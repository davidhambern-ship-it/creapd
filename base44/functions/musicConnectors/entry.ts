import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ═══════════════════════════════════════════════════════════
// KAAE Music Connector Provider Framework
// Separates music metadata from music playback.
// AI Workers request through this layer — never contact providers directly.
// API keys are read dynamically from each Connector's api_key_name field.
// ═══════════════════════════════════════════════════════════

const CATEGORY_MUSIC_METADATA = 'music_metadata';
const CATEGORY_PLAYABLE_AUDIO = 'playable_audio';
const CATEGORY_SOUND_EFFECTS = 'sound_effects';

const PRIORITY_LOCAL = 0;
const PRIORITY_PUBLIC_DOMAIN = 10;
const PRIORITY_OPEN_LICENSE = 20;
const PRIORITY_FREE_API = 30;
const PRIORITY_PREMIUM = 40;
const PRIORITY_AI = 50;

// ═══════════════════════════════════════════════════════════
// Jamendo — playable audio (royalty-free / CC licensed)
// ═══════════════════════════════════════════════════════════
const jamendoConnector = {
  provider_name: 'jamendo',
  base_url: 'https://api.jamendo.com/v3.0',

  async search(query, limit, apiKey) {
    if (!apiKey) return [];
    const params = new URLSearchParams({
      client_id: apiKey, format: 'json', limit: String(limit),
      search: query, include: 'musicinfo+licenses', audioformat: 'mp32',
    });
    const res = await fetch(`${this.base_url}/tracks/?${params}`);
    if (!res.ok) throw new Error(`Jamendo HTTP ${res.status}`);
    const data = await res.json();
    return (data?.results || []).map(t => this.normalize(t));
  },

  normalize(track) {
    if (!track) return null;
    const license = this.evaluateLicense(track);
    return {
      provider_asset_id: String(track.id),
      title: track.name || 'Untitled',
      artist: track.artist_name || 'Unknown',
      album: track.album_name || '',
      genre: track.musicinfo?.tags?.genres?.[0] || '',
      subgenre: track.musicinfo?.tags?.genres?.[1] || '',
      release_date: track.releasedate || '',
      duration_seconds: track.duration || 0,
      bpm: track.bpm ? Number(track.bpm) : null,
      language: track.musicinfo?.vocalinstrumental === 'instrumental' ? 'instrumental' : '',
      explicit_content: track.musicinfo?.explicit ? true : false,
      provider: 'jamendo',
      source_url: track.shareurl || '',
      artwork_url: track.album_image || '',
      thumbnail_url: track.album_image || '',
      description: track.musicinfo?.tags?.genres?.join(', ') || '',
      playback_allowed: license.playback_allowed,
      preview_available: !!track.audio,
      streaming_available: license.playback_allowed,
      download_available: license.download_allowed,
      offline_cache_allowed: license.cache_allowed,
      commercial_use_allowed: license.commercial_use_allowed,
      modification_allowed: license.modification_allowed,
      redistribution_allowed: license.redistribution_allowed,
      attribution_required: license.attribution_required,
      license_type: license.license_type,
      license_url: license.license_url,
      playback_url: track.audio || '',
      preview_url: track.audiodownload || track.audio || '',
      waveform_data: track.waveform || null,
      asset_category: CATEGORY_PLAYABLE_AUDIO,
      confidence_score: 80,
    };
  },

  evaluateLicense(track) {
    const licenseUrl = track.license_ccurl || '';
    const lt = (licenseUrl || '').toLowerCase();
    let license_type = 'creative_commons';
    if (lt.includes('public')) license_type = 'public_domain';
    else if (lt.includes('royalty')) license_type = 'royalty_free';
    const isNC = lt.includes('nc');
    const isND = lt.includes('nd');
    return {
      license_type, commercial_use_allowed: !isNC, modification_allowed: !isND,
      redistribution_allowed: true, attribution_required: true,
      playback_allowed: true, download_allowed: !isNC, cache_allowed: true, license_url: licenseUrl,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// Internet Archive — playable audio (public domain, no auth)
// ═══════════════════════════════════════════════════════════
const internetArchiveConnector = {
  provider_name: 'internet_archive',
  base_url: 'https://archive.org',

  async search(query, limit, apiKey) {
    const params = new URLSearchParams({
      q: `${query} AND mediatype:audio AND (format:MP3 OR format:VBR MP3)`,
      rows: String(limit), output: 'json',
      'fl[]': 'identifier,title,creator,date,description,licenseurl',
    });
    const res = await fetch(`${this.base_url}/advancedsearch.php?${params}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Internet Archive HTTP ${res.status}`);
    const data = await res.json();
    const docs = data?.response?.docs || [];
    const results = [];
    for (const doc of docs) {
      const item = await this.getMetadata(doc.identifier);
      if (item) results.push(item);
    }
    return results;
  },

  async getMetadata(identifier) {
    const res = await fetch(`${this.base_url}/metadata/${identifier}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const server = data?.server || 'ia600001.us.archive.org';
    const dir = data?.dir || '';
    const files = (data?.files || []).filter(f => f.format === 'VBR MP3' || f.format === 'MP3');
    if (files.length === 0) return null;
    const audioFile = files[0];
    const playbackUrl = `https://${server}${dir}/${audioFile.name}`;
    return {
      provider_asset_id: identifier,
      title: data?.metadata?.title || identifier,
      artist: data?.metadata?.creator || 'Unknown',
      album: '', genre: '', subgenre: '',
      release_date: data?.metadata?.date || '',
      duration_seconds: audioFile.length ? Math.round(parseFloat(audioFile.length)) : 0,
      bpm: null, language: '', explicit_content: false,
      provider: 'internet_archive',
      source_url: `https://archive.org/details/${identifier}`,
      artwork_url: '', thumbnail_url: '',
      description: data?.metadata?.description || '',
      playback_allowed: true, preview_available: true, streaming_available: true,
      download_available: true, offline_cache_allowed: true,
      commercial_use_allowed: true, modification_allowed: true, redistribution_allowed: true,
      attribution_required: false, license_type: 'public_domain',
      license_url: data?.metadata?.licenseurl || '',
      playback_url: playbackUrl, preview_url: playbackUrl, waveform_data: null,
      asset_category: CATEGORY_PLAYABLE_AUDIO, confidence_score: 70,
    };
  },

  normalize(item) { return item; },
};

// ═══════════════════════════════════════════════════════════
// Freesound — sound effects
// ═══════════════════════════════════════════════════════════
const freesoundConnector = {
  provider_name: 'freesound',
  base_url: 'https://freesound.org/apiv2',

  async search(query, limit, apiKey) {
    if (!apiKey) return [];
    const params = new URLSearchParams({
      token: apiKey, query: query, page_size: String(limit),
      fields: 'id,name,tags,duration,license,previews,images',
    });
    const res = await fetch(`${this.base_url}/search/text/?${params}`);
    if (!res.ok) throw new Error(`Freesound HTTP ${res.status}`);
    const data = await res.json();
    return (data?.results || []).map(r => this.normalize(r)).filter(Boolean);
  },

  normalize(sound) {
    if (!sound) return null;
    const license = this.evaluateLicense(sound.license);
    return {
      provider_asset_id: String(sound.id),
      title: sound.name || 'Untitled',
      artist: 'Freesound Community', album: '', genre: '', subgenre: '',
      release_date: '', duration_seconds: Math.round(sound.duration || 0),
      bpm: null, language: '', explicit_content: false,
      provider: 'freesound',
      source_url: `https://freesound.org/s/${sound.id}/`,
      artwork_url: sound.images?.waveform_m || '',
      thumbnail_url: sound.images?.waveform_m || '',
      description: (sound.tags || []).join(', '),
      playback_allowed: !!sound.previews?.['preview-hq-mp3'],
      preview_available: !!sound.previews?.['preview-lq-mp3'],
      streaming_available: license.streaming, download_available: license.download,
      offline_cache_allowed: license.cache, commercial_use_allowed: license.commercial,
      modification_allowed: license.modification, redistribution_allowed: license.redistribution,
      attribution_required: license.attribution,
      license_type: license.type, license_url: sound.license || '',
      playback_url: sound.previews?.['preview-hq-mp3'] || '',
      preview_url: sound.previews?.['preview-lq-mp3'] || '',
      waveform_data: null, asset_category: CATEGORY_SOUND_EFFECTS, confidence_score: 65,
    };
  },

  evaluateLicense(licenseUrl) {
    const url = (licenseUrl || '').toLowerCase();
    if (url.includes('cc0') || url.includes('public')) {
      return { type: 'public_domain', commercial: true, modification: true, redistribution: true, attribution: false, streaming: true, download: true, cache: true };
    }
    if (url.includes('cc-by')) {
      return { type: 'creative_commons', commercial: true, modification: true, redistribution: true, attribution: true, streaming: true, download: true, cache: true };
    }
    return { type: 'unknown', commercial: false, modification: false, redistribution: false, attribution: true, streaming: !!url, download: false, cache: false };
  },
};

// ═══════════════════════════════════════════════════════════
// Discogs — music metadata only (no playback)
// ═══════════════════════════════════════════════════════════
const discogsConnector = {
  provider_name: 'discogs',
  base_url: 'https://api.discogs.com',

  async search(query, limit, apiKey) {
    if (!apiKey) return [];
    const params = new URLSearchParams({
      token: apiKey, q: query, type: 'release', per_page: String(limit),
    });
    const res = await fetch(`${this.base_url}/database/search?${params}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Discogs HTTP ${res.status}`);
    const data = await res.json();
    return (data?.results || []).map(r => this.normalize(r)).filter(Boolean);
  },

  normalize(release) {
    if (!release) return null;
    return {
      provider_asset_id: String(release.id || ''),
      title: release.title || 'Untitled',
      artist: release.artist || 'Unknown',
      album: release.title || '',
      genre: (release.genre && release.genre[0]) || '',
      subgenre: (release.style && release.style[0]) || '',
      release_date: release.year ? String(release.year) : (release.released || ''),
      duration_seconds: 0, bpm: null, language: '', explicit_content: false,
      composer: '', producer: '',
      label: (release.labels && release.labels[0]?.name) || '',
      provider: 'discogs',
      source_url: release.uri || '',
      artwork_url: release.thumb || release.cover_image || '',
      thumbnail_url: release.thumb || '',
      description: (release.genre || []).concat(release.style || []).join(', '),
      // Metadata-only — NO playback properties
      playback_allowed: false, preview_available: false, streaming_available: false,
      download_available: false, offline_cache_allowed: false,
      commercial_use_allowed: false, modification_allowed: false, redistribution_allowed: false,
      attribution_required: false, license_type: 'unknown', license_url: '',
      playback_url: '', preview_url: '', waveform_data: null,
      asset_category: CATEGORY_MUSIC_METADATA, confidence_score: 75,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// Wikidata — music metadata (no auth required)
// ═══════════════════════════════════════════════════════════
const wikidataConnector = {
  provider_name: 'wikidata',
  base_url: 'https://www.wikidata.org/w/api.php',

  async search(query, limit, apiKey) {
    const params = new URLSearchParams({
      action: 'wbsearchentities', search: query, language: 'en',
      format: 'json', type: 'item', limit: String(limit),
    });
    const res = await fetch(`${this.base_url}?${params}`, {
      headers: { 'User-Agent': 'CREAPD-KAAE/1.0' },
    });
    if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
    const data = await res.json();
    return (data?.search || []).map(r => this.normalize(r)).filter(Boolean);
  },

  normalize(item) {
    if (!item) return null;
    return {
      provider_asset_id: item.id || '',
      title: item.label || 'Untitled',
      artist: '', album: '', genre: '', subgenre: '',
      release_date: '', duration_seconds: 0, bpm: null, language: '', explicit_content: false,
      provider: 'wikidata',
      source_url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
      artwork_url: '', thumbnail_url: '',
      description: item.description || '',
      // Metadata-only — NO playback properties
      playback_allowed: false, preview_available: false, streaming_available: false,
      download_available: false, offline_cache_allowed: false,
      commercial_use_allowed: false, modification_allowed: false, redistribution_allowed: false,
      attribution_required: false, license_type: 'unknown',
      license_url: 'https://www.wikidata.org/wiki/Wikidata:Copyright',
      playback_url: '', preview_url: '', waveform_data: null,
      asset_category: CATEGORY_MUSIC_METADATA, confidence_score: 60,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// Local Music Library — searches approved MusicLibraryEntry first
// ═══════════════════════════════════════════════════════════
const localMusicLibraryConnector = {
  provider_name: 'local_music_library',

  async search(query, limit, apiKey, context) {
    const { base44 } = context;
    const items = await base44.asServiceRole.entities.MusicLibraryEntry.filter({
      is_active: true, license_review_status: 'approved',
    }, '-created_date', limit || 20);
    const q = (query || '').toLowerCase();
    return items
      .filter(item => {
        if (!q) return true;
        return (item.title || '').toLowerCase().includes(q)
          || (item.artist || '').toLowerCase().includes(q)
          || (item.album || '').toLowerCase().includes(q)
          || (item.genre || '').toLowerCase().includes(q);
      })
      .map(item => this.normalize(item));
  },

  normalize(item) {
    if (!item) return null;
    return {
      provider_asset_id: item.id,
      title: item.title || 'Untitled',
      artist: item.artist || 'Unknown',
      album: item.album || '',
      genre: item.genre || '', subgenre: item.subgenre || '',
      release_date: item.release_date || '',
      duration_seconds: item.duration_seconds || 0,
      bpm: item.bpm || null, musical_key: item.musical_key || '',
      mood: item.mood || '', language: item.language || '',
      explicit_content: item.explicit_content || false,
      composer: item.composer || '', producer: item.producer || '', label: item.label || '',
      provider: item.provider || 'local_music_library',
      source_url: item.source_url || '',
      artwork_url: item.artwork_url || '', thumbnail_url: item.thumbnail_url || '',
      description: item.description || '',
      playback_allowed: item.playback_allowed || false,
      preview_available: item.preview_available || false,
      streaming_available: item.streaming_available || false,
      download_available: item.download_available || false,
      offline_cache_allowed: item.offline_cache_allowed || false,
      commercial_use_allowed: item.commercial_use_allowed || false,
      modification_allowed: item.modification_allowed || false,
      redistribution_allowed: item.redistribution_allowed || false,
      attribution_required: item.attribution_required || false,
      attribution_text: item.attribution_text || '',
      license_type: item.license_type || 'unknown',
      license_url: item.license_url || '',
      playback_url: item.playback_url || '',
      preview_url: item.preview_url || '',
      waveform_data: item.waveform_data || null,
      asset_category: item.asset_category || CATEGORY_PLAYABLE_AUDIO,
      confidence_score: 95, already_imported: true, music_library_id: item.id,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// PROVIDER_REGISTRY
// ═══════════════════════════════════════════════════════════
const PROVIDER_REGISTRY = {
  local_music_library: localMusicLibraryConnector,
  jamendo: jamendoConnector,
  internet_archive: internetArchiveConnector,
  freesound: freesoundConnector,
  discogs: discogsConnector,
  wikidata: wikidataConnector,
};

// ═══════════════════════════════════════════════════════════
// Producer Preferences
// ═══════════════════════════════════════════════════════════
async function getProducerPreferences(context) {
  const { base44 } = context;
  const prefs = await base44.asServiceRole.entities.MusicProviderPreference.filter({ is_active: true }, '-created_date', 1);
  return prefs[0] || {
    allow_attribution_required: true, allow_premium_providers: false,
    allow_ai_music_generation: false, allow_streaming_assets: true,
    allow_downloadable_assets: true, explicit_content_filter: true,
  };
}

function applyPreferences(results, prefs) {
  return results.filter(r => {
    if (prefs.explicit_content_filter && r.explicit_content) return false;
    if (!prefs.allow_attribution_required && r.attribution_required) return false;
    if (!prefs.allow_streaming_assets && r.streaming_available && !r.download_available) return false;
    if (!prefs.allow_downloadable_assets && r.download_available && !r.streaming_available) return false;
    if (!prefs.allow_premium_providers && r.license_type === 'premium_subscription') return false;
    return true;
  });
}

// ═══════════════════════════════════════════════════════════
// Core Search
// ═══════════════════════════════════════════════════════════
async function searchMusic(payload, context) {
  const { base44 } = context;
  const startTime = Date.now();
  const { query, search_type = 'all', limit = 10 } = payload;

  let categories = [];
  if (search_type === 'metadata') categories = [CATEGORY_MUSIC_METADATA];
  else if (search_type === 'playable') categories = [CATEGORY_PLAYABLE_AUDIO];
  else if (search_type === 'sound_effects') categories = [CATEGORY_SOUND_EFFECTS];
  else categories = [CATEGORY_MUSIC_METADATA, CATEGORY_PLAYABLE_AUDIO, CATEGORY_SOUND_EFFECTS];

  let connectors = await base44.asServiceRole.entities.Connector.filter({ enabled: true }, 'priority', 100);
  connectors = connectors.filter(c => categories.includes(c.category));
  connectors.sort((a, b) => (a.priority || 50) - (b.priority || 50));

  const prefs = await getProducerPreferences(context);
  if (!prefs.allow_ai_music_generation) {
    connectors = connectors.filter(c => c.provider_name !== 'ai_generation');
  }

  const allResults = [];
  const providerLogs = [];

  for (const connector of connectors) {
    const impl = PROVIDER_REGISTRY[connector.provider_name];
    if (!impl) {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'no_implementation' });
      continue;
    }

    // Check health — skip offline providers
    const health = await base44.asServiceRole.entities.ProviderHealth.filter({ connector_id: connector.id }, '-created_date', 1);
    if (health[0]?.current_status === 'offline') {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'skipped_unhealthy' });
      continue;
    }

    // Read API key dynamically from connector config
    const apiKey = connector.api_key_name ? Deno.env.get(connector.api_key_name) : null;

    let providerResults = null;
    let lastError = null;
    const maxRetries = connector.retry_count || 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        providerResults = await Promise.race([
          impl.search(query, limit, apiKey, context),
          new Promise((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), (connector.timeout_seconds || 30) * 1000)),
        ]);
        break;
      } catch (err) {
        lastError = err.message;
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    if (providerResults === null) {
      providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'failed', error: lastError });
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Connector.update(connector.id, { health_status: 'degraded', last_failure: now });
      continue;
    }

    for (const r of providerResults) r.connector_id = connector.id;
    allResults.push(...providerResults);
    providerLogs.push({ connector_id: connector.id, provider: connector.provider_name, status: 'success', count: providerResults.length });

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Connector.update(connector.id, { last_success: now });
  }

  const filtered = applyPreferences(allResults, prefs);
  filtered.sort((a, b) => {
    if (a.playback_allowed && !b.playback_allowed) return -1;
    if (!a.playback_allowed && b.playback_allowed) return 1;
    return (b.confidence_score || 0) - (a.confidence_score || 0);
  });

  return {
    total_results: filtered.length,
    providers_tried: connectors.length,
    providers_succeeded: providerLogs.filter(p => p.status === 'success').length,
    providers_failed: providerLogs.filter(p => p.status === 'failed').length,
    processing_time_ms: Date.now() - startTime,
    search_type, provider_logs: providerLogs,
    results: filtered.slice(0, limit * 2),
    preferences_applied: true,
  };
}

// ═══════════════════════════════════════════════════════════
// Import to Music Library
// ═══════════════════════════════════════════════════════════
async function importToMusicLibrary(payload, context) {
  const { base44 } = context;
  const { asset_data } = payload;
  if (!asset_data) return { error: 'No asset_data provided' };
  if (asset_data.music_library_id) return { success: true, music_library_id: asset_data.music_library_id, already_existed: true };

  // License review: auto-approve public_domain / royalty_free; CC if playback_allowed; metadata-only stays pending
  let reviewStatus = 'pending';
  if (asset_data.license_type === 'public_domain' || asset_data.license_type === 'royalty_free') reviewStatus = 'approved';
  else if (asset_data.license_type === 'creative_commons' && asset_data.playback_allowed) reviewStatus = 'approved';

  const entry = await base44.asServiceRole.entities.MusicLibraryEntry.create({
    title: asset_data.title || 'Untitled',
    artist: asset_data.artist || 'Unknown',
    album: asset_data.album || '',
    genre: asset_data.genre || '', subgenre: asset_data.subgenre || '',
    release_date: asset_data.release_date || '',
    duration_seconds: asset_data.duration_seconds || 0,
    bpm: asset_data.bpm || null, musical_key: asset_data.musical_key || '',
    mood: asset_data.mood || '', language: asset_data.language || '',
    explicit_content: asset_data.explicit_content || false,
    composer: asset_data.composer || '', producer: asset_data.producer || '', label: asset_data.label || '',
    isrc: asset_data.isrc || '',
    provider: asset_data.provider || '',
    provider_asset_id: asset_data.provider_asset_id || '',
    source_url: asset_data.source_url || '',
    artwork_url: asset_data.artwork_url || '', thumbnail_url: asset_data.thumbnail_url || '',
    description: asset_data.description || '',
    playback_allowed: reviewStatus === 'approved' && (asset_data.playback_allowed || false),
    preview_available: asset_data.preview_available || false,
    streaming_available: asset_data.streaming_available || false,
    download_available: asset_data.download_available || false,
    offline_cache_allowed: asset_data.offline_cache_allowed || false,
    commercial_use_allowed: asset_data.commercial_use_allowed || false,
    modification_allowed: asset_data.modification_allowed || false,
    redistribution_allowed: asset_data.redistribution_allowed || false,
    attribution_required: asset_data.attribution_required || false,
    attribution_text: asset_data.attribution_text || '',
    license_type: asset_data.license_type || 'unknown',
    license_url: asset_data.license_url || '',
    playback_url: reviewStatus === 'approved' ? (asset_data.playback_url || '') : '',
    preview_url: asset_data.preview_url || '',
    waveform_data: asset_data.waveform_data || null,
    license_review_status: reviewStatus,
    license_reviewed_at: reviewStatus === 'approved' ? new Date().toISOString() : null,
    connector_id: asset_data.connector_id || '',
    asset_category: asset_data.asset_category || 'playable_audio',
    is_active: true,
  });

  return { success: true, music_library_id: entry.id, license_review_status: reviewStatus };
}

// ═══════════════════════════════════════════════════════════
// Browse Music Library
// ═══════════════════════════════════════════════════════════
async function browseMusicLibrary(payload, context) {
  const { base44 } = context;
  const { query, genre, mood, artist, license_type, asset_category, favorites_only, limit = 50 } = payload;
  let filter = { is_active: true };
  if (genre) filter.genre = genre;
  if (mood) filter.mood = mood;
  if (artist) filter.artist = artist;
  if (license_type) filter.license_type = license_type;
  if (asset_category) filter.asset_category = asset_category;
  if (favorites_only) filter.is_favorite = true;
  let items = await base44.asServiceRole.entities.MusicLibraryEntry.filter(filter, '-created_date', limit);
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.artist || '').toLowerCase().includes(q) ||
      (item.album || '').toLowerCase().includes(q)
    );
  }
  return { total: items.length, results: items };
}

// ═══════════════════════════════════════════════════════════
// Seed Music Connectors
// ═══════════════════════════════════════════════════════════
async function seedMusicConnectors(context) {
  const { base44 } = context;
  const defaults = [
    {
      name: 'Local Music Library', category: 'playable_audio', provider_name: 'local_music_library',
      description: 'Searches approved music assets in the CREAPD Music Library first',
      authentication_type: 'none', enabled: true, priority: PRIORITY_LOCAL,
      supports_search: true, supports_download: true, supports_preview: true, supports_metadata: true,
      rate_limit_per_minute: 1000, rate_limit_per_day: 100000, timeout_seconds: 5, retry_count: 0,
    },
    {
      name: 'Jamendo', category: 'playable_audio', provider_name: 'jamendo',
      description: 'Royalty-free and Creative Commons music with streaming audio',
      base_url: 'https://api.jamendo.com/v3.0',
      authentication_type: 'api_key', api_key_name: 'JAMENDO_CLIENT_ID',
      enabled: true, priority: PRIORITY_OPEN_LICENSE,
      supports_search: true, supports_download: true, supports_preview: true, supports_streaming: true, supports_metadata: true,
      rate_limit_per_minute: 60, rate_limit_per_day: 1000, timeout_seconds: 20, retry_count: 2,
    },
    {
      name: 'Internet Archive', category: 'playable_audio', provider_name: 'internet_archive',
      description: 'Public domain audio and music collections',
      base_url: 'https://archive.org', authentication_type: 'none', enabled: true, priority: PRIORITY_PUBLIC_DOMAIN,
      supports_search: true, supports_download: true, supports_preview: true, supports_streaming: true, supports_metadata: true,
      rate_limit_per_minute: 120, rate_limit_per_day: 5000, timeout_seconds: 30, retry_count: 2,
    },
    {
      name: 'Freesound', category: 'sound_effects', provider_name: 'freesound',
      description: 'Sound effects, ambience, foley, and loops',
      base_url: 'https://freesound.org/apiv2',
      authentication_type: 'api_key', api_key_name: 'FREESOUND_API_KEY',
      enabled: true, priority: PRIORITY_FREE_API,
      supports_search: true, supports_download: true, supports_preview: true, supports_metadata: true,
      rate_limit_per_minute: 30, rate_limit_per_day: 500, timeout_seconds: 20, retry_count: 1,
    },
    {
      name: 'Discogs', category: 'music_metadata', provider_name: 'discogs',
      description: 'Music metadata — artists, releases, labels, discographies',
      base_url: 'https://api.discogs.com',
      authentication_type: 'api_key', api_key_name: 'DISCOGS_API_KEY',
      enabled: true, priority: PRIORITY_FREE_API,
      supports_search: true, supports_metadata: true, supports_preview: false, supports_download: false,
      rate_limit_per_minute: 60, rate_limit_per_day: 1000, timeout_seconds: 20, retry_count: 1,
    },
    {
      name: 'Wikidata', category: 'music_metadata', provider_name: 'wikidata',
      description: 'Structured music metadata — artists, genres, musical properties',
      base_url: 'https://www.wikidata.org/w/api.php', authentication_type: 'none', enabled: true, priority: PRIORITY_FREE_API,
      supports_search: true, supports_metadata: true, supports_preview: false, supports_download: false,
      rate_limit_per_minute: 100, rate_limit_per_day: 5000, timeout_seconds: 15, retry_count: 1,
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
// Health Check
// ═══════════════════════════════════════════════════════════
async function healthCheckAll(context) {
  const { base44 } = context;
  const connectors = await base44.asServiceRole.entities.Connector.filter({
    enabled: true,
    category: { $in: [CATEGORY_MUSIC_METADATA, CATEGORY_PLAYABLE_AUDIO, CATEGORY_SOUND_EFFECTS] },
  }, 'priority', 50);

  const results = [];
  for (const connector of connectors) {
    const impl = PROVIDER_REGISTRY[connector.provider_name];
    if (!impl) { results.push({ connector_id: connector.id, provider: connector.provider_name, online: false, error: 'no_implementation' }); continue; }

    // For local music library, always healthy
    if (connector.provider_name === 'local_music_library') {
      results.push({ connector_id: connector.id, provider: connector.provider_name, online: true, latency: 0 });
      continue;
    }

    // For providers needing API keys, check if key exists
    const apiKey = connector.api_key_name ? Deno.env.get(connector.api_key_name) : null;
    if (connector.authentication_type === 'api_key' && !apiKey) {
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Connector.update(connector.id, { health_status: 'degraded', last_health_check: now });
      results.push({ connector_id: connector.id, provider: connector.provider_name, online: false, error: 'no_api_key' });
      continue;
    }

    try {
      const start = Date.now();
      const testRes = await Promise.race([
        fetch(`${connector.base_url}`, { signal: AbortSignal.timeout(10000) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
      ]);
      const online = testRes.ok || testRes.status === 403 || testRes.status === 401;
      const latency = Date.now() - start;
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Connector.update(connector.id, {
        health_status: online ? 'healthy' : 'down',
        last_health_check: now,
        ...(online ? { last_success: now } : { last_failure: now }),
      });
      results.push({ connector_id: connector.id, provider: connector.provider_name, online, latency });
    } catch (err) {
      const now = new Date().toISOString();
      await base44.asServiceRole.entities.Connector.update(connector.id, { health_status: 'down', last_health_check: now, last_failure: now });
      results.push({ connector_id: connector.id, provider: connector.provider_name, online: false, error: err.message });
    }
  }
  return { checked: connectors.length, results };
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
      case 'search_music':
        return Response.json(await searchMusic(body.payload || {}, context));
      case 'import_to_music_library':
        return Response.json(await importToMusicLibrary(body.payload || {}, context));
      case 'browse_music_library':
        return Response.json(await browseMusicLibrary(body.payload || {}, context));
      case 'seed_music_connectors':
        if (user.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });
        return Response.json(await seedMusicConnectors(context));
      case 'health_check_music':
        return Response.json(await healthCheckAll(context));
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});