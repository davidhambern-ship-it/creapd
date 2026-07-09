import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════
// KAAE-CON-001: Knowledge & Asset Connector System
// ConnectorManager — single integration layer for all external providers
// ═══════════════════════════════════════════════════════════

// ── Provider Priority Tiers ──
const PRIORITY_LOCAL_REGISTRY = 0;
const PRIORITY_PUBLIC_DOMAIN = 10;
const PRIORITY_OPEN_LICENSE = 20;
const PRIORITY_FREE_API = 30;
const PRIORITY_PREMIUM = 40;
const PRIORITY_AI_GENERATION = 50;

// ── Restricted license types that block import ──
const BLOCKED_LICENSES = ['restricted', 'rejected', 'unknown'];

// ═══════════════════════════════════════════════════════════
// Connector Interface — every provider must implement these methods.
// Built-in providers are registered in PROVIDER_REGISTRY below.
// To add a new provider: implement these methods and register.
// ═══════════════════════════════════════════════════════════

// ── Wikimedia Commons — public domain / open license images ──
const wikimediaConnector = {
  provider_name: 'wikimedia_commons',
  category: 'images',
  base_url: 'https://commons.wikimedia.org/w/api.php',
  authentication_type: 'none',
  priority: PRIORITY_PUBLIC_DOMAIN,
  supports_search: true,
  supports_download: true,
  supports_preview: true,
  supports_metadata: true,

  async search(query, limit = 10) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: String(limit),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime|size',
      iiurlwidth: '400',
    });
    const res = await fetch(`${this.base_url}?${params}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Wikimedia HTTP ${res.status}`);
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return [];
    return Object.values(pages).map(p => this.normalize(p)).filter(Boolean);
  },

  async lookup(providerAssetId) {
    const params = new URLSearchParams({
      action: 'query', format: 'json', prop: 'imageinfo',
      titles: `File:${providerAssetId}`, iiprop: 'url|extmetadata|mime|size', iiurlwidth: '400',
    });
    const res = await fetch(`${this.base_url}?${params}`, { headers: { 'User-Agent': 'CREAPD-KAAE/1.0' } });
    if (!res.ok) throw new Error(`Wikimedia lookup HTTP ${res.status}`);
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return this.normalize(page);
  },

  async healthCheck() {
    const start = Date.now();
    const res = await fetch(`${this.base_url}?action=query&format=json&meta=siteinfo`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    return { online: res.ok, latency: Date.now() - start, status: res.status };
  },

  normalize(page) {
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata || {};
    return {
      provider_asset_id: page.title?.replace('File:', '') || String(page.pageid),
      title: meta.ObjectName?.value || page.title?.replace('File:', '') || 'Untitled',
      description: meta.ImageDescription?.value || '',
      creator: meta.Artist?.value?.replace(/<[^>]*>/g, '') || 'Unknown',
      asset_type: 'image',
      metadata: JSON.stringify({
        width: info.width, height: info.height, mime: info.mime,
        license_url: meta.LicenseUrl?.value,
        license_short: meta.LicenseShortName?.value,
      }),
      source_url: info.descriptionurl || info.url,
      preview_url: info.thumburl,
      download_url: info.url,
      thumbnail_url: info.thumburl,
      file_type: (info.mime || '').split('/')[1] || 'unknown',
      license_data: this.validateLicense(meta),
      confidence_score: 75,
    };
  },

  validateLicense(meta) {
    const licenseName = (meta.LicenseShortName?.value || '').toLowerCase();
    const licenseUrl = meta.LicenseUrl?.value || '';
    let license_type = 'open_license';
    if (licenseName.includes('public domain') || licenseName.includes('cc0')) license_type = 'public_domain';
    else if (licenseName.includes('cc-by') || licenseName.includes('creative commons')) license_type = 'creative_commons';
    else if (licenseName.includes('cc')) license_type = 'creative_commons';
    return JSON.stringify({
      license_type,
      commercial_use_allowed: !licenseName.includes('nc'),
      attribution_required: !licenseName.includes('cc0') && !licenseName.includes('public domain'),
      modification_allowed: !licenseName.includes('nd'),
      redistribution_allowed: true,
      playback_allowed: true,
      download_allowed: true,
      cache_allowed: true,
      license_url: licenseUrl,
    });
  },

  getPreview(asset) { return asset.preview_url || asset.thumbnail_url; },
  getPlayback(asset) { return null; },
  getDownload(asset) { return asset.download_url; },
};

