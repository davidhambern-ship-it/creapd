import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  let body;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    body = await req.json();
    const source_id = body.source_id;
    const provider_account_id = body.provider_account_id;

    if (!source_id && !provider_account_id) {
      return Response.json({ error: 'source_id or provider_account_id is required' }, { status: 400 });
    }

    let source = null;
    let account = null;

    if (source_id) {
      source = await base44.entities.SMCSource.get(source_id);
      if (!source) return Response.json({ error: 'Source not found' }, { status: 404 });
    } else {
      account = await base44.entities.SMCProviderAccount.get(provider_account_id);
      if (!account) return Response.json({ error: 'Account not found' }, { status: 404 });
      source = account.source_id ? await base44.entities.SMCSource.get(account.source_id) : null;
    }

    const testUrl = source?.api_base_url || source?.website || source?.data_endpoint;
    const checks = [];
    let allPassed = true;
    let responseTime = 0;

    // 1. URL Reachability
    let urlReachable = false;
    if (testUrl) {
      try {
        const startTime = Date.now();
        const resp = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(10000) });
        responseTime = Date.now() - startTime;
        urlReachable = resp.ok || resp.status < 500;
        checks.push({ check_name: 'URL Reachable', passed: urlReachable, detail: `HTTP ${resp.status}`, response_time_ms: responseTime });
        if (!urlReachable) allPassed = false;
      } catch (err) {
        checks.push({ check_name: 'URL Reachable', passed: false, detail: err.message, response_time_ms: 0 });
        allPassed = false;
      }
    } else {
      checks.push({ check_name: 'URL Reachable', passed: false, detail: 'No URL configured', response_time_ms: 0 });
      allPassed = false;
    }

    // 2. API Reachable (if api_base_url exists and is different from testUrl)
    if (source?.api_base_url && source.api_base_url !== testUrl) {
      try {
        const apiResp = await fetch(source.api_base_url, { method: 'GET', signal: AbortSignal.timeout(10000) });
        const apiReachable = apiResp.ok || apiResp.status < 500;
        checks.push({ check_name: 'API Reachable', passed: apiReachable, detail: `HTTP ${apiResp.status}`, response_time_ms: 0 });
        if (!apiReachable) allPassed = false;
      } catch (err) {
        checks.push({ check_name: 'API Reachable', passed: false, detail: err.message, response_time_ms: 0 });
        allPassed = false;
      }
    }

    // 3. Response Format Valid (try to parse JSON if content-type is JSON)
    let responseFormatValid = false;
    let sampleResponse = '';
    if (urlReachable && testUrl) {
      try {
        const resp = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await resp.json();
          responseFormatValid = true;
          sampleResponse = JSON.stringify(data).substring(0, 500);
        } else if (contentType.includes('xml') || contentType.includes('html')) {
          responseFormatValid = true;
          sampleResponse = (await resp.text()).substring(0, 500);
        } else {
          responseFormatValid = true;
          sampleResponse = 'Non-JSON response received';
        }
        checks.push({ check_name: 'Response Format Valid', passed: responseFormatValid, detail: contentType, response_time_ms: 0 });
      } catch (err) {
        checks.push({ check_name: 'Response Format Valid', passed: false, detail: err.message, response_time_ms: 0 });
        allPassed = false;
      }
    } else {
      checks.push({ check_name: 'Response Format Valid', passed: false, detail: 'Skipped - URL not reachable', response_time_ms: 0 });
      allPassed = false;
    }

    // 4. Authentication check — look up credential from Key Vault and actually test it
    let authValid = false;
    let authDetail = 'No auth required';
    if (source?.api_key_required || (source?.authentication_type && source.authentication_type !== 'None' && source.authentication_type !== 'Anonymous')) {
      authDetail = 'API key required — checking Key Vault...';
      try {
        const vaultAccounts = await base44.asServiceRole.entities.SMCProviderAccount.filter(
          { source_id: source.id },
          '-created_date',
          5
        ).catch(() => []);

        if (vaultAccounts && vaultAccounts.length > 0) {
          const acct = vaultAccounts.find(a => a.credential_id) || vaultAccounts[0];
          if (acct.credential_id) {
            const cred = await base44.asServiceRole.entities.SMCCredential.get(acct.credential_id).catch(() => null);
            if (cred && cred.encrypted_secret) {
              // Check expiry
              if (cred.expiration_date && new Date(cred.expiration_date) < new Date()) {
                authDetail = `Credential expired on ${cred.expiration_date}`;
              } else {
                // Decrypt and test with an authenticated request
                let secret = '';
                try { secret = atob(cred.encrypted_secret); } catch { secret = cred.encrypted_secret; }
                const authType = (acct.authentication_type || cred.authentication_type || '').toLowerCase();
                let testHeaders = {};
                if (authType === 'bearer token' || authType === 'oauth 2.0' || authType === 'jwt') {
                  testHeaders = { 'Authorization': `Bearer ${secret}` };
                } else if (authType === 'basic auth') {
                  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(secret) && secret.includes('=');
                  testHeaders = { 'Authorization': `Basic ${isBase64 ? secret : btoa(secret)}` };
                } else if (authType === 'api key') {
                  testHeaders = { 'X-API-Key': secret };
                }
                // Re-fetch the test URL with auth headers
                if (testUrl && Object.keys(testHeaders).length > 0) {
                  const authResp = await fetch(testUrl, { headers: testHeaders, signal: AbortSignal.timeout(10000) });
                  authValid = authResp.status !== 401 && authResp.status !== 403;
                  authDetail = authValid
                    ? `Authenticated successfully (${acct.authentication_type})`
                    : `Authentication rejected (HTTP ${authResp.status}) — credential may be invalid`;
                } else {
                  authDetail = 'Credential found but auth type not supported for test';
                }
              }
            } else {
              authDetail = 'No credential linked to provider account';
            }
          } else {
            authDetail = 'Provider account exists but no credential linked';
          }
        } else {
          authDetail = 'API key required — no provider account in Key Vault. Set one up in SMC → Key Vault.';
        }
      } catch (err) {
        authDetail = `Credential lookup error: ${err.message}`;
      }
    } else {
      authValid = true;
    }
    checks.push({ check_name: 'Authentication Valid', passed: authValid, detail: authDetail, response_time_ms: 0 });
    if (!authValid) allPassed = false;

    // 5. Rate limit detection
    let rateLimited = false;
    if (urlReachable && testUrl) {
      try {
        const resp = await fetch(testUrl, { signal: AbortSignal.timeout(10000) });
        const rateLimitRemaining = resp.headers.get('x-ratelimit-remaining') || resp.headers.get('x-rate-limit-remaining');
        const rateLimitLimit = resp.headers.get('x-ratelimit-limit') || resp.headers.get('x-rate-limit-limit');
        rateLimited = resp.status === 429;
        checks.push({ check_name: 'Rate Limit Status', passed: !rateLimited, detail: rateLimited ? 'Rate limited (429)' : `Limit: ${rateLimitLimit || 'unknown'}`, response_time_ms: 0 });
        if (rateLimited) allPassed = false;
      } catch {
        checks.push({ check_name: 'Rate Limit Status', passed: true, detail: 'Could not determine', response_time_ms: 0 });
      }
    }

    // 6. Expected data returned
    const expectedDataReturned = responseFormatValid && sampleResponse.length > 10;
    checks.push({ check_name: 'Expected Data Returned', passed: expectedDataReturned, detail: expectedDataReturned ? 'Data received' : 'No data', response_time_ms: 0 });
    if (!expectedDataReturned) allPassed = false;

    // 7. License/access status
    checks.push({ check_name: 'License Status Valid', passed: source?.license_status !== 'Negotiation Required', detail: source?.license_status || 'Unknown', response_time_ms: 0 });

    // Create connection test record
    const test = await base44.entities.SMCConnectionTest.create({
      source_id: source?.id || '',
      provider_account_id: account?.id || '',
      test_type: body.test_type || 'Manual',
      status: allPassed ? 'Passed' : checks.some(c => c.passed) ? 'Partial' : 'Failed',
      checks: JSON.stringify(checks),
      url_reachable: checks.find(c => c.check_name === 'URL Reachable')?.passed || false,
      api_reachable: checks.find(c => c.check_name === 'API Reachable')?.passed || false,
      auth_valid: authValid,
      response_format_valid: responseFormatValid,
      rate_limit_detected: rateLimited,
      expected_data_returned: expectedDataReturned,
      license_valid: source?.license_status !== 'Negotiation Required',
      response_time_ms: responseTime,
      http_status_code: 0,
      sample_response: sampleResponse
    });

    // Update source health based on test results
    if (source) {
      const newHealthStatus = allPassed ? 'Healthy' : !checks.find(c => c.check_name === 'URL Reachable')?.passed ? 'Offline' : rateLimited ? 'Rate Limited' : 'Connection Failed';
      await base44.entities.SMCSource.update(source.id, {
        health_status: newHealthStatus,
        last_checked_at: new Date().toISOString(),
        last_successful_connection: allPassed ? new Date().toISOString() : source.last_successful_connection,
        last_failed_connection: !allPassed ? new Date().toISOString() : source.last_failed_connection,
        current_response_time_ms: responseTime,
        average_response_time_ms: source.average_response_time_ms > 0 ? Math.round((source.average_response_time_ms + responseTime) / 2) : responseTime
      });

      // Create monitoring event
      await base44.entities.SMCMonitoringEvent.create({
        source_id: source.id,
        event_type: allPassed ? 'Health Check Passed' : 'Health Check Failed',
        health_status: newHealthStatus,
        response_time_ms: responseTime,
        details: allPassed ? 'All checks passed' : `${checks.filter(c => !c.passed).map(c => c.check_name).join(', ')} failed`,
        recommended_action: allPassed ? '' : 'Review failed checks and consider switching to backup source',
        severity: allPassed ? 'Info' : 'Warning',
        auto_recovery_attempted: false,
        auto_recovery_successful: false
      });
    }

    // Update provider account if applicable
    if (account) {
      await base44.entities.SMCProviderAccount.update(account.id, {
        account_status: allPassed ? 'Connected' : 'Error',
        last_verified: new Date().toISOString()
      });
    }

    return Response.json({ success: true, test_id: test.id, status: test.status, checks, response_time_ms: responseTime });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});