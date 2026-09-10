import { randomUUID } from 'node:crypto';
import { generateStructuredGatewayResponse } from './aiGateway.js';
import { upsertTalkProductionPackage } from './talkPackageEngine.js';

const objectSchema = properties => ({
  type: 'object',
  additionalProperties: false,
  properties,
  required: Object.keys(properties),
});
const arraySchema = items => ({ type: 'array', items });
const stringArraySchema = arraySchema({ type: 'string' });

const segmentSchema = objectSchema({
  order: { type: 'number' },
  segment_type: { type: 'string' },
  title: { type: 'string' },
  duration_seconds: { type: 'number' },
  start_time: { type: 'string' },
  end_time: { type: 'string' },
  notes: { type: 'string' },
});

const talkProductionSchema = objectSchema({
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
  'intro', 'host_monologue', 'interview', 'panel_discussion', 'debate',
  'solo_commentary', 'audience_qa', 'sponsor_break', 'station_id', 'transition', 'outro',
]);

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

function assetRequested(automation, key) {
  return automation.length === 0 || automation.includes(key);
}

function buildIdentityLowerThirdAssets(configuration, guests) {
  const productionName = clean(configuration.production_name, 'Talk Show');
  const hostName = clean(configuration.host_name);
  const label = clean(configuration.station_name, 'CREAPD LIVE');
  const lowerThirds = [];

  if (hostName || productionName) {
    lowerThirds.push({
      type: 'lower_third',
      title: `Lower Third: ${hostName || productionName}`,
      content: json({
        title: hostName || productionName,
        subtitle: hostName ? `Host · ${productionName}` : clean(configuration.show_format),
        label,
        kind: 'host',
      }),
      associatedTopic: '',
    });
  }

  for (const guest of guests || []) {
    const guestName = clean(guest.guest_name);
    if (!guestName) continue;
    const role = clean(guest.title_role);
    const organization = clean(guest.organization);
    const subtitle = role && organization
      ? `${role} · ${organization}`
      : role || organization || productionName;

    lowerThirds.push({
      type: 'lower_third',
      title: `Lower Third: ${guestName}`,
      content: json({
        title: guestName,
        subtitle,
        label,
        kind: 'guest',
      }),
      associatedTopic: '',
    });
  }

  return lowerThirds;
}

