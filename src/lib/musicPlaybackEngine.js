/**
 * Music Playback Engine — Licensing Gateway
 *
 * The ONLY entry point for audio playback in the Music PP.
 * Every track must pass KAAE licensing validation before the
 * Howler.js audio engine is permitted to load or play it.
 *
 * Validation rules (KAAE-004 §Licensing Rights Engine):
 *   1. Asset must exist in AssetRegistry with resource_type "music"
 *   2. qa_status must be "approved"
 *   3. is_active must be true
 *   4. license must be a free/legal type that permits playback
 *   5. commercial_use must be true (this is a production app)
 *   6. Must have a playable URL (cached_file_url or source_url)
 */

// Licenses that are legally playable in a production/broadcast context without payment
const PLAYABLE_LICENSES = [
  'public_domain',
  'creative_commons',
  'mit',
  'apache',
  'bsd',
  'official_free_access',
];

/**
 * Validate a single AssetRegistry record for playback eligibility.
 * Returns { valid, reason, playableUrl, license, attribution }
 */
export function validateAudioAsset(asset) {
  if (!asset) {
    return { valid: false, reason: 'No audio asset provided', playableUrl: null, license: null, attribution: null };
  }

  // Must be a music resource
  if (asset.resource_type !== 'music' && asset.resource_type !== 'audio') {
    return { valid: false, reason: `Wrong resource type: ${asset.resource_type}`, playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  // Must have passed QA
  if (asset.qa_status !== 'approved') {
    return { valid: false, reason: `QA status: ${asset.qa_status}`, playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  // Must be active
  if (asset.is_active === false) {
    return { valid: false, reason: 'Asset is deactivated', playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  // License must be in the playable set
  if (!PLAYABLE_LICENSES.includes(asset.license)) {
    return { valid: false, reason: `License not playable: ${asset.license}`, playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  // Commercial use must be permitted
  if (asset.commercial_use === false) {
    return { valid: false, reason: 'Commercial use not permitted', playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  // Must have a URL
  const playableUrl = asset.cached_file_url || asset.source_url;
  if (!playableUrl) {
    return { valid: false, reason: 'No audio URL available', playableUrl: null, license: asset.license, attribution: asset.attribution_text };
  }

  return {
    valid: true,
    reason: 'Approved',
    playableUrl,
    license: asset.license,
    attribution: asset.attribution_text,
  };
}

/**
 * Validate a PlaylistItem for playback.
 * Checks the cached kaae_validated flag, or falls back to full asset validation.
 *
 * @param {object} playlistItem - The PlaylistItem record
 * @param {object|null} assetRegistryRecord - Optional: the linked AssetRegistry record
 * @returns {{ valid, reason, playableUrl, license, attribution }}
 */
export function validatePlaylistItemForPlayback(playlistItem, assetRegistryRecord = null) {
  if (!playlistItem) {
    return { valid: false, reason: 'No playlist item', playableUrl: null, license: null, attribution: null };
  }

  // Fast path: if the item has a cached validation, check the flag
  if (playlistItem.kaae_validated && playlistItem.audio_url) {
    // If we also have the full asset record, do a full re-check for safety
    if (assetRegistryRecord) {
      return validateAudioAsset(assetRegistryRecord);
    }
    return {
      valid: true,
      reason: 'Cached KAAE validation',
      playableUrl: playlistItem.audio_url,
      license: playlistItem.audio_license,
      attribution: playlistItem.attribution_text,
    };
  }

  // Full validation from asset registry record
  if (assetRegistryRecord) {
    return validateAudioAsset(assetRegistryRecord);
  }

  // No validation possible
  return {
    valid: false,
    reason: playlistItem.audio_asset_id ? 'Asset not yet fetched from registry' : 'No audio asset linked',
    playableUrl: null,
    license: playlistItem.audio_license,
    attribution: playlistItem.attribution_text,
  };
}

/**
 * Format a license enum value for display.
 */
export function formatLicenseLabel(license) {
  if (!license) return 'Unknown';
  const labels = {
    public_domain: 'Public Domain',
    creative_commons: 'Creative Commons',
    mit: 'MIT',
    apache: 'Apache',
    bsd: 'BSD',
    official_free_access: 'Official Free Access',
    commercial_license: 'Commercial License',
    premium_subscription: 'Premium Subscription',
    restricted: 'Restricted',
    unknown: 'Unknown',
    rejected: 'Rejected',
  };
  return labels[license] || license;
}

/**
 * Check if a license is in the free/playable set.
 */
export function isPlayableLicense(license) {
  return PLAYABLE_LICENSES.includes(license);
}