// ── Openverse — open license media aggregator ──
const openverseConnector = {
  provider_name: 'openverse',
  category: 'images',
  base_url: 'https://api.openverse.org/v1',
  authentication_type: 'none',
  priority: PRIORITY_OPEN_LICENSE,
  supports_search: true,
  supports_download: true,
  supports_preview: true,
  supports_metadata: true,

  async search(query, limit = 10) {
    const res = await fetch(`${this.base_url}/images/?q=${encodeURIComponent(query)}&page_size=${limit}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`);
    const data = await res.json();
    return (data?.results || []).map(r => this.normalize(r)).filter(Boolean);
  },

  async lookup(providerAssetId) {
    const res = await fetch(`${this.base_url}/images/${encodeURIComponent(providerAssetId)}/`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Openverse lookup HTTP ${res.status}`);
    return this.normalize(await res.json());
  },

  async healthCheck() {
    const start = Date.now();
    const res = await fetch(`${this.base_url}/images/?page_size=1`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    return { online: res.ok, latency: Date.now() - start, status: res.status };
  },

  normalize(item) {
    if (!item) return null;
    return {
      provider_asset_id: item.id || item.identifier || '',
      title: item.title || 'Untitled',
      description: '',
      creator: item.creator || 'Unknown',
      asset_type: 'image',
      metadata: JSON.stringify({ width: item.width, height: item.height, source: item.source }),
      source_url: item.foreign_landing_url || item.url,
      preview_url: item.thumbnail || item.url,
      download_url: item.url,
      thumbnail_url: item.thumbnail,
      file_type: (item.mime_type || '').split('/')[1] || 'jpg',
      license_data: this.validateLicense(item),
      confidence_score: 70,
    };
  },

  validateLicense(item) {
    const lic = (item.license || '').toLowerCase();
    const licVer = item.license_version;
    let license_type = 'creative_commons';
    if (lic === 'cc0' || lic === 'pdm' || lic === 'public-domain') license_type = 'public_domain';
    else if (lic.includes('cc-by')) license_type = 'creative_commons';
    return JSON.stringify({
      license_type,
      commercial_use_allowed: !lic.includes('nc'),
      attribution_required: true,
      modification_allowed: !lic.includes('nd'),
      redistribution_allowed: true,
      playback_allowed: true,
      download_allowed: true,
      cache_allowed: true,
      license_url: `https://creativecommons.org/licenses/${lic}/${licVer || '4.0'}/`,
    });
  },

  getPreview(asset) { return asset.preview_url; },
  getPlayback(asset) { return null; },
  getDownload(asset) { return asset.download_url; },
};

