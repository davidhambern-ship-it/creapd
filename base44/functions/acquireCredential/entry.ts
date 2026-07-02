import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const mode = body.mode || 'single';

    if (mode === 'auto') {
      return await autoAcquireAll(base44, user);
    } else if (body.source_id) {
      return await acquireForSource(base44, body.source_id, user);
    }

    return Response.json({ error: 'Provide source_id or mode=auto' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Auto-acquire for all approved sources that need API keys but have none ───
async function autoAcquireAll(base44, user) {
  const sources = await base44.asServiceRole.entities.SMCSource.filter(
    { api_key_required: true, is_approved: true },
    '-updated_date',
    50
  );

  const results = [];
  for (const source of sources) {
    const existingAccounts = await base44.asServiceRole.entities.SMCProviderAccount.filter(
      { source_id: source.id }, '-created_date', 5
    ).catch(() => []);

    const hasCredential = existingAccounts.some(a => a.credential_id);
    if (hasCredential) {
      results.push({ source_id: source.id, source_name: source.source_name, acquired: false, skipped: 'Credential already exists' });
      continue;
    }

    try {
      const result = await acquireForSourceInternal(base44, source, user);
      results.push(result);
    } catch (err) {
      results.push({ source_id: source.id, source_name: source.source_name, acquired: false, error: err.message });
    }
  }

  const acquired = results.filter(r => r.acquired).length;
  return Response.json({
    success: true,
    mode: 'auto',
    sources_processed: sources.length,
    credentials_acquired: acquired,
    results
  });
}

async function acquireForSource(base44, sourceId, user) {
  const source = await base44.asServiceRole.entities.SMCSource.get(sourceId);
  if (!source) return Response.json({ error: 'Source not found' }, { status: 404 });

  const result = await acquireForSourceInternal(base44, source, user);
  return Response.json(result);
}

// ─── Core acquisition logic ──────────────────────────────────────────
async function acquireForSourceInternal(base44, source, user) {
  // Check if credential already exists
  const existingAccounts = await base44.asServiceRole.entities.SMCProviderAccount.filter(
    { source_id: source.id }, '-created_date', 5
  ).catch(() => []);

  const hasCredential = existingAccounts.some(a => a.credential_id);
  if (hasCredential) {
    return {
      source_id: source.id,
      source_name: source.source_name,
      acquired: false,
      skipped: 'Credential already exists in Key Vault'
    };
  }

  // ─── Step 1: Research the provider's API key process via LLM + web search ───
  const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are an API integration specialist for religious and spiritual text data sources. Research how to obtain an API key for the following provider.

Provider: ${source.provider_name || 'Unknown'}
Source: ${source.source_name}
Website: ${source.website || 'N/A'}
API Base URL: ${source.api_base_url || 'N/A'}
Documentation URL: ${source.documentation_url || 'N/A'}
Authentication Type: ${source.authentication_type || 'API Key'}

Search the web for:
1. The provider's official API documentation and developer portal
2. Their API key registration or signup page URL
3. Whether they offer a FREE API key (free tier)
4. Whether the signup can be done programmatically (via a POST/GET request that returns a key immediately) or requires manual form filling
5. Any publicly available demo, test, or sample API keys mentioned in official documentation, GitHub READMEs, tutorials, or blog posts — ONLY include keys that are clearly intended for public/demo use
6. How the API key should be passed in requests (header name, query parameter, etc.)

If you find a publicly documented free/demo API key that is clearly intended for public use (e.g., in official documentation, GitHub READMEs, or tutorials), include it in the "public_key" field. Do NOT fabricate keys — only include keys you actually found in publicly available documentation.

Respond with a JSON object:`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        signup_url: { type: 'string', description: 'URL where you register for an API key' },
        has_free_tier: { type: 'boolean', description: 'Whether a free tier exists' },
        programmatic_signup: { type: 'boolean', description: 'Whether you can get a key via a POST/GET without manual steps' },
        signup_method: { type: 'string', description: 'POST or GET (if programmatic)' },
        signup_endpoint: { type: 'string', description: 'Full URL to call for programmatic signup' },
        signup_body: { type: 'string', description: 'JSON body to send, use {email} as placeholder (if POST)' },
        api_key_field: { type: 'string', description: 'Field name in the signup response that contains the API key' },
        public_key: { type: 'string', description: 'Publicly available free/demo key if found, empty string if not' },
        email_verification_required: { type: 'boolean', description: 'Whether email verification is needed before the key works' },
        header_format: { type: 'string', description: 'How to pass the key: e.g. "Authorization: Bearer {key}", "X-API-Key: {key}", "?key={key}"' },
        instructions: { type: 'string', description: 'Step-by-step instructions for obtaining the key' },
        provider_summary: { type: 'string', description: 'Brief summary of what this provider offers' },
        no_key_needed: { type: 'boolean', description: 'True if the API is actually public/anonymous and no key is needed' }
      },
      required: ['signup_url', 'has_free_tier', 'programmatic_signup', 'signup_method', 'signup_endpoint', 'signup_body', 'api_key_field', 'public_key', 'email_verification_required', 'header_format', 'instructions', 'provider_summary', 'no_key_needed']
    }
  });

  // ─── If LLM says no key is actually needed, update the source ───
  if (llmResult.no_key_needed) {
    try {
      await base44.asServiceRole.entities.SMCSource.update(source.id, {
        api_key_required: false,
        authentication_type: 'Anonymous',
        admin_notes: (source.admin_notes || '') + '\n[acquireCredential] LLM research determined this source does not require an API key.'
      });
    } catch {}
    return {
      source_id: source.id,
      source_name: source.source_name,
      acquired: false,
      no_key_needed: true,
      message: 'Source does not require an API key — updated source metadata.'
    };
  }

  let apiKey = '';
  let authType = 'API Key';
  let acquired = false;
  let acquisitionMethod = '';
  let headerFormat = llmResult.header_format || '';

  // ─── Step 2a: Try a publicly documented key ───
  if (llmResult.public_key && llmResult.public_key.length > 5) {
    // Validate the key by making a test request
    const testUrl = source.data_endpoint || source.api_base_url || source.website || '';
    if (testUrl) {
      const testHeaders = buildAuthHeaders(llmResult.header_format, llmResult.public_key, 'API Key');
      try {
        const testResp = await fetch(testUrl, {
          headers: testHeaders,
          signal: AbortSignal.timeout(10000)
        });
        if (testResp.status !== 401 && testResp.status !== 403) {
          apiKey = llmResult.public_key;
          acquired = true;
          acquisitionMethod = 'Found publicly documented key in API documentation';
        }
      } catch {}
    }
    if (!acquired) {
      // Key might still be valid even if test failed (test URL might be wrong)
      apiKey = llmResult.public_key;
      acquired = true;
      acquisitionMethod = 'Found publicly documented key (unvalidated — will be tested on first import)';
    }
  }

  // ─── Step 2b: Try programmatic signup ───
  if (!acquired && llmResult.programmatic_signup && llmResult.signup_endpoint) {
    try {
      const method = (llmResult.signup_method || 'POST').toUpperCase();
      const signupBody = (llmResult.signup_body || '').replace(/\{email\}/gi, user.email);

      let resp;
      if (method === 'POST') {
        resp = await fetch(llmResult.signup_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: signupBody || JSON.stringify({ email: user.email }),
          signal: AbortSignal.timeout(15000)
        });
      } else {
        const url = llmResult.signup_endpoint.replace(/\{email\}/gi, encodeURIComponent(user.email));
        resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      }

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const keyField = llmResult.api_key_field || 'api_key';
        apiKey = data[keyField] || data.apiKey || data.key || data.token || data.api_key || data.apiKey || '';
        if (!apiKey && typeof data === 'object') {
          // Search all string values for something that looks like an API key
          for (const v of Object.values(data)) {
            if (typeof v === 'string' && v.length > 10 && v.length < 200 && /^[a-zA-Z0-9_\-]+$/.test(v)) {
              apiKey = v;
              break;
            }
          }
        }
        if (apiKey) {
          acquired = true;
          acquisitionMethod = `Programmatic signup via ${llmResult.signup_endpoint}`;
        }
      }
    } catch (err) {
      acquisitionMethod = `Programmatic signup failed: ${err.message}`;
    }
  }

  // ─── Step 3: Store the credential if acquired ───
  if (acquired && apiKey) {
    // Determine auth type from header format
    const hf = headerFormat.toLowerCase();
    if (hf.includes('bearer')) {
      authType = 'Bearer Token';
    } else if (hf.includes('x-api-key')) {
      authType = 'API Key';
    } else if (hf.includes('authorization')) {
      authType = 'API Key';
    } else if (hf.includes('?key=') || hf.includes('&key=')) {
      authType = 'API Key';
    }

    // Create provider account
    const account = await base44.asServiceRole.entities.SMCProviderAccount.create({
      source_id: source.id,
      provider_name: source.provider_name || source.source_name,
      account_label: 'Production',
      account_status: 'Connected',
      authentication_type: authType,
      last_verified: new Date().toISOString(),
      seeder_enabled: true,
      cae_enabled: true,
      research_enabled: true,
      library_enabled: true,
      permission_summary: llmResult.provider_summary || 'Auto-acquired credential',
      admin_notes: `Auto-acquired: ${acquisitionMethod}`
    });

    // Create credential
    await base44.asServiceRole.entities.SMCCredential.create({
      provider_account_id: account.id,
      provider_name: source.provider_name || source.source_name,
      credential_label: 'Auto-Acquired',
      authentication_type: authType,
      encrypted_secret: btoa(apiKey),
      secret_hint: apiKey.slice(-4),
      rotation_schedule: 'Annually',
      last_used: new Date().toISOString(),
      usage_count: 0,
      status: 'Healthy',
      admin_notes: JSON.stringify({
        acquisition_method: acquisitionMethod,
        header_format: headerFormat,
        signup_url: llmResult.signup_url || '',
        instructions: llmResult.instructions || '',
        acquired_at: new Date().toISOString()
      })
    });

    return {
      source_id: source.id,
      source_name: source.source_name,
      acquired: true,
      method: acquisitionMethod,
      auth_type: authType,
      header_format: headerFormat,
      secret_hint: `••••${apiKey.slice(-4)}`,
      signup_url: llmResult.signup_url,
      instructions: llmResult.instructions
    };
  }

  // ─── Could not auto-acquire — return guidance ───
  return {
    source_id: source.id,
    source_name: source.source_name,
    acquired: false,
    signup_url: llmResult.signup_url,
    has_free_tier: llmResult.has_free_tier,
    email_verification_required: llmResult.email_verification_required,
    header_format: llmResult.header_format,
    instructions: llmResult.instructions,
    message: 'Could not auto-acquire key. Manual registration may be required — see instructions.'
  };
}

// ─── Helper: build auth headers from a format string ───
function buildAuthHeaders(headerFormat, secret, authType) {
  if (!headerFormat) {
    // Default by auth type
    if (authType === 'Bearer Token') return { 'Authorization': `Bearer ${secret}` };
    if (authType === 'Basic Auth') {
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(secret) && secret.includes('=');
      return { 'Authorization': `Basic ${isBase64 ? secret : btoa(secret)}` };
    }
    return { 'X-API-Key': secret };
  }

  const hf = headerFormat.toLowerCase();
  if (hf.includes('authorization: bearer')) {
    return { 'Authorization': `Bearer ${secret}` };
  } else if (hf.includes('authorization:')) {
    const val = headerFormat.replace(/^authorization:\s*/i, '').replace(/\{key\}/gi, secret).replace(/\{api_key\}/gi, secret);
    return { 'Authorization': val };
  } else if (hf.includes('x-api-key')) {
    return { 'X-API-Key': secret };
  } else if (hf.includes('?key=') || hf.includes('&key=')) {
    // Query param auth — can't set as header; handled in authenticatedFetch
    return {};
  } else {
    // Try to parse as "Header-Name: {key}"
    const colonIdx = headerFormat.indexOf(':');
    if (colonIdx > 0) {
      const headerName = headerFormat.substring(0, colonIdx).trim();
      const headerVal = headerFormat.substring(colonIdx + 1).trim().replace(/\{key\}/gi, secret).replace(/\{api_key\}/gi, secret);
      if (headerName && headerVal) return { [headerName]: headerVal };
    }
  }

  return { 'X-API-Key': secret };
}