import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * KAAE License Verification Engine — Implements KAAE-004
 *
 * Given an asset (or asset fields), this function:
 *   1. Classifies the license
 *   2. Runs the compliance check
 *   3. Returns PASS or BLOCK with full reasoning
 *
 * Also supports re-verification of existing registry records to detect
 * license downgrades (KAAE-004 §7).
 */

const COMPATIBLE_LICENSES = [
  'public_domain',
  'creative_commons',
  'mit',
  'apache',
  'bsd',
  'official_free_access',
  'commercial_license',
  'premium_subscription',
];

const COMPATIBLE_CC_VARIANTS = ['cc0', 'cc-by', 'cc-by-sa'];

/**
 * Detects CC variant from a license URL or string
 */
function detectCcVariant(licenseUrl, licenseText) {
  const combined = ((licenseUrl || '') + ' ' + (licenseText || '')).toLowerCase();

  if (combined.includes('cc0') || combined.includes('public-domain') || combined.includes('publicdomain')) {
    return 'cc0';
  }
  if (combined.includes('by-nc-nd')) return 'cc-by-nc-nd';
  if (combined.includes('by-nc-sa')) return 'cc-by-nc-sa';
  if (combined.includes('by-nc')) return 'cc-by-nc';
  if (combined.includes('by-nd')) return 'cc-by-nd';
  if (combined.includes('by-sa')) return 'cc-by-sa';
  if (combined.includes('by') && combined.includes('creativecommons')) return 'cc-by';

  return 'n/a';
}

/**
 * Classifies a license based on available metadata
 */
function classifyLicense(asset) {
  const licenseUrl = (asset.license_url || '').toLowerCase();
  const provider = (asset.provider || '').toLowerCase();
  const sourceUrl = (asset.source_url || '').toLowerCase();
  const combined = `${licenseUrl} ${provider} ${sourceUrl}`;

  // Public domain
  if (combined.includes('publicdomain') || combined.includes('pd/') || combined.includes('cc0')) {
    return {
      license: 'public_domain',
      cc_variant: 'cc0',
      commercial_use: true,
      modification_allowed: true,
      redistribution_allowed: true,
      attribution_required: false,
    };
  }

  // MIT
  if (combined.includes('mit-license') || combined.includes('opensource.org/licenses/mit')) {
    return {
      license: 'mit',
      cc_variant: 'n/a',
      commercial_use: true,
      modification_allowed: true,
      redistribution_allowed: true,
      attribution_required: true,
    };
  }

  // Apache
  if (combined.includes('apache') && combined.includes('license')) {
    return {
      license: 'apache',
      cc_variant: 'n/a',
      commercial_use: true,
      modification_allowed: true,
      redistribution_allowed: true,
      attribution_required: true,
    };
  }

  // BSD
  if (combined.includes('bsd') && combined.includes('license')) {
    return {
      license: 'bsd',
      cc_variant: 'n/a',
      commercial_use: true,
      modification_allowed: true,
      redistribution_allowed: true,
      attribution_required: true,
    };
  }

  // Creative Commons
  if (combined.includes('creativecommons') || combined.includes('cc-by') || combined.includes('/cc/')) {
    const variant = detectCcVariant(licenseUrl, combined);
    const isCompatible = COMPATIBLE_CC_VARIANTS.includes(variant);
    return {
      license: 'creative_commons',
      cc_variant: variant,
      commercial_use: isCompatible,
      modification_allowed: isCompatible && variant !== 'cc-by-nd',
      redistribution_allowed: isCompatible,
      attribution_required: true,
    };
  }

  // Government / official free access
  if (combined.includes('gov') || combined.includes('government') || combined.includes('.gov')) {
    return {
      license: 'official_free_access',
      cc_variant: 'n/a',
      commercial_use: true,
      modification_allowed: true,
      redistribution_allowed: true,
      attribution_required: false,
    };
  }

  // Commercial / premium
  if (combined.includes('getty') || combined.includes('shutterstock') || combined.includes('stock')) {
    return {
      license: 'commercial_license',
      cc_variant: 'n/a',
      commercial_use: true,
      modification_allowed: false,
      redistribution_allowed: false,
      attribution_required: true,
    };
  }

  // Unknown
  return {
    license: 'unknown',
    cc_variant: 'n/a',
    commercial_use: false,
    modification_allowed: false,
    redistribution_allowed: false,
    attribution_required: false,
  };
}

/**
 * Generates formatted attribution text per KAAE-004 §6.1
 */
function generateAttributionText(asset) {
  const title = asset.title || 'Untitled';
  const author = asset.metadata ? safeJsonParse(asset.metadata, 'author', '') : '';
  const licenseLabel = asset.license === 'creative_commons'
    ? `CC ${asset.cc_variant || 'BY'}`
    : asset.license.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const sourceUrl = asset.source_url || '';

  const parts = [`"${title}"`];
  if (author) parts.push(`by ${author}`);
  if (sourceUrl) parts.push(`— ${licenseLabel} — ${sourceUrl}`);
  else parts.push(`— ${licenseLabel}`);

  return parts.join(' ');
}

