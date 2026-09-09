import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { readProductionCore } from '../../../server/productionCore.js';

export const config = {
  maxDuration: 10,
};

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'production_core_read_failed').slice(0, 180),
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
      service: 'creapd-production-core',
      error: 'database_not_configured',
    });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const data = await readProductionCore(sql, user.id, {
      limit: request.query?.limit,
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-production-core',
      source: 'neon',
      data_authority: 'neon',
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-production-core',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD PRODUCTION CORE READ]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-production-core',
      error: 'production_core_read_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
