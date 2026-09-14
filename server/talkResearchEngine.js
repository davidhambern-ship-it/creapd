import { createHash, randomUUID } from 'node:crypto';
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

function buildTalkResearchSchema(topicBatch) {
  const topicNameSchema = { type: 'string', enum: topicBatch };
  return objectSchema({
    research_items: arraySchema(objectSchema({
      ...researchItemSchema.properties,
      topic_name: topicNameSchema,
    })),
    topics: arraySchema(objectSchema({
      ...topicSchema.properties,
      topic_name: topicNameSchema,
    })),
    suggested_guests: arraySchema(guestSchema),
  });
}

const VALID_RELEVANCE = new Set(['high', 'medium', 'low']);
const VALID_VERIFICATION = new Set(['verified', 'mixed', 'unverified', 'warning']);
const TOPICS_PER_BATCH = 3;

function clean(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function canonical(value) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ');
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

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildResearchSignature(configuration, topics, sources) {
  return createHash('sha256')
    .update(JSON.stringify({
      production_name: configuration.production_name || '',
      show_format: configuration.show_format || '',
      show_tone: configuration.show_tone || '',
      show_description: configuration.show_description || '',
      guest_details: configuration.guest_details || '',
      topics,
      sources,
    }))
    .digest('hex')
    .slice(0, 24);
}

function buildResearchPrompt(configuration, topicBatch, sources, batchIndex, batchCount) {
  const today = new Date().toISOString().slice(0, 10);

  return `You are the RESEARCH + VERIFICATION desk for CREAPD Talk Studio.

CURRENT DATE: ${today}
SHOW: ${configuration.production_name || 'Talk Show'}
FORMAT: ${configuration.show_format || 'Interview Show'}
TONE: ${configuration.show_tone || 'Conversational'}
DESCRIPTION: ${configuration.show_description || 'No additional description.'}
RESEARCH BATCH: ${batchIndex + 1} of ${batchCount}
TOPICS IN THIS BATCH: ${topicBatch.join(' | ')}
PREFERRED SOURCE TYPES: ${sources.length ? sources.join(', ') : 'Use the strongest primary and reputable sources available.'}
PROVIDED GUEST DETAILS: ${configuration.guest_details || 'None supplied.'}

You are performing three editorial jobs for ONLY the topics in this batch:
1. INTAKE / DE-DUPLICATION — identify the distinct claims and developments that matter.
2. FACT-CHECK / VERIFICATION — use LIVE WEB SEARCH to verify important factual claims. Prefer official records, primary sources, academic work, direct transcripts, and reputable reporting. Never invent a URL, quotation, statistic, person, or organization.
3. COUNTER-PERSPECTIVE / DEBATE — identify credible competing interpretations, weaknesses, unanswered questions, and skeptical questions a guest/caller could raise. Do not manufacture false balance where evidence is one-sided.

OUTPUT CONTRACT:
- Cover EVERY topic in this batch and no unrelated topics.
- topic_name MUST exactly match one of these input strings: ${JSON.stringify(topicBatch)}.
- Return exactly one topic dossier per input topic.
- Return 1-2 concise research items per input topic when useful. The topic dossier is the authoritative coverage record.
- Each research summary: under 60 words.
- generated_summary: under 100 words per topic.
- talking_points: under 120 words per topic.
- verification_notes: under 60 words per topic.
- counter_perspectives: at most 2 concise items per topic.
- debate_questions: at most 3 concise items per topic.
- source_links: at most 4 real https URLs per topic found during this run; use [] rather than inventing links.
- verification_status must be one of verified, mixed, unverified, warning.
- confidence_score is 0-100.
- Suggest at most 2 real identifiable guests for this batch, supported by reliable sources. If none can be responsibly verified, return an empty array.
- Keep the response compact. Complete valid structured JSON is more important than extra prose.

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
    stage: 'research_failed',
    failed_at: new Date().toISOString(),
    code: error?.code || null,
    message: String(error?.message || 'Talk research failed').slice(0, 500),
    recoverable: true,
    ...(error?.details && typeof error.details === 'object' ? { failure_details: error.details } : {}),
  });
  try {
    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='failed', build_metadata=${metadata}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;
  } catch {}
}

async function clearResearchCheckpoint(sql, ownerId, configId) {
  await Promise.all([
    sql`DELETE FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
    sql`DELETE FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId}`,
    sql`DELETE FROM creapd.talk_guests WHERE configuration_id=${configId} AND owner_user_id=${ownerId} AND guest_source='ai'`,
  ]);
}

