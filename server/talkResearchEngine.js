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

const researchItemSchema = objectSchema({
  topic_name: { type: 'string' },
  title: { type: 'string' },
  source: { type: 'string' },
  source_url: { type: 'string' },
  category: { type: 'string' },
  summary: { type: 'string' },
  date: { type: 'string' },
  relevance: { type: 'string' },
  verification_status: { type: 'string' },
  verification_notes: { type: 'string' },
  confidence_score: { type: 'number' },
});

const topicSchema = objectSchema({
  topic_name: { type: 'string' },
  generated_summary: { type: 'string' },
  talking_points: { type: 'string' },
  sources: { type: 'string' },
  source_links: stringArraySchema,
  suggested_placement: { type: 'string' },
  verification_status: { type: 'string' },
  verification_notes: { type: 'string' },
  counter_perspectives: stringArraySchema,
  debate_questions: stringArraySchema,
  confidence_score: { type: 'number' },
});

const guestSchema = objectSchema({
  guest_name: { type: 'string' },
  title_role: { type: 'string' },
  organization: { type: 'string' },
  bio: { type: 'string' },
  expertise: { type: 'string' },
  website_url: { type: 'string' },
  social_handle: { type: 'string' },
  talking_points: { type: 'string' },
});

const talkResearchSchema = objectSchema({
  research_items: arraySchema(researchItemSchema),
  topics: arraySchema(topicSchema),
  suggested_guests: arraySchema(guestSchema),
});

const VALID_RELEVANCE = new Set(['high', 'medium', 'low']);
const VALID_VERIFICATION = new Set(['verified', 'mixed', 'unverified', 'warning']);

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
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

