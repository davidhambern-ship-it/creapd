import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';
const DEFAULT_IMAGE_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';

function safeMessage(value, fallback) {
  return String(value || fallback || 'media_generation_failed').slice(0, 260);
}

function resolveCloudflareCredential() {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const token = String(process.env.CLOUDFLARE_API_TOKEN || '').trim();

  if (!accountId || !token) {
    const error = new Error(
      `Cloudflare Workers AI is not configured for this project (account_id_present=${Boolean(accountId)}, api_token_present=${Boolean(token)})`,
    );
    error.code = 'CLOUDFLARE_AI_NOT_CONFIGURED';
    throw error;
  }

  return { accountId, token, source: 'cloudflare_workers_ai_token' };
}

async function uploadPublicBlob({ pathname, bytes, contentType }) {
  if (!pathname || !bytes?.length) {
    const error = new Error('Blob pathname and bytes are required');
    error.code = 'BLOB_UPLOAD_INPUT_INVALID';
    throw error;
  }

  const token = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (!token) {
    const error = new Error('Vercel Blob is not configured for this project');
    error.code = 'BLOB_NOT_CONFIGURED';
    throw error;
  }

  try {
    const blob = await put(pathname, bytes, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      token,
      abortSignal: AbortSignal.timeout(30000),
    });

    if (!blob?.url) {
      const error = new Error('Vercel Blob returned no URL');
      error.code = 'BLOB_UPLOAD_EMPTY';
      throw error;
    }

    return {
      url: blob.url,
      downloadUrl: blob.downloadUrl || null,
      pathname: blob.pathname || pathname,
      contentType: blob.contentType || contentType,
      etag: blob.etag || null,
      authSource: 'read_write_token',
    };
  } catch (error) {
    if (String(error?.code || '').startsWith('BLOB_')) throw error;
    const wrapped = new Error(safeMessage(error?.message, 'Vercel Blob upload failed'));
    wrapped.code = 'BLOB_UPLOAD_FAILED';
    throw wrapped;
  }
}

async function generateImageBytes({ prompt, model = DEFAULT_IMAGE_MODEL }) {
  if (!prompt) {
    const error = new Error('Image prompt is required');
    error.code = 'IMAGE_PROMPT_REQUIRED';
    throw error;
  }

  const credential = resolveCloudflareCredential();
  const startedAt = Date.now();
  const modelPath = String(model || DEFAULT_IMAGE_MODEL).trim();
  const endpoint = `${CLOUDFLARE_API_BASE_URL}/accounts/${encodeURIComponent(credential.accountId)}/ai/run/${modelPath}`;

  const cloudflareResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      prompt: String(prompt).slice(0, 2048),
      steps: 4,
    }),
    signal: AbortSignal.timeout(55000),
  });

  const payload = await cloudflareResponse.json().catch(() => null);
  if (!cloudflareResponse.ok || payload?.success === false) {
    const providerMessage =
      payload?.errors?.[0]?.message ||
      payload?.error?.message ||
      payload?.message ||
      `Cloudflare Workers AI returned HTTP ${cloudflareResponse.status}`;
    const error = new Error(safeMessage(providerMessage));
    error.code = 'CLOUDFLARE_IMAGE_FAILED';
    error.status = cloudflareResponse.status;
    throw error;
  }

  const imageBase64 = payload?.result?.image || payload?.image || null;
  const bytes = imageBase64 ? Buffer.from(imageBase64, 'base64') : null;

  if (!bytes?.length) {
    const error = new Error('Cloudflare Workers AI returned no image bytes');
    error.code = 'CLOUDFLARE_IMAGE_EMPTY';
    throw error;
  }

  return {
    bytes,
    contentType: 'image/jpeg',
    extension: 'jpg',
    model: modelPath,
    authSource: credential.source,
    elapsedMs: Date.now() - startedAt,
  };
}

export function hasOwnedMediaStorageConfig() {
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim());
}

export async function generateAndStoreResearchMedia({
  packageId,
  mediaType,
  prompt,
}) {
  if (!packageId || !['image', 'thumbnail'].includes(mediaType)) {
    const error = new Error(
      mediaType === 'audio'
        ? 'Research voice generation is browser-local only; paid server TTS is disabled.'
        : 'Unsupported Research media request',
    );
    error.code = mediaType === 'audio' ? 'LOCAL_VOICE_REQUIRED' : 'MEDIA_REQUEST_INVALID';
    error.status = mediaType === 'audio' ? 409 : 400;
    throw error;
  }

  const generated = await generateImageBytes({ prompt });
  const pathname = [
    'creapd',
    'research',
    String(packageId),
    `${mediaType}-${Date.now()}-${randomUUID()}.${generated.extension}`,
  ].join('/');

  const blob = await uploadPublicBlob({
    pathname,
    bytes: generated.bytes,
    contentType: generated.contentType,
  });

  return {
    mediaType,
    url: blob.url,
    model: generated.model,
    gatewayAuthSource: generated.authSource,
    blobAuthSource: blob.authSource,
    elapsedMs: generated.elapsedMs,
    contentType: blob.contentType,
    pathname: blob.pathname,
    warnings: generated.warnings || [],
  };
}