import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import {
  PROFILE_INTROS, hasProfileIntroPlayed, markProfileIntroPlayed,
} from '@/lib/profileIntros';

/**
 * ProfileIntroOverlay — Per-module opening animation.
 *
 * When the producer enters a Production Profile section for the first
 * time in a session (and AUTOPILOT mode is active), this overlay plays
 * a short cinematic intro with profile-specific colors, icon, and narration.
 *
 * Each profile has its own personality:
 *  - News: urgent, professional
 *  - Music: energetic, rhythmic
 *  - Talk: conversational, warm
 *  - Cooking: inviting, warm
 *  - Sports: high-energy, dynamic
 *  - Cosmo: glamorous, elegant
 *  - Spiritual: reverent, peaceful
 */
export default function ProfileIntroOverlay({ profileKey }) {
  const { mode, isLoadingPrefs } = useCREAPMode();
  const profile = PROFILE_INTROS[profileKey];

  const [active, setActive] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  const shouldPlay =
    !isLoadingPrefs &&
    mode === CREAP_MODES.AUTOPILOT &&
    profile &&
    !hasProfileIntroPlayed(profileKey);

  useEffect(() => {
    if (shouldPlay && !active) {
      setActive(true);
      setCurrentScene(0);
      setRevealedWords(0);
      setAudioUrl(null);
    }
  }, [shouldPlay, active]);

  // Generate TTS for current scene
  useEffect(() => {
    if (!active || !profile) return;

    const scene = profile.scenes[currentScene];
    if (!scene) return;

    let cancelled = false;
    setIsLoadingAudio(true);
    setAudioUrl(null);

    (async () => {
      try {
        const result = await generateNarrationSpeech(scene.speech || scene.text);
        if (!cancelled) {
          setAudioUrl(result.url);
          setIsLoadingAudio(false);
        }
      } catch (err) {
        console.error('Profile intro TTS error:', err);
        if (!cancelled) {
          setAudioUrl(null);
          setIsLoadingAudio(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [active, currentScene, profile]);

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }

    if (currentScene >= profile.scenes.length - 1) {
      markProfileIntroPlayed(profileKey);
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
  }, [currentScene, profile, profileKey]);

  // Play audio + reveal words
  useEffect(() => {
    if (!active || isLoadingAudio || !audioUrl || !profile) return;

    const scene = profile.scenes[currentScene];
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
  }, [active, isLoadingAudio, audioUrl, currentScene, profile, handleSceneComplete]);

  const handleSkip = () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (audioRef.current) audioRef.current.pause();
    markProfileIntroPlayed(profileKey);
    setFadingOut(true);
    setTimeout(() => {
      setActive(false);
      setFadingOut(false);
    }, 400);
  };

  if (!active || !profile) return null;

  const scene = profile.scenes[currentScene];
  const words = scene?.text.split(' ') || [];
  const ProfileIcon = profile.icon;

  return (
    <AnimatePresence>
      {!fadingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Profile-specific ambient gradient */}
          <motion.div
            className={`absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${profile.bgGradient} blur-[150px]`}
            animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className={`absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-br ${profile.bgGradient} blur-[130px]`}
            animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip & Take Control
          </button>

          {/* Progress dots */}
          <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5">
            {profile.scenes.map((_, i) => (
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
                  {/* Scene visual */}
                  {scene?.visual === 'icon' && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="relative"
                    >
                      <motion.div
                        className={`absolute inset-0 rounded-2xl ${profile.colorClass} opacity-20 blur-2xl`}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <div className={`relative w-24 h-24 rounded-2xl bg-white/[0.04] border ${profile.accentRing} flex items-center justify-center ${profile.glowClass}`}>
                        <ProfileIcon className={`w-12 h-12 ${profile.colorClass}`} />
                      </div>
                    </motion.div>
                  )}

                  {scene?.visual === 'flow' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center gap-2"
                    >
                      {['Research', 'Generate', 'Direct', 'Deliver'].map((step, i) => (
                        <React.Fragment key={step}>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.25, duration: 0.3 }}
                            className="flex flex-col items-center gap-1"
                          >
                            <div className={`w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center`}>
                              <Sparkles className={`w-4 h-4 ${profile.colorClass}`} />
                            </div>
                            <span className="text-[9px] font-mono uppercase text-muted-foreground">{step}</span>
                          </motion.div>
                          {i < 3 && (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: 12 }}
                              transition={{ delay: i * 0.25 + 0.2 }}
                              className="h-px bg-gradient-to-r from-white/20 to-transparent"
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </motion.div>
                  )}

                  {scene?.visual === 'reveal' && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className={`w-20 h-20 rounded-full bg-gradient-to-br ${profile.bgGradient} border ${profile.accentRing} flex items-center justify-center ${profile.glowClass}`}
                    >
                      <ArrowRight className={`w-10 h-10 ${profile.colorClass}`} />
                    </motion.div>
                  )}

                  {/* Animated text */}
                  <p className="text-lg lg:text-xl font-heading font-medium text-white leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1">
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

          {/* Profile label at bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
              {profile.name} · AUTOPILOT
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}