import { generateStructuredGatewayResponse } from './aiGateway.js';

const SCRIPT_TYPES = new Set([
  'host_script',
  'cohost_script',
  'host_intro',
  'host_outro',
  'guest_intro',
]);

const scriptSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    script: { type: 'string' },
  },
  required: ['script'],
};

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function parseObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {}
  }
  return fallback;
}

function wordCount(value) {
  return clean(value).split(/\s+/).filter(Boolean).length;
}

function assemblyContext(configuration, associatedTopic) {
  const meta = parseObject(configuration?.build_metadata);
  const segments = Array.isArray(meta.assembly_segments) ? meta.assembly_segments : [];
  const matchingSegment = associatedTopic
    ? segments.find(segment => clean(segment?.title).toLowerCase() === clean(associatedTopic).toLowerCase())
    : null;

  return {
    episode_direction: clean(meta.episode_direction),
    opening_goal: clean(meta.opening_goal),
    closing_goal: clean(meta.closing_goal),
    assembly_notes: clean(meta.assembly_notes),
    matching_segment: matchingSegment || null,
  };
}

function regenerationPrompt({
  configuration,
  asset,
  topic,
  research,
  instruction,
}) {
  const currentScript = clean(asset.content);
  const currentWords = wordCount(currentScript);
  const assembly = assemblyContext(configuration, asset.associated_topic);
  const targetDescription = asset.associated_topic
    ? `This is the spoken script for the assembled segment/topic "${asset.associated_topic}".`
    : `This is the "${asset.title}" spoken asset for the overall episode.`;

  return `You are the SCRIPT REVISION desk for CREAPD Podcast Production.

The producer is reviewing an already-built podcast episode and wants ONE script regenerated.
Regenerate only this script. Do not rewrite the episode structure, other scripts, or source research.

SHOW CONFIGURATION
- Show: ${configuration.production_name || 'Podcast'}
- Host: ${configuration.host_name || 'Host'}
- Co-host: ${configuration.co_host_name || 'None'}
- Format: ${configuration.show_format || 'Podcast'}
- Tone: ${configuration.show_tone || 'Conversational'}
- Description: ${configuration.show_description || 'Not provided'}
- Total runtime: ${configuration.total_show_runtime || 60} minutes

ASSEMBLY CONTEXT
${JSON.stringify(assembly)}

TARGET SCRIPT
- Asset type: ${asset.asset_type}
- Asset title: ${asset.title}
- Associated topic: ${asset.associated_topic || 'Whole episode'}
- Current length: ${currentWords} words
- Purpose: ${targetDescription}

VERIFIED TOPIC DOSSIER
${topic ? JSON.stringify({
    topic_name: topic.topic_name,
    summary: topic.generated_summary,
    talking_points: topic.talking_points,
    verification_status: topic.verification_status,
    verification_notes: topic.verification_notes,
    counter_perspectives: topic.counter_perspectives,
    debate_questions: topic.debate_questions,
  }) : 'No single topic dossier applies to this asset.'}

VERIFIED RESEARCH FOR THIS SCRIPT
${JSON.stringify((research || []).map(item => ({
    title: item.title,
    source: item.source,
    summary: item.summary,
    relevance: item.relevance,
    verification_status: item.verification_status,
    verification_notes: item.verification_notes,
  })))}

CURRENT SCRIPT
${currentScript}

PRODUCER REVISION REQUEST
${clean(instruction, 'Create a stronger alternate version while preserving the approved Assembly direction, facts, tone, and intended purpose.')}

REVISION RULES
- Return spoken, teleprompter-ready copy only.
- Preserve the approved Assembly direction and the purpose of this exact script.
- Use only the verified topic/research context supplied above. Do not invent facts, quotes, people, statistics, or source claims.
- Match the configured show tone and host role.
- Keep the replacement reasonably close to the current script's length unless the producer explicitly asks for a different length.
- For interview/question material, never invent guest answers.
- Do not include stage directions unless they are essential and already appropriate to the asset.
- Do not explain the rewrite. Return only the replacement script in the structured response.`;
}

