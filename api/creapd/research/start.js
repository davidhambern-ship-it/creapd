import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { runResearchEngine } from '../../../server/researchEngine.js';

export const config = {
  maxDuration: 60,
};

function clean(value) {
  const text = String(value ?? '').trim();
  return text || null;
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
      service: 'creapd-research-engine',
      error: 'database_not_configured',
    });
  }

  try {
    const sql = getSql();
    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    let configurationId = clean(body.configuration_id);
    let topic = body.topic && typeof body.topic === 'object' ? { ...body.topic } : {};
    const requestedTopicId = clean(body.topic_id) || clean(topic.id);

    if (requestedTopicId && (!clean(topic.title) || !configurationId)) {
      const [existingTopic] = await sql`
        SELECT *
        FROM creapd.research_topics
        WHERE id = ${requestedTopicId}
          AND owner_user_id = ${ownerUserId}
        LIMIT 1
      `;

      if (!existingTopic) {
        return response.status(404).json({
          ok: false,
          service: 'creapd-research-engine',
          error: 'topic_not_found',
        });
      }

      topic = {
        ...existingTopic,
        ...topic,
        id: requestedTopicId,
        research_depth: clean(body.research_depth) || clean(topic.research_depth) || existingTopic.research_depth,
      };
      configurationId = configurationId || clean(existingTopic.configuration_id);
    }

    if (!configurationId || !clean(topic.id) || !clean(topic.title)) {
      return response.status(400).json({
        ok: false,
        service: 'creapd-research-engine',
        error: 'configuration_topic_id_and_title_required',
      });
    }

    const result = await runResearchEngine({
      ownerUserId,
      ownerEmail: user.email || null,
      configurationId,
      topic,
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-research-engine',
      source: 'neon',
      data_authority: 'neon',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403, 404, 409].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-research-engine',
        error: error.code || 'research_start_rejected',
        safe_message: String(error?.message || 'research_start_rejected').slice(0, 220),
      });
    }

    console.error('[CREAPD RESEARCH ENGINE START]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research-engine',
      error: error?.code || 'research_engine_failed',
      gateway_auth_source: error?.authSource || null,
      diagnostic: {
        error_name: error?.name || null,
        error_code: error?.code || null,
        gateway_status: error?.status || null,
        safe_message: String(error?.message || 'research_engine_failed').slice(0, 220),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
