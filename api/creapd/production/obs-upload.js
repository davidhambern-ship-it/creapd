import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';
import { requireCreapdUser } from '../../../server/creapdUser.js';

export const config = {
  maxDuration: 30,
};

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const TICKET_TTL_MS = 15 * 60 * 1000;

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/mpeg',
]);

function safeText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function getTicketSecret() {
  const secret = String(
    process.env.CREAPD_UPLOAD_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    '',
  ).trim();

  if (!secret) {
    const error = new Error('OBS media upload signing is not configured');
    error.code = 'OBS_UPLOAD_SIGNING_NOT_CONFIGURED';
    throw error;
  }

  return secret;
}

function signTicket(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getTicketSecret())
    .update(encoded)
    .digest('base64url');
  return encoded + '.' + signature;
}

function verifyTicket(ticket) {
  const [encoded, suppliedSignature] = String(ticket || '').split('.');
  if (!encoded || !suppliedSignature) {
    const error = new Error('Invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  const expectedSignature = createHmac('sha256', getTicketSecret())
    .update(encoded)
    .digest('base64url');

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    const error = new Error('Invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('Invalid OBS upload ticket payload');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  if (
    payload?.purpose !== 'creapd_obs_media' ||
    !payload?.ownerUserId ||
    !payload?.pathname ||
    !payload?.contentType ||
    Number(payload?.expiresAt || 0) < Date.now()
  ) {
    const error = new Error('Expired or invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_EXPIRED';
    throw error;
  }

  return payload;
}

function extensionFor(filename, contentType) {
  const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]{2,6})$/);
  if (match) return match[1];

  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/mpeg': 'mpeg',
  };
  return map[contentType] || 'bin';
}

function allowedType(contentType) {
  if (IMAGE_TYPES.has(contentType)) return { kind: 'image', maxBytes: MAX_IMAGE_BYTES };
  if (VIDEO_TYPES.has(contentType)) return { kind: 'video', maxBytes: MAX_VIDEO_BYTES };
  return null;
}

async function authorizeUpload(request, response, body) {
  const auth = await requireCreapdUser(request);
  const ownerUserId = String(auth.user.id);
  const filename = safeText(body.filename, 240);
  const contentType = safeText(body.content_type, 120).toLowerCase();
  const byteSize = Number(body.byte_size || 0);
  const allowed = allowedType(contentType);

  if (!filename || !allowed) {
    return response.status(400).json({ ok: false, error: 'unsupported_obs_media_type' });
  }

  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > allowed.maxBytes) {
    return response.status(400).json({
      ok: false,
      error: 'obs_media_size_invalid',
      max_bytes: allowed.maxBytes,
    });
  }

  const extension = extensionFor(filename, contentType);
  const pathname = [
    'creapd',
    'obs',
    ownerUserId.replace(/[^a-zA-Z0-9_-]/g, '_'),
    Date.now() + '-' + randomUUID() + '.' + extension,
  ].join('/');

  const expiresAt = Date.now() + TICKET_TTL_MS;
  const ticket = signTicket({
    purpose: 'creapd_obs_media',
    ownerUserId,
    pathname,
    contentType,
    maxBytes: Math.round(byteSize),
    kind: allowed.kind,
    expiresAt,
  });

  return response.status(200).json({
    ok: true,
    action: 'authorize',
    pathname,
    upload_ticket: ticket,
    content_type: contentType,
    media_kind: allowed.kind,
    max_bytes: allowed.maxBytes,
    valid_until: new Date(expiresAt).toISOString(),
  });
}

async function handleBlobClientUpload(request, response, body) {
  const result = await handleUpload({
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
        const error = new Error('OBS upload pathname does not match its ticket');
        error.code = 'OBS_UPLOAD_PATH_MISMATCH';
        throw error;
      }

      const allowed = allowedType(ticket.contentType);
      if (!allowed) {
        const error = new Error('OBS upload content type is no longer allowed');
        error.code = 'OBS_UPLOAD_TYPE_INVALID';
        throw error;
      }

      return {
        allowedContentTypes: [ticket.contentType],
        maximumSizeInBytes: Math.min(
          allowed.maxBytes,
          Math.max(1, Number(ticket.maxBytes || allowed.maxBytes)),
        ),
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({
          ownerUserId: ticket.ownerUserId,
          pathname: ticket.pathname,
          contentType: ticket.contentType,
          kind: ticket.kind,
        }),
      };
    },
    onUploadCompleted: async ({ blob }) => {
      console.info('[CREAPD OBS MEDIA UPLOAD COMPLETE]', {
        pathname: blob?.pathname || null,
        url: blob?.url || null,
      });
    },
  });

  return response.status(200).json(result);
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    if (safeText(body.action, 40) === 'authorize') {
      return await authorizeUpload(request, response, body);
    }
    return await handleBlobClientUpload(request, response, body);
  } catch (error) {
    console.error('[CREAPD OBS MEDIA UPLOAD]', error);
    return response.status(error?.status || 500).json({
      ok: false,
      error: error?.code || 'obs_media_upload_failed',
      diagnostic: {
        message: String(error?.message || 'OBS media upload failed').slice(0, 240),
      },
    });
  }
}
