import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * KAAE Acquisition Engine — Implements KAAE-008 Prime Directive
 *
 * When an AI Worker or Production Profile needs a resource, it calls this function.
 * The engine follows the priority chain:
 *   1. Search existing Asset Registry (library reuse)
 *   2. Search free API providers
 *   3. Search public domain resources
 *   4. Search open license resources
 *   5. Search premium sources (budget-gated)
 *   6. AI generation (last resort)
 *
 * Every decision is logged for audit trail (KAAE-008 §11).
 */

// ── License compatibility check (KAAE-004) ──

const COMPATIBLE_LICENSES = [
  'public_domain',
  'creative_commons',  // further filtered by CC variant
  'mit',
  'apache',
  'bsd',
  'official_free_access',
  'commercial_license',
  'premium_subscription',
];

const COMPATIBLE_CC_VARIANTS = ['cc0', 'cc-by', 'cc-by-sa'];

function isLicenseCompatible(asset) {
  if (!COMPATIBLE_LICENSES.includes(asset.license)) return false;
  if (asset.license === 'creative_commons') {
    if (!COMPATIBLE_CC_VARIANTS.includes(asset.cc_variant || 'n/a')) return false;
  }
  if (!asset.commercial_use) return false;
  return true;
}

// ── Quality threshold check (KAAE-008 §8) ──

const QUALITY_THRESHOLDS = {
  knowledge: { min_confidence: 60, min_qa: 'passed' },
  image:     { min_confidence: 50, min_qa: 'not_reviewed' },
  svg:       { min_confidence: 40, min_qa: 'not_reviewed' },
  icon:      { min_confidence: 40, min_qa: 'not_reviewed' },
  video:     { min_confidence: 60, min_qa: 'passed' },
  audio:     { min_confidence: 55, min_qa: 'passed' },
  music:     { min_confidence: 55, min_qa: 'passed' },
  dataset:   { min_confidence: 60, min_qa: 'passed' },
  template:  { min_confidence: 50, min_qa: 'not_reviewed' },
  font:      { min_confidence: 70, min_qa: 'passed' },
  map:       { min_confidence: 50, min_qa: 'not_reviewed' },
  chart:     { min_confidence: 50, min_qa: 'not_reviewed' },
  diagram:   { min_confidence: 50, min_qa: 'not_reviewed' },
  animation: { min_confidence: 55, min_qa: 'not_reviewed' },
  rss_feed:  { min_confidence: 40, min_qa: 'not_reviewed' },
};

const QA_RANK = { not_reviewed: 0, needs_revision: 1, passed: 2, approved: 3 };

function meetsQualityThreshold(asset) {
  const threshold = QUALITY_THRESHOLDS[asset.resource_type] || QUALITY_THRESHOLDS.knowledge;
  if (asset.confidence < threshold.min_confidence) return false;
  if (QA_RANK[asset.qa_status] < QA_RANK[threshold.min_qa]) return false;
  return true;
}

// ── Keyword matching for library search ──

function matchesKeywords(asset, query) {
  if (!query || !query.trim()) return true;
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (terms.length === 0) return true;

  const haystack = [
    asset.title || '',
    asset.description || '',
    asset.category || '',
    asset.subcategory || '',
    ...(safeJsonArray(asset.keywords)),
    ...(safeJsonArray(asset.tags)),
  ].join(' ').toLowerCase();

  return terms.some(term => haystack.includes(term));
}

function safeJsonArray(str) {
  if (!str) return [];
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}

// ── Acquisition decision logging ──

async function logAcquisitionDecision(base44, logData) {
  try {
    await base44.asServiceRole.entities.CAEOperationLog.create({
      timestamp: new Date().toISOString(),
      operation: 'kaae_acquire',
      details: JSON.stringify(logData),
    });
  } catch (e) {
    // Logging is best-effort; don't fail the acquisition
  }
}

