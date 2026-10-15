import { randomUUID } from 'node:crypto';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { runResearchEngine } from '../../../server/researchEngine.js';
import { generateStructuredGatewayResponse } from '../../../server/aiGateway.js';

export const config = {
  maxDuration: 60,
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

    if (action === 'auto_build') {
      const producerMessage = cleanString(body.prompt);
      const skipConfirmation = body.skip_confirmation === true;

      if (!producerMessage) {
        return response.status(400).json({
          ok: false,
          service: 'creapd-research',
          error: 'prompt_required',
        });
      }

      const schema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          research_query: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          target_audience: { type: 'string' },
          tone: { type: 'string' },
          reading_style: { type: 'string' },
          research_depth: { type: 'string' },
          production_name: { type: 'string' },
          presentation_goal: { type: 'string' },
          confidence: { type: 'number' },
          clarification_question: { type: 'string' },
        },
        required: [
          'title',
          'research_query',
          'description',
          'category',
          'target_audience',
          'tone',
          'reading_style',
          'research_depth',
          'production_name',
          'presentation_goal',
          'confidence',
        ],
      };

      const prompt = `You are CREAPr, the AI Executive Producer inside CREAPD Research.

A producer wants to auto-build a research presentation. They said:

"${producerMessage}"

Infer the production intent and return:
- title: professional research topic title
- research_query: refined research query
- description: 2-3 sentence scope
- category: broad category
- target_audience
- tone: one of professional, conversational, energetic, serious, investigative, educational, inspirational, neutral, urgent, humorous
- reading_style: one of broadcast_news, podcast, documentary, educational_presentation, storytelling
- research_depth: one of quick_scan, standard, deep_dive, exhaustive
- production_name: short session name
- presentation_goal: one sentence
- confidence: 0-100
- clarification_question only when critical information is missing

Rules:
- Define what should be researched; do not perform the research here.
- Keep the scope suitable for a 6-10 slide presentation.
- Do not invent user-specific facts.
- Make the research_query detailed enough for the Research engine.`;

      const generated = await generateStructuredGatewayResponse({
        prompt,
        schema,
        schemaName: 'creapd_auto_build_topics_v1',
        maxOutputTokens: 1800,
        timeoutMs: 50000,
      });

      const inferred = generated?.data || {};
      const confidence = Number(inferred.confidence || 0);

      if (!skipConfirmation && confidence < 75 && cleanString(inferred.clarification_question)) {
        return response.status(200).json({
          ok: true,
          service: 'creapd-research',
          source: 'neon',
          data_authority: 'neon',
          action: 'auto_build',
          requires_confirmation: true,
          clarification_question: inferred.clarification_question,
          inferred_params: inferred,
        });
      }

      const configurationId = randomUUID();
      const topicId = randomUUID();
      const today = new Date().toISOString().slice(0, 10);
      const productionName = cleanString(inferred.production_name) || cleanString(inferred.title) || 'Auto-Built Production';
      const targetAudience = cleanString(inferred.target_audience) || 'General Public';
      const tone = cleanString(inferred.tone) || 'educational';
      const readingStyle = cleanString(inferred.reading_style) || 'documentary';
      const researchDepth = cleanString(inferred.research_depth) || 'standard';
      const title = cleanString(inferred.title) || 'Untitled Research Topic';
      const description = cleanString(inferred.description) || '';
      const researchQuery = cleanString(inferred.research_query) || title;
      const category = cleanString(inferred.category) || 'general';

      await sql`
        UPDATE creapd.research_production_configurations
        SET is_default = false, updated_at = now()
        WHERE owner_user_id = ${ownerUserId}
          AND is_default = true
      `;

      const [configuration] = await sql`
        INSERT INTO creapd.research_production_configurations (
          id, owner_user_id, production_name, show_date, target_audience, tone,
          reading_style, research_depth, max_points_per_topic, status, is_default,
          created_by_id, created_by_email, source_system, source_payload,
          created_at, updated_at
        ) VALUES (
          ${configurationId}, ${ownerUserId}, ${productionName}, ${today}::date, ${targetAudience}, ${tone},
          ${readingStyle}, ${researchDepth}, 8, 'ready', true,
          ${ownerUserId}, ${user.email || null}, 'creapd-vercel',
          ${JSON.stringify({
            created_via: 'auto-build',
            presentation_goal: cleanString(inferred.presentation_goal),
            inferred_params: inferred,
          })}::jsonb,
          now(), now()
        )
        RETURNING *
      `;

      const [topic] = await sql`
        INSERT INTO creapd.research_topics (
          id, configuration_id, owner_user_id, title, description, research_query,
          category, priority, research_depth, status, pipeline_stage,
          confidence_score, created_by_id, created_by_email, source_system, source_payload
        ) VALUES (
          ${topicId}, ${configurationId}, ${ownerUserId}, ${title}, ${description}, ${researchQuery},
          ${category}, 'standard', ${researchDepth}, 'pending', 'idle',
          ${confidence}, ${ownerUserId}, ${user.email || null}, 'creapd-vercel',
          ${JSON.stringify({
            created_via: 'auto-build',
            presentation_goal: cleanString(inferred.presentation_goal),
          })}::jsonb
        )
        RETURNING *
      `;

      return response.status(201).json({
        ok: true,
        service: 'creapd-research',
        source: 'neon',
        data_authority: 'neon',
        action: 'auto_build',
        topic_id: topic.id,
        configuration_id: configuration.id,
        inferred_params: inferred,
        topic: normalizeTopic(topic),
        configuration,
        message: `Research Assignment created: "${title}"`,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'create') {
      const input = body.topic && typeof body.topic === 'object' ? body.topic : body;
      const configurationId = cleanString(input.configuration_id);
      const title = cleanString(input.title);

      if (!configurationId || !title) {
        return response.status(400).json({
          ok: false,
          service: 'creapd-research',
          error: 'configuration_id_and_title_required',
        });
      }

      const [configuration] = await sql`
        SELECT id, research_depth
        FROM creapd.research_production_configurations
        WHERE id = ${configurationId}
          AND owner_user_id = ${ownerUserId}
        LIMIT 1
      `;

      if (!configuration) {
        return response.status(404).json({
          ok: false,
          service: 'creapd-research',
          error: 'configuration_not_found',
        });
      }

      const topicId = cleanString(input.id) || randomUUID();
      const description = cleanString(input.description) || '';
      const researchQuery = cleanString(input.research_query) || title;
      const category = cleanString(input.category) || 'general';
      const priority = cleanString(input.priority) || 'standard';
      const researchDepth = cleanString(input.research_depth) || configuration.research_depth || 'standard';
      const requestedStatus = cleanString(input.status);
      const status = ALLOWED_STATUSES.has(requestedStatus) ? requestedStatus : 'pending';

      const [createdTopic] = await sql`
        INSERT INTO creapd.research_topics (
          id, configuration_id, owner_user_id, title, description, research_query,
          category, priority, research_depth, status, pipeline_stage,
          created_by_id, created_by_email, source_system, source_payload
        ) VALUES (
          ${topicId}, ${configurationId}, ${ownerUserId}, ${title}, ${description}, ${researchQuery},
          ${category}, ${priority}, ${researchDepth}, ${status}, 'idle',
          ${ownerUserId}, ${user.email || null}, 'creapd-vercel',
          ${JSON.stringify({ created_via: 'topic-action', created_at: new Date().toISOString() })}::jsonb
        )
        RETURNING *
      `;

      return response.status(201).json({
        ok: true,
        service: 'creapd-research',
        source: 'neon',
        data_authority: 'neon',
        action: 'create',
        topic: normalizeTopic(createdTopic),
        timestamp: new Date().toISOString(),
      });
    }

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

    if (action === 'start') {
      const result = await runResearchEngine({
        ownerUserId,
        ownerEmail: user.email || null,
        configurationId: String(topic.configuration_id),
        topic: {
          ...topic,
          research_depth: cleanString(body.research_depth) || topic.research_depth,
        },
      });

      return response.status(200).json({
        ok: true,
        service: 'creapd-research-engine',
        source: 'neon',
        data_authority: 'neon',
        action: 'start',
        ...result,
        timestamp: new Date().toISOString(),
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
    if ([400, 401, 403, 404, 409].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-research',
        error: error.code || 'research_topic_action_rejected',
        safe_message: String(error?.message || 'research_topic_action_rejected').slice(0, 220),
      });
    }

    console.error('[CREAPD RESEARCH TOPIC WRITE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-research',
      error: error?.code || 'research_topic_write_failed',
      gateway_auth_source: error?.authSource || null,
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
