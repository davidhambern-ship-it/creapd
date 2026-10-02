import { randomUUID } from 'node:crypto';
import { generateStructuredGatewayResponse } from './aiGateway.js';

const objectSchema = properties => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const arraySchema = items => ({ type: 'array', items });
const stringArraySchema = arraySchema({ type: 'string' });

const assemblySegmentSchema = objectSchema({
  order: { type: 'number' },
  title: { type: 'string' },
  purpose: { type: 'string' },
  estimated_minutes: { type: 'number' },
  source_ids: stringArraySchema,
  key_points: stringArraySchema,
  counterpoints: stringArraySchema,
  fact_check_notes: { type: 'string' },
  transition_goal: { type: 'string' },
});

const podcastAssemblySchema = objectSchema({
  episode_direction: { type: 'string' },
  opening_goal: { type: 'string' },
  closing_goal: { type: 'string' },
  assembly_notes: { type: 'string' },
  segments: arraySchema(assemblySegmentSchema),
});

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function json(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}

function buildAssemblyPrompt(configuration, articles = []) {
  const totalRuntime = Math.max(5, number(configuration.total_show_runtime, 60));
  const intro = Math.max(0, number(configuration.intro_runtime, 2));
  const outro = Math.max(0, number(configuration.outro_runtime, 2));
  const sponsor = Math.max(0, number(configuration.commercial_sponsor_runtime, 0));
  const editorialRuntime = Math.max(1, totalRuntime - intro - outro - sponsor);

  const sources = articles.map((article, index) => ({
    id: clean(article.id, String(index + 1)),
    title: clean(article.title, `Source ${index + 1}`),
    source: clean(article.source_name || article.source),
    url: clean(article.url || article.source_url),
    category: clean(article.category),
    summary: clean(article.summary).slice(0, 1800),
    why_it_matters: clean(article.why_it_matters).slice(0, 1200),
    key_facts: clean(article.key_facts).slice(0, 1800),
    timeline: clean(article.timeline).slice(0, 1200),
    talking_points: clean(article.talking_points).slice(0, 1800),
    opposing_viewpoints: clean(article.opposing_viewpoints).slice(0, 1600),
    fact_check_notes: clean(article.fact_check_notes).slice(0, 1400),
    body_excerpt: clean(article.body_content || article.full_text_excerpt || article.transcript).slice(0, 5000),
  }));

  return `You are the EPISODE ASSEMBLY desk inside CREAPD.

The producer has already completed Podcast Setup and approved the research sources below.
DO NOT search for more sources.
DO NOT write the finished host script yet.
DO NOT treat each article as its own segment automatically.

Your job is to turn the approved research pool into a coherent podcast episode blueprint that Production can later script.

PODCAST SETUP
- Show: ${configuration.production_name || 'Podcast'}
- Host: ${configuration.host_name || 'Host'}
- Co-host: ${configuration.co_host_name || 'None'}
- Format: ${configuration.show_format || 'Podcast'}
- Tone: ${configuration.show_tone || 'Conversational'}
- Description: ${configuration.show_description || 'Not provided'}
- Total runtime: ${totalRuntime} minutes
- Editorial runtime available: approximately ${editorialRuntime} minutes
- Intro: ${intro} minutes
- Sponsor / break time: ${sponsor} minutes
- Outro: ${outro} minutes
- Configured topics: ${parseArray(configuration.topics).join(', ') || 'Not specified'}
- Guest context: ${configuration.guest_details || 'None'}

APPROVED SOURCE MATERIAL
${JSON.stringify(sources)}

ASSEMBLY JOB
1. Determine the strongest overall episode direction supported by the approved material and the configured show.
2. Combine related sources into logical discussion segments. Multiple sources may support one segment.
3. Use only source_ids that exist in the approved source material.
4. Create enough substantive segments to fill the editorial runtime without filler.
5. estimated_minutes across all segments should approximately equal the editorial runtime.
6. For each segment, identify the key points Production should later turn into host copy.
7. Preserve useful counterpoints and fact-check cautions.
8. transition_goal should explain how the segment should naturally hand off to the next part of the show.
9. opening_goal and closing_goal describe what those parts should accomplish; do not write the final spoken copy.
10. This is an editorial blueprint, not a transcript.

Return only the requested structured object.`;
}

