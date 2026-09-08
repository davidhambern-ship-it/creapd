import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

const ALLOWED_STATUSES = new Set([
  'pending',
  'researching',
  'researched',
  'in_review',
  'selected',
  'used',
  'rejected',
  'failed',
  'archived',
]);

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeTopic(row) {
  if (!row) return row;
  return {
    ...row,
    confidence_score: row.confidence_score === null || row.confidence_score === undefined
      ? row.confidence_score
      : Number(row.confidence_score),
    source_count: row.sources_count ?? row.source_count ?? 0,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_topic_write_failed').slice(0, 180),
  };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
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
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const action = cleanString(body.action);
    const topicId = cleanString(body.topic_id);

    if (!topicId) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research',
        error: 'topic_id_required',
      });
    }

    const [topic] = await sql`
      SELECT *
      FROM creapd.research_topics
      WHERE id = ${topicId}
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

    if (action === 'status') {
      const status = cleanString(body.status);
      if (!status || !ALLOWED_STATUSES.has(status)) {
        return response.status(400).json({
          ok: false,
          service: 'creapd-research',
          error: 'invalid_topic_status',
        });
      }

      const rejectionReason = cleanString(body.rejection_reason);
      const [updatedTopic] = await sql`
        UPDATE creapd.research_topics
        SET
          status = ${status},
          rejection_reason = ${status === 'rejected' ? rejectionReason : null},
          archived_date = CASE WHEN ${status} = 'archived' THEN now() ELSE archived_date END,
          updated_at = now()
        WHERE id = ${topicId}
          AND owner_user_id = ${ownerUserId}
        RETURNING *
      `;

      return response.status(200).json({
        ok: true,
        service: 'creapd-research',
        source: 'neon',
        data_authority: 'neon',
        action: 'status',
        topic: normalizeTopic(updatedTopic),
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'delete') {
      const [dependencies] = await sql`
        SELECT
          EXISTS(
            SELECT 1
            FROM creapd.research_points p
            WHERE p.topic_id = ${topicId}
              AND p.owner_user_id = ${ownerUserId}
          ) AS has_points,
          EXISTS(
            SELECT 1
            FROM creapd.research_dossiers d
            WHERE d.owner_user_id = ${ownerUserId}
              AND (d.topic_id = ${topicId} OR d.id = ${topic.dossier_id || ''})
          ) AS has_dossier
      `;

      if (dependencies?.has_points || dependencies?.has_dossier || topic.dossier_id) {
        return response.status(409).json({
          ok: false,
          service: 'creapd-research',
          error: 'topic_has_research_data',
          safe_action: 'archive',
        });
      }

      await sql`
        DELETE FROM creapd.research_topics
        WHERE id = ${topicId}
          AND owner_user_id = ${ownerUserId}
      `;

      return response.status(200).json({
        ok: true,
        service: 'creapd-research',
        source: 'neon',
        data_authority: 'neon',
        action: 'delete',
        topic_id: topicId,
        timestamp: new Date().toISOString(),
      });
    }

    return response.status(400).json({
      ok: false,
      service: 'creapd-research',
      error: 'invalid_topic_action',
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-research',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD RESEARCH TOPIC WRITE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_topic_write_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
