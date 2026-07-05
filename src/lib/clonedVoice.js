import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'creapd_cloned_voice_id';

export function getClonedVoiceId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setClonedVoiceId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable
  }
}

export function clearClonedVoice() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function hasClonedVoice() {
  return !!getClonedVoiceId();
}

/**
 * Generate narration speech. If an ElevenLabs voice_id is provided,
 * use the ElevenLabs TTS backend; otherwise fall back to built-in TTS.
 *
 * @param {string} text — the text to speak
 * @param {string} voice — built-in voice name (river, honey, sunny, storm, spark)
 * @param {object} opts — optional overrides:
 *   - elevenlabs_voice_id: ElevenLabs voice ID (overrides built-in voice)
 *   - voice_stability: 0-1
 *   - voice_similarity: 0-1
 */
export async function generateNarrationSpeech(text, voice, opts = {}) {
  if (opts.elevenlabs_voice_id) {
    const res = await base44.functions.invoke('generateClonedSpeech', {
      text,
      voice_id: opts.elevenlabs_voice_id,
      stability: opts.voice_stability ?? 0.5,
      similarity_boost: opts.voice_similarity ?? 0.75,
    });
    return { url: res.data?.url || res.data };
  }
  return await base44.integrations.Core.GenerateSpeech({ text, voice: voice || 'storm' });
}