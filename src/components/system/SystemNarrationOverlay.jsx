import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import {
  getNarration, hasNarrationPlayed, markNarrationPlayed,
} from '@/lib/systemNarration';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import { useTourScript } from '@/hooks/useTourScript';
import { logTourEngagement } from '@/lib/tourEngagement';
import { FONT_CLASSES } from '@/lib/tourIcons';
import NarrationVisual from './NarrationVisual';

/**
 * SystemNarrationOverlay — AUTOPILOT guided tour.
 *
 * When the producer is in AUTOPILOT mode and visits a page with a
 * narration script (and hasn't seen it this session), this overlay
 * takes over the screen with an animated, voice-narrated explanation
 * of the page. After the narration completes, the actual page is revealed.
 *
 * This is a SYSTEM function — it sits at the layout level and activates
 * automatically based on mode + route + session state.
 */
export default function SystemNarrationOverlay() {
  const { mode, isLoadingPrefs } = useCREAPMode();
  const location = useLocation();
  const pathname = location.pathname;

  const [active, setActive] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  const { narration, isLoading: isLoadingTour } = useTourScript(pathname);
  const shouldNarrate =
    !isLoadingPrefs &&
    !isLoadingTour &&
    mode === CREAP_MODES.AUTOPILOT &&
    narration &&
    !hasNarrationPlayed(pathname);

  // Activate narration when conditions are met
  useEffect(() => {
    if (shouldNarrate && !active) {
      setActive(true);
      setCurrentScene(0);
      setRevealedWords(0);
      setAudioUrl(null);
    }
  }, [shouldNarrate, active]);

  // Generate TTS for current scene
  useEffect(() => {
    if (!active || !narration) return;

    const scene = narration.scenes[currentScene];
    if (!scene) return;

    let cancelled = false;
    setIsLoadingAudio(true);
    setAudioUrl(null);

    (async () => {
      try {
        const sceneVoice = scene.voice_override || narration?.default_voice || 'storm';
        const result = await generateNarrationSpeech(scene.speech || scene.text, sceneVoice);
        if (!cancelled) {
          setAudioUrl(result.url);
          setIsLoadingAudio(false);
        }
      } catch (err) {
        console.error('Narration TTS error:', err);
        if (!cancelled) {
          setAudioUrl(null);
          setIsLoadingAudio(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [active, currentScene, narration]);

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }

    if (currentScene >= narration.scenes.length - 1) {
      // Narration finished — fade out and reveal page
      const lastScene = narration.scenes[narration.scenes.length - 1];
      logTourEngagement({
        tour_script_id: narration._scriptId || '',
        route_path: pathname,
        script_name: narration.name,
        last_scene_id: lastScene?.id || '',
        last_scene_index: narration.scenes.length - 1,
        total_scenes: narration.scenes.length,
        action: 'completed',
      });
      markNarrationPlayed(pathname);
      setFadingOut(true);
      setTimeout(() => {
        setActive(false);
        setFadingOut(false);
      }, 600);
      return;
    }

    sceneTimerRef.current = setTimeout(() => {
      setCurrentScene(prev => prev + 1);
      setRevealedWords(0);
    }, 500);
  }, [currentScene, narration, pathname]);

  // Play audio + reveal words
  useEffect(() => {
    if (!active || isLoadingAudio || !audioUrl || !narration) return;

    const scene = narration.scenes[currentScene];
    if (!scene) return;

    const words = scene.text.split(' ');

    if (audioRef.current) {
      const audio = audioRef.current;
      audio.src = audioUrl;

      audio.onloadedmetadata = () => {
        const duration = audio.duration * 1000;
        const perWord = duration / words.length;

        audio.play().catch(() => {
          startTimedReveal(words, duration);
        });

        wordTimerRef.current = setInterval(() => {
          setRevealedWords(prev => {
            if (prev >= words.length) {
              clearInterval(wordTimerRef.current);
              return prev;
            }
            return prev + 1;
          });
        }, perWord);
      };

      audio.onended = () => {
        setRevealedWords(words.length);
        setTimeout(handleSceneComplete, 400);
      };

      audio.onerror = () => {
        startTimedReveal(words, 4000);
      };
    }

    function startTimedReveal(words, duration) {
      const perWord = duration / words.length;
      let count = 0;
      wordTimerRef.current = setInterval(() => {
        count++;
        setRevealedWords(count);
        if (count >= words.length) {
          clearInterval(wordTimerRef.current);
          setTimeout(handleSceneComplete, 800);
        }
      }, perWord);
    }

    return () => {
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
        wordTimerRef.current = null;
      }
      if (sceneTimerRef.current) {
        clearTimeout(sceneTimerRef.current);
        sceneTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [active, isLoadingAudio, audioUrl, currentScene, narration, handleSceneComplete]);

  const handleSkip = () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (audioRef.current) audioRef.current.pause();
    const skipScene = narration.scenes[currentScene];
    logTourEngagement({
      tour_script_id: narration._scriptId || '',
      route_path: pathname,
      script_name: narration.name,
      last_scene_id: skipScene?.id || '',
      last_scene_index: currentScene,
      total_scenes: narration.scenes.length,
      action: 'skipped',
    });
    markNarrationPlayed(pathname);
    setFadingOut(true);
    setTimeout(() => {
      setActive(false);
      setFadingOut(false);
    }, 400);
  };

  if (!active || !narration) return null;

  const scene = narration.scenes[currentScene];
  const words = scene?.text.split(' ') || [];

  return (
    <AnimatePresence>
      {!fadingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Ambient gradient background */}
          <motion.div
            className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-berna-purple/8 blur-[150px]"
            animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-berna-orange/8 blur-[130px]"
            animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip Tour
          </button>

          {/* Progress dots */}
          <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5">
            {narration.scenes.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentScene ? 'w-6 bg-primary' : i < currentScene ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>

          <audio ref={audioRef} />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl px-6 text-center min-h-[300px]">
            {isLoadingAudio ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene?.id}
                  className="flex flex-col items-center gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <NarrationVisual scene={scene} />

                  <p className={`text-base lg:text-xl ${FONT_CLASSES[scene?.font_style] || 'font-heading'} font-medium text-white leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1`}>
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={`transition-all duration-200 ${
                          i < revealedWords ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ filter: i < revealedWords ? 'blur(0px)' : 'blur(4px)' }}
                      >
                        {word}
                      </span>
                    ))}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
              AUTOPILOT · Guided Tour · {narration.name}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}