const ENGINE_REVISION = 'r8-duration';
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_PACKAGE_URLS = [
  'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js',
  'https://unpkg.com/kokoro-js@1.2.1/dist/kokoro.web.js',
  'https://esm.sh/kokoro-js@1.2.1?bundle',
];
const SAMPLE_RATE = 24000;
const MAX_SCRIPT_CHARS = 8000;
const TARGET_SEGMENT_CHARS = 240;
const RUNTIME_IMPORT_TIMEOUT_MS = 60000;
const MODEL_LOAD_TIMEOUT_MS = 240000;
const SEGMENT_GENERATION_TIMEOUT_MS = 150000;

const VOICE_MAP = {
  // American English — female
  heart: 'af_heart',
  alloy: 'af_alloy',
  aoede: 'af_aoede',
  honey: 'af_bella',
  bella: 'af_bella',
  jessica: 'af_jessica',
  kore: 'af_kore',
  nicole: 'af_nicole',
  nova: 'af_nova',
  river: 'af_river',
  sarah: 'af_sarah',
  sunny: 'af_sky',
  sky: 'af_sky',

  // American English — male
  adam: 'am_adam',
  echo: 'am_echo',
  eric: 'am_eric',
  fenrir: 'am_fenrir',
  liam: 'am_liam',
  michael: 'am_michael',
  storm: 'am_onyx',
  onyx: 'am_onyx',
  spark: 'am_puck',
  puck: 'am_puck',
  santa: 'am_santa',

  // British English — female
  alice: 'bf_alice',
  emma: 'bf_emma',
  isabella: 'bf_isabella',
  lily: 'bf_lily',

  // British English — male
  daniel: 'bm_daniel',
  fable: 'bm_fable',
  george: 'bm_george',
  lewis: 'bm_lewis',
};

let ttsPromise = null;

function postProgress(stage, detail = {}) {
  self.postMessage({ type: 'progress', stage, detail: { engineRevision: ENGINE_REVISION, ...detail } });
}

function errorMessage(error) {
  return String(error?.message || error || 'Unknown error').slice(0, 500);
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
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

function readAscii(view, offset, length) {
  let result = '';
  for (let i = 0; i < length; i += 1) result += String.fromCharCode(view.getUint8(offset + i));
  return result;
}

async function decodeWavBlob(blob) {
  if (!(blob instanceof Blob)) throw new Error('Kokoro did not return a WAV Blob.');
  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength < 44) throw new Error(`Kokoro WAV was only ${buffer.byteLength} bytes.`);

  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new Error('Kokoro returned an unrecognized audio container.');
  }

  let offset = 12;
  let format = 0;
  let channels = 1;
  let sampleRate = SAMPLE_RATE;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      format = view.getUint16(chunkDataOffset, true);
      channels = view.getUint16(chunkDataOffset + 2, true) || 1;
      sampleRate = view.getUint32(chunkDataOffset + 4, true) || SAMPLE_RATE;
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = chunkDataOffset;
      dataSize = Math.min(chunkSize, view.byteLength - chunkDataOffset);
      break;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0 || !bitsPerSample) {
    throw new Error(`Kokoro WAV had no readable samples (format=${format}, bits=${bitsPerSample}, data=${dataSize}).`);
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameSize = bytesPerSample * channels;
  const frameCount = Math.floor(dataSize / frameSize);
  if (frameCount <= 0) throw new Error('Kokoro WAV contained zero audio frames.');

  const samples = new Float32Array(frameCount);

  const readSample = sampleOffset => {
    if (format === 3 && bitsPerSample === 32) return view.getFloat32(sampleOffset, true);
    if (format === 3 && bitsPerSample === 64) return view.getFloat64(sampleOffset, true);
    if (format !== 1) throw new Error(`Unsupported Kokoro WAV format code ${format}.`);
    if (bitsPerSample === 8) return (view.getUint8(sampleOffset) - 128) / 128;
    if (bitsPerSample === 16) return view.getInt16(sampleOffset, true) / 32768;
    if (bitsPerSample === 24) {
      let value = view.getUint8(sampleOffset)
        | (view.getUint8(sampleOffset + 1) << 8)
        | (view.getUint8(sampleOffset + 2) << 16);
      if (value & 0x800000) value |= 0xff000000;
      return value / 8388608;
    }
    if (bitsPerSample === 32) return view.getInt32(sampleOffset, true) / 2147483648;
    throw new Error(`Unsupported Kokoro PCM depth ${bitsPerSample}.`);
  };

  for (let frame = 0; frame < frameCount; frame += 1) {
    const frameOffset = dataOffset + frame * frameSize;
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += readSample(frameOffset + channel * bytesPerSample);
    }
    samples[frame] = sum / channels;
  }

  return { samples, sampleRate };
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
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
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
      const runtime = await withTimeout(
        import(/* @vite-ignore */ packageUrl),
        RUNTIME_IMPORT_TIMEOUT_MS,
        `Kokoro runtime timed out from ${new URL(packageUrl).hostname}.`,
      );
      if (runtime?.KokoroTTS?.from_pretrained) return runtime;
      throw new Error('KokoroTTS export was missing.');
    } catch (error) {
      lastError = error;
      postProgress('loading_model', {
        phase: 'runtime_failed',
        source: new URL(packageUrl).hostname,
        error: errorMessage(error),
      });
    }
  }

  throw new Error(`CREAPD could not load Kokoro browser runtime. ${errorMessage(lastError)}`);
}

