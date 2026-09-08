import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDateOnly(value) {
  if (!value) return value ?? null;
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

function withBase44Aliases(row, extra = {}) {
  if (!row) return row;
  return {
    ...row,
    ...(row.show_date ? { show_date: normalizeDateOnly(row.show_date) } : {}),
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
    ...extra,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_read_failed').slice(0, 180),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
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
        timestamp: new Date().toISOString(),
      });
    }

    const configurationId = String(configuration.id);

    const [topics, points, dossiers] = await Promise.all([
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

    console.error('[CREAPD RESEARCH PRODUCTION READ]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_read_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
