import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { generateResearchProductionPackage } from '../../../server/researchPackageEngine.js';
import { generateAndStoreResearchMedia } from '../../../server/mediaGateway.js';

export const config = {
  maxDuration: 60,
};

const NUMERIC_FIELDS = [
  'total_show_runtime',
  'confidence_score',
  'priority_score',
  'debate_potential_score',
];

const POINT_STATUSES = new Set(['pending', 'approved', 'rejected', 'used']);
const PACKAGE_STATUSES = new Set(['not_generated', 'generating', 'generated', 'edited', 'approved']);
const OWNED_MEDIA_TYPES = new Set(['image', 'thumbnail', 'audio']);

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDateOnly(value) {
  if (!value) return value ?? null;
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

function normalizeNumericFields(row) {
  const normalized = { ...row };

  for (const field of NUMERIC_FIELDS) {
    const value = normalized[field];
    if (value === null || value === undefined || value === '') continue;

    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) {
      normalized[field] = numberValue;
    }
  }

  return normalized;
}

function withBase44Aliases(row, extra = {}) {
  if (!row) return row;
  const normalized = normalizeNumericFields(row);

  return {
    ...normalized,
    ...(normalized.show_date ? { show_date: normalizeDateOnly(normalized.show_date) } : {}),
    created_date: normalized.created_at ?? normalized.created_date ?? null,
    updated_date: normalized.updated_at ?? normalized.updated_date ?? null,
    ...extra,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_request_failed').slice(0, 220),
  };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function textPatchValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  const value = patch[key];
  return value === null || value === undefined ? null : String(value);
}

function booleanPatchValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  return Boolean(patch[key]);
}

function jsonPatchValue(patch, key) {
  if (!hasOwn(patch, key)) return null;
  const value = patch[key];
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value));
    } catch {
      return JSON.stringify([]);
    }
  }

  return JSON.stringify(value);
}

function jsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function getOwnedPoint(sql, ownerUserId, pointId) {
  if (!pointId) return null;
  const [point] = await sql`
    SELECT *
    FROM creapd.research_points
    WHERE id = ${String(pointId)}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;
  return point || null;
}

async function getOwnedPackage(sql, ownerUserId, packageId) {
  if (!packageId) return null;
  const [pkg] = await sql`
    SELECT *
    FROM creapd.production_packages
    WHERE id = ${String(packageId)}
      AND owner_user_id = ${ownerUserId}
      AND source_entity_type = 'ResearchPoint'
    LIMIT 1
  `;
  return pkg || null;
}

async function getOwnedConfiguration(sql, ownerUserId, configurationId) {
  if (!configurationId) return null;
  const [configuration] = await sql`
    SELECT *
    FROM creapd.research_production_configurations
    WHERE id = ${String(configurationId)}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;
  return configuration || null;
}

