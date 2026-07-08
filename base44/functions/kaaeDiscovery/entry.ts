import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * KAAE Continuous Discovery Engine — Implements KAAE-007
 *
 * Runs a discovery cycle that:
 *   1. Picks up active Collection Goals and demand events
 *   2. Searches connected providers for new resources
 *   3. Registers discovered resources via kaaeRegisterAsset
 *   4. Re-verifies license status for existing assets (weekly)
 *   5. Checks content availability (daily)
 *
 * Designed to run as a scheduled automation (every 30 min).
 */

const DISCOVERY_LIMIT = 25; // Max resources to process per cycle
const VERIFICATION_BATCH = 10; // Assets to re-verify per cycle
const AVAILABILITY_BATCH = 20; // Assets to health-check per cycle

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results = {
      cycle_started: new Date().toISOString(),
      goals_processed: 0,
      demand_events_processed: 0,
      resources_discovered: 0,
      resources_registered: 0,
      licenses_reverified: 0,
      downgrades_detected: 0,
      availability_checked: 0,
      broken_links_found: 0,
      errors: [],
    };

    // ═══ 1. Collection Goal-Driven Discovery ═══

    const goals = await base44.asServiceRole.entities.CAECollectionGoal.filter(
      { status: 'active' }, '-priority_score'
    );

    for (const goal of (goals || []).slice(0, 5)) { // Top 5 goals per cycle
      results.goals_processed++;

      try {
        // Search connected providers for resources matching this goal
        const keywords = safeJsonArray(goal.target_keywords);
        if (keywords.length === 0) continue;

        const providers = await base44.asServiceRole.entities.CAESourceProvider.filter(
          { is_archived: false, api_health: 'healthy' }, '-trust_score'
        );

        for (const provider of (providers || []).slice(0, 3)) { // Top 3 providers per goal
          try {
            // Use the provider's discovered assets from CAEDiscovery
            const discoveries = await base44.asServiceRole.entities.CAEDiscovery.filter(
              { collection_goal: goal.goal_name || goal.id }, '-created_date', DISCOVERY_LIMIT
            );

            for (const discovery of (discoveries || [])) {
              results.resources_discovered++;

              // Register the discovered resource
              try {
                const regResponse = await base44.asServiceRole.functions.invoke('kaaeRegisterAsset', {
                  title: discovery.title || 'Untitled',
                  resource_type: goal.target_resource_type || 'knowledge',
                  format: discovery.format || '',
                  category: goal.target_category || '',
                  keywords: JSON.stringify(keywords),
                  tags: JSON.stringify(keywords.slice(0, 5)),
                  provider: provider.name,
                  provider_resource_id: discovery.id,
                  source_url: discovery.source_url || '',
                  connector_id: provider.id,
                  license: discovery.license || 'unknown',
                  license_url: discovery.license_url || '',
                  commercial_use: discovery.commercial_use ?? false,
                  confidence: discovery.confidence || 50,
                  qa_status: 'not_reviewed',
                  acquisition_method: 'connector_discovery',
                  cost: 0,
                  production_profiles: JSON.stringify([]),
                });

                if (regResponse.data?.status === 'registered') {
                  results.resources_registered++;
                }
              } catch (e) {
                // Registration error — skip this resource
              }
            }
          } catch (e) {
            results.errors.push(`Goal "${goal.goal_name}": ${e.message}`);
          }
        }

        // Update goal progress
        const registeredCount = await base44.asServiceRole.entities.AssetRegistry.filter(
          { category: goal.target_category, is_active: true }
        );
        const progress = goal.target_count > 0
          ? Math.min(100, Math.round(((registeredCount || []).length / goal.target_count) * 100))
          : 0;

        if (progress !== goal.savings_progress) {
          await base44.asServiceRole.entities.CAECollectionGoal.update(goal.id, {
            savings_progress: progress,
          });
        }
      } catch (e) {
        results.errors.push(`Goal processing error: ${e.message}`);
      }
    }

    // ═══ 2. Demand-Driven Discovery ═══

    try {
      const demandEvents = await base44.asServiceRole.entities.RegistryDemandEvent.filter(
        { status: 'pending' }, '-created_date', 5
      );

      for (const event of (demandEvents || [])) {
        results.demand_events_processed++;

        try {
          // Log the demand as processed
          await base44.asServiceRole.entities.RegistryDemandEvent.update(event.id, {
            status: 'processing',
          });

          // The actual search would go through connectors — for now, mark as processed
          // Future: invoke connector search with event.search_query

          await base44.asServiceRole.entities.RegistryDemandEvent.update(event.id, {
            status: 'processed',
          });
        } catch (e) {
          results.errors.push(`Demand event ${event.id}: ${e.message}`);
        }
      }
    } catch (e) {
      // RegistryDemandEvent entity might not exist or have different fields
    }

    // ═══ 3. License Re-verification (weekly cycle) ═══

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const assetsToVerify = await base44.asServiceRole.entities.AssetRegistry.filter(
        { is_active: true, is_deprecated: false }, 'last_verified', VERIFICATION_BATCH
      );

      // Filter to those not verified in 7 days
      const stale = (assetsToVerify || []).filter(a =>
        !a.last_verified || a.last_verified < oneWeekAgo
      );

      for (const asset of stale) {
        try {
          const verifyResponse = await base44.asServiceRole.functions.invoke('kaaeLicenseCheck', {
            asset_id: asset.id,
            reverify: true,
          });

          results.licenses_reverified++;

          if (verifyResponse.data?.downgrade_detected) {
            results.downgrades_detected++;
          }
        } catch (e) {
          results.errors.push(`License verify ${asset.id}: ${e.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`License re-verification: ${e.message}`);
    }

    // ═══ 4. Content Availability Check (daily cycle) ═══

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const assetsToCheck = await base44.asServiceRole.entities.AssetRegistry.filter(
        { is_active: true }, 'last_checked', AVAILABILITY_BATCH
      );

      const staleHealth = (assetsToCheck || []).filter(a =>
        !a.last_checked || a.last_checked < oneDayAgo
      );

      for (const asset of staleHealth) {
        try {
          // Basic availability check — verify source_url is reachable
          if (asset.source_url) {
            const response = await fetch(asset.source_url, { method: 'HEAD', redirect: 'follow' });

            if (response.ok) {
              await base44.asServiceRole.entities.AssetRegistry.update(asset.id, {
                health_status: 'healthy',
                last_checked: new Date().toISOString(),
              });
            } else if (response.status === 404) {
              await base44.asServiceRole.entities.AssetRegistry.update(asset.id, {
                health_status: 'down',
                last_checked: new Date().toISOString(),
                is_active: false,
                is_deprecated: true,
              });
              results.broken_links_found++;
            } else {
              await base44.asServiceRole.entities.AssetRegistry.update(asset.id, {
                health_status: 'degraded',
                last_checked: new Date().toISOString(),
              });
            }
          }
          results.availability_checked++;
        } catch (e) {
          // Network error — mark as degraded
          await base44.asServiceRole.entities.AssetRegistry.update(asset.id, {
            health_status: 'degraded',
            last_checked: new Date().toISOString(),
          });
          results.availability_checked++;
        }
      }
    } catch (e) {
      results.errors.push(`Availability check: ${e.message}`);
    }

    results.cycle_completed = new Date().toISOString();

    // Log the cycle
    try {
      await base44.asServiceRole.entities.CAEOperationLog.create({
        timestamp: new Date().toISOString(),
        operation: 'kaae_discovery_cycle',
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

function safeJsonArray(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}