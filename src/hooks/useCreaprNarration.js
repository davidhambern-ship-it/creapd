/**
 * useCreaprNarration — connects the CREAPr Engine's narration queue
 * to the TTS audio interface (generateCreapSpeech backend function).
 *
 * Usage:
 *   const engine = useCreaprEngine(researchData);
 *   useCreaprNarration(engine, { voice: 'daniel' });
 *
 * The hook watches engine.narrationQueue. When items are queued and
 * nothing is currently playing, it pops the next narration via
 * engine.consumeNarration(), generates speech, plays the audio, and
 * calls engine.clearNarration() when playback ends — then checks for more.
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useCreaprNarration(engine, options = {}) {
  const { voice = 'daniel', enabled = true } = options;

  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);
  const genRef = useRef(0);

  // Cleanup any playing audio
  const stopAudio = useCallback(() => {
    genRef.current++;
    isPlayingRef.current = false;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // Play a single narration item
  const playNarration = useCallback(async (narration) => {
    if (!narration?.text) {
      engine.clearNarration();
      return;
    }

    const gen = ++genRef.current;
    isPlayingRef.current = true;

    try {
      const response = await base44.functions.invoke('generateCreapSpeech', {
        text: narration.text.substring(0, 5000),
        voice: narration.metadata?.voice || voice,
      });
      // Stale — a newer narration superseded this one
      if (gen !== genRef.current) return;

      const url = response?.data?.url;
      if (!url) {
        isPlayingRef.current = false;
        engine.clearNarration();
        return;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        if (gen !== genRef.current) return;
        isPlayingRef.current = false;
        engine.clearNarration();
      };
      audio.onerror = () => {
        if (gen !== genRef.current) return;
        isPlayingRef.current = false;
        engine.clearNarration();
      };

      await audio.play().catch(() => {
        if (gen !== genRef.current) return;
        isPlayingRef.current = false;
        engine.clearNarration();
      });
    } catch (err) {
      if (gen !== genRef.current) return;
      console.error('CREAPr narration TTS failed:', err);
      isPlayingRef.current = false;
      engine.clearNarration();
    }
  }, [engine, voice]);

  // Watch the queue — pop and play when idle
  useEffect(() => {
    if (!enabled) return;

    if (engine.narrationQueue.length > 0 && !isPlayingRef.current && !engine.currentNarration) {
      engine.consumeNarration();
    }
  }, [engine.narrationQueue, engine.currentNarration, enabled, engine]);

  // When currentNarration changes and we're not playing, play it
  useEffect(() => {
    if (!enabled) return;

    if (engine.currentNarration && !isPlayingRef.current) {
      playNarration(engine.currentNarration);
    }
  }, [engine.currentNarration, enabled, playNarration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return {
    stop: stopAudio,
    isPlaying: isPlayingRef.current,
  };
}