function safeJsonParse(str, key, fallback) {
  try {
    const obj = JSON.parse(str || '{}');
    return obj[key] || fallback;
  } catch {
    return fallback;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { asset_id, asset_data, reverify = false } = await req.json();

    let asset;
    let existingRecord = null;

    // Mode 1: Verify an existing registry record by ID
    if (asset_id) {
      existingRecord = await base44.asServiceRole.entities.AssetRegistry.get(asset_id);
      if (!existingRecord) {
        return Response.json({ error: 'Asset not found in registry' }, { status: 404 });
      }
      asset = existingRecord;
    }
    // Mode 2: Verify raw asset data (pre-registration)
    else if (asset_data) {
      asset = asset_data;
    } else {
      return Response.json({ error: 'Either asset_id or asset_data is required' }, { status: 400 });
    }

    // ── Step 1: License Detection & Classification ──
    let classification = classifyLicense(asset);

    // If the asset already has a license set and we're not re-verifying, respect it
    if (asset.license && asset.license !== 'unknown' && !reverify) {
      // Keep existing classification but ensure CC variant is resolved
      if (asset.license === 'creative_commons' && (!asset.cc_variant || asset.cc_variant === 'n/a')) {
        const variant = detectCcVariant(asset.license_url, '');
        classification = {
          ...classification,
          license: 'creative_commons',
          cc_variant: variant,
        };
      } else {
        classification = {
          license: asset.license,
          cc_variant: asset.cc_variant || 'n/a',
          commercial_use: asset.commercial_use ?? classification.commercial_use,
          modification_allowed: asset.modification_allowed ?? classification.modification_allowed,
          redistribution_allowed: asset.redistribution_allowed ?? classification.redistribution_allowed,
          attribution_required: asset.attribution_required ?? classification.attribution_required,
        };
      }
    }

    // ── Step 2: Compliance Check ──
    const isCompatible = COMPATIBLE_LICENSES.includes(classification.license) &&
      (classification.license !== 'creative_commons' ||
        COMPATIBLE_CC_VARIANTS.includes(classification.cc_variant)) &&
      classification.commercial_use === true;

    // ── Step 3: Attribution Text ──
    const attributionText = classification.attribution_required
      ? generateAttributionText({ ...asset, ...classification })
      : null;

    const result = {
      status: isCompatible ? 'pass' : 'block',
      license: classification.license,
      cc_variant: classification.cc_variant,
      commercial_use: classification.commercial_use,
      modification_allowed: classification.modification_allowed,
      redistribution_allowed: classification.redistribution_allowed,
      attribution_required: classification.attribution_required,
      attribution_text: attributionText,
      reason: isCompatible
        ? 'License is compatible with CREAPD commercial production pipeline.'
        : `License "${classification.license}" (${classification.cc_variant}) is not compatible with CREAPD commercial production pipeline.`,
      reverify: reverify,
    };

    // ── Step 4: If re-verifying an existing record, detect downgrade ──
    if (existingRecord && reverify) {
      const previousLicense = existingRecord.license;
      const wasCompatible = COMPATIBLE_LICENSES.includes(previousLicense) &&
        existingRecord.commercial_use === true;

      if (wasCompatible && !isCompatible) {
        // License downgrade detected!
        result.downgrade_detected = true;
        result.previous_license = previousLicense;
        result.new_license = classification.license;

        // Flag the asset
        await base44.asServiceRole.entities.AssetRegistry.update(asset_id, {
          license: classification.license,
          cc_variant: classification.cc_variant,
          commercial_use: classification.commercial_use,
          modification_allowed: classification.modification_allowed,
          redistribution_allowed: classification.redistribution_allowed,
          attribution_required: classification.attribution_required,
          attribution_text: attributionText,
          is_active: false,
          is_deprecated: true,
          last_verified: new Date().toISOString(),
          health_status: 'degraded',
        });

        // Log the licensing issue
        try {
          await base44.asServiceRole.entities.LicensingIssue.create({
            asset_id: asset_id,
            issue_type: 'license_downgrade',
            previous_license: previousLicense,
            new_license: classification.license,
            details: JSON.stringify(result),
            status: 'flagged',
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          // LicensingIssue entity might have different fields — best effort
        }

      } else {
        // Update verification timestamp
        await base44.asServiceRole.entities.AssetRegistry.update(asset_id, {
          license: classification.license,
          cc_variant: classification.cc_variant,
          commercial_use: classification.commercial_use,
          modification_allowed: classification.modification_allowed,
          redistribution_allowed: classification.redistribution_allowed,
          attribution_required: classification.attribution_required,
          attribution_text: attributionText,
          verified: true,
          last_verified: new Date().toISOString(),
        });
      }
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});