/**
 * useCreaprNarration — connects the CREAPr Engine's narration queue
 * to the TTS audio interface (generateCreapSpeech backend function).
 *
 * Usage:
 *   const engine = useCreaprEngine(researchData);
 *   useCreaprNarration(engine, { voice: 'daniel' });
 *
 * Two coordinated effects with an async lock guarantee sequential
 * playback — only one narration plays at a time, no overlap.
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useCreaprNarration(engine, options = {}) {
  const { voice = 'daniel', enabled = true } = options;

  const audioRef = useRef(null);
  const processingRef = useRef(false);

  const stopAudio = useCallback(() => {
    processingRef.current = false;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  // Effect 1: When idle and queue has items, pop the next narration
  useEffect(() => {
    if (!enabled) return;
    if (processingRef.current || engine.currentNarration) return;
    if (engine.narrationQueue.length > 0) {
      engine.consumeNarration();
    }
  }, [engine.narrationQueue, engine.currentNarration, enabled, engine]);

  // Effect 2: When a narration is set and we're not processing, play it
  useEffect(() => {
    if (!enabled || !engine.currentNarration || processingRef.current) return;

    const narration = engine.currentNarration;
    processingRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        if (!narration?.text) return;

        const response = await base44.functions.invoke('generateCreapSpeech', {
          text: narration.text.substring(0, 5000),
          voice: narration.metadata?.voice || voice,
        });
        if (cancelled) return;

        const url = response?.data?.url;
        if (!url) return;

        // Play and wait for completion before moving to next
        await new Promise((resolve) => {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { audioRef.current = null; resolve(); };
          audio.onerror = () => { audioRef.current = null; resolve(); };
          audio.play().catch(() => { audioRef.current = null; resolve(); });
        });
      } catch (err) {
        console.error('CREAPr narration TTS failed:', err);
      } finally {
        if (!cancelled) {
          audioRef.current = null;
          processingRef.current = false;
          engine.clearNarration();
        }
      }
    })();

    return () => { cancelled = true; };
  }, [engine.currentNarration, enabled, voice, engine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  return {
    stop: stopAudio,
    isPlaying: processingRef.current,
  };
}