async function updateOwnedPackage(sql, ownerUserId, packageId, patch) {
  const existing = await getOwnedPackage(sql, ownerUserId, packageId);
  if (!existing) return null;

  const status = hasOwn(patch, 'status') ? String(patch.status || '').trim() : null;
  if (status && !PACKAGE_STATUSES.has(status)) {
    const error = new Error('Invalid package status');
    error.code = 'INVALID_PACKAGE_STATUS';
    error.status = 400;
    throw error;
  }

  const imageVariations = jsonPatchValue(patch, 'image_variations');
  const thumbnailVariations = jsonPatchValue(patch, 'thumbnail_variations');

  const [updated] = await sql`
    UPDATE creapd.production_packages
    SET
      teleprompter_script = CASE WHEN ${hasOwn(patch, 'teleprompter_script')} THEN ${textPatchValue(patch, 'teleprompter_script')} ELSE teleprompter_script END,
      show_script = CASE WHEN ${hasOwn(patch, 'show_script')} THEN ${textPatchValue(patch, 'show_script')} ELSE show_script END,
      story_summary = CASE WHEN ${hasOwn(patch, 'story_summary')} THEN ${textPatchValue(patch, 'story_summary')} ELSE story_summary END,
      talking_points = CASE WHEN ${hasOwn(patch, 'talking_points')} THEN ${textPatchValue(patch, 'talking_points')} ELSE talking_points END,
      lower_third_text = CASE WHEN ${hasOwn(patch, 'lower_third_text')} THEN ${textPatchValue(patch, 'lower_third_text')} ELSE lower_third_text END,
      headline_suggestions = CASE WHEN ${hasOwn(patch, 'headline_suggestions')} THEN ${textPatchValue(patch, 'headline_suggestions')} ELSE headline_suggestions END,
      image_prompt = CASE WHEN ${hasOwn(patch, 'image_prompt')} THEN ${textPatchValue(patch, 'image_prompt')} ELSE image_prompt END,
      thumbnail_prompt = CASE WHEN ${hasOwn(patch, 'thumbnail_prompt')} THEN ${textPatchValue(patch, 'thumbnail_prompt')} ELSE thumbnail_prompt END,
      visual_suggestions = CASE WHEN ${hasOwn(patch, 'visual_suggestions')} THEN ${textPatchValue(patch, 'visual_suggestions')} ELSE visual_suggestions END,
      broll_suggestions = CASE WHEN ${hasOwn(patch, 'broll_suggestions')} THEN ${textPatchValue(patch, 'broll_suggestions')} ELSE broll_suggestions END,
      social_caption = CASE WHEN ${hasOwn(patch, 'social_caption')} THEN ${textPatchValue(patch, 'social_caption')} ELSE social_caption END,
      fact_check_notes = CASE WHEN ${hasOwn(patch, 'fact_check_notes')} THEN ${textPatchValue(patch, 'fact_check_notes')} ELSE fact_check_notes END,
      producer_notes = CASE WHEN ${hasOwn(patch, 'producer_notes')} THEN ${textPatchValue(patch, 'producer_notes')} ELSE producer_notes END,
      estimated_runtime = CASE WHEN ${hasOwn(patch, 'estimated_runtime')} THEN ${textPatchValue(patch, 'estimated_runtime')} ELSE estimated_runtime END,
      generated_image_url = CASE WHEN ${hasOwn(patch, 'generated_image_url')} THEN ${textPatchValue(patch, 'generated_image_url')} ELSE generated_image_url END,
      generated_thumbnail_url = CASE WHEN ${hasOwn(patch, 'generated_thumbnail_url')} THEN ${textPatchValue(patch, 'generated_thumbnail_url')} ELSE generated_thumbnail_url END,
      generated_video_url = CASE WHEN ${hasOwn(patch, 'generated_video_url')} THEN ${textPatchValue(patch, 'generated_video_url')} ELSE generated_video_url END,
      generated_audio_url = CASE WHEN ${hasOwn(patch, 'generated_audio_url')} THEN ${textPatchValue(patch, 'generated_audio_url')} ELSE generated_audio_url END,
      voice_package_id = CASE WHEN ${hasOwn(patch, 'voice_package_id')} THEN ${textPatchValue(patch, 'voice_package_id')} ELSE voice_package_id END,
      image_variations = CASE WHEN ${hasOwn(patch, 'image_variations')} THEN ${imageVariations}::jsonb ELSE image_variations END,
      thumbnail_variations = CASE WHEN ${hasOwn(patch, 'thumbnail_variations')} THEN ${thumbnailVariations}::jsonb ELSE thumbnail_variations END,
      custom_prompt = CASE WHEN ${hasOwn(patch, 'custom_prompt')} THEN ${textPatchValue(patch, 'custom_prompt')} ELSE custom_prompt END,
      status = CASE WHEN ${hasOwn(patch, 'status')} THEN ${status || existing.status} ELSE status END,
      is_edited = CASE WHEN ${hasOwn(patch, 'is_edited')} THEN ${booleanPatchValue(patch, 'is_edited')} ELSE is_edited END,
      updated_at = now()
    WHERE id = ${String(existing.id)}
      AND owner_user_id = ${ownerUserId}
    RETURNING *
  `;

  return updated || null;
}

