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

const segmentSchema = objectSchema({
  order: { type: 'number' },
  segment_type: { type: 'string' },
  title: { type: 'string' },
  duration_seconds: { type: 'number' },
  start_time: { type: 'string' },
  end_time: { type: 'string' },
  notes: { type: 'string' },
});

const talkBuildSchema = objectSchema({
  research_items: arraySchema(researchItemSchema),
  topics: arraySchema(topicSchema),
  suggested_guests: arraySchema(guestSchema),
  rundown: arraySchema(segmentSchema),
  host_intro: { type: 'string' },
  host_outro: { type: 'string' },
  host_script: { type: 'string' },
  cohost_script: { type: 'string' },
  guest_intro: { type: 'string' },
  discussion_questions: { type: 'string' },
  audience_prompts: { type: 'string' },
  social_captions: stringArraySchema,
  hashtags: { type: 'string' },
  thumbnail_prompt: { type: 'string' },
  presentation_prompt: { type: 'string' },
  production_notes: { type: 'string' },
});

const VALID_SEGMENT_TYPES = new Set([
  'intro',
  'host_monologue',
  'interview',
  'panel_discussion',
  'debate',
  'solo_commentary',
  'audience_qa',
  'sponsor_break',
  'station_id',
  'transition',
  'outro',
]);

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

function assetRequested(automation, key) {
  return automation.length === 0 || automation.includes(key);
}

function buildTalkPrompt(configuration) {
  const topics = parseArray(configuration.topics);
  const sources = parseArray(configuration.research_sources);
  const automation = parseArray(configuration.ai_automation);
  const today = new Date().toISOString().slice(0, 10);

  return `You are CREAPD Talk Studio's autonomous editorial and broadcast production desk.

CURRENT DATE: ${today}
PRODUCTION: ${configuration.production_name || 'Talk Show'}
HOST: ${configuration.host_name || 'Host'}
CO-HOST: ${configuration.co_host_name || 'None'}
SHOW DATE: ${configuration.show_date || today}
START TIME: ${configuration.show_start_time || '12:00'}
LIVE OR RECORDED: ${configuration.live_or_recorded || 'live'}
STATION / CHANNEL: ${configuration.station_name || 'Not specified'}
FORMAT: ${configuration.show_format || 'Interview Show'}
TONE: ${configuration.show_tone || 'Conversational'}
DESCRIPTION: ${configuration.show_description || 'No additional description.'}
TOTAL RUNTIME: ${configuration.total_show_runtime || 60} minutes
DISCUSSION RUNTIME: ${configuration.talk_segment_runtime || 45} minutes
SPONSOR RUNTIME: ${configuration.commercial_sponsor_runtime || 8} minutes
INTRO RUNTIME: ${configuration.intro_runtime || 2} minutes
OUTRO RUNTIME: ${configuration.outro_runtime || 2} minutes
SELECTED TOPICS: ${topics.length ? topics.join(', ') : 'Choose timely topics appropriate for the show.'}
PREFERRED RESEARCH SOURCES: ${sources.length ? sources.join(', ') : 'Use the strongest available primary and reputable sources.'}
PROVIDED GUEST DETAILS: ${configuration.guest_details || 'No guest details supplied.'}
REQUESTED AUTOMATION: ${automation.length ? automation.join(', ') : 'Standard complete production package.'}

Execute these editorial roles in order before writing the final output:
1. INTAKE / DE-DUPLICATION: identify the distinct issues that actually matter for the selected topics and avoid repeating the same wire fact.
2. FACT-CHECK / VERIFICATION: verify important factual claims with live web search. Prefer primary sources, official records, academic work, direct transcripts, and reputable reporting. Never invent a source or URL. Mark uncertain/disputed claims clearly.
3. COUNTER-PERSPECTIVE / DEBATE: for each topic identify credible competing perspectives, weaknesses, and questions a skeptical guest or caller could raise. Do not manufacture false balance when evidence is one-sided.
4. BROADCAST DOSSIER SYNTHESIS: turn the verified material into concise host-ready summaries and talking points.
5. RUNDOWN PRODUCER: create a coherent broadcast rundown that approximately fills the configured runtime and uses only these segment types: intro, host_monologue, interview, panel_discussion, debate, solo_commentary, audience_qa, sponsor_break, station_id, transition, outro.
6. SCRIPT / ASSET PRODUCER: write broadcast-ready host/co-host material and the requested supporting assets.

RESEARCH REQUIREMENTS:
- Return 2-4 research items per selected topic when enough reliable material exists.
- source_url must be a real https URL discovered during this run; use an empty string rather than inventing one.
- verification_status must be one of verified, mixed, unverified, warning.
- confidence_score is 0-100.
- topic source_links is an array of real URLs.
- counter_perspectives and debate_questions must be specific enough to use on-air.
- Suggested guests must be real identifiable people discovered from reliable sources when possible. If a real person cannot be responsibly verified, omit the suggestion instead of fabricating a person.

PRODUCTION REQUIREMENTS:
- Build a practical rundown with durations in seconds.
- Host script should be complete enough to demo the show, but stay below roughly 5,000 characters.
- Co-host script should complement rather than duplicate the host.
- Discussion questions should be separated by line breaks.
- Presentation prompt should describe a visual presentation companion, not a rendered video.
- Keep all generated copy consistent with the configured tone.

Return only the requested structured object.`;
}

