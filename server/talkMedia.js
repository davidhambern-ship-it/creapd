import { randomUUID } from 'node:crypto';
import { generateAndStoreTalkMedia } from './mediaGateway.js';

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

function safeFailure(error) {
  return {
    code: error?.code || 'TALK_IMAGE_GENERATION_FAILED',
    message: String(error?.message || 'Talk image generation failed').slice(0, 240),
  };
}

async function upsertImageAsset({
  sql,
  ownerId,
  configurationId,
  mediaType,
  prompt,
  media,
}) {
  const title = mediaType === 'thumbnail' ? 'AI Image: Thumbnail' : 'AI Image: Presentation Visual';
  const payload = JSON.stringify({
    media_type: mediaType,
    prompt,
    model: media.model,
    gateway_auth_source: media.gatewayAuthSource,
    blob_auth_source: media.blobAuthSource,
    blob_pathname: media.pathname,
    content_type: media.contentType,
    elapsed_ms: media.elapsedMs,
    generated_at: new Date().toISOString(),
  });

  const [existing] = await sql`
    SELECT id
    FROM creapd.talk_assets
    WHERE configuration_id = ${configurationId}
      AND owner_user_id = ${ownerId}
      AND asset_type = 'ai_image'
      AND source_payload ->> 'media_type' = ${mediaType}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (existing) {
    const [updated] = await sql`
      UPDATE creapd.talk_assets
      SET title = ${title}, content = ${media.url}, status = 'ready',
          source_system = 'creapd-vercel', source_payload = ${payload}::jsonb, updated_at = now()
      WHERE id = ${existing.id}
        AND owner_user_id = ${ownerId}
      RETURNING *
    `;
    return updated;
  }

  const [created] = await sql`
    INSERT INTO creapd.talk_assets (
      id, configuration_id, owner_user_id, asset_type, title, content,
      associated_topic, status, source_system, source_payload
    ) VALUES (
      ${randomUUID()}, ${configurationId}, ${ownerId}, 'ai_image', ${title}, ${media.url},
      NULL, 'ready', 'creapd-vercel', ${payload}::jsonb
    )
    RETURNING *
  `;
  return created;
}

export async function generateTalkImages({ sql, ownerUserId, configurationId }) {
  const ownerId = String(ownerUserId || '').trim();
  const configId = clean(configurationId);
  if (!ownerId || !configId) {
    const error = new Error('Talk image generation requires owner and configuration id');
    error.code = 'TALK_MEDIA_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT id, ai_automation
    FROM creapd.talk_production_configurations
    WHERE id = ${configId}
      AND owner_user_id = ${ownerId}
    LIMIT 1
  `;
  if (!configuration) {
    const error = new Error('Talk configuration was not found');
    error.code = 'TALK_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const automation = parseArray(configuration.ai_automation);
  const requested = automation.length === 0 || automation.includes('Generate AI Images');
  if (!requested) {
    return { requested: false, skipped: true, generated: [], failures: [] };
  }

  const promptAssets = await sql`
    SELECT asset_type, title, content
    FROM creapd.talk_assets
    WHERE configuration_id = ${configId}
      AND owner_user_id = ${ownerId}
      AND asset_type IN ('thumbnail_prompt', 'presentation_prompt')
      AND COALESCE(content, '') <> ''
    ORDER BY created_at ASC
  `;

  const jobs = [];
  const thumbnailPrompt = promptAssets.find(asset => asset.asset_type === 'thumbnail_prompt');
  const presentationPrompt = promptAssets.find(asset => asset.asset_type === 'presentation_prompt');
  if (thumbnailPrompt?.content) jobs.push({ mediaType: 'thumbnail', prompt: clean(thumbnailPrompt.content) });
  if (presentationPrompt?.content) jobs.push({ mediaType: 'presentation', prompt: clean(presentationPrompt.content) });

  if (!jobs.length) {
    return {
      requested: true,
      skipped: true,
      reason: 'no_image_prompts_generated',
      generated: [],
      failures: [],
    };
  }

  const settled = await Promise.allSettled(
    jobs.map(job => generateAndStoreTalkMedia({
      configurationId: configId,
      mediaType: job.mediaType,
      prompt: job.prompt,
    })),
  );

  const generated = [];
  const failures = [];

  for (let index = 0; index < settled.length; index += 1) {
    const job = jobs[index];
    const result = settled[index];
    if (result.status === 'rejected') {
      failures.push({ media_type: job.mediaType, ...safeFailure(result.reason) });
      continue;
    }

    const media = result.value;
    const asset = await upsertImageAsset({
      sql,
      ownerId,
      configurationId: configId,
      mediaType: job.mediaType,
      prompt: job.prompt,
      media,
    });

    if (job.mediaType === 'thumbnail') {
      await sql`
        UPDATE creapd.production_packages
        SET generated_thumbnail_url = ${media.url}, updated_at = now()
        WHERE configuration_id = ${configId}
          AND owner_user_id = ${ownerId}
          AND production_profile = 'talk'
      `;
    } else {
      await sql`
        UPDATE creapd.production_packages
        SET generated_image_url = ${media.url}, updated_at = now()
        WHERE configuration_id = ${configId}
          AND owner_user_id = ${ownerId}
          AND production_profile = 'talk'
      `;
    }

    generated.push({
      media_type: job.mediaType,
      url: media.url,
      model: media.model,
      elapsed_ms: media.elapsedMs,
      asset_id: asset?.id || null,
    });
  }

  return {
    requested: true,
    skipped: false,
    generated,
    failures,
    generated_count: generated.length,
    failure_count: failures.length,
  };
}
