import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 10,
};

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
    message: String(error?.message || 'research_archive_read_failed').slice(0, 180),
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

    const [productions, dossiers] = await Promise.all([
      sql`
        SELECT *
        FROM creapd.research_production_configurations
        WHERE owner_user_id = ${ownerUserId}
        ORDER BY created_at DESC
        LIMIT 200
      `,
      sql`
        SELECT *
        FROM creapd.research_dossiers
        WHERE owner_user_id = ${ownerUserId}
        ORDER BY created_at DESC
        LIMIT 200
      `,
    ]);

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      data_authority: 'neon',
      productions: (productions || []).map(withBase44Aliases),
      dossiers: (dossiers || []).map(withBase44Aliases),
      packages: [],
      deferred: {
        packages: true,
        reason: 'ProductionPackage schema has not been migrated to Neon yet.',
      },
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

    console.error('[CREAPD RESEARCH ARCHIVE READ]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_archive_read_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
