import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * KAAE Asset Registration — Implements KAAE-003
 *
 * Registers a newly discovered or acquired resource into the Asset Registry.
 * Performs duplicate detection before creating a new record.
 *
 * Called by:
 *   - Knowledge Connectors after discovering a resource
 *   - AI Workers after generating a resource
 *   - Manual import flows
 */

function generateAssetId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KAAE-${ts}-${rand}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const asset = await req.json();
    if (!asset.title || !asset.resource_type) {
      return Response.json({ error: 'title and resource_type are required' }, { status: 400 });
    }

    // ── Duplicate Detection (KAAE-003 §5) ──

    // Check 1: Exact source_url match
    if (asset.source_url) {
      const urlMatches = await base44.asServiceRole.entities.AssetRegistry.filter(
        { source_url: asset.source_url, is_active: true }
      );
      if (urlMatches && urlMatches.length > 0) {
        return Response.json({
          status: 'duplicate',
          existing_asset_id: urlMatches[0].id,
          reason: 'source_url already exists in registry',
          asset: urlMatches[0],
        });
      }
    }

    // Check 2: Provider + provider_resource_id match
    if (asset.provider && asset.provider_resource_id) {
      const providerMatches = await base44.asServiceRole.entities.AssetRegistry.filter(
        { provider: asset.provider, provider_resource_id: asset.provider_resource_id }
      );
      if (providerMatches && providerMatches.length > 0) {
        return Response.json({
          status: 'duplicate',
          existing_asset_id: providerMatches[0].id,
          reason: 'provider + provider_resource_id already exists in registry',
          asset: providerMatches[0],
        });
      }
    }

    // Check 3: Content hash match (flag as duplicate but allow both records)
    let hashDuplicate = null;
    if (asset.content_hash) {
      const hashMatches = await base44.asServiceRole.entities.AssetRegistry.filter(
        { content_hash: asset.content_hash }
      );
      if (hashMatches && hashMatches.length > 0) {
        hashDuplicate = hashMatches[0];
      }
    }

    // ── Create Registry Record ──

    const registryRecord = await base44.asServiceRole.entities.AssetRegistry.create({
      asset_id: asset.asset_id || generateAssetId(),
      title: asset.title,
      description: asset.description || '',
      resource_type: asset.resource_type,
      format: asset.format || '',
      category: asset.category || '',
      subcategory: asset.subcategory || '',
      keywords: asset.keywords || JSON.stringify([]),
      tags: asset.tags || JSON.stringify([]),
      provider: asset.provider || 'unknown',
      provider_resource_id: asset.provider_resource_id || '',
      source_url: asset.source_url || '',
      connector_id: asset.connector_id || '',
      license: asset.license || 'unknown',
      license_url: asset.license_url || '',
      commercial_use: asset.commercial_use ?? false,
      modification_allowed: asset.modification_allowed ?? false,
      redistribution_allowed: asset.redistribution_allowed ?? false,
      attribution_required: asset.attribution_required ?? false,
      attribution_text: asset.attribution_text || '',
      cc_variant: asset.cc_variant || 'n/a',
      download_status: asset.download_status || 'not_downloaded',
      cached: asset.cached ?? false,
      cached_file_url: asset.cached_file_url || '',
      cached_at: asset.cached_at || null,
      content_hash: asset.content_hash || '',
      verified: asset.verified ?? false,
      last_verified: asset.last_verified || null,
      confidence: asset.confidence || 0,
      qa_status: asset.qa_status || 'not_reviewed',
      preview_url: asset.preview_url || '',
      thumbnail_url: asset.thumbnail_url || '',
      preview_generated: asset.preview_generated ?? false,
      health_status: asset.health_status || 'unknown',
      last_checked: asset.last_checked || null,
      is_active: asset.is_active ?? true,
      is_deprecated: false,
      usage_count: 0,
      last_used_at: null,
      version_number: 1,
      production_profiles: asset.production_profiles || JSON.stringify([]),
      acquisition_method: asset.acquisition_method || 'connector_discovery',
      cost: asset.cost || 0,
      metadata: asset.metadata || JSON.stringify({}),
    });

    return Response.json({
      status: 'registered',
      asset_id: registryRecord.id,
      registry_record: registryRecord,
      content_hash_duplicate: hashDuplicate ? hashDuplicate.id : null,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});