async function generateOwnedMedia(response, sql, ownerUserId, body) {
  const packageId = body.package_id || null;
  const mediaType = String(body.media_type || '').trim();

  if (!packageId) {
    return response.status(400).json({ ok: false, error: 'package_id_required' });
  }

  if (mediaType === 'video') {
    return response.status(409).json({
      ok: false,
      error: 'video_media_migration_pending',
      message: 'Video generation is not enabled on the owned Preview media path yet.',
    });
  }

  if (!OWNED_MEDIA_TYPES.has(mediaType)) {
    return response.status(400).json({ ok: false, error: 'unsupported_media_type' });
  }

  const pkg = await getOwnedPackage(sql, ownerUserId, packageId);
  if (!pkg) {
    return response.status(404).json({ ok: false, error: 'production_package_not_found' });
  }

  const prompt = String(
    body.prompt ||
    (mediaType === 'thumbnail' ? pkg.thumbnail_prompt : pkg.image_prompt) ||
    '',
  ).trim();
  const script = String(body.script || pkg.teleprompter_script || pkg.story_summary || '').trim();

  try {
    const media = await generateAndStoreResearchMedia({
      packageId: pkg.id,
      mediaType,
      prompt,
      script,
      voice: String(body.voice || 'river'),
    });

    const patch = {};
    if (mediaType === 'audio') {
      patch.generated_audio_url = media.url;
    } else if (mediaType === 'thumbnail') {
      patch.generated_thumbnail_url = media.url;
      if (pkg.generated_thumbnail_url) {
        patch.thumbnail_variations = [
          ...jsonArray(pkg.thumbnail_variations).filter(item => item?.url !== pkg.generated_thumbnail_url),
          {
            url: pkg.generated_thumbnail_url,
            prompt,
            created_at: new Date().toISOString(),
          },
        ];
      }
    } else {
      patch.generated_image_url = media.url;
      if (pkg.generated_image_url) {
        patch.image_variations = [
          ...jsonArray(pkg.image_variations).filter(item => item?.url !== pkg.generated_image_url),
          {
            url: pkg.generated_image_url,
            prompt,
            created_at: new Date().toISOString(),
          },
        ];
      }
    }

    let updatedPackage = await updateOwnedPackage(sql, ownerUserId, pkg.id, patch);

    const mediaMetadata = JSON.stringify({
      last_media_generation: {
        media_type: mediaType,
        model: media.model,
        gateway_auth_source: media.gatewayAuthSource,
        blob_auth_source: media.blobAuthSource,
        blob_pathname: media.pathname,
        content_type: media.contentType,
        elapsed_ms: media.elapsedMs,
        generated_at: new Date().toISOString(),
      },
    });

    [updatedPackage] = await sql`
      UPDATE creapd.production_packages
      SET
        source_payload = COALESCE(source_payload, '{}'::jsonb) || ${mediaMetadata}::jsonb,
        updated_at = now()
      WHERE id = ${String(pkg.id)}
        AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      action: 'generate_media',
      source: 'neon',
      data_authority: 'neon',
      media,
      package: withBase44Aliases(updatedPackage),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CREAPD RESEARCH MEDIA GENERATION]', error);
    const isStorageError = String(error?.code || '').startsWith('BLOB_');
    return response.status(isStorageError ? 503 : 502).json({
      ok: false,
      service: 'creapd-research',
      action: 'generate_media',
      error: error?.code || 'media_generation_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}

async function handlePost(request, response, sql, ownerUserId) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const action = String(body.action || '').trim();

  if (!action) {
    return response.status(400).json({ ok: false, error: 'action_required' });
  }

  if (action === 'update_package') {
    const packageId = body.package_id || null;
    const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};

    if (!packageId) {
      return response.status(400).json({ ok: false, error: 'package_id_required' });
    }

    try {
      const updatedPackage = await updateOwnedPackage(sql, ownerUserId, packageId, patch);
      if (!updatedPackage) {
        return response.status(404).json({ ok: false, error: 'production_package_not_found' });
      }

      return response.status(200).json({
        ok: true,
        service: 'creapd-research',
        action,
        source: 'neon',
        data_authority: 'neon',
        package: withBase44Aliases(updatedPackage),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error?.status === 400) {
        return response.status(400).json({ ok: false, error: error.code || 'invalid_package_patch' });
      }
      throw error;
    }
  }

  if (action === 'generate_media') {
    return await generateOwnedMedia(response, sql, ownerUserId, body);
  }

  const pointId = body.point_id || body.research_point_id || null;
  const point = await getOwnedPoint(sql, ownerUserId, pointId);
  if (!point) {
    return response.status(404).json({ ok: false, error: 'research_point_not_found' });
  }

  if (action === 'set_point_status') {
    const status = String(body.status || '').trim();
    if (!POINT_STATUSES.has(status)) {
      return response.status(400).json({ ok: false, error: 'invalid_point_status' });
    }

    const [updatedPoint] = await sql`
      UPDATE creapd.research_points
      SET
        status = ${status},
        rejection_reason = ${status === 'rejected' ? String(body.rejection_reason || '') : null},
        updated_at = now()
      WHERE id = ${String(point.id)}
        AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      action,
      point: withBase44Aliases(updatedPoint, { order: updatedPoint.display_order ?? null }),
    });
  }

  if (action !== 'approve_point' && action !== 'generate_package') {
    return response.status(400).json({ ok: false, error: 'unsupported_action' });
  }

  const configuration = await getOwnedConfiguration(sql, ownerUserId, point.configuration_id);
  if (!configuration) {
    return response.status(404).json({ ok: false, error: 'configuration_not_found' });
  }

  if (action === 'approve_point') {
    await sql`
      UPDATE creapd.research_points
      SET status = 'approved', updated_at = now()
      WHERE id = ${String(point.id)}
        AND owner_user_id = ${ownerUserId}
    `;
    point.status = 'approved';
  }

  try {
    const result = await generateResearchProductionPackage({
      sql,
      ownerUserId,
      point,
      config: configuration,
    });

    const refreshedPoint = await getOwnedPoint(sql, ownerUserId, point.id);

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      action,
      source: 'neon',
      data_authority: 'neon',
      point: withBase44Aliases(refreshedPoint, { order: refreshedPoint?.display_order ?? null }),
      package: withBase44Aliases(result.package),
      gateway: result.gateway,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CREAPD RESEARCH PACKAGE GENERATION]', error);
    return response.status(502).json({
      ok: false,
      service: 'creapd-research',
      action,
      error: error?.code || 'package_generation_failed',
      diagnostic: safeError(error),
      point_status: action === 'approve_point' ? 'approved' : point.status,
      timestamp: new Date().toISOString(),
    });
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'database_not_configured',
    });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);

    if (request.method === 'POST') {
      return await handlePost(request, response, sql, ownerUserId);
    }

    const requestedConfigId = firstQueryValue(request.query?.config_id) || null;
    let configuration;

    if (requestedConfigId) {
      [configuration] = await sql`
        SELECT *
        FROM creapd.research_production_configurations
        WHERE id = ${requestedConfigId}
          AND owner_user_id = ${ownerUserId}
        LIMIT 1
      `;

      if (!configuration) {
        return response.status(404).json({
          ok: false,
          service: 'creapd-research',
          error: 'configuration_not_found',
        });
      }
    } else {
      [configuration] = await sql`
        SELECT *
        FROM creapd.research_production_configurations
        WHERE owner_user_id = ${ownerUserId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }

    if (!configuration) {
      return response.status(200).json({
        ok: true,
        service: 'creapd-research',
        source: 'neon',
        data_authority: 'neon',
        config: null,
        topics: [],
        points: [],
        dossiers: [],
        packages: [],
        timestamp: new Date().toISOString(),
      });
    }

    const configurationId = String(configuration.id);

    const [topics, points, dossiers, packages] = await Promise.all([
      sql`
        SELECT *
        FROM creapd.research_topics
        WHERE configuration_id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT *
        FROM creapd.research_points
        WHERE configuration_id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
        ORDER BY display_order ASC NULLS LAST, created_at ASC
      `,
      sql`
        SELECT d.*
        FROM creapd.research_dossiers d
        WHERE d.owner_user_id = ${ownerUserId}
          AND (
            d.topic_id IN (
              SELECT t.id
              FROM creapd.research_topics t
              WHERE t.configuration_id = ${configurationId}
                AND t.owner_user_id = ${ownerUserId}
            )
            OR d.id IN (
              SELECT t.dossier_id
              FROM creapd.research_topics t
              WHERE t.configuration_id = ${configurationId}
                AND t.owner_user_id = ${ownerUserId}
                AND t.dossier_id IS NOT NULL
            )
          )
        ORDER BY d.created_at DESC
      `,
      sql`
        SELECT *
        FROM creapd.production_packages
        WHERE configuration_id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
          AND source_entity_type = 'ResearchPoint'
        ORDER BY created_at DESC
      `,
    ]);

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      data_authority: 'neon',
      config: withBase44Aliases(configuration),
      topics: (topics || []).map(topic => withBase44Aliases(topic)),
      points: (points || []).map(point => withBase44Aliases(point, {
        order: point.display_order ?? null,
      })),
      dossiers: (dossiers || []).map(dossier => withBase44Aliases(dossier)),
      packages: (packages || []).map(pkg => withBase44Aliases(pkg)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-research',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD RESEARCH PRODUCTION]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_request_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