async function setBuildFailure(sql, ownerUserId, configurationId, error) {
  const metadata = json({
    pipeline: 'talkStudioV2',
    stage: 'failed',
    failed_at: new Date().toISOString(),
    code: error?.code || null,
    message: String(error?.message || 'Talk build failed').slice(0, 500),
  });

  try {
    await sql`
      UPDATE creapd.talk_production_configurations
      SET status = 'failed', build_metadata = ${metadata}::jsonb, updated_at = now()
      WHERE id = ${configurationId} AND owner_user_id = ${ownerUserId}
    `;
  } catch {}
}

async function upsertProductionPackage({ sql, ownerUserId, configuration, data, metadata }) {
  const [existing] = await sql`
    SELECT id, generation_count
    FROM creapd.production_packages
    WHERE owner_user_id = ${ownerUserId}
      AND production_profile = 'talk'
      AND source_entity_type = 'TalkProductionConfiguration'
      AND source_entity_id = ${configuration.id}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const packageId = existing?.id || randomUUID();
  const topicSummary = (data.topics || [])
    .map(topic => `${clean(topic.topic_name)}: ${clean(topic.generated_summary)}`)
    .filter(Boolean)
    .join('\n\n');
  const talkingPoints = (data.topics || [])
    .map(topic => clean(topic.talking_points))
    .filter(Boolean)
    .join('\n---\n');
  const factCheckNotes = (data.topics || [])
    .map(topic => `${clean(topic.topic_name)} [${clean(topic.verification_status, 'unverified')}]: ${clean(topic.verification_notes)}`)
    .join('\n');
  const socialCaption = Array.isArray(data.social_captions) ? data.social_captions.join('\n\n') : '';
  const estimatedRuntime = `${Math.max(1, Math.round(Number(configuration.total_show_runtime) || 60))} Minutes`;
  const sourcePayload = json({
    pipeline: 'talkStudioV2',
    build: metadata,
    verification: (data.topics || []).map(topic => ({
      topic: topic.topic_name,
      status: topic.verification_status,
      confidence_score: topic.confidence_score,
    })),
  });

  if (existing) {
    const [updated] = await sql`
      UPDATE creapd.production_packages
      SET
        title = ${clean(configuration.production_name, 'Talk Show')},
        show_id = ${configuration.show_id || null},
        episode_id = ${configuration.episode_id || null},
        configuration_id = ${configuration.id},
        teleprompter_script = ${clean(data.host_script)},
        show_script = ${clean(data.host_script)},
        story_summary = ${topicSummary},
        talking_points = ${talkingPoints},
        headline_suggestions = ${clean(configuration.production_name, 'Talk Show')},
        image_prompt = ${clean(data.presentation_prompt || data.thumbnail_prompt)},
        thumbnail_prompt = ${clean(data.thumbnail_prompt)},
        social_caption = ${socialCaption},
        fact_check_notes = ${factCheckNotes},
        producer_notes = ${clean(data.production_notes)},
        estimated_runtime = ${estimatedRuntime},
        target_runtime = ${estimatedRuntime},
        tone = ${clean(configuration.show_tone, 'Conversational')},
        reading_style = 'talk_show',
        status = 'approved',
        generation_provider = ${clean(metadata.model, 'creapd-ai-gateway')},
        generated_at = now(),
        generation_count = ${Number(existing.generation_count || 0) + 1},
        source_system = 'creapd-vercel',
        source_payload = ${sourcePayload}::jsonb,
        updated_at = now()
      WHERE id = ${packageId} AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;
    return updated;
  }

  const [created] = await sql`
    INSERT INTO creapd.production_packages (
      id, owner_user_id, production_profile, source_entity_type, source_entity_id,
      configuration_id, title, show_id, episode_id, teleprompter_script, show_script,
      story_summary, talking_points, headline_suggestions, image_prompt, thumbnail_prompt,
      social_caption, fact_check_notes, producer_notes, estimated_runtime, target_runtime,
      tone, reading_style, status, generation_provider, generated_at, generation_count,
      source_system, source_payload, created_at, updated_at
    ) VALUES (
      ${packageId}, ${ownerUserId}, 'talk', 'TalkProductionConfiguration', ${configuration.id},
      ${configuration.id}, ${clean(configuration.production_name, 'Talk Show')},
      ${configuration.show_id || null}, ${configuration.episode_id || null},
      ${clean(data.host_script)}, ${clean(data.host_script)}, ${topicSummary}, ${talkingPoints},
      ${clean(configuration.production_name, 'Talk Show')}, ${clean(data.presentation_prompt || data.thumbnail_prompt)},
      ${clean(data.thumbnail_prompt)}, ${socialCaption}, ${factCheckNotes}, ${clean(data.production_notes)},
      ${estimatedRuntime}, ${estimatedRuntime}, ${clean(configuration.show_tone, 'Conversational')},
      'talk_show', 'approved', ${clean(metadata.model, 'creapd-ai-gateway')}, now(), 1,
      'creapd-vercel', ${sourcePayload}::jsonb, now(), now()
    )
    RETURNING *
  `;

  return created;
}