// ── MusicBrainz — open music metadata ──
const musicbrainzConnector = {
  provider_name: 'musicbrainz',
  category: 'music_metadata',
  base_url: 'https://musicbrainz.org/ws/2',
  authentication_type: 'none',
  priority: PRIORITY_FREE_API,
  supports_search: true,
  supports_metadata: true,
  supports_preview: false,
  supports_download: false,

  async search(query, limit = 10) {
    const res = await fetch(`${this.base_url}/recording/?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`);
    const data = await res.json();
    return (data?.recordings || []).map(r => this.normalize(r)).filter(Boolean);
  },

  async lookup(providerAssetId) {
    const res = await fetch(`${this.base_url}/recording/${providerAssetId}?fmt=json`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`MusicBrainz lookup HTTP ${res.status}`);
    return this.normalize(await res.json());
  },

  async healthCheck() {
    const start = Date.now();
    const res = await fetch(`${this.base_url}/recording/?query=test&limit=1&fmt=json`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    return { online: res.ok, latency: Date.now() - start, status: res.status };
  },

  normalize(rec) {
    if (!rec) return null;
    const artist = rec['artist-credit']?.[0]?.name || 'Unknown';
    return {
      provider_asset_id: rec.id || '',
      title: rec.title || 'Untitled',
      description: `${rec.disambiguation || ''}`.trim(),
      creator: artist,
      asset_type: 'music_metadata',
      metadata: JSON.stringify({
        mbid: rec.id, length: rec.length, releases: rec.releases?.length || 0,
      }),
      source_url: `https://musicbrainz.org/recording/${rec.id}`,
      preview_url: null,
      download_url: null,
      thumbnail_url: null,
      duration: rec.length ? Math.round(rec.length / 1000) : null,
      file_type: 'metadata',
      license_data: this.validateLicense(),
      confidence_score: 65,
    };
  },

  validateLicense() {
    return JSON.stringify({
      license_type: 'open_license',
      commercial_use_allowed: true,
      attribution_required: true,
      modification_allowed: true,
      redistribution_allowed: true,
      playback_allowed: false,
      download_allowed: false,
      cache_allowed: true,
      license_url: 'https://musicbrainz.org/doc/MusicBrainz_License',
    });
  },

  getPreview(asset) { return null; },
  getPlayback(asset) { return null; },
  getDownload(asset) { return null; },
};

// ── Local Registry — searches existing AssetRegistry first ──
const localRegistryConnector = {
  provider_name: 'local_registry',
  category: 'research',
  priority: PRIORITY_LOCAL_REGISTRY,
  supports_search: true,
  supports_download: true,
  supports_preview: true,
  supports_metadata: true,

  async search(query, limit, context) {
    const { base44 } = context;
    const items = await base44.asServiceRole.entities.AssetRegistry.filter({
      is_active: true,
      is_deprecated: false,
    }, '-created_date', limit);
    const q = (query || '').toLowerCase();
    return items
      .filter(item => {
        if (!q) return true;
        return (item.title || '').toLowerCase().includes(q)
          || (item.description || '').toLowerCase().includes(q)
          || (item.keywords || '').toLowerCase().includes(q);
      })
      .map(item => this.normalize(item))
      .filter(Boolean);
  },

  async lookup(providerAssetId, context) {
    const { base44 } = context;
    const item = await base44.asServiceRole.entities.AssetRegistry.get(providerAssetId);
    return this.normalize(item);
  },

  async healthCheck() {
    return { online: true, latency: 0, status: 200 };
  },

  normalize(item) {
    if (!item) return null;
    return {
      provider_asset_id: item.id,
      title: item.title || 'Untitled',
      description: item.description || '',
      creator: item.provider || 'Local Registry',
      asset_type: item.resource_type || 'unknown',
      metadata: item.metadata || JSON.stringify({ category: item.category, subcategory: item.subcategory }),
      source_url: item.source_url || '',
      preview_url: item.preview_url || item.thumbnail_url || '',
      download_url: item.cached_file_url || item.source_url || '',
      thumbnail_url: item.thumbnail_url || '',
      file_type: item.format || 'unknown',
      license_data: JSON.stringify({
        license_type: item.license || 'unknown',
        commercial_use_allowed: item.commercial_use || false,
        attribution_required: item.attribution_required || false,
        modification_allowed: item.modification_allowed || false,
        redistribution_allowed: item.redistribution_allowed || false,
        playback_allowed: item.commercial_use || false,
        download_allowed: true,
        cache_allowed: true,
      }),
      confidence_score: 90,
    };
  },

  validateLicense(item) {
    return JSON.stringify({
      license_type: item.license || 'unknown',
      commercial_use_allowed: item.commercial_use || false,
      attribution_required: item.attribution_required || false,
      modification_allowed: item.modification_allowed || false,
      redistribution_allowed: item.redistribution_allowed || false,
      playback_allowed: item.commercial_use || false,
      download_allowed: true,
      cache_allowed: true,
    });
  },

  getPreview(asset) { return asset.preview_url; },
  getPlayback(asset) { return asset.download_url; },
  getDownload(asset) { return asset.download_url; },
};

// ── AI Generation connector (fallback tier) ──
const aiGenerationConnector = {
  provider_name: 'ai_generation',
  category: 'images',
  priority: PRIORITY_AI_GENERATION,
  supports_search: false,
  supports_download: true,
  supports_preview: true,
  supports_metadata: true,

  async search(query, limit, context) {
    const { base44 } = context;
    const results = [];
    for (let i = 0; i < Math.min(limit, 3); i++) {
      try {
        const res = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `${query} — high quality, professional, ${i === 1 ? 'alternate composition' : i === 2 ? 'different angle' : ''}`,
        });
        if (res?.url) {
          results.push({
            provider_asset_id: `ai_${Date.now()}_${i}`,
            title: `AI Generated: ${query}`,
            description: 'AI-generated image fallback — no external provider matched.',
            creator: 'CREAPD AI Generation',
            asset_type: 'image',
            metadata: JSON.stringify({ source: 'ai_generation', prompt: query }),
            source_url: res.url,
            preview_url: res.url,
            download_url: res.url,
            thumbnail_url: res.url,
            file_type: 'png',
            license_data: this.validateLicense(),
            confidence_score: 50,
          });
        }
      } catch (err) {
        // Non-fatal
      }
    }
    return results;
  },

  async lookup() { return null; },

  async healthCheck() {
    return { online: true, latency: 0, status: 200 };
  },

  validateLicense() {
    return JSON.stringify({
      license_type: 'commercial_license',
      commercial_use_allowed: true,
      attribution_required: false,
      modification_allowed: true,
      redistribution_allowed: true,
      playback_allowed: true,
      download_allowed: true,
      cache_allowed: true,
    });
  },

  getPreview(asset) { return asset.preview_url; },
  getPlayback(asset) { return null; },
  getDownload(asset) { return asset.download_url; },
};

