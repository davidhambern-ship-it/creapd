import { randomUUID } from 'node:crypto';

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function json(value, fallback = {}) {
  return JSON.stringify(value ?? fallback);
}

export async function upsertTalkProductionPackage({
  sql,
  ownerUserId,
  configuration,
  topics = [],
  production = {},
  metadata = {},
}) {
  const ownerId = String(ownerUserId || '').trim();
  if (!ownerId || !configuration?.id) {
    const error = new Error('Talk package requires an owner and configuration');
    error.code = 'TALK_PACKAGE_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [existing] = await sql`
    SELECT id, generation_count
    FROM creapd.production_packages
    WHERE owner_user_id = ${ownerId}
      AND production_profile = 'talk'
      AND source_entity_type = 'TalkProductionConfiguration'
      AND source_entity_id = ${configuration.id}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const packageId = existing?.id || randomUUID();
  const topicSummary = topics
    .map(topic => `${clean(topic.topic_name)}: ${clean(topic.generated_summary)}`)
    .filter(Boolean)
    .join('\n\n');
  const talkingPoints = topics
    .map(topic => clean(topic.talking_points))
    .filter(Boolean)
    .join('\n---\n');
  const factCheckNotes = topics
    .map(topic => `${clean(topic.topic_name)} [${clean(topic.verification_status, 'unverified')}]: ${clean(topic.verification_notes)}`)
    .filter(Boolean)
    .join('\n');
  const socialCaption = Array.isArray(production.social_captions)
    ? production.social_captions.join('\n\n')
    : clean(production.social_captions);
  const estimatedRuntime = `${Math.max(1, Math.round(Number(configuration.total_show_runtime) || 60))} Minutes`;
  const sourcePayload = json({
    pipeline: 'talkStudioV2',
    stage: 'production_complete',
    build: metadata,
    verification: topics.map(topic => ({
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
        teleprompter_script = ${clean(production.host_script)},
        show_script = ${clean(production.host_script)},
        story_summary = ${topicSummary},
        talking_points = ${talkingPoints},
        headline_suggestions = ${clean(configuration.production_name, 'Talk Show')},
        image_prompt = ${clean(production.presentation_prompt || production.thumbnail_prompt)},
        thumbnail_prompt = ${clean(production.thumbnail_prompt)},
        social_caption = ${socialCaption},
        fact_check_notes = ${factCheckNotes},
        producer_notes = ${clean(production.production_notes)},
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
      WHERE id = ${packageId} AND owner_user_id = ${ownerId}
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
      ${packageId}, ${ownerId}, 'talk', 'TalkProductionConfiguration', ${configuration.id},
      ${configuration.id}, ${clean(configuration.production_name, 'Talk Show')},
      ${configuration.show_id || null}, ${configuration.episode_id || null},
      ${clean(production.host_script)}, ${clean(production.host_script)}, ${topicSummary}, ${talkingPoints},
      ${clean(configuration.production_name, 'Talk Show')},
      ${clean(production.presentation_prompt || production.thumbnail_prompt)}, ${clean(production.thumbnail_prompt)},
      ${socialCaption}, ${factCheckNotes}, ${clean(production.production_notes)}, ${estimatedRuntime}, ${estimatedRuntime},
      ${clean(configuration.show_tone, 'Conversational')}, 'talk_show', 'approved',
      ${clean(metadata.model, 'creapd-ai-gateway')}, now(), 1, 'creapd-vercel', ${sourcePayload}::jsonb,
      now(), now()
    )
    RETURNING *
  `;

  return created;
}
