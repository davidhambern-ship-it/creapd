import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 30,
};

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const AUDIO_CONTENT_TYPE = 'audio/wav';
const LOCAL_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const LOCAL_MODEL_PREFIX = 'onnx-community/Kokoro-82M';
const TICKET_TTL_MS = 15 * 60 * 1000;

function safeText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getTicketSecret() {
  const secret = String(
    process.env.CREAPD_UPLOAD_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    '',
  ).trim();

  if (!secret) {
    const error = new Error('Local voice upload signing is not configured');
    error.code = 'VOICE_UPLOAD_SIGNING_NOT_CONFIGURED';
    throw error;
  }

  return secret;
}

function signTicket(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getTicketSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyTicket(ticket) {
  const [encoded, suppliedSignature] = String(ticket || '').split('.');
  if (!encoded || !suppliedSignature) {
    const error = new Error('Invalid local voice upload ticket');
    error.code = 'VOICE_UPLOAD_TICKET_INVALID';
    throw error;
  }

  const expectedSignature = createHmac('sha256', getTicketSecret())
    .update(encoded)
    .digest('base64url');

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    const error = new Error('Invalid local voice upload ticket');
    error.code = 'VOICE_UPLOAD_TICKET_INVALID';
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('Invalid local voice upload ticket payload');
    error.code = 'VOICE_UPLOAD_TICKET_INVALID';
    throw error;
  }

  if (
    payload?.purpose !== 'creapd_local_voice' ||
    !payload?.packageId ||
    !payload?.ownerUserId ||
    !payload?.pathname ||
    Number(payload?.expiresAt || 0) < Date.now()
  ) {
    const error = new Error('Expired or invalid local voice upload ticket');
    error.code = 'VOICE_UPLOAD_TICKET_EXPIRED';
    throw error;
  }

  return payload;
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
      AND owner_user_id = ${String(ownerUserId)}
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

async function persistLocalVoice({
  sql,
  ownerUserId,
  packageId,
  blobUrl,
  blobPathname,
  model = LOCAL_MODEL,
  voice = null,
  device = null,
  byteSize = 0,
  elapsedMs = 0,
  blobAuthSource = 'vercel_client_upload',
}) {
  if (!isOwnedBlobUrl(blobUrl)) {
    const error = new Error('Invalid owned voice blob URL');
    error.code = 'INVALID_OWNED_VOICE_BLOB';
    throw error;
  }

  const pkg = await getOwnedPackage(sql, ownerUserId, packageId);
  if (!pkg) {
    const error = new Error('Production package not found');
    error.code = 'PRODUCTION_PACKAGE_NOT_FOUND';
    throw error;
  }

  const expectedPrefix = `creapd/research/${pkg.id}/voice-`;
  if (!blobPathname.startsWith(expectedPrefix) || !blobPathname.endsWith('.wav')) {
    const error = new Error('Voice blob pathname does not match the production package');
    error.code = 'INVALID_OWNED_VOICE_BLOB';
    throw error;
  }

  const normalizedModel = safeText(model, 300) || LOCAL_MODEL;
  if (!normalizedModel.startsWith(LOCAL_MODEL_PREFIX)) {
    const error = new Error('Unsupported local voice model');
    error.code = 'UNSUPPORTED_LOCAL_VOICE_MODEL';
    throw error;
  }

  const now = new Date().toISOString();
  const mediaMetadata = JSON.stringify({
    last_media_generation: {
      media_type: 'audio',
      model: normalizedModel,
      voice: safeText(voice, 120) || null,
      device: safeText(device, 80) || null,
      gateway_auth_source: 'browser_local_inference',
      blob_auth_source: blobAuthSource,
      blob_pathname: blobPathname,
      content_type: AUDIO_CONTENT_TYPE,
      byte_size: Math.max(0, Math.round(safeNumber(byteSize, 0))) || null,
      elapsed_ms: Math.max(0, Math.round(safeNumber(elapsedMs, 0))) || null,
      generated_at: now,
    },
  });

  const [updatedPackage] = await sql`
    UPDATE creapd.production_packages
    SET
      generated_audio_url = ${blobUrl},
      voice_package_id = ${`kokoro:${safeText(voice, 120) || 'local'}`},
      source_system = 'creapd-neon-vercel',
      source_payload = COALESCE(source_payload, '{}'::jsonb) || ${mediaMetadata}::jsonb,
      updated_at = now()
    WHERE id = ${String(pkg.id)}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;

  return updatedPackage || null;
}

async function authorizeUpload(request, response, sql, body) {
  const auth = await requireCreapdUser(request);
  const ownerUserId = String(auth.user.id);
  const packageId = safeText(body.package_id, 120);
  const contentType = safeText(body.content_type, 80) || AUDIO_CONTENT_TYPE;
  const byteSize = safeNumber(body.byte_size, 0);
  const model = safeText(body.model, 300) || LOCAL_MODEL;
  const voice = safeText(body.voice, 120) || null;
  const device = safeText(body.device, 80) || null;

  if (!packageId) {
    return response.status(400).json({ ok: false, error: 'package_id_required' });
  }

  if (contentType !== AUDIO_CONTENT_TYPE) {
    return response.status(400).json({ ok: false, error: 'audio_wav_required' });
  }

  if (!model.startsWith(LOCAL_MODEL_PREFIX)) {
    return response.status(400).json({ ok: false, error: 'unsupported_local_voice_model' });
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

  const expiresAt = Date.now() + TICKET_TTL_MS;
  const ticket = signTicket({
    purpose: 'creapd_local_voice',
    packageId: String(pkg.id),
    ownerUserId,
    pathname,
    maxBytes: Math.round(byteSize),
    model,
    voice,
    device,
    expiresAt,
  });

  return response.status(200).json({
    ok: true,
    service: 'creapd-research-local-voice',
    action: 'authorize',
    package_id: pkg.id,
    pathname,
    upload_ticket: ticket,
    content_type: AUDIO_CONTENT_TYPE,
    max_bytes: MAX_AUDIO_BYTES,
    valid_until: new Date(expiresAt).toISOString(),
  });
}

async function handleBlobClientUpload(request, response, sql, body) {
  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let payload = null;
      try {
        payload = clientPayload ? JSON.parse(clientPayload) : null;
      } catch {
        payload = null;
      }

      const ticket = verifyTicket(payload?.ticket);
      if (String(pathname) !== String(ticket.pathname)) {
        const error = new Error('Voice upload pathname does not match its ticket');
        error.code = 'VOICE_UPLOAD_PATH_MISMATCH';
        throw error;
      }

      const pkg = await getOwnedPackage(sql, ticket.ownerUserId, ticket.packageId);
      if (!pkg) {
        const error = new Error('Production package is no longer available');
        error.code = 'PRODUCTION_PACKAGE_NOT_FOUND';
        throw error;
      }

      return {
        allowedContentTypes: [AUDIO_CONTENT_TYPE],
        maximumSizeInBytes: Math.min(
          MAX_AUDIO_BYTES,
          Math.max(1, Number(ticket.maxBytes || MAX_AUDIO_BYTES)),
        ),
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({
          packageId: ticket.packageId,
          ownerUserId: ticket.ownerUserId,
          pathname: ticket.pathname,
          model: ticket.model || LOCAL_MODEL,
          voice: ticket.voice || null,
          device: ticket.device || null,
          byteSize: Number(ticket.maxBytes || 0),
        }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      let payload = null;
      try {
        payload = tokenPayload ? JSON.parse(tokenPayload) : null;
      } catch {
        payload = null;
      }

      if (!payload?.packageId || !payload?.ownerUserId || !blob?.url || !blob?.pathname) {
        console.error('[CREAPD LOCAL VOICE BLOB COMPLETE] Missing completion metadata');
        return;
      }

      try {
        await persistLocalVoice({
          sql,
          ownerUserId: payload.ownerUserId,
          packageId: payload.packageId,
          blobUrl: blob.url,
          blobPathname: blob.pathname,
          model: payload.model || LOCAL_MODEL,
          voice: payload.voice || null,
          device: payload.device || null,
          byteSize: payload.byteSize || 0,
          blobAuthSource: 'vercel_client_upload_callback',
        });

        console.info('[CREAPD LOCAL VOICE BLOB COMPLETE]', {
          packageId: payload.packageId,
          pathname: blob.pathname,
          neonPersisted: true,
        });
      } catch (error) {
        console.error('[CREAPD LOCAL VOICE BLOB COMPLETE] Neon persistence failed', error);
      }
    },
  });

  return response.status(200).json(jsonResponse);
}

async function registerUpload(request, response, sql, body) {
  const auth = await requireCreapdUser(request);
  const ownerUserId = String(auth.user.id);
  const packageId = safeText(body.package_id, 120);
  const blobUrl = safeText(body.blob_url, 2000);
  const blobPathname = safeText(body.blob_pathname, 1000);

  if (!packageId || !blobUrl || !blobPathname) {
    return response.status(400).json({ ok: false, error: 'voice_registration_incomplete' });
  }

  let updatedPackage;
  try {
    updatedPackage = await persistLocalVoice({
      sql,
      ownerUserId,
      packageId,
      blobUrl,
      blobPathname,
      model: body.model || LOCAL_MODEL,
      voice: body.voice || null,
      device: body.device || null,
      byteSize: body.byte_size || 0,
      elapsedMs: body.elapsed_ms || 0,
      blobAuthSource: 'vercel_client_upload_register',
    });
  } catch (error) {
    if (error?.code === 'PRODUCTION_PACKAGE_NOT_FOUND') {
      return response.status(404).json({ ok: false, error: 'production_package_not_found' });
    }
    if (
      error?.code === 'INVALID_OWNED_VOICE_BLOB' ||
      error?.code === 'UNSUPPORTED_LOCAL_VOICE_MODEL'
    ) {
      return response.status(400).json({ ok: false, error: error.code.toLowerCase() });
    }
    throw error;
  }

  return response.status(200).json({
    ok: true,
    service: 'creapd-research-local-voice',
    action: 'register',
    source: 'neon',
    data_authority: 'neon',
    package: withAliases(updatedPackage),
    timestamp: new Date().toISOString(),
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
    const sql = getSql();
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    const action = safeText(body.action, 40);

    if (action === 'authorize') {
      return await authorizeUpload(request, response, sql, body);
    }

    if (action === 'register') {
      return await registerUpload(request, response, sql, body);
    }

    // @vercel/blob/client posts its own protocol body without CREAPD auth headers.
    return await handleBlobClientUpload(request, response, sql, body);
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