export async function regeneratePodcastScript({
  sql,
  ownerUserId,
  configurationId,
  assetId,
  instruction = '',
}) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = String(configurationId || '').trim();
  const targetAssetId = String(assetId || '').trim();

  if (!ownerId || !configId || !targetAssetId) {
    const error = new Error('Script regeneration requires configuration_id and asset_id.');
    error.code = 'PODCAST_SCRIPT_REGEN_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [[configuration], [asset]] = await Promise.all([
    sql`
      SELECT *
      FROM creapd.talk_production_configurations
      WHERE id=${configId} AND owner_user_id=${ownerId}
      LIMIT 1
    `,
    sql`
      SELECT *
      FROM creapd.talk_assets
      WHERE id=${targetAssetId} AND configuration_id=${configId} AND owner_user_id=${ownerId}
      LIMIT 1
    `,
  ]);

  if (!configuration) {
    const error = new Error('Podcast configuration was not found.');
    error.code = 'PODCAST_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (!asset) {
    const error = new Error('Podcast script asset was not found.');
    error.code = 'PODCAST_SCRIPT_ASSET_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (!SCRIPT_TYPES.has(asset.asset_type)) {
    const error = new Error('This production asset is not a regeneratable spoken script.');
    error.code = 'PODCAST_ASSET_NOT_SCRIPT';
    error.status = 409;
    throw error;
  }

  const associatedTopic = clean(asset.associated_topic);
  let topic = null;
  let research = [];

  if (associatedTopic) {
    [topic] = await sql`
      SELECT *
      FROM creapd.talk_topics
      WHERE configuration_id=${configId}
        AND owner_user_id=${ownerId}
        AND lower(topic_name)=lower(${associatedTopic})
      LIMIT 1
    `;

    research = await sql`
      SELECT *
      FROM creapd.talk_research_items
      WHERE configuration_id=${configId}
        AND owner_user_id=${ownerId}
        AND lower(topic_name)=lower(${associatedTopic})
      ORDER BY created_at ASC
    `;
  } else {
    research = await sql`
      SELECT *
      FROM creapd.talk_research_items
      WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
      ORDER BY created_at ASC
      LIMIT 30
    `;
  }

  const result = await generateStructuredGatewayResponse({
    webSearch: false,
    schemaName: 'creapd_podcast_script_regeneration_v1',
    schema: scriptSchema,
    maxOutputTokens: 5500,
    timeoutMs: 120000,
    prompt: regenerationPrompt({
      configuration,
      asset,
      topic,
      research,
      instruction,
    }),
  });

  const script = clean(result?.data?.script);
  if (!script) {
    const error = new Error('CREAPD returned an empty replacement script.');
    error.code = 'PODCAST_SCRIPT_REGEN_EMPTY';
    error.status = 502;
    throw error;
  }

  const previousPayload = parseObject(asset.source_payload);
  const revisionNumber = Math.max(0, Number(previousPayload.script_revision_number || 0)) + 1;
  const sourcePayload = {
    ...previousPayload,
    script_revision_number: revisionNumber,
    script_regenerated_at: new Date().toISOString(),
    script_regeneration_model: result?.model || null,
    script_regeneration_instruction: clean(instruction) || null,
    previous_script_word_count: wordCount(asset.content),
    current_script_word_count: wordCount(script),
  };

  const [updated] = await sql`
    UPDATE creapd.talk_assets
    SET
      content=${script},
      status='ready',
      source_system='creapd-vercel',
      source_payload=${JSON.stringify(sourcePayload)}::jsonb,
      updated_at=now()
    WHERE id=${targetAssetId}
      AND configuration_id=${configId}
      AND owner_user_id=${ownerId}
    RETURNING *
  `;

  return {
    asset: updated,
    revision_number: revisionNumber,
    model: result?.model || null,
    elapsed_ms: result?.elapsedMs || null,
  };
}