// ═══════════════════════════════════════════════════════════
// PROVIDER_REGISTRY — maps provider_name to implementation.
// To add a new provider: implement the interface + register here.
// ═══════════════════════════════════════════════════════════
const PROVIDER_REGISTRY = {
  local_registry: localRegistryConnector,
  wikimedia_commons: wikimediaConnector,
  openverse: openverseConnector,
  musicbrainz: musicbrainzConnector,
  ai_generation: aiGenerationConnector,
};

// ═══════════════════════════════════════════════════════════
// Duplicate Detection
// ═══════════════════════════════════════════════════════════
function deduplicateResults(results) {
  const seen = new Map();
  const merged = [];
  for (const r of results) {
    const keys = [
      r.provider_asset_id,
      r.source_url,
      r.title && r.creator ? `${r.title}|${r.creator}`.toLowerCase() : null,
    ].filter(Boolean);
    let found = false;
    for (const key of keys) {
      if (seen.has(key)) {
        found = true;
        break;
      }
    }
    if (found) continue;
    for (const key of keys) seen.set(key, true);
    merged.push(r);
  }
  return merged;
}

// ═══════════════════════════════════════════════════════════
// License Filtering
// ═══════════════════════════════════════════════════════════
function parseLicenseData(licenseDataStr) {
  try {
    return JSON.parse(licenseDataStr || '{}');
  } catch {
    return {};
  }
}

