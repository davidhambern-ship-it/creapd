import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { planResearchVideo } from '../../../server/researchVideoPlanner.js';

export const config = {
  maxDuration: 60,
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
    message: String(error?.message || 'video_plan_failed').slice(0, 220),
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
    const packageId = String(body.package_id || '').trim();
    const audioDurationSeconds = Number(body.audio_duration_seconds);

    if (!packageId) {
      return response.status(400).json({ ok: false, error: 'package_id_required' });
    }

    const [pkg] = await sql`
      SELECT *
      FROM creapd.production_packages
      WHERE id = ${packageId}
        AND owner_user_id = ${ownerUserId}
        AND source_entity_type = 'ResearchPoint'
      LIMIT 1
    `;

    if (!pkg) {
      return response.status(404).json({ ok: false, error: 'production_package_not_found' });
    }

    if (!String(pkg.teleprompter_script || '').trim()) {
      return response.status(409).json({
        ok: false,
        error: 'teleprompter_script_required',
        message: 'Generate the teleprompter script before planning video.',
      });
    }

    if (!String(pkg.generated_audio_url || '').trim()) {
      return response.status(409).json({
        ok: false,
        error: 'voiceover_required',
        message: 'Generate the local Kokoro voiceover before planning video.',
      });
    }

    const result = await planResearchVideo({ pkg, audioDurationSeconds });
    const videoPlanPayload = JSON.stringify({
      video_plan: {
        ...result.plan,
        planner: {
          model: result.gateway.model,
          auth_source: result.gateway.auth_source,
          elapsed_ms: result.gateway.elapsed_ms,
          response_id: result.gateway.response_id,
        },
      },
    });

    const [updatedPackage] = await sql`
      UPDATE creapd.production_packages
      SET
        source_payload = COALESCE(source_payload, '{}'::jsonb) || ${videoPlanPayload}::jsonb,
        updated_at = now()
      WHERE id = ${packageId}
        AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      action: 'plan_video',
      source: 'neon',
      data_authority: 'neon',
      video_plan: result.plan,
      package: withBase44Aliases(updatedPackage),
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

    console.error('[CREAPD RESEARCH VIDEO PLAN]', error);
    const code = String(error?.code || 'video_plan_failed');
    const status = code === 'VIDEO_PLAN_DURATION_INVALID' || code === 'VIDEO_PLAN_PACKAGE_INVALID' ? 400 : 502;
    return response.status(status).json({
      ok: false,
      service: 'creapd-research',
      action: 'plan_video',
      error: code,
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