export async function runTalkBuild({ sql, ownerUserId, ownerEmail, configurationId }) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = String(configurationId || '').trim();
  if (!ownerId || !configId) {
    const error = new Error('Talk build requires owner and configuration id');
    error.code = 'TALK_BUILD_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT *
    FROM creapd.talk_production_configurations
    WHERE id = ${configId} AND owner_user_id = ${ownerId}
    LIMIT 1
  `;

  if (!configuration) {
    const error = new Error('Talk configuration was not found');
    error.code = 'TALK_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const startedAt = new Date().toISOString();
  const startMeta = json({ pipeline: 'talkStudioV2', stage: 'agent_build', started_at: startedAt });

  await sql`
    UPDATE creapd.talk_production_configurations
    SET status = 'building', build_metadata = ${startMeta}::jsonb, updated_at = now()
    WHERE id = ${configId} AND owner_user_id = ${ownerId}
  `;

  try {
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_talk_v2',
      schema: talkBuildSchema,
      maxOutputTokens: 8500,
      timeoutMs: 50000,
      prompt: buildTalkPrompt(configuration),
    });

    const data = result.data || {};
    const buildMetadata = {
      pipeline: 'talkStudioV2',
      stage: 'complete',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
      response_id: result.responseId,
    };
    const metaJson = json(buildMetadata);

    await Promise.all([
      sql`DELETE FROM creapd.talk_topics WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId}`,
      sql`DELETE FROM creapd.talk_research_items WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId}`,
      sql`DELETE FROM creapd.talk_segments WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId}`,
      sql`DELETE FROM creapd.talk_assets WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId}`,
      sql`DELETE FROM creapd.talk_guests WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId} AND guest_source = 'ai'`,
    ]);

    const researchItems = Array.isArray(data.research_items) ? data.research_items : [];
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

    const topics = Array.isArray(data.topics) ? data.topics : [];
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

    const suggestedGuests = Array.isArray(data.suggested_guests) ? data.suggested_guests : [];
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

    const rundown = Array.isArray(data.rundown) ? data.rundown : [];
    for (let index = 0; index < rundown.length; index += 1) {
      const segment = rundown[index] || {};
      const segmentType = VALID_SEGMENT_TYPES.has(segment.segment_type) ? segment.segment_type : 'solo_commentary';
      await sql`
        INSERT INTO creapd.talk_segments (
          id, configuration_id, owner_user_id, order_index, segment_type, title,
          duration_seconds, start_time, end_time, notes, status, runtime_status,
          source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${Number.isFinite(Number(segment.order)) ? Math.trunc(Number(segment.order)) : index},
          ${segmentType}, ${clean(segment.title)}, ${Math.max(0, Number(segment.duration_seconds) || 0)},
          ${clean(segment.start_time)}, ${clean(segment.end_time)}, ${clean(segment.notes)},
          'ready', 'queued', 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

    const automation = parseArray(configuration.ai_automation);
    const assets = [];
    const addAsset = (key, type, title, content, associatedTopic = '') => {
      if (assetRequested(automation, key) && clean(content)) {
        assets.push({ type, title, content: clean(content), associatedTopic });
      }
    };

    addAsset('Generate Host Intros', 'host_intro', 'Host Intro', data.host_intro);
    addAsset('Generate Host Outros', 'host_outro', 'Host Outro', data.host_outro);
    addAsset('Generate Guest Intros', 'guest_intro', 'Guest Intro', data.guest_intro);
    addAsset('Generate Discussion Questions', 'discussion_questions', 'Discussion Questions', data.discussion_questions);
    addAsset('Generate Audience Prompts', 'audience_prompts', 'Audience Prompts', data.audience_prompts);
    addAsset('Generate Social Captions', 'social_caption', 'Social Captions', Array.isArray(data.social_captions) ? data.social_captions.join('\n\n---\n\n') : '');
    addAsset('Generate Hashtags', 'hashtag', 'Hashtags', data.hashtags);
    addAsset('Generate Thumbnail Prompt', 'thumbnail_prompt', 'Thumbnail Prompt', data.thumbnail_prompt);
    addAsset('Generate Presentation Prompt', 'presentation_prompt', 'Presentation Prompt', data.presentation_prompt);
    addAsset('Generate Production Notes', 'production_notes', 'Production Notes', data.production_notes);
    addAsset('Generate Host Script', 'host_script', 'Host Script', data.host_script);
    addAsset('Generate Co-Host Script', 'cohost_script', 'Co-Host Script', data.cohost_script);

    if (assetRequested(automation, 'Generate Talking Points')) {
      for (const topic of topics) {
        if (clean(topic.talking_points)) {
          assets.push({
            type: 'talking_points',
            title: `Talking Points: ${clean(topic.topic_name, 'Topic')}`,
            content: clean(topic.talking_points),
            associatedTopic: clean(topic.topic_name),
          });
        }
      }
    }

    const audioRequested = automation.includes('Generate Host Audio') || automation.includes('Generate Co-Host Audio');
    if (audioRequested) {
      assets.push({
        type: 'production_notes',
        title: 'Local Voice Generation',
        content: 'Voice audio is intentionally deferred to CREAPD local/browser voice generation so Talk Studio does not depend on a paid server TTS service.',
        associatedTopic: '',
      });
    }

    for (const asset of assets) {
      await sql`
        INSERT INTO creapd.talk_assets (
          id, configuration_id, owner_user_id, asset_type, title, content,
          associated_topic, status, source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${asset.type}, ${asset.title}, ${asset.content},
          ${asset.associatedTopic || null}, 'ready', 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

    const packageRecord = await upsertProductionPackage({
      sql,
      ownerUserId: ownerId,
      configuration,
      data,
      metadata: buildMetadata,
    });

    const [existingSession] = await sql`
      SELECT id FROM creapd.talk_sessions
      WHERE configuration_id = ${configId} AND owner_user_id = ${ownerId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (!existingSession) {
      await sql`
        INSERT INTO creapd.talk_sessions (
          id, configuration_id, owner_user_id, episode_id, status, host_view_state
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${configuration.episode_id || null}, 'ready', '{}'::jsonb
        )
      `;
    }

    await sql`
      UPDATE creapd.talk_production_configurations
      SET status = 'ready', build_metadata = ${metaJson}::jsonb, updated_at = now()
      WHERE id = ${configId} AND owner_user_id = ${ownerId}
    `;

    if (configuration.episode_id) {
      await sql`
        UPDATE creapd.episodes
        SET status = 'ready', updated_at = now()
        WHERE id = ${configuration.episode_id} AND owner_user_id = ${ownerId}
      `;
    }

    return {
      success: true,
      configuration_id: configId,
      research_count: researchItems.length,
      topic_count: topics.length,
      guest_suggestion_count: suggestedGuests.length,
      rundown_count: rundown.length,
      asset_count: assets.length,
      package_id: packageRecord?.id || null,
      package_status: packageRecord?.status || null,
      model: result.model,
      gateway_auth_source: result.authSource,
      web_search_used: result.webSearchUsed,
      elapsed_ms: result.elapsedMs,
      audio_generation: audioRequested ? 'deferred_local' : 'not_requested',
    };
  } catch (error) {
    await setBuildFailure(sql, ownerId, configId, error);
    throw error;
  }
}
