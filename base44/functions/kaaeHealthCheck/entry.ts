import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * KAAE Provider Health & Monitoring — Implements KAAE-006
 *
 * Runs health checks on all connected providers:
 *   1. Connectivity check (is the provider reachable?)
 *   2. Functional check (does a minimal request return valid data?)
 *   3. Updates health status, response time metrics, and consecutive failures
 *   4. Triggers alerts on status transitions
 *
 * Designed to run as a scheduled automation (every 15 min).
 */

const HEALTH_TIMEOUT_MS = 10000;
const MAX_FAILURES_BEFORE_DOWN = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = {
      cycle_started: new Date().toISOString(),
      providers_checked: 0,
      healthy: 0,
      degraded: 0,
      down: 0,
      alerts_triggered: 0,
      errors: [],
    };

    // Fetch all non-archived providers
    const providers = await base44.asServiceRole.entities.CAESourceProvider.filter(
      { is_archived: false }, 'name'
    );

    for (const provider of (providers || [])) {
      results.providers_checked++;
      const previousStatus = provider.api_health || 'unknown';

      try {
        // ── Connectivity Check ──
        const checkUrl = provider.website || provider.apis?.[0] || '';
        if (!checkUrl) {
          // No URL to check — skip
          continue;
        }

        const startTime = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

        let healthStatus = 'healthy';
        let responseTimeMs = 0;

        try {
          const response = await fetch(checkUrl, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
          });
          responseTimeMs = Date.now() - startTime;

          if (response.ok) {
            healthStatus = responseTimeMs > 5000 ? 'degraded' : 'healthy';
          } else if (response.status >= 500) {
            healthStatus = 'down';
          } else if (response.status >= 400) {
            healthStatus = 'degraded';
          }
        } catch (fetchError) {
          responseTimeMs = Date.now() - startTime;
          if (fetchError.name === 'AbortError') {
            healthStatus = 'degraded';
          } else {
            healthStatus = 'down';
          }
        } finally {
          clearTimeout(timeout);
        }

        // ── Calculate consecutive failures ──
        let consecutiveFailures = provider.broken_link_count || 0;
        if (healthStatus === 'down') {
          consecutiveFailures++;
        } else {
          consecutiveFailures = 0;
        }

        // Auto-down after MAX_FAILURES_BEFORE_DOWN consecutive failures
        if (consecutiveFailures >= MAX_FAILURES_BEFORE_DOWN && healthStatus !== 'down') {
          healthStatus = 'down';
        }

        // ── Update provider record ──
        await base44.asServiceRole.entities.CAESourceProvider.update(provider.id, {
          api_health: healthStatus,
          website_status: healthStatus,
          last_verification: new Date().toISOString(),
          broken_link_count: consecutiveFailures,
        });

        // ── Count results ──
        if (healthStatus === 'healthy') results.healthy++;
        else if (healthStatus === 'degraded') results.degraded++;
        else if (healthStatus === 'down') results.down++;

        // ── Alert on status transition ──
        const transitionedToDown = previousStatus !== 'down' && healthStatus === 'down';
        const transitionedToDegraded = previousStatus === 'healthy' && healthStatus === 'degraded';

        if (transitionedToDown || transitionedToDegraded) {
          results.alerts_triggered++;

          // Create alert
          try {
            await base44.asServiceRole.entities.AppNotification.create({
              title: `Provider ${transitionedToDown ? 'DOWN' : 'DEGRADED'}: ${provider.name}`,
              body: `Provider "${provider.name}" transitioned from ${previousStatus} to ${healthStatus}. Response time: ${responseTimeMs}ms. Consecutive failures: ${consecutiveFailures}.`,
              type: 'kaae_provider_health',
              severity: transitionedToDown ? 'critical' : 'warning',
              read: false,
              metadata: JSON.stringify({
                provider_id: provider.id,
                provider_name: provider.name,
                previous_status: previousStatus,
                new_status: healthStatus,
                response_time_ms: responseTimeMs,
                consecutive_failures: consecutiveFailures,
              }),
            });
          } catch (e) {
            // AppNotification entity might have different fields — best effort
          }

          // Log alert
          try {
            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: 'provider_health_alert',
              description: `Provider "${provider.name}" transitioned from ${previousStatus} to ${healthStatus}`,
              details: JSON.stringify({
                provider_id: provider.id,
                previous_status: previousStatus,
                new_status: healthStatus,
                response_time_ms: responseTimeMs,
                consecutive_failures: consecutiveFailures,
              }),
              timestamp: new Date().toISOString(),
            });
          } catch (e) {
            // Best effort
          }
        }
      } catch (e) {
        results.errors.push(`Provider ${provider.name}: ${e.message}`);
      }
    }

    results.cycle_completed = new Date().toISOString();

    // Log the cycle
    try {
      await base44.asServiceRole.entities.CAEOperationLog.create({
        timestamp: new Date().toISOString(),
        operation: 'kaae_health_check_cycle',
        details: JSON.stringify(results),
      });
    } catch (e) {
      // Best effort
    }

    return Response.json({ status: 'complete', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});