function isLicenseBlocked(licenseData) {
  const ld = typeof licenseData === 'string' ? parseLicenseData(licenseData) : licenseData;
  if (BLOCKED_LICENSES.includes(ld.license_type)) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════
// Health Check Execution
// ═══════════════════════════════════════════════════════════
async function checkProviderHealth(connector, context) {
  const { base44 } = context;
  const impl = PROVIDER_REGISTRY[connector.provider_name];
  if (!impl) return { online: false, latency: 0, status: 0 };

  try {
    const result = await Promise.race([
      impl.healthCheck(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), connector.timeout_seconds * 1000 || 15000)),
    ]);

    const isOnline = result.online;
    const now = new Date().toISOString();

    // Update Connector health_status
    await base44.asServiceRole.entities.Connector.update(connector.id, {
      health_status: isOnline ? 'healthy' : 'down',
      last_health_check: now,
      ...(isOnline ? { last_success: now } : { last_failure: now }),
    });

    // Upsert ProviderHealth record
    const existing = await base44.asServiceRole.entities.ProviderHealth.filter({ connector_id: connector.id }, '-created_date', 1);
    const healthData = {
      connector_id: connector.id,
      current_status: isOnline ? 'online' : 'offline',
      last_ping: now,
      latency: result.latency || 0,
      uptime_percentage: isOnline
        ? Math.min(100, (existing[0]?.uptime_percentage || 0) * 0.95 + 100 * 0.05)
        : (existing[0]?.uptime_percentage || 0) * 0.95,
      authentication_status: connector.authentication_type === 'none' ? 'not_required' : (isOnline ? 'authenticated' : 'unknown'),
      error_count: isOnline ? 0 : (existing[0]?.error_count || 0) + 1,
    };

    if (existing[0]?.id) {
      await base44.asServiceRole.entities.ProviderHealth.update(existing[0].id, healthData);
    } else {
      await base44.asServiceRole.entities.ProviderHealth.create(healthData);
    }

    return { online: isOnline, latency: result.latency };
  } catch (err) {
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Connector.update(connector.id, {
      health_status: 'down',
      last_health_check: now,
      last_failure: now,
    });
    return { online: false, latency: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════
// Connector Manager — Core Request Handler
// ═══════════════════════════════════════════════════════════

async function handleSearchRequest(payload, context) {
  const { base44 } = context;
  const startTime = Date.now();
  const {
    query,
    keywords,
    production_profile,
    department,
    worker,
    asset_type,
    limit = 10,
    connector_ids = null,
    allow_ai_generation = false,
  } = payload;

  // 1. Create ConnectorRequest record
  const requestRecord = await base44.asServiceRole.entities.ConnectorRequest.create({
    request_type: 'search',
    production_profile,
    department,
    worker,
    asset_type,
    query,
    keywords: JSON.stringify(keywords || []),
    connector_ids: connector_ids ? JSON.stringify(connector_ids) : null,
    status: 'in_progress',
    requested_at: new Date().toISOString(),
  });

  // 2. Determine eligible connectors
  let connectors = await base44.asServiceRole.entities.Connector.filter({ enabled: true }, 'priority', 50);

  // Filter by specific connector_ids if provided
  if (connector_ids && connector_ids.length > 0) {
    connectors = connectors.filter(c => connector_ids.includes(c.id));
  }

  // Sort by priority (ascending = highest priority first)
  connectors.sort((a, b) => (a.priority || 50) - (b.priority || 50));

  // Filter out AI generation unless explicitly allowed
  if (!allow_ai_generation) {
    connectors = connectors.filter(c => c.provider_name !== 'ai_generation');
  }

  const allResults = [];
  const providerLogs = [];
  let partialSuccess = false;

  // 3. Execute provider calls in priority order with fallback
  for (const connector of connectors) {
    const impl = PROVIDER_REGISTRY[connector.provider_name];
    if (!impl) {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'no_implementation', error: 'No provider implementation registered' });
      continue;
    }

    // Check health — skip unhealthy connectors
    const health = await base44.asServiceRole.entities.ProviderHealth.filter({ connector_id: connector.id }, '-created_date', 1);
    const isHealthy = !health[0] || health[0].current_status !== 'offline';

    if (!isHealthy && health[0]?.current_status === 'offline') {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'skipped_unhealthy' });
      continue;
    }

    // Execute with retries
    let providerResults = null;
    let lastError = null;
    const maxRetries = connector.retry_count || 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        providerResults = await Promise.race([
          impl.search(query, limit, context),
          new Promise((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), (connector.timeout_seconds || 30) * 1000)),
        ]);
        break; // Success
      } catch (err) {
        lastError = err.message;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Backoff
        }
      }
    }

    if (providerResults === null) {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'failed', error: lastError, attempts: maxRetries + 1 });
      // Mark connector as degraded
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Connector.update(connector.id, {
        health_status: 'degraded',
        last_failure: now,
      });
      continue;
    }

    if (providerResults.length > 0) {
      partialSuccess = true;
    }

    // Tag results with connector_id
    for (const result of providerResults) {
      result.connector_id = connector.id;
      result.connector_request_id = requestRecord.id;
    }

    allResults.push(...providerResults);

    providerLogs.push({
      connector_id: connector.id,
      provider: connector.provider_name,
      status: 'success',
      asset_count: providerResults.length,
      response_time: Date.now() - startTime,
    });

    // Update last_success
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Connector.update(connector.id, { last_success: now });
  }

  // 4. Deduplicate
  const deduped = deduplicateResults(allResults);

  // 5. Filter blocked licenses
  const filtered = deduped.filter(r => !isLicenseBlocked(r.license_data));

  // 6. Save ConnectorResult records
  const savedResults = [];
  for (const result of filtered.slice(0, limit * 2)) {
    try {
      const saved = await base44.asServiceRole.entities.ConnectorResult.create({
        connector_request_id: requestRecord.id,
        connector_id: result.connector_id,
        provider_asset_id: result.provider_asset_id || '',
        title: result.title || 'Untitled',
        description: result.description || '',
        creator: result.creator || '',
        asset_type: result.asset_type || 'unknown',
        metadata: result.metadata || '{}',
        source_url: result.source_url || '',
        preview_url: result.preview_url || '',
        playback_url: result.playback_url || '',
        download_url: result.download_url || '',
        thumbnail_url: result.thumbnail_url || '',
        duration: result.duration || null,
        file_type: result.file_type || 'unknown',
        license_data: result.license_data || '{}',
        confidence_score: result.confidence_score || 0,
        imported_to_registry: false,
      });
      savedResults.push(saved);
    } catch (err) {
      // Non-fatal: continue saving others
    }
  }

  // 7. Update request status
  const processingTime = Date.now() - startTime;
  await base44.asServiceRole.entities.ConnectorRequest.update(requestRecord.id, {
    status: savedResults.length > 0 ? 'completed' : (partialSuccess ? 'partial' : 'failed'),
    completed_at: new Date().toISOString(),
    processing_time: processingTime,
    error_message: savedResults.length === 0 ? 'No results from any provider' : null,
  });

  return {
    request_id: requestRecord.id,
    status: savedResults.length > 0 ? 'completed' : (partialSuccess ? 'partial' : 'failed'),
    total_results: savedResults.length,
    providers_tried: connectors.length,
    providers_succeeded: providerLogs.filter(p => p.status === 'success').length,
    providers_failed: providerLogs.filter(p => p.status === 'failed').length,
    processing_time_ms: processingTime,
    provider_logs: providerLogs,
    results: savedResults,
  };
}

