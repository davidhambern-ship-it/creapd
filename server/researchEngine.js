import { randomUUID } from 'node:crypto';
import { getSql } from './db.js';
import { generateStructuredGatewayResponse } from './aiGateway.js';

const objectSchema = properties => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});

const arraySchema = items => ({ type: 'array', items });
const stringArraySchema = arraySchema({ type: 'string' });

const sourceSchema = objectSchema({
  name: { type: 'string' },
  url: { type: 'string' },
  source_type: { type: 'string' },
  citation: { type: 'string' },
  verified: { type: 'boolean' },
});

const factSchema = objectSchema({
  fact: { type: 'string' },
  source: { type: 'string' },
});

const pointSchema = objectSchema({
  title: { type: 'string' },
  content: { type: 'string' },
  point_type: { type: 'string' },
  significance: { type: 'string' },
  suggested_angle: { type: 'string' },
  suggested_segment: { type: 'string' },
  priority_score: { type: 'number' },
  key_facts: arraySchema(factSchema),
  sources: arraySchema(sourceSchema),
});

const researchSchema = objectSchema({
  executive_summary: { type: 'string' },
  context_and_background: { type: 'string' },
  key_facts: arraySchema(factSchema),
  key_people: arraySchema(objectSchema({
    name: { type: 'string' },
    role: { type: 'string' },
    relevance: { type: 'string' },
  })),
  key_organizations: arraySchema(objectSchema({
    name: { type: 'string' },
    type: { type: 'string' },
    relevance: { type: 'string' },
  })),
  timeline: arraySchema(objectSchema({
    date: { type: 'string' },
    event: { type: 'string' },
    significance: { type: 'string' },
  })),
  counter_arguments: arraySchema(objectSchema({
    viewpoint: { type: 'string' },
    summary: { type: 'string' },
    source: { type: 'string' },
  })),
  data_and_statistics: arraySchema(objectSchema({
    statistic: { type: 'string' },
    source: { type: 'string' },
  })),
  coverage_angles: arraySchema(objectSchema({
    angle: { type: 'string' },
    rationale: { type: 'string' },
    target_audience: { type: 'string' },
  })),
  sources: arraySchema(sourceSchema),
  confidence_score: { type: 'number' },
  claim_confidence_scores: arraySchema(objectSchema({
    claim: { type: 'string' },
    score: { type: 'number' },
    status: { type: 'string' },
    notes: { type: 'string' },
  })),
  critical_analysis_report: objectSchema({
    gray_areas: stringArraySchema,
    logical_gaps: stringArraySchema,
    competing_perspectives: arraySchema(objectSchema({
      viewpoint: { type: 'string' },
      evidence: { type: 'string' },
      weakness: { type: 'string' },
    })),
    open_questions: stringArraySchema,
  }),
  debate_potential_score: { type: 'number' },
  organization_structure: objectSchema({
    themes: arraySchema(objectSchema({
      theme: { type: 'string' },
      description: { type: 'string' },
      significance: { type: 'string' },
    })),
  }),
  research_points: {
    type: 'array',
    minItems: 10,
    maxItems: 10,
    items: pointSchema,
  },
});

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function json(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function buildPrompt(topic, configuration) {
  const today = new Date().toISOString().slice(0, 10);
  const depth = clean(topic.research_depth || configuration.research_depth, 'standard');

  return `You are CREAPD's senior research desk. Produce a production-ready factual research dossier and exactly 10 production-ready research points using LIVE WEB SEARCH.

CURRENT DATE: ${today}
TOPIC: ${topic.title}
DESCRIPTION: ${topic.description || 'No additional description provided.'}
RESEARCH QUERY: ${topic.research_query || topic.title}
CATEGORY: ${topic.category || 'general'}
RESEARCH DEPTH: ${depth}

RESEARCH RULES:
- Use live web search and prefer primary sources, official records, academic sources, established reference works, and reputable reporting.
- Do not invent facts, quotations, organizations, statistics, dates, or URLs.
- Distinguish well-established fact from disputed interpretation.
- Include meaningful opposing viewpoints and gray areas when they exist.
- Every important factual claim should be traceable to one of the returned sources.
- Source URLs must be real https URLs discovered during this run.
- Confidence scores are 0-100. Debate potential is 0-10.
- Return exactly 10 research_points. Each point must be self-contained, useful to a producer, and supported by returned sources.
- Vary research point types where appropriate: finding, statistic, quote, context, counter_argument, timeline_event, key_person, key_organization, coverage_angle, data_point.
- suggested_segment should be one of: Lead Story, Quick Hit, Feature, Breaking, Talking Points, Fact Check, B-Roll Package.

Build the dossier, fact-check its strongest claims, stress-test ambiguity and competing perspectives, then derive the 10 strongest production points from that same verified research.`;
}

async function markFailure(sql, { ownerUserId, topicId, dossierId, error }) {
  const message = String(error?.message || 'Research failed').slice(0, 800);
  const metadata = json({
    pipeline: 'vercelResearchV1',
    current_stage: 'failed',
    failed_at: new Date().toISOString(),
    error_code: error?.code || null,
  }, {});

  try {
    if (dossierId) {
      await sql`
        UPDATE creapd.research_dossiers
        SET status = 'failed', error_message = ${message}, orchestration_metadata = ${metadata}::jsonb, updated_at = now()
        WHERE id = ${dossierId} AND owner_user_id = ${ownerUserId}
      `;
    }
  } catch {}

  try {
    if (topicId) {
      await sql`
        UPDATE creapd.research_topics
        SET status = 'failed', pipeline_stage = 'failed', updated_at = now()
        WHERE id = ${topicId} AND owner_user_id = ${ownerUserId}
      `;
    }
  } catch {}
}

export async function runResearchEngine({ ownerUserId, ownerEmail, configurationId, topic }) {
  const sql = getSql();
  const topicId = clean(topic.id);
  const title = clean(topic.title);
  const dossierId = clean(topic.dossier_id) || randomUUID();

  if (!topicId || !title || !configurationId || !ownerUserId) {
    const error = new Error('Research engine requires topic id, title, configuration id, and owner id');
    error.code = 'RESEARCH_ENGINE_INPUT_INVALID';
    throw error;
  }

  const [configuration] = await sql`
    SELECT *
    FROM creapd.research_production_configurations
    WHERE id = ${configurationId}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;

  if (!configuration) {
    const error = new Error('Research configuration was not found for this user');
    error.code = 'RESEARCH_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const [existingById] = await sql`
    SELECT id, owner_user_id, dossier_id, status
    FROM creapd.research_topics
    WHERE id = ${topicId}
    LIMIT 1
  `;

  if (existingById && String(existingById.owner_user_id) !== String(ownerUserId)) {
    const error = new Error('Topic id already belongs to another user');
    error.code = 'RESEARCH_TOPIC_ID_CONFLICT';
    error.status = 409;
    throw error;
  }

  const depth = clean(topic.research_depth || configuration.research_depth, 'standard');
  const description = clean(topic.description);
  const researchQuery = clean(topic.research_query, title);
  const category = clean(topic.category, 'general');
  const initialMeta = json({
    pipeline: 'vercelResearchV1',
    current_stage: 'discovery',
    started_at: new Date().toISOString(),
  }, {});

  if (existingById) {
    await sql`
      UPDATE creapd.research_topics
      SET
        configuration_id = ${configurationId},
        title = ${title},
        description = ${description},
        research_query = ${researchQuery},
        category = ${category},
        priority = 'standard',
        research_depth = ${depth},
        dossier_id = ${dossierId},
        status = 'researching',
        pipeline_stage = 'discovery',
        point_count = 0,
        approved_point_count = 0,
        confidence_score = 0,
        sources_count = 0,
        executive_summary = NULL,
        research_started_at = now(),
        research_completed_at = NULL,
        updated_at = now()
      WHERE id = ${topicId}
        AND owner_user_id = ${ownerUserId}
    `;
  } else {
    await sql`
      INSERT INTO creapd.research_topics (
        id, configuration_id, owner_user_id, title, description, research_query,
        category, priority, research_depth, dossier_id, status, pipeline_stage,
        point_count, approved_point_count, confidence_score, sources_count,
        research_started_at, created_by_id, created_by_email, source_system, source_payload
      ) VALUES (
        ${topicId}, ${configurationId}, ${ownerUserId}, ${title}, ${description}, ${researchQuery},
        ${category}, 'standard', ${depth}, ${dossierId}, 'researching', 'discovery',
        0, 0, 0, 0,
        now(), ${ownerUserId}, ${ownerEmail || null}, 'creapd-vercel', ${initialMeta}::jsonb
      )
    `;
  }

  await sql`
    DELETE FROM creapd.research_points
    WHERE topic_id = ${topicId}
      AND owner_user_id = ${ownerUserId}
      AND created_by_ai = true
  `;

  const [existingDossier] = await sql`
    SELECT id
    FROM creapd.research_dossiers
    WHERE id = ${dossierId}
      AND owner_user_id = ${ownerUserId}
    LIMIT 1
  `;

  if (existingDossier) {
    await sql`
      UPDATE creapd.research_dossiers
      SET
        topic_id = ${topicId},
        research_query = ${researchQuery},
        status = 'researching',
        error_message = NULL,
        orchestration_metadata = ${initialMeta}::jsonb,
        updated_at = now()
      WHERE id = ${dossierId}
        AND owner_user_id = ${ownerUserId}
    `;
  } else {
    await sql`
      INSERT INTO creapd.research_dossiers (
        id, owner_user_id, topic_id, research_query, status,
        role_assignments, orchestration_metadata, created_by_id, created_by_email,
        source_system, source_payload
      ) VALUES (
        ${dossierId}, ${ownerUserId}, ${topicId}, ${researchQuery}, 'researching',
        ${json({ research: 'AI_GATEWAY', synthesis: 'AI_GATEWAY', verification: 'AI_GATEWAY' }, {})}::jsonb,
        ${initialMeta}::jsonb,
        ${ownerUserId}, ${ownerEmail || null}, 'creapd-vercel', ${initialMeta}::jsonb
      )
    `;
  }

  try {
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_research_v1',
      schema: researchSchema,
      maxOutputTokens: 6500,
      timeoutMs: 50000,
      prompt: buildPrompt({ ...topic, title, description, research_query: researchQuery, category, research_depth: depth }, configuration),
    });

    const data = result.data || {};
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const points = Array.isArray(data.research_points) ? data.research_points.slice(0, 10) : [];
    const confidence = clampNumber(data.confidence_score, 0, 100, 0);
    const debateScore = clampNumber(data.debate_potential_score, 0, 10, 0);
    const completedMeta = json({
      pipeline: 'vercelResearchV1',
      current_stage: 'complete',
      completed_at: new Date().toISOString(),
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
      response_id: result.responseId,
    }, {});

    await sql`
      UPDATE creapd.research_dossiers
      SET
        executive_summary = ${clean(data.executive_summary)},
        context_and_background = ${clean(data.context_and_background)},
        key_facts = ${json(data.key_facts, [])}::jsonb,
        key_people = ${json(data.key_people, [])}::jsonb,
        key_organizations = ${json(data.key_organizations, [])}::jsonb,
        timeline = ${json(data.timeline, [])}::jsonb,
        counter_arguments = ${json(data.counter_arguments, [])}::jsonb,
        data_and_statistics = ${json(data.data_and_statistics, [])}::jsonb,
        sources = ${json(sources, [])}::jsonb,
        coverage_angles = ${json(data.coverage_angles, [])}::jsonb,
        confidence_score = ${confidence},
        status = 'ready',
        error_message = NULL,
        organization_structure = ${json(data.organization_structure, { themes: [] })}::jsonb,
        critical_analysis_report = ${json(data.critical_analysis_report, {})}::jsonb,
        debate_potential_score = ${debateScore},
        claim_confidence_scores = ${json(data.claim_confidence_scores, [])}::jsonb,
        orchestration_metadata = ${completedMeta}::jsonb,
        source_payload = ${completedMeta}::jsonb,
        updated_at = now()
      WHERE id = ${dossierId}
        AND owner_user_id = ${ownerUserId}
    `;

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index] || {};
      const pointId = randomUUID();
      const priority = clampNumber(point.priority_score, 0, 10, 5);
      await sql`
        INSERT INTO creapd.research_points (
          id, configuration_id, topic_id, owner_user_id, topic_title, title,
          content, point_type, key_facts, sources, significance, suggested_angle,
          suggested_segment, priority_score, confidence_score, status, display_order,
          created_by_ai, created_by_id, created_by_email, source_system, source_payload
        ) VALUES (
          ${pointId}, ${configurationId}, ${topicId}, ${ownerUserId}, ${title}, ${clean(point.title, 'Untitled Point')},
          ${clean(point.content)}, ${clean(point.point_type, 'finding')}, ${json(point.key_facts, [])}::jsonb,
          ${json(point.sources, [])}::jsonb, ${clean(point.significance)}, ${clean(point.suggested_angle)},
          ${clean(point.suggested_segment, 'Quick Hit')}, ${priority}, ${confidence}, 'pending', ${index},
          true, ${ownerUserId}, ${ownerEmail || null}, 'creapd-vercel', ${completedMeta}::jsonb
        )
      `;
    }

    await sql`
      UPDATE creapd.research_topics
      SET
        status = 'in_review',
        pipeline_stage = 'editorial_review',
        dossier_id = ${dossierId},
        point_count = ${points.length},
        approved_point_count = 0,
        confidence_score = ${confidence},
        sources_count = ${sources.length},
        executive_summary = ${clean(data.executive_summary)},
        research_completed_at = now(),
        source_payload = ${completedMeta}::jsonb,
        updated_at = now()
      WHERE id = ${topicId}
        AND owner_user_id = ${ownerUserId}
    `;

    return {
      success: true,
      topic_id: topicId,
      dossier_id: dossierId,
      points_extracted: points.length,
      sources_count: sources.length,
      confidence_score: confidence,
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
    };
  } catch (error) {
    await markFailure(sql, { ownerUserId, topicId, dossierId, error });
    throw error;
  }
}
