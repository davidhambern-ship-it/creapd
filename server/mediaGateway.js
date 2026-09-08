import { randomUUID } from 'node:crypto';
import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh';
const BLOB_API_BASE_URL = process.env.VERCEL_BLOB_API_URL || 'https://vercel.com/api/blob';
const DEFAULT_IMAGE_MODEL = process.env.CREAPD_IMAGE_MODEL || 'openai/gpt-image-2';
const DEFAULT_SPEECH_MODEL = process.env.CREAPD_SPEECH_MODEL || 'openai/tts-1';

const VOICE_MAP = {
  river: 'alloy',
  honey: 'nova',
  sunny: 'shimmer',
  storm: 'onyx',
  spark: 'echo',
};

function safeMessage(value, fallback) {
  return String(value || fallback || 'media_generation_failed').slice(0, 260);
}

async function resolveGatewayCredential() {
  if (process.env.AI_GATEWAY_API_KEY) {
    return { token: process.env.AI_GATEWAY_API_KEY, source: 'api_key' };
  }

  let contextToken = null;
  try {
    contextToken = await getVercelOidcToken();
  } catch {}

  if (contextToken) {
    return { token: contextToken, source: 'vercel_oidc_context' };
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    return { token: process.env.VERCEL_OIDC_TOKEN, source: 'vercel_oidc_env' };
  }

  const error = new Error('AI Gateway authentication is not available');
  error.code = 'AI_GATEWAY_AUTH_NOT_AVAILABLE';
  throw error;
}

function normalizeStoreId(value) {
  const text = String(value || '').trim();
  return text.startsWith('store_') ? text.slice('store_'.length) : text;
}

function readWriteStoreId(token) {
  const [, , , storeId = ''] = String(token || '').split('_');
  return storeId;
}

async function resolveBlobCredential() {
  const readWriteToken = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (readWriteToken) {
    const storeId = readWriteStoreId(readWriteToken) || normalizeStoreId(process.env.BLOB_STORE_ID);
    if (!storeId) {
      const error = new Error('Vercel Blob token is present but its store ID could not be resolved');
      error.code = 'BLOB_STORE_ID_NOT_AVAILABLE';
      throw error;
    }
    return { token: readWriteToken, storeId, source: 'read_write_token' };
  }

  const storeId = normalizeStoreId(process.env.BLOB_STORE_ID);
  let oidcToken = null;
  try {
    oidcToken = await getVercelOidcToken();
  } catch {}
  oidcToken = oidcToken || process.env.VERCEL_OIDC_TOKEN || null;

  if (oidcToken && storeId) {
    return { token: oidcToken, storeId, source: 'vercel_oidc' };
  }

  const error = new Error('Vercel Blob is not configured for this project');
  error.code = 'BLOB_NOT_CONFIGURED';
  throw error;
}

async function uploadPublicBlob({ pathname, bytes, contentType }) {
  if (!pathname || !bytes?.length) {
    const error = new Error('Blob pathname and bytes are required');
    error.code = 'BLOB_UPLOAD_INPUT_INVALID';
    throw error;
  }

  const credential = await resolveBlobCredential();
  const url = `${BLOB_API_BASE_URL}/?pathname=${encodeURIComponent(pathname)}`;
  const requestId = `${credential.storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

  const blobResponse = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${credential.token}`,
      'x-vercel-blob-store-id': credential.storeId,
      'x-vercel-blob-access': 'public',
      'x-content-type': contentType,
      'x-add-random-suffix': '1',
      'x-api-version': '12',
      'x-api-blob-request-id': requestId,
      'x-api-blob-request-attempt': '0',
    },
    body: bytes,
    signal: AbortSignal.timeout(30000),
  });

  const payload = await blobResponse.json().catch(() => null);
  if (!blobResponse.ok || !payload?.url) {
    const error = new Error(
      safeMessage(payload?.error?.message || payload?.message, `Vercel Blob returned HTTP ${blobResponse.status}`),
    );
    error.code = payload?.error?.code === 'store_not_found' ? 'BLOB_STORE_NOT_FOUND' : 'BLOB_UPLOAD_FAILED';
    error.status = blobResponse.status;
    throw error;
  }

  return {
    url: payload.url,
    downloadUrl: payload.downloadUrl || null,
    pathname: payload.pathname || pathname,
    contentType: payload.contentType || contentType,
    etag: payload.etag || null,
    authSource: credential.source,
  };
}

