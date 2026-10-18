import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
let ttsPromise = null;
let device = null;

async function ensureTts() {
  if (!ttsPromise) {
    device = self.navigator?.gpu ? "webgpu" : "wasm";
    self.postMessage({ type: "loading", device });
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      device,
      dtype: device === "webgpu" ? "fp32" : "q8",
      progress_callback: progress => {
        const value = Number(progress?.progress);
        if (Number.isFinite(value)) {
          self.postMessage({
            type: "progress",
            device,
            progress: Math.max(0, Math.min(100, value)),
            file: progress?.file || null,
          });
        }
      },
    });
  }

  const tts = await ttsPromise;
  self.postMessage({ type: "ready", device, voices: tts.voices });
  return tts;
}

self.addEventListener("message", async event => {
  const message = event.data || {};

  if (message.type === "init") {
    try {
      await ensureTts();
    } catch (error) {
      ttsPromise = null;
      self.postMessage({ type: "error", id: message.id || null, error: error?.message || "Human voice model failed to load." });
    }
    return;
  }

  if (message.type !== "generate") return;

  try {
    const tts = await ensureTts();
    const audio = await tts.generate(String(message.text || ""), {
      voice: message.voice || "af_heart",
      speed: Number(message.speed || 1),
    });
    const blob = audio.toBlob();
    self.postMessage({ type: "audio", id: message.id, blob });
  } catch (error) {
    self.postMessage({ type: "error", id: message.id, error: error?.message || "Human voice generation failed." });
  }
};