export async function buildPodcastAssembly({
  sql,
  ownerUserId,
  configurationId,
  articles = [],
}) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = String(configurationId || '').trim();

  if (!ownerId || !configId) {
    const error = new Error('Podcast assembly requires owner and configuration id');
    error.code = 'PODCAST_ASSEMBLY_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT *
    FROM creapd.talk_production_configurations
    WHERE id=${configId} AND owner_user_id=${ownerId}
    LIMIT 1
  `;

  if (!configuration) {
    const error = new Error('Podcast configuration was not found');
    error.code = 'PODCAST_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const approved = (Array.isArray(articles) ? articles : [])
    .filter(article => article && article.id && article.title)
    .slice(0, 30);

  if (!approved.length) {
    const error = new Error('No approved Podcast research was supplied for assembly');
    error.code = 'PODCAST_ASSEMBLY_RESEARCH_REQUIRED';
    error.status = 409;
    throw error;
  }

  const previousMeta = configuration.build_metadata && typeof configuration.build_metadata === 'object'
    ? configuration.build_metadata
    : {};

  const startedAt = new Date().toISOString();
  await sql`
    UPDATE creapd.talk_production_configurations
    SET
      status='building',
      build_metadata=${json({
        ...previousMeta,
        pipeline: 'podcastAssemblyV1',
        stage: 'assembling',
        assembly_started_at: startedAt,
        approved_source_count: approved.length,
      })}::jsonb,
      updated_at=now()
    WHERE id=${configId} AND owner_user_id=${ownerId}
  `;

  try {
    const result = await generateStructuredGatewayResponse({
      webSearch: false,
      schemaName: 'creapd_podcast_assembly_v1',
      schema: podcastAssemblySchema,
      maxOutputTokens: 7000,
      timeoutMs: 120000,
      prompt: buildAssemblyPrompt(configuration, approved),
    });

    const data = result?.data || {};
    const rawSegments = Array.isArray(data.segments) ? data.segments : [];
    if (!rawSegments.length) {
      const error = new Error('Podcast assembly returned no episode segments');
      error.code = 'PODCAST_ASSEMBLY_EMPTY';
      throw error;
    }

    const allowedSourceIds = new Set(approved.map(article => String(article.id)));
    const normalizedSegments = rawSegments.map((segment, index) => ({
      order: Number.isFinite(Number(segment.order)) ? Math.trunc(Number(segment.order)) : index + 1,
      title: clean(segment.title, `Segment ${index + 1}`),
      purpose: clean(segment.purpose),
      estimated_minutes: Math.max(1, number(segment.estimated_minutes, 8)),
      source_ids: (Array.isArray(segment.source_ids) ? segment.source_ids : [])
        .map(String)
        .filter(id => allowedSourceIds.has(id)),
      key_points: Array.isArray(segment.key_points) ? segment.key_points.map(clean).filter(Boolean) : [],
      counterpoints: Array.isArray(segment.counterpoints) ? segment.counterpoints.map(clean).filter(Boolean) : [],
      fact_check_notes: clean(segment.fact_check_notes),
      transition_goal: clean(segment.transition_goal),
    }));

    await Promise.all([
      sql`DELETE FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_segments WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_assets WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_sessions WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
    ]);

    const sourceToTopic = new Map();

    for (let index = 0; index < normalizedSegments.length; index += 1) {
      const segment = normalizedSegments[index];
      for (const sourceId of segment.source_ids) {
        if (!sourceToTopic.has(sourceId)) sourceToTopic.set(sourceId, segment.title);
      }

      const segmentSources = approved.filter(article => segment.source_ids.includes(String(article.id)));
      const sourceNames = [...new Set(segmentSources.map(article => clean(article.source_name || article.source)).filter(Boolean))];
      const sourceLinks = [...new Set(segmentSources.map(article => clean(article.url || article.source_url)).filter(Boolean))];

      const topicPayload = {
        pipeline: 'podcastAssemblyV1',
        source_ids: segment.source_ids,
        estimated_minutes: segment.estimated_minutes,
        transition_goal: segment.transition_goal,
        purpose: segment.purpose,
      };

      await sql`
        INSERT INTO creapd.talk_topics (
          id, configuration_id, owner_user_id, topic_name, generated_summary, talking_points,
          sources, source_links, suggested_placement, verification_status, verification_notes,
          counter_perspectives, debate_questions, confidence_score, status, display_order,
          source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${segment.title}, ${segment.purpose},
          ${segment.key_points.join('\n')}, ${sourceNames.join(', ') || 'Approved Podcast Research'},
          ${JSON.stringify(sourceLinks)}::jsonb, ${`Segment ${index + 1} · ~${segment.estimated_minutes} min`},
          'verified', ${segment.fact_check_notes || 'Assembled from producer-approved Podcast research.'},
          ${JSON.stringify(segment.counterpoints)}::jsonb, '[]'::jsonb, 100, 'approved', ${index},
          'creapd-podcast-assembly', ${json(topicPayload)}::jsonb
        )
      `;
    }

    for (const article of approved) {
      const topicName = sourceToTopic.get(String(article.id)) || normalizedSegments[0].title;
      const sourcePayload = {
        pipeline: 'podcastAssemblyV1',
        article_id: String(article.id),
        matched_segment: topicName,
      };
      const summaryParts = [
        clean(article.summary),
        clean(article.why_it_matters) ? `Why it matters: ${clean(article.why_it_matters)}` : '',
        clean(article.key_facts) ? `Key facts: ${clean(article.key_facts)}` : '',
        clean(article.talking_points) ? `Talking points: ${clean(article.talking_points)}` : '',
        clean(article.fact_check_notes) ? `Fact-check notes: ${clean(article.fact_check_notes)}` : '',
      ].filter(Boolean);

      await sql`
        INSERT INTO creapd.talk_research_items (
          id, configuration_id, owner_user_id, topic_name, title, source, source_url,
          category, summary, research_date, relevance, verification_status,
          verification_notes, confidence_score, source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${topicName}, ${clean(article.title)},
          ${clean(article.source_name || article.source, 'Approved Podcast Research')},
          ${clean(article.url || article.source_url) || null}, ${clean(article.category, 'podcast_research')},
          ${summaryParts.join('\n\n') || clean(article.body_content).slice(0, 3000)},
          ${new Date().toISOString().slice(0, 10)}::date, 'high', 'verified',
          ${clean(article.fact_check_notes, 'Producer-approved source material.')}, 100,
          'creapd-podcast-assembly', ${json(sourcePayload)}::jsonb
        )
      `;
    }

    const assembly = {
      episode_direction: clean(data.episode_direction),
      opening_goal: clean(data.opening_goal),
      closing_goal: clean(data.closing_goal),
      assembly_notes: clean(data.assembly_notes),
      segments: normalizedSegments,
    };

    const completedAt = new Date().toISOString();
    const metadata = {
      ...previousMeta,
      pipeline: 'podcastAssemblyV1',
      stage: 'assembly_complete',
      assembly_started_at: startedAt,
      assembly_completed_at: completedAt,
      approved_source_count: approved.length,
      assembly_segment_count: normalizedSegments.length,
      episode_direction: assembly.episode_direction,
      opening_goal: assembly.opening_goal,
      closing_goal: assembly.closing_goal,
      assembly_notes: assembly.assembly_notes,
      assembly_segments: normalizedSegments,
      assembly_model: result?.model || null,
      assembly_elapsed_ms: result?.elapsedMs || null,
    };

    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='assembled', build_metadata=${json(metadata)}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;

    return {
      configuration_id: configId,
      source_count: approved.length,
      segment_count: normalizedSegments.length,
      assembly,
      model: result?.model || null,
      elapsed_ms: result?.elapsedMs || null,
    };
  } catch (error) {
    const failedMeta = {
      ...previousMeta,
      pipeline: 'podcastAssemblyV1',
      stage: 'assembly_failed',
      assembly_started_at: startedAt,
      failed_at: new Date().toISOString(),
      code: error?.code || null,
      message: String(error?.message || 'Podcast assembly failed').slice(0, 500),
    };
    try {
      await sql`
        UPDATE creapd.talk_production_configurations
        SET status='failed', build_metadata=${json(failedMeta)}::jsonb, updated_at=now()
        WHERE id=${configId} AND owner_user_id=${ownerId}
      `;
    } catch {}
    throw error;
  }
}
