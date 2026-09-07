import { getSql, hasDatabaseConfig } from '../../../server/db.js';

export const config = {
  maxDuration: 10,
};

const DEFAULT_CANARY_TOPIC_ID = '6a9c801e6d6806231b3f7962';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      ok: false,
      error: 'method_not_allowed',
    });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'database_not_configured',
    });
  }

  const requestedTopicId = Array.isArray(request.query?.topic_id)
    ? request.query.topic_id[0]
    : request.query?.topic_id;
  const topicId = requestedTopicId || DEFAULT_CANARY_TOPIC_ID;

  try {
    const sql = getSql();

    const [topic] = await sql`
      SELECT
        id,
        configuration_id,
        dossier_id,
        title,
        status,
        pipeline_stage,
        point_count,
        approved_point_count,
        confidence_score,
        sources_count,
        updated_at
      FROM creapd.research_topics
      WHERE id = ${topicId}
      LIMIT 1
    `;

    if (!topic) {
      return response.status(404).json({
        ok: false,
        service: 'creapd-research',
        error: 'topic_not_found',
        topic_id: topicId,
      });
    }

    const [configuration] = await sql`
      SELECT
        id,
        production_name,
        status,
        research_depth,
        updated_at
      FROM creapd.research_production_configurations
      WHERE id = ${topic.configuration_id}
      LIMIT 1
    `;

    const [dossier] = await sql`
      SELECT
        id,
        topic_id,
        status,
        confidence_score,
        jsonb_array_length(COALESCE(sources, '[]'::jsonb)) AS source_count,
        updated_at
      FROM creapd.research_dossiers
      WHERE topic_id = ${topic.id}
         OR id = ${topic.dossier_id || ''}
      ORDER BY CASE WHEN id = ${topic.dossier_id || ''} THEN 0 ELSE 1 END
      LIMIT 1
    `;

    const [pointSummary] = await sql`
      SELECT
        COUNT(*)::int AS point_count,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
        MIN(display_order)::int AS first_order,
        MAX(display_order)::int AS last_order
      FROM creapd.research_points
      WHERE topic_id = ${topic.id}
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-research',
      source: 'neon',
      topic: {
        id: topic.id,
        title: topic.title,
        status: topic.status,
        pipeline_stage: topic.pipeline_stage,
        confidence_score: Number(topic.confidence_score || 0),
        recorded_point_count: Number(topic.point_count || 0),
        recorded_sources_count: Number(topic.sources_count || 0),
        updated_at: topic.updated_at,
      },
      configuration: configuration
        ? {
            id: configuration.id,
            production_name: configuration.production_name,
            status: configuration.status,
            research_depth: configuration.research_depth,
            updated_at: configuration.updated_at,
          }
        : null,
      dossier: dossier
        ? {
            id: dossier.id,
            status: dossier.status,
            confidence_score: Number(dossier.confidence_score || 0),
            source_count: Number(dossier.source_count || 0),
            updated_at: dossier.updated_at,
          }
        : null,
      points: {
        count: Number(pointSummary?.point_count || 0),
        approved_count: Number(pointSummary?.approved_count || 0),
        first_order: pointSummary?.first_order ?? null,
        last_order: pointSummary?.last_order ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CREAPD RESEARCH CANARY]', error);

    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: 'research_read_failed',
      timestamp: new Date().toISOString(),
    });
  }
}