async function downloadGeneratedAsset(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const error = new Error(`Generated media URL returned HTTP ${response.status}`);
    error.code = 'MEDIA_DOWNLOAD_FAILED';
    throw error;
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateImageBytes({ prompt, model = DEFAULT_IMAGE_MODEL }) {
  if (!prompt) {
    const error = new Error('Image prompt is required');
    error.code = 'IMAGE_PROMPT_REQUIRED';
    throw error;
  }

  const credential = await resolveGatewayCredential();
  const startedAt = Date.now();
  const gatewayResponse = await fetch(`${GATEWAY_BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: String(prompt).slice(0, 12000),
      n: 1,
      size: '1536x1024',
      providerOptions: {
        gateway: {
          disallowPromptTraining: true,
        },
      },
    }),
    signal: AbortSignal.timeout(55000),
  });

  const payload = await gatewayResponse.json().catch(() => null);
  if (!gatewayResponse.ok) {
    const error = new Error(
      safeMessage(payload?.error?.message || payload?.message, `AI Gateway image request returned HTTP ${gatewayResponse.status}`),
    );
    error.code = 'AI_GATEWAY_IMAGE_FAILED';
    error.status = gatewayResponse.status;
    throw error;
  }

  const generated = Array.isArray(payload?.data) ? payload.data[0] : null;
  let bytes = null;
  let contentType = 'image/png';

  if (generated?.b64_json) {
    bytes = Buffer.from(generated.b64_json, 'base64');
  } else if (generated?.url) {
    bytes = await downloadGeneratedAsset(generated.url);
    const lowerUrl = String(generated.url).toLowerCase();
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) contentType = 'image/jpeg';
    if (lowerUrl.includes('.webp')) contentType = 'image/webp';
  }

  if (!bytes?.length) {
    const error = new Error('AI Gateway returned no image bytes');
    error.code = 'AI_GATEWAY_IMAGE_EMPTY';
    throw error;
  }

  return {
    bytes,
    contentType,
    extension: contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png',
    model: payload?.model || model,
    authSource: credential.source,
    elapsedMs: Date.now() - startedAt,
  };
}

async function generateSpeechBytes({ text, voice = 'river', model = DEFAULT_SPEECH_MODEL }) {
  if (!text) {
    const error = new Error('Voiceover script is required');
    error.code = 'VOICEOVER_SCRIPT_REQUIRED';
    throw error;
  }

  const credential = await resolveGatewayCredential();
  const startedAt = Date.now();
  const gatewayResponse = await fetch(`${GATEWAY_BASE_URL}/v4/ai/speech-model`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'ai-model-id': model,
    },
    body: JSON.stringify({
      text: String(text).slice(0, 16000),
      voice: VOICE_MAP[voice] || voice || 'alloy',
      outputFormat: 'mp3',
      language: 'en',
      instructions: 'Natural broadcast delivery. Clear, confident, conversational, and not overly dramatic.',
      speed: 1,
    }),
    signal: AbortSignal.timeout(55000),
  });

  const payload = await gatewayResponse.json().catch(() => null);
  if (!gatewayResponse.ok) {
    const error = new Error(
      safeMessage(payload?.error?.message || payload?.message, `AI Gateway speech request returned HTTP ${gatewayResponse.status}`),
    );
    error.code = 'AI_GATEWAY_SPEECH_FAILED';
    error.status = gatewayResponse.status;
    throw error;
  }

  if (!payload?.audio) {
    const error = new Error('AI Gateway returned no speech audio');
    error.code = 'AI_GATEWAY_SPEECH_EMPTY';
    throw error;
  }

  return {
    bytes: Buffer.from(payload.audio, 'base64'),
    contentType: 'audio/mpeg',
    extension: 'mp3',
    model,
    authSource: credential.source,
    elapsedMs: Date.now() - startedAt,
    warnings: payload?.warnings || [],
  };
}

export function hasOwnedMediaStorageConfig() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    ((process.env.BLOB_STORE_ID || '').trim() && (process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL)),
  );
}

export async function generateAndStoreResearchMedia({
  packageId,
  mediaType,
  prompt,
  script,
  voice,
}) {
  if (!packageId || !['image', 'thumbnail', 'audio'].includes(mediaType)) {
    const error = new Error('Unsupported Research media request');
    error.code = 'MEDIA_REQUEST_INVALID';
    throw error;
  }

  const generated = mediaType === 'audio'
    ? await generateSpeechBytes({ text: script, voice })
    : await generateImageBytes({ prompt });

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
