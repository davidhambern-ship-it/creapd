import { upload } from '@vercel/blob/client';
import { creapdApi } from '@/api/creapdClient';

export const LOCAL_VOICE_ENGINE_REVISION = 'r6-webbundle';
const LOCAL_VOICE_MIME = 'audio/wav';

let workerInstance = null;
let activeJob = null;

function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

function getWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(new URL('./localVoiceWorkerV2.js', import.meta.url), {
    type: 'module',
    name: `creapd-local-voice-${LOCAL_VOICE_ENGINE_REVISION}`,
  });

  workerInstance.onmessage = event => {
    const message = event?.data || {};
    if (!activeJob) return;

    if (message.type === 'progress') {
      activeJob.onProgress?.(message.stage, message.detail || {});
      return;
    }

    if (message.requestId && message.requestId !== activeJob.requestId) return;

    if (message.type === 'complete') {
      const job = activeJob;
      activeJob = null;
      job.resolve({
        blob: new Blob([message.wavBuffer], { type: LOCAL_VOICE_MIME }),
        voice: message.voice,
        device: message.device,
        model: message.model,
        chunkCount: message.chunkCount || 0,
        segmentCount: message.segmentCount || 0,
        engineRevision: message.engineRevision || LOCAL_VOICE_ENGINE_REVISION,
      });
      return;
    }

    if (message.type === 'error') {
      const job = activeJob;
      activeJob = null;
      job.reject(new Error(message.message || 'Local voice generation failed.'));
    }
  };

  workerInstance.onerror = event => {
    const job = activeJob;
    activeJob = null;
    terminateWorker();
    if (job) {
      job.reject(new Error(event?.message || 'The local voice worker stopped unexpectedly.'));
    }
  };

  return workerInstance;
}

function generateInWorker(script, voice, onProgress) {
  if (activeJob) {
    return Promise.reject(new Error('A local voiceover is already generating in this browser tab.'));
  }

  const worker = getWorker();
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

  return new Promise((resolve, reject) => {
    activeJob = { requestId, resolve, reject, onProgress };
    worker.postMessage({
      type: 'generate',
      requestId,
      script: String(script || ''),
      voice: String(voice || 'river'),
    });
  });
}

async function refreshPackage(packageId) {
  const snapshot = await creapdApi.get('/research/production');
  return snapshot?.packages?.find(item => String(item.id) === String(packageId)) || null;
}

function prepareSpeechText(script) {
  return String(script || '')
    .replace(/\(\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*\)/gi, ' ')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, '$1')
    .replace(/https?:\/\/[^\s)]+/gi, ' ')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateFreeLocalVoice({ packageId, script, voice = 'river', onProgress }) {
  if (!packageId) throw new Error('Production package is required for voice generation.');

  const speechScript = prepareSpeechText(script);
  if (!speechScript) {
    throw new Error('The teleprompter script contains no speakable text.');
  }

  onProgress?.('preparing_script', {
    engineRevision: LOCAL_VOICE_ENGINE_REVISION,
    sourceCharacters: String(script || '').length,
    spokenCharacters: speechScript.length,
  });

  const startedAt = performance.now();
  const generated = await generateInWorker(speechScript, voice, onProgress);

  onProgress?.('authorizing_upload', { engineRevision: generated.engineRevision });
  const authorization = await creapdApi.post('/research/voice-upload', {
    action: 'authorize',
    package_id: packageId,
    content_type: LOCAL_VOICE_MIME,
    byte_size: generated.blob.size,
    model: generated.model,
    voice: generated.voice,
    device: generated.device,
  });

  if (!authorization?.upload_ticket || !authorization?.pathname) {
    throw new Error('CREAPD could not authorize the local voice upload.');
  }

  onProgress?.('uploading', { engineRevision: generated.engineRevision });
  const uploaded = await upload(authorization.pathname, generated.blob, {
    access: 'public',
    handleUploadUrl: '/api/creapd/research/voice-upload',
    clientPayload: JSON.stringify({ ticket: authorization.upload_ticket }),
    contentType: LOCAL_VOICE_MIME,
    multipart: generated.blob.size > 8 * 1024 * 1024,
  });

  if (!uploaded?.url || !uploaded?.pathname) {
    throw new Error('Vercel Blob returned no URL for the generated voiceover.');
  }

  onProgress?.('saving', { engineRevision: generated.engineRevision });
  try {
    const registered = await creapdApi.post('/research/voice-upload', {
      action: 'register',
      package_id: packageId,
      blob_url: uploaded.url,
      blob_pathname: uploaded.pathname,
      model: generated.model,
      voice: generated.voice,
      device: generated.device,
      byte_size: generated.blob.size,
      elapsed_ms: Math.round(performance.now() - startedAt),
    });

    if (registered?.package) {
      onProgress?.('done', { engineRevision: generated.engineRevision });
      return registered;
    }
  } catch (error) {
    console.warn('[CREAPD LOCAL VOICE] Confirmation call failed; refreshing Neon.', error);
  }

  const refreshedPackage = await refreshPackage(packageId);
  if (!refreshedPackage?.generated_audio_url) {
    throw new Error('The voiceover was generated, but CREAPD could not confirm that it was saved.');
  }

  onProgress?.('done', { engineRevision: generated.engineRevision });
  return {
    ok: true,
    source: 'neon',
    package: refreshedPackage,
  };
}

export function cancelFreeLocalVoice() {
  if (activeJob) {
    activeJob.reject(new Error('Local voice generation was cancelled.'));
    activeJob = null;
  }
  terminateWorker();
}
