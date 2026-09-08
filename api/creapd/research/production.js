import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { generateResearchProductionPackage } from '../../../server/researchPackageEngine.js';

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

async function handlePost(request, response, sql, ownerUserId) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const action = String(body.action || '').trim();
  const pointId = body.point_id || body.research_point_id || null;

  if (!action) {
    return response.status(400).json({ ok: false, error: 'action_required' });
  }

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