async function handleLookupRequest(payload, context) {
  const { base44 } = context;
  const { connector_id, provider_asset_id, production_profile, department, worker } = payload;

  const requestRecord = await base44.asServiceRole.entities.ConnectorRequest.create({
    request_type: 'lookup',
    production_profile,
    department,
    worker,
    connector_ids: JSON.stringify([connector_id]),
    status: 'in_progress',
    requested_at: new Date().toISOString(),
  });

  const connector = await base44.asServiceRole.entities.Connector.get(connector_id);
  const impl = PROVIDER_REGISTRY[connector.provider_name];
  if (!impl) {
    await base44.asServiceRole.entities.ConnectorRequest.update(requestRecord.id, {
      status: 'failed', error_message: 'No implementation for provider', completed_at: new Date().toISOString(),
    });
    return { error: 'No implementation for provider', request_id: requestRecord.id };
  }

  const result = await impl.lookup(provider_asset_id, context);
  if (!result) {
    await base44.asServiceRole.entities.ConnectorRequest.update(requestRecord.id, {
      status: 'failed', error_message: 'Asset not found', completed_at: new Date().toISOString(),
    });
    return { error: 'Asset not found', request_id: requestRecord.id };
  }

  result.connector_id = connector_id;
  result.connector_request_id = requestRecord.id;

  const saved = await base44.asServiceRole.entities.ConnectorResult.create({
    connector_request_id: requestRecord.id,
    connector_id,
    provider_asset_id: result.provider_asset_id || '',
    title: result.title || 'Untitled',
    description: result.description || '',
    creator: result.creator || '',
    asset_type: result.asset_type || 'unknown',
    metadata: result.metadata || '{}',
    source_url: result.source_url || '',
    preview_url: result.preview_url || '',
    playback_url: result.playback_url || '',
    download_url: result.download_url || '',
    thumbnail_url: result.thumbnail_url || '',
    duration: result.duration || null,
    file_type: result.file_type || 'unknown',
    license_data: result.license_data || '{}',
    confidence_score: result.confidence_score || 0,
    imported_to_registry: false,
  });

  await base44.asServiceRole.entities.ConnectorRequest.update(requestRecord.id, {
    status: 'completed', completed_at: new Date().toISOString(),
  });

  return { request_id: requestRecord.id, result: saved };
}