function buildProductionPrompt(configuration, topics, researchItems, guests) {
  const automation = parseArray(configuration.ai_automation);
  const compactTopics = topics.map(topic => ({
    topic_name: topic.topic_name,
    summary: topic.generated_summary,
    talking_points: topic.talking_points,
    verification_status: topic.verification_status,
    verification_notes: topic.verification_notes,
    counter_perspectives: topic.counter_perspectives,
    debate_questions: topic.debate_questions,
  }));
  const compactResearch = researchItems.map(item => ({
    topic_name: item.topic_name,
    title: item.title,
    source: item.source,
    summary: item.summary,
    relevance: item.relevance,
    verification_status: item.verification_status,
  }));
  const compactGuests = guests.map(guest => ({
    guest_name: guest.guest_name,
    title_role: guest.title_role,
    organization: guest.organization,
    bio: guest.bio,
    expertise: guest.expertise,
    talking_points: guest.talking_points,
    status: guest.status,
  }));

  return `You are the RUNDOWN + SCRIPT + ASSET desk for CREAPD Talk Studio.

The Research/Verification desk has already completed its work. Do NOT redo web research. Use the verified checkpoint below as the editorial source of truth.

SHOW CONFIGURATION:
- Production: ${configuration.production_name || 'Talk Show'}
- Host: ${configuration.host_name || 'Host'}
- Co-host: ${configuration.co_host_name || 'None'}
- Date: ${configuration.show_date || ''}
- Start time: ${configuration.show_start_time || '12:00'}
- Live/Recorded: ${configuration.live_or_recorded || 'live'}
- Station/Channel: ${configuration.station_name || 'Not specified'}
- Format: ${configuration.show_format || 'Interview Show'}
- Tone: ${configuration.show_tone || 'Conversational'}
- Description: ${configuration.show_description || 'No additional description.'}
- Total runtime: ${configuration.total_show_runtime || 60} minutes
- Discussion runtime: ${configuration.talk_segment_runtime || 45} minutes
- Sponsor runtime: ${configuration.commercial_sponsor_runtime || 8} minutes
- Intro runtime: ${configuration.intro_runtime || 2} minutes
- Outro runtime: ${configuration.outro_runtime || 2} minutes
- Requested automation: ${automation.length ? automation.join(', ') : 'Standard complete production package'}

VERIFIED TOPIC DOSSIERS:
${JSON.stringify(compactTopics)}

VERIFIED RESEARCH ITEMS:
${JSON.stringify(compactResearch)}

GUEST CONTEXT:
${JSON.stringify(compactGuests)}

PRODUCTION JOBS:
1. RUNDOWN PRODUCER — build a coherent practical show rundown using only these segment types: intro, host_monologue, interview, panel_discussion, debate, solo_commentary, audience_qa, sponsor_break, station_id, transition, outro.
2. HOST PRODUCER — write host opening/closing, guest intro, and a broadcast-ready host script grounded in the verified material.
3. CO-HOST PRODUCER — write complementary co-host material when appropriate; do not merely repeat the host.
4. ENGAGEMENT PRODUCER — create discussion questions and audience prompts that use the counter-perspective/debate material.
5. PROMOTION / PRESENTATION PRODUCER — create concise social copy, hashtags, thumbnail prompt, presentation prompt, and internal production notes.

OUTPUT CONTRACT:
- Rundown durations must approximately fill the configured total runtime. Use realistic sponsor/transition/intro/outro timing.
- For long shows, create enough substantive segments to make the rundown usable, but avoid dozens of tiny filler segments.
- host_script: under 5,000 characters; it is a demo-ready anchor script, not a verbatim 120-minute transcript.
- cohost_script: under 3,500 characters.
- host_intro and host_outro: each under 500 words.
- discussion_questions: 5-8 strong questions, line-separated.
- audience_prompts: 3-5 concise prompts, line-separated.
- social_captions: exactly 3 concise captions.
- presentation_prompt should describe a visual presentation companion, not a rendered video.
- Never introduce factual claims that contradict the verification checkpoint.
- Keep the output compact enough to complete reliably.

Return only the requested structured object.`;
}

async function setStageFailure(sql, ownerId, configId, error) {
  const [existing] = await sql`
    SELECT build_metadata FROM creapd.talk_production_configurations
    WHERE id=${configId} AND owner_user_id=${ownerId}
    LIMIT 1
  `;
  const previous = existing?.build_metadata && typeof existing.build_metadata === 'object'
    ? existing.build_metadata
    : {};
  const metadata = json({
    ...previous,
    pipeline: 'talkStudioV2',
    stage: 'production_failed',
    failed_at: new Date().toISOString(),
    code: error?.code || null,
    message: String(error?.message || 'Talk production failed').slice(0, 500),
    recoverable: true,
    research_checkpoint_preserved: true,
  });
  try {
    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='failed', build_metadata=${metadata}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;
  } catch {}
}