async function loadTts() {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    postProgress('loading_model', { phase: 'starting' });
    const { KokoroTTS } = await importKokoroRuntime();

    postProgress('loading_model', { phase: 'initializing_model' });
    const tts = await withTimeout(
      KokoroTTS.from_pretrained(KOKORO_MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progress => {
          postProgress('loading_model', {
            phase: 'model_progress',
            status: progress?.status,
            file: progress?.file,
            progress: Number.isFinite(progress?.progress) ? progress.progress : undefined,
          });
        },
      }),
      MODEL_LOAD_TIMEOUT_MS,
      'Kokoro model loading timed out after 4 minutes.',
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

  const rawAudio = await withTimeout(
    tts.generate(segment, { voice, speed: 1 }),
    SEGMENT_GENERATION_TIMEOUT_MS,
    `Kokoro timed out generating segment ${segmentIndex + 1} of ${totalSegments}.`,
  );

  if (!rawAudio || typeof rawAudio.toBlob !== 'function') {
    const keys = rawAudio && typeof rawAudio === 'object' ? Object.keys(rawAudio).join(',') : typeof rawAudio;
    throw new Error(`Kokoro did not return RawAudio for segment ${segmentIndex + 1}. Shape: ${keys || 'unknown'}.`);
  }

  const blob = rawAudio.toBlob();
  const decoded = await decodeWavBlob(blob);
  if (decoded.sampleRate !== SAMPLE_RATE) {
    throw new Error(`Kokoro returned ${decoded.sampleRate} Hz audio; expected ${SAMPLE_RATE} Hz.`);
  }

  postProgress('synthesizing', {
    phase: 'segment_complete',
    segment: segmentIndex + 1,
    totalSegments,
    sampleCount: decoded.samples.length,
    blobBytes: blob.size,
  });

  return decoded.samples;
}

async function synthesize(script, voiceKey) {
  const text = String(script || '').trim();
  if (!text) throw new Error('A teleprompter script is required for voice generation.');
  if (text.length > MAX_SCRIPT_CHARS) {
    throw new Error(`This voiceover is too long for local generation. Keep it under ${MAX_SCRIPT_CHARS.toLocaleString()} characters.`);
  }

  const tts = await loadTts();
  const voice = VOICE_MAP[voiceKey] || VOICE_MAP.river;
  const segments = splitForSpeech(text);
  if (!segments.length) throw new Error('The teleprompter script has no speakable text.');

  postProgress('synthesizing', { phase: 'plan_ready', totalSegments: segments.length, voice });

  const chunks = [];
  for (let i = 0; i < segments.length; i += 1) {
    chunks.push(await generateSegment(tts, segments[i], voice, i, segments.length));
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (!chunks.length) throw new Error('Kokoro produced no narration chunks.');

  postProgress('encoding');
  const combinedSamples = concatFloat32(chunks);
  const durationSeconds = combinedSamples.length / SAMPLE_RATE;
  const wavBuffer = encodeWavBuffer(combinedSamples, SAMPLE_RATE);

  return {
    wavBuffer,
    voice,
    device: 'wasm-worker-webbundle',
    model: KOKORO_MODEL,
    chunkCount: chunks.length,
    segmentCount: segments.length,
    durationSeconds,
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
      durationSeconds: result.durationSeconds,
      engineRevision: ENGINE_REVISION,
      wavBuffer: result.wavBuffer,
    }, [result.wavBuffer]);
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: message.requestId,
      message: `[${ENGINE_REVISION}] ${errorMessage(error)}`,
    });
  }
};