function clamp(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function validDate(value) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function buildResearchPrompt(configuration) {
  const topics = parseArray(configuration.topics);
  const sources = parseArray(configuration.research_sources);
  const today = new Date().toISOString().slice(0, 10);

  return `You are the RESEARCH + VERIFICATION desk for CREAPD Talk Studio.

CURRENT DATE: ${today}
SHOW: ${configuration.production_name || 'Talk Show'}
FORMAT: ${configuration.show_format || 'Interview Show'}
TONE: ${configuration.show_tone || 'Conversational'}
DESCRIPTION: ${configuration.show_description || 'No additional description.'}
SELECTED TOPICS: ${topics.length ? topics.join(' | ') : 'Choose timely topics appropriate to this show.'}
PREFERRED SOURCE TYPES: ${sources.length ? sources.join(', ') : 'Use the strongest primary and reputable sources available.'}
PROVIDED GUEST DETAILS: ${configuration.guest_details || 'None supplied.'}

You are performing three distinct editorial jobs before returning results:
1. INTAKE / DE-DUPLICATION — identify the distinct claims and developments that matter for each selected topic.
2. FACT-CHECK / VERIFICATION — use LIVE WEB SEARCH to verify important factual claims. Prefer official records, primary sources, academic work, direct transcripts, and reputable reporting. Never invent a URL, quotation, statistic, person, or organization.
3. COUNTER-PERSPECTIVE / DEBATE — identify credible competing interpretations, weaknesses, unanswered questions, and skeptical questions a guest/caller could raise. Do not manufacture false balance where evidence is one-sided.

OUTPUT CONTRACT:
- Cover EVERY selected topic. Do not silently drop topics because the list is long.
- Return about 2 concise research items per selected topic. A third is acceptable only when materially useful.
- Each research summary should stay under 90 words.
- Return one topic dossier per selected topic with a concise verified summary, host-ready talking points, source links, verification notes, counter-perspectives, and debate questions.
- Keep talking_points under 220 words per topic.
- counter_perspectives: at most 3 concise items per topic.
- debate_questions: at most 4 concise items per topic.
- source_links must be real https URLs found during this run. Use [] rather than fabricate links.
- verification_status must be one of verified, mixed, unverified, warning.
- confidence_score is 0-100.
- Suggested guests must be real identifiable people supported by reliable sources. Suggest at most 4. If no person can be responsibly verified, return an empty array.
- Keep the response compact. Complete valid structured output for all selected topics is more important than extra prose.

Return only the requested structured object.`;
}

async function setStageFailure(sql, ownerId, configId, error) {
  const metadata = json({
    pipeline: 'talkStudioV2',
    stage: 'research_failed',
    failed_at: new Date().toISOString(),
    code: error?.code || null,
    message: String(error?.message || 'Talk research failed').slice(0, 500),
    recoverable: true,
  });
  try {
    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='failed', build_metadata=${metadata}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;
  } catch {}
}

export async function runTalkResearchStage({ sql, ownerUserId, configurationId }) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = String(configurationId || '').trim();
  if (!ownerId || !configId) {
    const error = new Error('Talk research requires owner and configuration id');
    error.code = 'TALK_RESEARCH_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT * FROM creapd.talk_production_configurations
    WHERE id=${configId} AND owner_user_id=${ownerId}
    LIMIT 1
  `;
  if (!configuration) {
    const error = new Error('Talk configuration was not found');
    error.code = 'TALK_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const startedAt = new Date().toISOString();
  const startMeta = json({
    pipeline: 'talkStudioV2',
    stage: 'researching',
    started_at: startedAt,
    checkpointed: true,
  });
  await sql`
    UPDATE creapd.talk_production_configurations
    SET status='building', build_metadata=${startMeta}::jsonb, updated_at=now()
    WHERE id=${configId} AND owner_user_id=${ownerId}
  `;

  try {
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_talk_research_v2',
      schema: talkResearchSchema,
      maxOutputTokens: 6000,
      timeoutMs: 210000,
      prompt: buildResearchPrompt(configuration),
    });

    const data = result.data || {};
    const researchItems = Array.isArray(data.research_items) ? data.research_items : [];
    const topics = Array.isArray(data.topics) ? data.topics : [];
    const suggestedGuests = Array.isArray(data.suggested_guests) ? data.suggested_guests : [];
    const completedAt = new Date().toISOString();
    const metadata = {
      pipeline: 'talkStudioV2',
      stage: 'research_ready',
      started_at: startedAt,
      completed_at: completedAt,
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
      response_id: result.responseId,
      research_count: researchItems.length,
      topic_count: topics.length,
      guest_suggestion_count: suggestedGuests.length,
      checkpointed: true,
    };
    const metaJson = json(metadata);

    await Promise.all([
      sql`DELETE FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_guests WHERE configuration_id=${configId} AND owner_user_id=${ownerId} AND guest_source='ai'`,
    ]);

    for (const item of researchItems) {
      const relevance = VALID_RELEVANCE.has(item.relevance) ? item.relevance : 'medium';
      const verification = VALID_VERIFICATION.has(item.verification_status) ? item.verification_status : 'unverified';
      await sql`
        INSERT INTO creapd.talk_research_items (
          id, configuration_id, owner_user_id, topic_name, title, source, source_url,
          category, summary, research_date, relevance, verification_status,
          verification_notes, confidence_score, source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${clean(item.topic_name)}, ${clean(item.title, 'Research Item')},
          ${clean(item.source)}, ${clean(item.source_url)}, ${clean(item.category)}, ${clean(item.summary)},
          ${validDate(item.date)}::date, ${relevance}, ${verification}, ${clean(item.verification_notes)},
          ${clamp(item.confidence_score, 0, 100, 0)}, 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

    for (let index = 0; index < topics.length; index += 1) {
      const topic = topics[index] || {};
      const verification = VALID_VERIFICATION.has(topic.verification_status) ? topic.verification_status : 'unverified';
      await sql`
        INSERT INTO creapd.talk_topics (
          id, configuration_id, owner_user_id, topic_name, generated_summary, talking_points,
          sources, source_links, suggested_placement, verification_status, verification_notes,
          counter_perspectives, debate_questions, confidence_score, status, display_order,
          source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${clean(topic.topic_name, `Topic ${index + 1}`)},
          ${clean(topic.generated_summary)}, ${clean(topic.talking_points)}, ${clean(topic.sources)},
          ${json(topic.source_links, [])}::jsonb, ${clean(topic.suggested_placement)}, ${verification},
          ${clean(topic.verification_notes)}, ${json(topic.counter_perspectives, [])}::jsonb,
          ${json(topic.debate_questions, [])}::jsonb, ${clamp(topic.confidence_score, 0, 100, 0)},
          'ready', ${index}, 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

    for (const guest of suggestedGuests) {
      if (!clean(guest.guest_name)) continue;
      await sql`
        INSERT INTO creapd.talk_guests (
          id, configuration_id, owner_user_id, guest_name, title_role, organization, bio,
          expertise, website_url, social_handle, talking_points, status, availability_status,
          guest_source, source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${clean(guest.guest_name)}, ${clean(guest.title_role)},
          ${clean(guest.organization)}, ${clean(guest.bio)}, ${clean(guest.expertise)}, ${clean(guest.website_url)},
          ${clean(guest.social_handle)}, ${clean(guest.talking_points)}, 'pending', 'suggested',
          'ai', 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='building', build_metadata=${metaJson}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;

    return {
      success: true,
      stage: 'research_ready',
      configuration_id: configId,
      research_count: researchItems.length,
      topic_count: topics.length,
      guest_suggestion_count: suggestedGuests.length,
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
    };
  } catch (error) {
    await setStageFailure(sql, ownerId, configId, error);
    throw error;
  }
}
