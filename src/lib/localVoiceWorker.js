const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_PACKAGE_URLS = [
  'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm',
  'https://esm.sh/kokoro-js@1.2.1?bundle',
];
const SAMPLE_RATE = 24000;
const MAX_SCRIPT_CHARS = 8000;
const TARGET_SEGMENT_CHARS = 260;
const RUNTIME_IMPORT_TIMEOUT_MS = 45000;
const MODEL_LOAD_TIMEOUT_MS = 240000;
const SEGMENT_GENERATION_TIMEOUT_MS = 150000;

const VOICE_MAP = {
  river: 'af_river',
  honey: 'af_bella',
  sunny: 'af_sky',
  storm: 'am_onyx',
  spark: 'am_puck',
};

let ttsPromise = null;

function postProgress(stage, detail = {}) {
  self.postMessage({ type: 'progress', stage, detail });
}

function errorMessage(error) {
  return String(error?.message || error || 'Unknown error').slice(0, 300);
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function normalizeModelProgress(progress) {
  if (!progress || typeof progress !== 'object') return {};

  const detail = {};
  if (typeof progress.status === 'string') detail.status = progress.status;
  if (typeof progress.name === 'string') detail.name = progress.name;
  if (typeof progress.file === 'string') detail.file = progress.file;
  if (Number.isFinite(progress.progress)) detail.progress = progress.progress;
  if (Number.isFinite(progress.loaded)) detail.loaded = progress.loaded;
  if (Number.isFinite(progress.total)) detail.total = progress.total;
  return detail;
}

function splitLongText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const parts = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) parts.push(current);

    // A pathological token should never make a segment unbounded.
    if (word.length > maxChars) {
      for (let offset = 0; offset < word.length; offset += maxChars) {
        parts.push(word.slice(offset, offset + maxChars));
      }
      current = '';
    } else {
      current = word;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function splitForSpeech(text) {
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!normalized) return [];

  const sentenceCandidates = normalized
    .split(/(?<=[.!?])\s+|\n+/g)
    .map(part => part.trim())
    .filter(Boolean)
    .flatMap(part => part.length > TARGET_SEGMENT_CHARS
      ? splitLongText(part, TARGET_SEGMENT_CHARS)
      : [part]);

  const segments = [];
  let current = '';

  for (const sentence of sentenceCandidates) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= TARGET_SEGMENT_CHARS) {
      current = candidate;
      continue;
    }

    if (current) segments.push(current);
    current = sentence;
  }

  if (current) segments.push(current);
  return segments;
}

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

function encodeWavBuffer(samples, sampleRate = SAMPLE_RATE) {
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

  return buffer;
}

async function importKokoroRuntime() {
  let lastError = null;

  for (let index = 0; index < KOKORO_PACKAGE_URLS.length; index += 1) {
    const packageUrl = KOKORO_PACKAGE_URLS[index];
    postProgress('loading_model', {
      phase: 'loading_runtime',
      attempt: index + 1,
      totalAttempts: KOKORO_PACKAGE_URLS.length,
      source: new URL(packageUrl).hostname,
    });

    try {
      return await withTimeout(
        import(/* @vite-ignore */ packageUrl),
        RUNTIME_IMPORT_TIMEOUT_MS,
        `Kokoro runtime download timed out from ${new URL(packageUrl).hostname}.`,
      );
    } catch (error) {
      lastError = error;
      postProgress('loading_model', {
        phase: 'runtime_failed',
        attempt: index + 1,
        totalAttempts: KOKORO_PACKAGE_URLS.length,
        source: new URL(packageUrl).hostname,
        error: errorMessage(error),
      });
    }
  }

  throw new Error(`CREAPD could not load the Kokoro browser runtime. ${errorMessage(lastError)}`);
}

async function loadTts() {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    postProgress('loading_model', { phase: 'starting' });
    const runtime = await importKokoroRuntime();
    const { KokoroTTS } = runtime || {};

    if (!KokoroTTS?.from_pretrained) {
      throw new Error('The Kokoro browser runtime loaded, but KokoroTTS was unavailable.');
    }

    postProgress('loading_model', { phase: 'initializing_model' });

    const modelPromise = KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: progress => {
        postProgress('loading_model', {
          phase: 'model_progress',
          ...normalizeModelProgress(progress),
        });
      },
    });

    const tts = await withTimeout(
      modelPromise,
      MODEL_LOAD_TIMEOUT_MS,
      'Kokoro model loading timed out after 4 minutes. Check this browser connection to Hugging Face and try again.',
    );

    postProgress('loading_model', { phase: 'ready' });
    return tts;
  })().catch(error => {
    ttsPromise = null;
    throw error;
  });

  return ttsPromise;
}

async function generateSegment(tts, segment, voice, segmentIndex, totalSegments) {
  postProgress('synthesizing', {
    phase: 'segment_started',
    segment: segmentIndex + 1,
    totalSegments,
    segmentCharacters: segment.length,
  });

  const audio = await withTimeout(
    tts.generate(segment, { voice, speed: 1 }),
    SEGMENT_GENERATION_TIMEOUT_MS,
    `Kokoro timed out while generating narration segment ${segmentIndex + 1} of ${totalSegments}.`,
  );

  const data = audio?.data;
  if (!data?.length) {
    throw new Error(`Kokoro returned no audio for narration segment ${segmentIndex + 1} of ${totalSegments}.`);
  }

  postProgress('synthesizing', {
    phase: 'segment_complete',
    segment: segmentIndex + 1,
    totalSegments,
    sampleCount: data.length,
  });

  return new Float32Array(data);
}

async function synthesize(script, voiceKey) {
  const text = String(script || '').trim();
  if (!text) throw new Error('A teleprompter script is required for voice generation.');
  if (text.length > MAX_SCRIPT_CHARS) {
    throw new Error(`This voiceover is too long for local generation right now. Keep it under ${MAX_SCRIPT_CHARS.toLocaleString()} characters.`);
  }

  const tts = await loadTts();
  const voice = VOICE_MAP[voiceKey] || VOICE_MAP.river;
  const segments = splitForSpeech(text);
  if (!segments.length) throw new Error('The teleprompter script has no speakable text.');

  postProgress('synthesizing', {
    phase: 'plan_ready',
    totalSegments: segments.length,
  });

  const audioChunks = [];

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    const audioChunk = await generateSegment(
      tts,
      segments[segmentIndex],
      voice,
      segmentIndex,
      segments.length,
    );
    audioChunks.push(audioChunk);

    // Yield between inference calls so the worker can flush progress messages
    // and avoid chaining long ONNX runs back-to-back without a scheduling gap.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (!audioChunks.length) throw new Error('Local voice model returned no audio.');

  postProgress('encoding');
  const wavBuffer = encodeWavBuffer(concatFloat32(audioChunks), SAMPLE_RATE);

  return {
    wavBuffer,
    voice,
    device: 'wasm-worker-generate',
    model: KOKORO_MODEL,
    chunkCount: audioChunks.length,
    segmentCount: segments.length,
  };
}

self.onmessage = async event => {
  const message = event?.data || {};
  if (message.type !== 'generate') return;

  try {
    const result = await synthesize(message.script, message.voice);
    self.postMessage({
      type: 'complete',
      requestId: message.requestId,
      voice: result.voice,
      device: result.device,
      model: result.model,
      chunkCount: result.chunkCount,
      segmentCount: result.segmentCount,
      wavBuffer: result.wavBuffer,
    }, [result.wavBuffer]);
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: message.requestId,
      message: errorMessage(error),
    });
  }
};
