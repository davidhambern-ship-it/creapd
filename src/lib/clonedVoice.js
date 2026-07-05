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
 * Generate narration speech using the cloned voice if available,
 * otherwise fall back to the built-in TTS with 'storm' voice.
 */
export async function generateNarrationSpeech(text) {
  return await base44.integrations.Core.GenerateSpeech({ text, voice: 'storm' });
}