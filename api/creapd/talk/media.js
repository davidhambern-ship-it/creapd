import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { generateTalkImages } from '../../../server/talkMedia.js';

export const config = {
  maxDuration: 120,
};

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'talk_media_request_failed').slice(0, 220),
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
      service: 'creapd-talk-media',
      error: 'database_not_configured',
    });
  }

  try {
    const { user } = await requireCreapdUser(request);
    const sql = getSql();
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const result = await generateTalkImages({
      sql,
      ownerUserId: String(user.id),
      configurationId: body.configuration_id,
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-talk-media',
      source: 'neon',
      data_authority: 'neon',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const status = [400, 401, 403, 404, 409].includes(Number(error?.status))
      ? Number(error.status)
      : 503;
    if (status === 503) console.error('[CREAPD TALK MEDIA]', error);
    return response.status(status).json({
      ok: false,
      service: 'creapd-talk-media',
      error: error?.code || 'talk_media_request_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
