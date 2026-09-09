import { creapdApi } from '@/api/creapdClient';

const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_PACKAGE_URL = 'https://esm.sh/kokoro-js@1.2.1?bundle';
const SAMPLE_RATE = 24000;

const VOICE_MAP = {
  river: 'af_river',
  honey: 'af_bella',
  sunny: 'af_sky',
  storm: 'am_onyx',
  spark: 'am_puck',
};

let ttsPromise = null;
let activeDevice = null;

function concatFloat32(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function importKokoro() {
  // Pinned browser module keeps inference off CREAPD servers and avoids any
  // per-character or per-generation TTS charge. Vite leaves this URL import
  // to the browser intentionally.
  return import(/* @vite-ignore */ KOKORO_PACKAGE_URL);
}

async function loadTts() {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    const { KokoroTTS } = await importKokoro();

    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
          dtype: 'fp32',
          device: 'webgpu',
        });
        activeDevice = 'webgpu';
        return tts;
      } catch (error) {
        console.warn('[CREAPD LOCAL VOICE] WebGPU unavailable; falling back to WASM.', error);
      }
    }

    const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype: 'q8',
      device: 'wasm',
    });
    activeDevice = 'wasm';
    return tts;
  })().catch(error => {
    ttsPromise = null;
    activeDevice = null;
    throw error;
  });

  return ttsPromise;
}

async function synthesizeToWav(script, voiceKey, onProgress) {
  const text = String(script || '').trim();
  if (!text) throw new Error('A teleprompter script is required for voice generation.');

  onProgress?.('loading_model');
  const tts = await loadTts();
  const kokoroVoice = VOICE_MAP[voiceKey] || VOICE_MAP.river;
  const chunks = [];
  let chunkCount = 0;

  onProgress?.('synthesizing');
  for await (const result of tts.stream(text, { voice: kokoroVoice, speed: 1 })) {
    if (result?.audio?.data?.length) {
      chunks.push(new Float32Array(result.audio.data));
      chunkCount += 1;
      onProgress?.('synthesizing', { chunkCount });
    }
  }

  if (!chunks.length) throw new Error('Local voice model returned no audio.');

  onProgress?.('encoding');
  return {
    blob: encodeWav(concatFloat32(chunks), SAMPLE_RATE),
    voice: kokoroVoice,
    device: activeDevice || 'wasm',
    model: KOKORO_MODEL,
    chunkCount,
  };
}

export async function generateFreeLocalVoice({ packageId, script, voice = 'river', onProgress }) {
  if (!packageId) throw new Error('Production package is required for voice generation.');

  const startedAt = performance.now();
  const generated = await synthesizeToWav(script, voice, onProgress);

  onProgress?.('authorizing_upload');
  const authorization = await creapdApi.post('/research/voice-upload', {
    action: 'authorize',
    package_id: packageId,
    content_type: 'audio/wav',
    byte_size: generated.blob.size,
  });

  if (!authorization?.presigned_url || !authorization?.pathname) {
    throw new Error('CREAPD could not authorize the local voice upload.');
  }

  onProgress?.('uploading');
  const uploadResponse = await fetch(authorization.presigned_url, {
    method: 'PUT',
    headers: { 'content-type': 'audio/wav' },
    body: generated.blob,
  });

  const uploadText = await uploadResponse.text();
  let uploadResult = null;
  try {
    uploadResult = uploadText ? JSON.parse(uploadText) : null;
  } catch {
    uploadResult = null;
  }

  if (!uploadResponse.ok) {
    throw new Error(uploadResult?.message || uploadResult?.error || `Voice upload failed (${uploadResponse.status}).`);
  }

  const blobUrl = uploadResult?.url;
  const blobPathname = uploadResult?.pathname || authorization.pathname;
  if (!blobUrl) throw new Error('Vercel Blob returned no URL for the generated voiceover.');

  onProgress?.('saving');
  const registered = await creapdApi.post('/research/voice-upload', {
    action: 'register',
    package_id: packageId,
    blob_url: blobUrl,
    blob_pathname: blobPathname,
    model: generated.model,
    voice: generated.voice,
    device: generated.device,
    byte_size: generated.blob.size,
    elapsed_ms: Math.round(performance.now() - startedAt),
  });

  if (!registered?.package) {
    throw new Error('CREAPD uploaded the voiceover but could not save it to the production package.');
  }

  onProgress?.('done');
  return registered;
}

export function getLocalVoiceLabel(voiceKey) {
  return VOICE_MAP[voiceKey] || VOICE_MAP.river;
}
