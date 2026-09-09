const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const KOKORO_PACKAGE_URL = 'https://esm.sh/kokoro-js@1.2.1?bundle';
const SAMPLE_RATE = 24000;
const MAX_SCRIPT_CHARS = 8000;
const TARGET_SEGMENT_CHARS = 650;

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

function splitForSpeech(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+|\n+/g)
    .map(part => part.trim())
    .filter(Boolean);

  const segments = [];
  let current = '';

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if (`${current} ${sentence}`.length <= TARGET_SEGMENT_CHARS) {
      current = `${current} ${sentence}`;
      continue;
    }

    segments.push(current);
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

async function loadTts() {
  if (ttsPromise) return ttsPromise;

  ttsPromise = (async () => {
    postProgress('loading_model');
    const { KokoroTTS } = await import(/* @vite-ignore */ KOKORO_PACKAGE_URL);

    // WASM q8 is deliberate here. Keeping inference in a dedicated worker
    // protects the React UI and avoids WebGPU work starving the compositor.
    return KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype: 'q8',
      device: 'wasm',
    });
  })().catch(error => {
    ttsPromise = null;
    throw error;
  });

  return ttsPromise;
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

  const audioChunks = [];
  let streamChunkCount = 0;

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
    postProgress('synthesizing', {
      segment: segmentIndex + 1,
      totalSegments: segments.length,
      chunkCount: streamChunkCount,
    });

    for await (const result of tts.stream(segments[segmentIndex], { voice, speed: 1 })) {
      const data = result?.audio?.data;
      if (data?.length) {
        audioChunks.push(new Float32Array(data));
        streamChunkCount += 1;
        postProgress('synthesizing', {
          segment: segmentIndex + 1,
          totalSegments: segments.length,
          chunkCount: streamChunkCount,
        });
      }
    }
  }

  if (!audioChunks.length) throw new Error('Local voice model returned no audio.');

  postProgress('encoding');
  const wavBuffer = encodeWavBuffer(concatFloat32(audioChunks), SAMPLE_RATE);

  return {
    wavBuffer,
    voice,
    device: 'wasm-worker',
    model: KOKORO_MODEL,
    chunkCount: streamChunkCount,
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
      message: String(error?.message || 'Local voice generation failed').slice(0, 500),
    });
  }
};
