import { randomUUID } from 'node:crypto';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 30,
};

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const AUDIO_CONTENT_TYPE = 'audio/wav';
const LOCAL_MODEL_PREFIX = 'onnx-community/Kokoro-82M';

function safeText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isOwnedBlobUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

async function getOwnedPackage(sql, ownerUserId, packageId) {
  if (!packageId) return null;

  const [pkg] = await sql`
    SELECT *
    FROM creapd.production_packages
    WHERE id = ${String(packageId)}
      AND owner_user_id = ${ownerUserId}
      AND source_entity_type = 'ResearchPoint'
    LIMIT 1
  `;

  return pkg || null;
}

function withAliases(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

async function authorizeUpload(response, sql, ownerUserId, body) {
  const packageId = safeText(body.package_id, 120);
  const contentType = safeText(body.content_type, 80) || AUDIO_CONTENT_TYPE;
  const byteSize = safeNumber(body.byte_size, 0);

  if (!packageId) {
    return response.status(400).json({ ok: false, error: 'package_id_required' });
  }

  if (contentType !== AUDIO_CONTENT_TYPE) {
    return response.status(400).json({ ok: false, error: 'audio_wav_required' });
  }

  if (byteSize <= 0 || byteSize > MAX_AUDIO_BYTES) {
    return response.status(400).json({
      ok: false,
      error: 'audio_size_invalid',
      max_bytes: MAX_AUDIO_BYTES,
    });
  }

  const pkg = await getOwnedPackage(sql, ownerUserId, packageId);
  if (!pkg) {
    return response.status(404).json({ ok: false, error: 'production_package_not_found' });
  }

  const pathname = [
    'creapd',
    'research',
    String(pkg.id),
    `voice-${Date.now()}-${randomUUID()}.wav`,
  ].join('/');

  const validUntil = Date.now() + 15 * 60 * 1000;
  const signedToken = await issueSignedToken({
    pathname,
    operations: ['put'],
    validUntil,
    allowedContentTypes: [AUDIO_CONTENT_TYPE],
    maximumSizeInBytes: MAX_AUDIO_BYTES,
  });

  const { presignedUrl } = await presignUrl(signedToken, {
    access: 'public',
    operation: 'put',
    pathname,
    validUntil,
    allowedContentTypes: [AUDIO_CONTENT_TYPE],
    maximumSizeInBytes: MAX_AUDIO_BYTES,
    addRandomSuffix: false,
  });

  return response.status(200).json({
    ok: true,
    service: 'creapd-research-local-voice',
    action: 'authorize',
    package_id: pkg.id,
    pathname,
    presigned_url: presignedUrl,
    content_type: AUDIO_CONTENT_TYPE,
    max_bytes: MAX_AUDIO_BYTES,
    valid_until: new Date(validUntil).toISOString(),
  });
}

async function registerUpload(response, sql, ownerUserId, body) {
  const packageId = safeText(body.package_id, 120);
  const blobUrl = safeText(body.blob_url, 2000);
  const blobPathname = safeText(body.blob_pathname, 1000);
  const model = safeText(body.model, 300);
  const voice = safeText(body.voice, 120);
  const device = safeText(body.device, 80);
  const elapsedMs = Math.max(0, Math.round(safeNumber(body.elapsed_ms, 0)));
  const byteSize = Math.max(0, Math.round(safeNumber(body.byte_size, 0)));

  if (!packageId || !blobUrl || !blobPathname) {
    return response.status(400).json({ ok: false, error: 'voice_registration_incomplete' });
  }

  const pkg = await getOwnedPackage(sql, ownerUserId, packageId);
  if (!pkg) {
    return response.status(404).json({ ok: false, error: 'production_package_not_found' });
  }

  const expectedPrefix = `creapd/research/${pkg.id}/voice-`;
  if (
    !isOwnedBlobUrl(blobUrl) ||
    !blobPathname.startsWith(expectedPrefix) ||
    !blobPathname.endsWith('.wav')
  ) {
    return response.status(400).json({ ok: false, error: 'invalid_owned_voice_blob' });
  }

  if (model && !model.startsWith(LOCAL_MODEL_PREFIX)) {
    return response.status(400).json({ ok: false, error: 'unsupported_local_voice_model' });
  }

  const now = new Date().toISOString();
  const mediaMetadata = JSON.stringify({
    last_media_generation: {
      media_type: 'audio',
      model: model || 'onnx-community/Kokoro-82M-v1.0-ONNX',
      voice: voice || null,
      device: device || null,
      gateway_auth_source: 'browser_local_inference',
      blob_auth_source: 'vercel_presigned_put',
      blob_pathname: blobPathname,
      content_type: AUDIO_CONTENT_TYPE,
      byte_size: byteSize || null,
      elapsed_ms: elapsedMs || null,
      generated_at: now,
    },
  });

  const [updatedPackage] = await sql`
    UPDATE creapd.production_packages
    SET
      generated_audio_url = ${blobUrl},
      voice_package_id = ${`kokoro:${voice || 'default'}`},
      source_system = 'creapd-neon-vercel',
      source_payload = COALESCE(source_payload, '{}'::jsonb) || ${mediaMetadata}::jsonb,
      updated_at = now()
    WHERE id = ${String(pkg.id)}
      AND owner_user_id = ${ownerUserId}
    RETURNING *
  `;

  return response.status(200).json({
    ok: true,
    service: 'creapd-research-local-voice',
    action: 'register',
    source: 'neon',
    data_authority: 'neon',
    package: withAliases(updatedPackage),
    timestamp: now,
  });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({ ok: false, error: 'DATABASE_NOT_CONFIGURED' });
  }

  try {
    const auth = await requireCreapdUser(request);
    const ownerUserId = String(auth.user.id);
    const sql = getSql();
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const action = safeText(body.action, 40);

    if (action === 'authorize') {
      return await authorizeUpload(response, sql, ownerUserId, body);
    }

    if (action === 'register') {
      return await registerUpload(response, sql, ownerUserId, body);
    }

    return response.status(400).json({ ok: false, error: 'unsupported_action' });
  } catch (error) {
    console.error('[CREAPD LOCAL VOICE UPLOAD]', error);
    return response.status(error?.status || 500).json({
      ok: false,
      service: 'creapd-research-local-voice',
      error: error?.code || 'local_voice_upload_failed',
      diagnostic: {
        code: error?.code || null,
        message: safeText(error?.message || 'local_voice_upload_failed', 260),
      },
      timestamp: new Date().toISOString(),
    });
  }
}
