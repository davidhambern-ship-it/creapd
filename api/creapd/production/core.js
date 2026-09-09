import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { readProductionCore } from '../../../server/productionCore.js';
import { assembleResearchPresentation } from '../../../server/researchPresentationAssembly.js';

export const config = {
  maxDuration: 60,
};

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'production_core_request_failed').slice(0, 220),
    ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {}),
  };
}

async function handlePost(request, response, sql, ownerUserId) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const action = String(body.action || '').trim();

  if (!action) {
    return response.status(400).json({ ok: false, error: 'action_required' });
  }

  if (action !== 'assemble_research_presentation') {
    return response.status(400).json({ ok: false, error: 'unsupported_action' });
  }

  try {
    const result = await assembleResearchPresentation({
      sql,
      ownerUserId,
      configurationId: body.configuration_id || body.config_id,
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-production-core',
      action,
      source: 'neon',
      data_authority: 'neon',
      presentation: result.presentation,
      configuration: result.configuration,
      package_count: result.packages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    if ([400, 404, 409].includes(status)) {
      return response.status(status).json({
        ok: false,
        service: 'creapd-production-core',
        action,
        error: error.code || 'research_presentation_assembly_failed',
        diagnostic: safeError(error),
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
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
      service: 'creapd-production-core',
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

    const data = await readProductionCore(sql, ownerUserId, {
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

    console.error('[CREAPD PRODUCTION CORE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-production-core',
      error: 'production_core_request_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
