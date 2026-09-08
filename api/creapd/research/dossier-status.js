import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function withBase44Aliases(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_dossier_status_failed').slice(0, 180),
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

  const topicId = firstQueryValue(request.query?.topic_id);
  if (!topicId) {
    return response.status(400).json({
      ok: false,
      service: 'creapd-research',
      error: 'topic_id_required',
    });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);

    const [topic] = await sql`
      SELECT id, configuration_id, dossier_id, status, pipeline_stage
      FROM creapd.research_topics
      WHERE id = ${String(topicId)}
        AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `;

    if (!topic) {
      return response.status(404).json({
        ok: false,
        service: 'creapd-research',
        error: 'topic_not_found',
      });
    }

    const [[dossier], [pointCountRow]] = await Promise.all([
      sql`
        SELECT *
        FROM creapd.research_dossiers
        WHERE owner_user_id = ${ownerUserId}
          AND (
            topic_id = ${String(topic.id)}
            OR id = ${String(topic.dossier_id || '')}
          )
        ORDER BY
          CASE WHEN id = ${String(topic.dossier_id || '')} THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT 1
      `,
      sql`
        SELECT COUNT(*)::int AS point_count
        FROM creapd.research_points
        WHERE owner_user_id = ${ownerUserId}
          AND topic_id = ${String(topic.id)}
      `,
    ]);

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      data_authority: 'neon',
      topic: withBase44Aliases(topic),
      dossier: dossier ? withBase44Aliases(dossier) : null,
      point_count: pointCountRow?.point_count || 0,
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

    console.error('[CREAPD RESEARCH DOSSIER STATUS]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_dossier_status_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