// ── Main handler ──

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      resource_type,
      query,
      keywords,
      production_profile,
      allow_ai_generation = true,
      max_cost = 0,
      require_modification_allowed = false,
    } = await req.json();

    if (!resource_type) {
      return Response.json({ error: 'resource_type is required' }, { status: 400 });
    }

    const searchQuery = query || (keywords ? keywords.join(' ') : '');
    const decisionLog = {
      request_source: user.email,
      resource_type,
      query: searchQuery,
      production_profile: production_profile || null,
      providers_searched: [],
      resources_found: {},
      priority_level_reached: null,
      selected_asset_id: null,
      acquisition_method: null,
      cost: 0,
      justification: null,
      timestamp: new Date().toISOString(),
    };

    // ═══ Priority 1: Search Existing Asset Registry ═══

    const allAssets = await base44.asServiceRole.entities.AssetRegistry.filter(
      { resource_type, is_active: true }, '-confidence'
    );

    const libraryMatches = (allAssets || []).filter(a =>
      isLicenseCompatible(a) &&
      meetsQualityThreshold(a) &&
      matchesKeywords(a, searchQuery) &&
      (!require_modification_allowed || a.modification_allowed)
    );

    decisionLog.providers_searched.push('asset_registry');
    decisionLog.resources_found.priority_1_library = libraryMatches.length;

    if (libraryMatches.length > 0) {
      const selected = libraryMatches[0]; // highest confidence (sorted)

      // Increment usage count
      await base44.asServiceRole.entities.AssetRegistry.update(selected.id, {
        usage_count: (selected.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      });

      decisionLog.priority_level_reached = 1;
      decisionLog.selected_asset_id = selected.id;
      decisionLog.acquisition_method = 'library_reuse';
      decisionLog.cost = 0;

      await logAcquisitionDecision(base44, decisionLog);

      return Response.json({
        status: 'found',
        priority_level: 1,
        acquisition_method: 'library_reuse',
        asset: selected,
        cost: 0,
      });
    }

    // ═══ Priority 2-4: Search External Providers via Connectors ═══
    // (Delegates to the SMC/CAE discovery infrastructure)

    const sourceProviders = await base44.asServiceRole.entities.CAESourceProvider.filter(
      { is_archived: false }, '-trust_score'
    );

    // Filter by health: only use healthy or degraded providers
    const usableProviders = (sourceProviders || []).filter(p =>
      p.api_health !== 'down' && p.website_status !== 'down'
    );

    decisionLog.providers_searched.push(...usableProviders.map(p => p.name));

    // Priority 2: Free API providers
    const freeApiProviders = usableProviders.filter(p =>
      p.registration_requirements === 'none' ||
      p.registration_requirements === 'free_registration' ||
      p.license_model === 'free'
    );

    // Priority 3: Public domain providers
    const publicDomainProviders = usableProviders.filter(p =>
      p.pipeline === 'public_domain' ||
      p.license_model === 'public_domain'
    );

    // Priority 4: Open license providers
    const openLicenseProviders = usableProviders.filter(p =>
      p.pipeline === 'open_access' ||
      p.license_model === 'creative_commons' ||
      p.license_model === 'open_access'
    );

    // Priority 5: Premium providers
    const premiumProviders = usableProviders.filter(p =>
      p.registration_requirements === 'paid' ||
      p.license_model === 'commercial' ||
      p.license_model === 'premium_subscription'
    );

    const providerBuckets = [
      { level: 2, providers: freeApiProviders, method: 'free_api' },
      { level: 3, providers: publicDomainProviders, method: 'public_domain' },
      { level: 4, providers: openLicenseProviders, method: 'open_license' },
      { level: 5, providers: premiumProviders, method: 'premium_purchase' },
    ];

    for (const bucket of providerBuckets) {
      decisionLog.resources_found[`priority_${bucket.level}`] = bucket.providers.length;

      if (bucket.providers.length === 0) continue;

      // For premium sources, check budget constraint
      if (bucket.level === 5 && max_cost <= 0) {
        decisionLog.resources_found.priority_5_skipped = 'budget_constraint';
        continue;
      }

      // Query each provider's already-discovered assets
      for (const provider of bucket.providers) {
        const providerAssets = (allAssets || []).filter(a =>
          a.provider === provider.name &&
          isLicenseCompatible(a) &&
          meetsQualityThreshold(a) &&
          matchesKeywords(a, searchQuery) &&
          (!require_modification_allowed || a.modification_allowed)
        );

        if (providerAssets.length > 0) {
          const selected = providerAssets[0];

          // For premium, check cost
          if (bucket.level === 5 && (selected.cost || 0) > max_cost) continue;

          // Cache the resource if not already cached
          if (!selected.cached && selected.download_status !== 'downloaded') {
            await base44.asServiceRole.entities.AssetRegistry.update(selected.id, {
              download_status: 'downloading',
              cached_at: new Date().toISOString(),
            });
            // Note: actual download is handled by the connector framework (KAAE-002)
          }

          await base44.asServiceRole.entities.AssetRegistry.update(selected.id, {
            usage_count: (selected.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          });

          decisionLog.priority_level_reached = bucket.level;
          decisionLog.selected_asset_id = selected.id;
          decisionLog.acquisition_method = bucket.method;
          decisionLog.cost = selected.cost || 0;

          await logAcquisitionDecision(base44, decisionLog);

          return Response.json({
            status: 'found',
            priority_level: bucket.level,
            acquisition_method: bucket.method,
            asset: selected,
            cost: selected.cost || 0,
          });
        }
      }
    }

    // ═══ Priority 6: AI Generation (last resort) ═══

    if (allow_ai_generation) {
      decisionLog.priority_level_reached = 6;
      decisionLog.acquisition_method = 'ai_generation';
      decisionLog.justification = `No suitable ${resource_type} resource found in library or external providers for query: "${searchQuery}". Falling back to AI generation per KAAE-008 Prime Directive.`;

      await logAcquisitionDecision(base44, decisionLog);

      return Response.json({
        status: 'not_found',
        priority_level: 6,
        acquisition_method: 'ai_generation',
        message: 'No suitable resource found in the KAAE. Proceed with AI generation.',
        justification: decisionLog.justification,
        searched_providers: decisionLog.providers_searched,
      });
    }

    // AI generation not allowed — return not found
    decisionLog.priority_level_reached = null;
    decisionLog.justification = `No suitable ${resource_type} resource found and AI generation is disabled.`;

    await logAcquisitionDecision(base44, decisionLog);

    return Response.json({
      status: 'not_found',
      priority_level: null,
      message: 'No suitable resource found in the KAAE and AI generation is disabled.',
      searched_providers: decisionLog.providers_searched,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});