async function handleHealthCheckAll(context) {
  const { base44 } = context;
  const connectors = await base44.asServiceRole.entities.Connector.filter({ enabled: true }, 'priority', 100);
  const results = [];
  for (const connector of connectors) {
    const result = await checkProviderHealth(connector, context);
    results.push({ connector_id: connector.id, provider: connector.provider_name, ...result });
  }
  return { checked: connectors.length, results };
}

// ═══════════════════════════════════════════════════════════
// Import to Asset Registry
// ═══════════════════════════════════════════════════════════
async function handleImportToRegistry(payload, context) {
  const { base44 } = context;
  const { connector_result_id } = payload;

  const result = await base44.asServiceRole.entities.ConnectorResult.get(connector_result_id);
  if (!result) return { error: 'ConnectorResult not found' };
  if (result.imported_to_registry) return { error: 'Already imported' };

  const license = parseLicenseData(result.license_data);
  if (isLicenseBlocked(license)) {
    return { error: `Cannot import: license is ${license.license_type}` };
  }

  // Create AssetRegistry record
  const asset = await base44.asServiceRole.entities.AssetRegistry.create({
    title: result.title,
    description: result.description,
    resource_type: result.asset_type === 'image' ? 'image' : result.asset_type === 'audio' ? 'audio' : result.asset_type === 'music' ? 'music' : result.asset_type === 'video' ? 'video' : 'knowledge',
    format: result.file_type,
    provider: PROVIDER_REGISTRY[result.connector_id] ? result.connector_id : 'connector_system',
    source_url: result.source_url,
    cached_file_url: result.download_url || result.preview_url,
    license: license.license_type,
    commercial_use: license.commercial_use_allowed,
    modification_allowed: license.modification_allowed,
    redistribution_allowed: license.redistribution_allowed,
    attribution_required: license.attribution_required,
    preview_url: result.preview_url,
    thumbnail_url: result.thumbnail_url,
    is_active: true,
    verified: true,
    qa_status: 'approved',
    confidence: result.confidence_score,
    acquisition_method: 'connector_discovery',
    provider_resource_id: result.provider_asset_id,
  });

  // Mark as imported
  await base44.asServiceRole.entities.ConnectorResult.update(connector_result_id, {
    imported_to_registry: true,
    qa_status: 'approved',
  });

  return { success: true, asset_registry_id: asset.id };
}

