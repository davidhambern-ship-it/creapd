/**
 * CREAPr narration using CREAPD's free local neural voice.
 * No Base44 speech function and no browser speechSynthesis fallback.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useHumanVoice } from '@/hooks/useHumanVoice';

const LEGACY_VOICE_MAP = {
  daniel: 'am_michael',
  river: 'af_heart',
  bella: 'af_bella',
  michael: 'am_michael',
  fenrir: 'am_fenrir',
  emma: 'bf_emma',
};

export function useCreaprNarration(engine, options = {}) {
  const { voice = 'daniel', enabled = true } = options;
  const processingRef = useRef(false);
  const narrationRunRef = useRef(0);

  const humanVoice = useHumanVoice();
  const {
    enabled: humanVoiceEnabled,
    setEnabled: setHumanVoiceEnabled,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop: stopHumanVoice,
  } = humanVoice;

  useEffect(() => {
    const mapped = LEGACY_VOICE_MAP[String(voice || '').toLowerCase()];
    if (mapped && mapped !== selectedVoice) setSelectedVoice(mapped);
  }, [voice, selectedVoice, setSelectedVoice]);

  useEffect(() => {
    if (enabled && !humanVoiceEnabled) setHumanVoiceEnabled(true);
    if (!enabled && humanVoiceEnabled) setHumanVoiceEnabled(false);
  }, [enabled, humanVoiceEnabled, setHumanVoiceEnabled]);

  const stopAudio = useCallback(() => {
    narrationRunRef.current += 1;
    processingRef.current = false;
    stopHumanVoice();
  }, [stopHumanVoice]);

  useEffect(() => {
    if (!enabled || !humanVoiceEnabled) return;
    if (processingRef.current || engine.currentNarration) return;
    if (engine.narrationQueue.length > 0) {
      engine.consumeNarration();
    }
  }, [
    engine.narrationQueue,
    engine.currentNarration,
    enabled,
    humanVoiceEnabled,
    engine,
  ]);

  useEffect(() => {
    if (!enabled || !humanVoiceEnabled || !engine.currentNarration || processingRef.current) return;

    const narration = engine.currentNarration;
    const runId = ++narrationRunRef.current;
    processingRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        if (!narration?.text) return;
        await speak(
          String(narration.text).slice(0, 5000),
          narration.id || `creapr-narration-${runId}`,
        );
      } catch (error) {
        console.error('CREAPr local human narration failed:', error);
      } finally {
        if (!cancelled && narrationRunRef.current === runId) {
          processingRef.current = false;
          engine.clearNarration();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    engine.currentNarration,
    enabled,
    humanVoiceEnabled,
    speak,
    engine,
  ]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  return {
    stop: stopAudio,
    isPlaying: processingRef.current,
    voiceStatus: humanVoice.status,
    voiceError: humanVoice.error,
  };
}