async function clearTopicBatch(sql, ownerId, configId, topicBatch) {
  for (const topicName of topicBatch) {
    await Promise.all([
      sql`DELETE FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId} AND lower(topic_name)=lower(${topicName})`,
      sql`DELETE FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId} AND lower(topic_name)=lower(${topicName})`,
    ]);
  }
}

function normalizeAndValidateBatch(data, topicBatch) {
  const rawTopics = Array.isArray(data?.topics) ? data.topics : [];
  const rawResearchItems = Array.isArray(data?.research_items) ? data.research_items : [];
  const dossierByTopic = new Map(rawTopics.map(topic => [canonical(topic?.topic_name), topic]));
  const missingDossiers = topicBatch.filter(topic => !dossierByTopic.has(canonical(topic)));

  if (missingDossiers.length) {
    const error = new Error('Talk research batch returned incomplete topic dossier coverage');
    error.code = 'TALK_RESEARCH_BATCH_INCOMPLETE';
    error.details = { missing_dossiers: missingDossiers };
    throw error;
  }

  const normalizedTopics = topicBatch.map(topicName => ({
    ...dossierByTopic.get(canonical(topicName)),
    topic_name: topicName,
  }));

  const normalizedResearchItems = rawResearchItems
    .filter(item => topicBatch.some(topic => canonical(topic) === canonical(item?.topic_name)))
    .map(item => {
      const inputTopic = topicBatch.find(topic => canonical(topic) === canonical(item?.topic_name));
      return { ...item, topic_name: inputTopic || clean(item?.topic_name) };
    });

  let syntheticResearchCount = 0;
  for (const topicName of topicBatch) {
    const alreadyCovered = normalizedResearchItems.some(item => canonical(item?.topic_name) === canonical(topicName));
    if (alreadyCovered) continue;

    const dossier = dossierByTopic.get(canonical(topicName)) || {};
    const sourceLinks = Array.isArray(dossier.source_links) ? dossier.source_links : [];
    const firstSourceUrl = sourceLinks.find(url => /^https:\/\//i.test(clean(url))) || '';
    normalizedResearchItems.push({
      topic_name: topicName,
      title: `${topicName} — verified briefing`,
      source: clean(dossier.sources, 'CREAPD verified topic dossier'),
      source_url: firstSourceUrl,
      category: 'verified topic briefing',
      summary: clean(dossier.generated_summary, `Verified briefing for ${topicName}.`),
      date: new Date().toISOString().slice(0, 10),
      relevance: 'high',
      verification_status: clean(dossier.verification_status, 'unverified'),
      verification_notes: clean(
        dossier.verification_notes,
        'Derived from the verified topic dossier generated in this research batch.',
      ),
      confidence_score: clamp(dossier.confidence_score, 0, 100, 0),
    });
    syntheticResearchCount += 1;
  }

  return {
    research_items: normalizedResearchItems,
    topics: normalizedTopics,
    suggested_guests: Array.isArray(data?.suggested_guests) ? data.suggested_guests : [],
    synthetic_research_count: syntheticResearchCount,
  };
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

  const requestedTopics = parseArray(configuration.topics).map(topic => clean(topic)).filter(Boolean);
  const topicsToResearch = requestedTopics.length
    ? requestedTopics
    : ['Current timely topics appropriate to this show'];
  const sources = parseArray(configuration.research_sources);
  const batches = chunk(topicsToResearch, TOPICS_PER_BATCH);
  const signature = buildResearchSignature(configuration, topicsToResearch, sources);
  const previousMeta = configuration.build_metadata && typeof configuration.build_metadata === 'object'
    ? configuration.build_metadata
    : {};
  const canResume = previousMeta.research_signature === signature && previousMeta.checkpointed === true;
  const completedTopics = new Set(
    canResume && Array.isArray(previousMeta.research_completed_topics)
      ? previousMeta.research_completed_topics.map(canonical)
      : [],
  );

  if (!canResume) {
    await clearResearchCheckpoint(sql, ownerId, configId);
    completedTopics.clear();
  }

  const startedAt = canResume && previousMeta.research_started_at
    ? previousMeta.research_started_at
    : new Date().toISOString();
  let responseIds = canResume && Array.isArray(previousMeta.research_response_ids)
    ? previousMeta.research_response_ids.filter(Boolean)
    : [];

  const startMeta = json({
    ...previousMeta,
    pipeline: 'talkStudioV2',
    stage: 'researching',
    research_started_at: startedAt,
    research_signature: signature,
    research_batch_count: batches.length,
    research_batches_completed: Math.floor(completedTopics.size / TOPICS_PER_BATCH),
    research_completed_topics: topicsToResearch.filter(topic => completedTopics.has(canonical(topic))),
    research_response_ids: responseIds,
    checkpointed: true,
    recoverable: true,
  });
  await sql`
    UPDATE creapd.talk_production_configurations
    SET status='building', build_metadata=${startMeta}::jsonb, updated_at=now()
    WHERE id=${configId} AND owner_user_id=${ownerId}
  `;

  try {
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const topicBatch = batches[batchIndex];
      const pendingTopics = topicBatch.filter(topic => !completedTopics.has(canonical(topic)));
      if (!pendingTopics.length) continue;

      let result;
      try {
        result = await generateStructuredGatewayResponse({
          webSearch: true,
          schemaName: 'creapd_talk_research_batch_v2',
          schema: buildTalkResearchSchema(pendingTopics),
          maxOutputTokens: 7000,
          timeoutMs: 85000,
          prompt: buildResearchPrompt(configuration, pendingTopics, sources, batchIndex, batches.length),
        });
      } catch (error) {
        error.details = {
          ...(error?.details && typeof error.details === 'object' ? error.details : {}),
          batch_index: batchIndex,
          batch_number: batchIndex + 1,
          batch_count: batches.length,
          topics: pendingTopics,
        };
        throw error;
      }

      const data = normalizeAndValidateBatch(result.data || {}, pendingTopics);
      const researchItems = data.research_items;
      const topics = data.topics;
      const suggestedGuests = data.suggested_guests;

      await clearTopicBatch(sql, ownerId, configId, pendingTopics);

      const batchMetadata = {
        pipeline: 'talkStudioV2',
        stage: 'researching',
        research_started_at: startedAt,
        research_signature: signature,
        research_batch_count: batches.length,
        current_batch: batchIndex + 1,
        current_batch_elapsed_ms: result.elapsedMs,
        synthetic_research_items: data.synthetic_research_count,
        model: result.model,
        gateway_auth_source: result.authSource,
        web_search_used: result.webSearchUsed,
        checkpointed: true,
        recoverable: true,
      };
      const batchMetaJson = json(batchMetadata);

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
            ${clamp(item.confidence_score, 0, 100, 0)}, 'creapd-vercel', ${batchMetaJson}::jsonb
          )
        `;
      }

      for (let index = 0; index < topics.length; index += 1) {
        const topic = topics[index] || {};
        const verification = VALID_VERIFICATION.has(topic.verification_status) ? topic.verification_status : 'unverified';
        const inputIndex = topicsToResearch.findIndex(name => canonical(name) === canonical(topic.topic_name));
        const displayOrder = inputIndex >= 0 ? inputIndex : (batchIndex * TOPICS_PER_BATCH) + index;
        await sql`
          INSERT INTO creapd.talk_topics (
            id, configuration_id, owner_user_id, topic_name, generated_summary, talking_points,
            sources, source_links, suggested_placement, verification_status, verification_notes,
            counter_perspectives, debate_questions, confidence_score, status, display_order,
            source_system, source_payload
          ) VALUES (
            ${randomUUID()}, ${configId}, ${ownerId}, ${clean(topic.topic_name, `Topic ${displayOrder + 1}`)},
            ${clean(topic.generated_summary)}, ${clean(topic.talking_points)}, ${clean(topic.sources)},
            ${json(topic.source_links, [])}::jsonb, ${clean(topic.suggested_placement)}, ${verification},
            ${clean(topic.verification_notes)}, ${json(topic.counter_perspectives, [])}::jsonb,
            ${json(topic.debate_questions, [])}::jsonb, ${clamp(topic.confidence_score, 0, 100, 0)},
            'ready', ${displayOrder}, 'creapd-vercel', ${batchMetaJson}::jsonb
          )
        `;
      }

      for (const guest of suggestedGuests) {
        const guestName = clean(guest.guest_name);
        if (!guestName) continue;
        const [existingGuest] = await sql`
          SELECT id FROM creapd.talk_guests
          WHERE configuration_id=${configId} AND owner_user_id=${ownerId}
            AND guest_source='ai' AND lower(guest_name)=lower(${guestName})
          LIMIT 1
        `;
        if (existingGuest) continue;
        await sql`
          INSERT INTO creapd.talk_guests (
            id, configuration_id, owner_user_id, guest_name, title_role, organization, bio,
            expertise, website_url, social_handle, talking_points, status, availability_status,
            guest_source, source_system, source_payload
          ) VALUES (
            ${randomUUID()}, ${configId}, ${ownerId}, ${guestName}, ${clean(guest.title_role)},
            ${clean(guest.organization)}, ${clean(guest.bio)}, ${clean(guest.expertise)}, ${clean(guest.website_url)},
            ${clean(guest.social_handle)}, ${clean(guest.talking_points)}, 'pending', 'suggested',
            'ai', 'creapd-vercel', ${batchMetaJson}::jsonb
          )
        `;
      }

      pendingTopics.forEach(topic => completedTopics.add(canonical(topic)));
      if (result.responseId) responseIds = [...responseIds, result.responseId];

      const checkpointMeta = json({
        ...batchMetadata,
        stage: 'researching',
        research_batches_completed: batchIndex + 1,
        research_completed_topics: topicsToResearch.filter(topic => completedTopics.has(canonical(topic))),
        research_response_ids: responseIds,
        last_checkpoint_at: new Date().toISOString(),
      });
      await sql`
        UPDATE creapd.talk_production_configurations
        SET status='building', build_metadata=${checkpointMeta}::jsonb, updated_at=now()
        WHERE id=${configId} AND owner_user_id=${ownerId}
      `;
    }

    const [[counts], guestRows] = await Promise.all([
      sql`
        SELECT
          (SELECT count(*)::int FROM creapd.talk_research_items WHERE configuration_id=${configId} AND owner_user_id=${ownerId}) AS research_count,
          (SELECT count(*)::int FROM creapd.talk_topics WHERE configuration_id=${configId} AND owner_user_id=${ownerId}) AS topic_count
      `,
      sql`SELECT count(*)::int AS guest_suggestion_count FROM creapd.talk_guests WHERE configuration_id=${configId} AND owner_user_id=${ownerId} AND guest_source='ai'`,
    ]);

    const completedAt = new Date().toISOString();
    const finalMetadata = {
      pipeline: 'talkStudioV2',
      stage: 'research_ready',
      research_started_at: startedAt,
      research_completed_at: completedAt,
      research_signature: signature,
      research_batch_count: batches.length,
      research_batches_completed: batches.length,
      research_completed_topics: topicsToResearch,
      research_response_ids: responseIds,
      research_count: Number(counts?.research_count || 0),
      topic_count: Number(counts?.topic_count || 0),
      guest_suggestion_count: Number(guestRows?.[0]?.guest_suggestion_count || 0),
      checkpointed: true,
      recoverable: true,
    };
    const finalMetaJson = json(finalMetadata);

    await sql`
      UPDATE creapd.talk_production_configurations
      SET status='building', build_metadata=${finalMetaJson}::jsonb, updated_at=now()
      WHERE id=${configId} AND owner_user_id=${ownerId}
    `;

    return {
      success: true,
      stage: 'research_ready',
      configuration_id: configId,
      research_count: finalMetadata.research_count,
      topic_count: finalMetadata.topic_count,
      guest_suggestion_count: finalMetadata.guest_suggestion_count,
      batch_count: batches.length,
      checkpointed: true,
      resumed: canResume,
    };
  } catch (error) {
    await setStageFailure(sql, ownerId, configId, error);
    throw error;
  }
}