// ═══════════════════════════════════════════════════════════
// Seed default connectors
// ═══════════════════════════════════════════════════════════
async function handleSeedDefaults(context) {
  const { base44 } = context;
  const defaults = [
    {
      name: 'Local Asset Registry',
      category: 'research',
      provider_name: 'local_registry',
      description: 'Searches existing approved assets in the AssetRegistry first',
      base_url: '',
      authentication_type: 'none',
      enabled: true,
      priority: PRIORITY_LOCAL_REGISTRY,
      supports_search: true,
      supports_download: true,
      supports_preview: true,
      supports_metadata: true,
      rate_limit_per_minute: 1000,
      rate_limit_per_day: 100000,
      timeout_seconds: 10,
      retry_count: 0,
    },
    {
      name: 'Wikimedia Commons',
      category: 'images',
      provider_name: 'wikimedia_commons',
      description: 'Public domain and Creative Commons images, media',
      base_url: 'https://commons.wikimedia.org/w/api.php',
      authentication_type: 'none',
      enabled: true,
      priority: PRIORITY_PUBLIC_DOMAIN,
      supports_search: true,
      supports_download: true,
      supports_preview: true,
      supports_metadata: true,
      rate_limit_per_minute: 200,
      rate_limit_per_day: 5000,
      timeout_seconds: 30,
      retry_count: 2,
    },
    {
      name: 'Openverse',
      category: 'images',
      provider_name: 'openverse',
      description: 'Open license media aggregator (images, audio)',
      base_url: 'https://api.openverse.org/v1',
      authentication_type: 'none',
      enabled: true,
      priority: PRIORITY_OPEN_LICENSE,
      supports_search: true,
      supports_download: true,
      supports_preview: true,
      supports_metadata: true,
      rate_limit_per_minute: 100,
      rate_limit_per_day: 1000,
      timeout_seconds: 20,
      retry_count: 2,
    },
    {
      name: 'MusicBrainz',
      category: 'music_metadata',
      provider_name: 'musicbrainz',
      description: 'Open music metadata database — recordings, artists, releases',
      base_url: 'https://musicbrainz.org/ws/2',
      authentication_type: 'none',
      enabled: true,
      priority: PRIORITY_FREE_API,
      supports_search: true,
      supports_metadata: true,
      supports_preview: false,
      supports_download: false,
      rate_limit_per_minute: 50,
      rate_limit_per_day: 1000,
      timeout_seconds: 20,
      retry_count: 1,
    },
    {
      name: 'AI Generation (Fallback)',
      category: 'images',
      provider_name: 'ai_generation',
      description: 'AI-generated assets — fallback only when no provider matches',
      base_url: '',
      authentication_type: 'none',
      enabled: true,
      priority: PRIORITY_AI_GENERATION,
      supports_search: false,
      supports_download: true,
      supports_preview: true,
      supports_metadata: true,
      rate_limit_per_minute: 10,
      rate_limit_per_day: 100,
      timeout_seconds: 60,
      retry_count: 0,
    },
  ];

  const created = [];
  for (const def of defaults) {
    const existing = await base44.asServiceRole.entities.Connector.filter({ provider_name: def.provider_name }, '-created_date', 1);
    if (existing.length === 0) {
      const rec = await base44.asServiceRole.entities.Connector.create(def);
      created.push(rec);
    }
  }
  return { seeded: created.length, connectors: created };
}

// ═══════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action;
    const context = { base44, user };

    switch (action) {
      case 'search':
        return Response.json(await handleSearchRequest(body.payload || {}, context));

      case 'lookup':
        return Response.json(await handleLookupRequest(body.payload || {}, context));

      case 'health_check_all':
        return Response.json(await handleHealthCheckAll(context));

      case 'import_to_registry':
        return Response.json(await handleImportToRegistry(body.payload || {}, context));

      case 'seed_defaults':
        if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });
        return Response.json(await handleSeedDefaults(context));

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});