export async function runTalkProductionStage({ sql, ownerUserId, configurationId }) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = String(configurationId || '').trim();
  if (!ownerId || !configId) {
    const error = new Error('Talk production requires owner and configuration id');
    error.code = 'TALK_PRODUCTION_INPUT_INVALID';
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

  const [topics, researchItems, guests] = await Promise.all([
    sql`SELECT * FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId} ORDER BY display_order ASC, created_at ASC`,
    sql`SELECT * FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId} ORDER BY created_at ASC`,
    sql`SELECT * FROM creapd.talk_guests WHERE configuration_id=${configId} AND owner_user_id=${ownerId} ORDER BY created_at ASC`,
  ]);

  if (!topics.length || !researchItems.length) {
    const error = new Error('Verified Talk research checkpoint is missing. Run the research stage first.');
    error.code = 'TALK_RESEARCH_CHECKPOINT_REQUIRED';
    error.status = 409;
    throw error;
  }

  const startedAt = new Date().toISOString();
  const previousMeta = configuration.build_metadata && typeof configuration.build_metadata === 'object'
    ? configuration.build_metadata
    : {};
  const startMeta = json({
    ...previousMeta,
    pipeline: 'talkStudioV2',
    stage: 'assembling_production',
    production_started_at: startedAt,
    checkpointed: true,
  });
  await sql`
    UPDATE creapd.talk_production_configurations
    SET status='building', build_metadata=${startMeta}::jsonb, updated_at=now()
    WHERE id=${configId} AND owner_user_id=${ownerId}
  `;

  try {
    const result = await generateStructuredGatewayResponse({
      webSearch: false,
      schemaName: 'creapd_talk_production_v2',
      schema: talkProductionSchema,
      maxOutputTokens: 6500,
      timeoutMs: 180000,
      prompt: buildProductionPrompt(configuration, topics, researchItems, guests),
    });

    const data = result.data || {};
    const rundown = Array.isArray(data.rundown) ? data.rundown : [];
    const automation = parseArray(configuration.ai_automation);
    const completedAt = new Date().toISOString();
    const metadata = {
      ...previousMeta,
      pipeline: 'talkStudioV2',
      stage: 'complete',
      production_started_at: startedAt,
      completed_at: completedAt,
      production_model: result.model,
      production_gateway_auth_source: result.authSource,
      production_elapsed_ms: result.elapsedMs,
      production_response_id: result.responseId,
      checkpointed: true,
    };
    const metaJson = json(metadata);

    await Promise.all([
      sql`DELETE FROM creapd.talk_segments WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
      sql`DELETE FROM creapd.talk_assets WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
    ]);

    for (let index = 0; index < rundown.length; index += 1) {
      const segment = rundown[index] || {};
      const segmentType = VALID_SEGMENT_TYPES.has(segment.segment_type) ? segment.segment_type : 'solo_commentary';
      await sql`
        INSERT INTO creapd.talk_segments (
          id, configuration_id, owner_user_id, order_index, segment_type, title,
          duration_seconds, start_time, end_time, notes, status, runtime_status,
          source_system, source_payload
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId},
          ${Number.isFinite(Number(segment.order)) ? Math.trunc(Number(segment.order)) : index},
          ${segmentType}, ${clean(segment.title)}, ${Math.max(0, Number(segment.duration_seconds) || 0)},
          ${clean(segment.start_time)}, ${clean(segment.end_time)}, ${clean(segment.notes)},
          'ready', 'queued', 'creapd-vercel', ${metaJson}::jsonb
        )
      `;
    }

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

    // Identity lower thirds are deterministic production assets, not creative AI copy.
    // They must always exist for Live graphics even when an older configuration predates
    // lower-third automation options or the user did not request promotional assets.
    assets.push(...buildIdentityLowerThirdAssets(configuration, guests));

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

    const packageRecord = await upsertTalkProductionPackage({
      sql,
      ownerUserId: ownerId,
      configuration,
      topics,
      production: data,
      metadata: {
        ...metadata,
        model: result.model,
      },
    });

    let [session] = await sql`
      SELECT * FROM creapd.talk_sessions
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY updated_at DESC LIMIT 1
    `;
    if (!session) {
      [session] = await sql`
        INSERT INTO creapd.talk_sessions (
          id, configuration_id, owner_user_id, episode_id, status, host_view_state
        ) VALUES (
          ${randomUUID()}, ${configId}, ${ownerId}, ${configuration.episode_id || null}, 'ready', '{}'::jsonb
        ) RETURNING *
      `;
    } else {
      [session] = await sql`
        UPDATE creapd.talk_sessions
        SET status='ready', active_segment_id=NULL, ended_at=NULL, paused_at=NULL, updated_at=now()
        WHERE id=${session.id} AND owner_user_id=${ownerId}
        RETURNING *
      `;
    }

    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='ready', build_metadata=${metaJson}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;

    if (configuration.episode_id) {
      await sql`
        UPDATE creapd.episodes
        SET status='ready', updated_at=now()
        WHERE id=${configuration.episode_id} AND owner_user_id=${ownerId}
      `;
    }

    return {
      success: true,
      stage: 'complete',
      configuration_id: configId,
      topic_count: topics.length,
      research_count: researchItems.length,
      rundown_count: rundown.length,
      asset_count: assets.length,
      package_id: packageRecord?.id || null,
      package_status: packageRecord?.status || null,
      session_id: session?.id || null,
      model: result.model,
      gateway_auth_source: result.authSource,
      elapsed_ms: result.elapsedMs,
      audio_generation: audioRequested ? 'deferred_local' : 'not_requested',
    };
  } catch (error) {
    await setStageFailure(sql, ownerId, configId, error);
    throw error;
  }
}
