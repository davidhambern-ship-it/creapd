import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

const ALLOWED_STATUSES = new Set(['researching', 'ready', 'failed']);

function cleanString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function withBase44Aliases(row) {
  if (!row) return row;
  return {
    ...row,
    confidence_score: row.confidence_score === null || row.confidence_score === undefined
      ? row.confidence_score
      : Number(row.confidence_score),
    debate_potential_score: row.debate_potential_score === null || row.debate_potential_score === undefined
      ? row.debate_potential_score
      : Number(row.debate_potential_score),
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'research_dossier_write_failed').slice(0, 180),
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
    const dossierId = cleanString(body.dossier_id);
    const status = cleanString(body.status);

    if (!dossierId) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research',
        error: 'dossier_id_required',
      });
    }

    if (!status || !ALLOWED_STATUSES.has(status)) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research',
        error: 'invalid_dossier_status',
      });
    }

    const [updatedDossier] = await sql`
      UPDATE creapd.research_dossiers
      SET status = ${status}, updated_at = now()
      WHERE id = ${dossierId}
        AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;

    if (!updatedDossier) {
      return response.status(404).json({
        ok: false,
        service: 'creapd-research',
        error: 'dossier_not_found',
      });
    }

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      data_authority: 'neon',
      dossier: withBase44Aliases(updatedDossier),
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

    console.error('[CREAPD RESEARCH DOSSIER WRITE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_dossier_write_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
