import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh';
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
  return Boolean(String(process.env.BLOB_READ_WRITE_TOKEN || '').trim());
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
