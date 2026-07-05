import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Loader2, Check, X, ChevronRight } from 'lucide-react';
import { useOrchestrator } from '@/context/OrchestratorProvider';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import { FONT_CLASSES } from '@/lib/tourIcons';
import NarrationVisual from '@/components/system/NarrationVisual';

/**
 * CreaprTourOverlay — CREAPr's tour playback surface.
 *
 * CREAPr IS the tour system. This overlay renders the full-screen
 * cinematic tour experience (visuals, word-by-word text reveal, TTS)
 * directly from orchestrator state. No separate tour system.
 *
 * Also renders approval gates when the engine pauses for user input.
 *
 * Rendered in CREAPModeLayout, persists across route changes.
 */
export default function CreaprTourOverlay() {
  const { state, advanceTourScene, completeTour, skipTour, approve, reject } = useOrchestrator();
  const { tour, tourSceneIndex, tourActive, pendingApproval, status } = state;

  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  const scene = tour?.scenes?.[tourSceneIndex];

  // Keep latest scene data in refs so audio effects don't re-fire
  // when revealedWords updates (which recreates `words` array each render)
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const tourRef = useRef(tour);
  tourRef.current = tour;

  const wordsRef = useRef([]);
  wordsRef.current = scene?.text?.split(' ') || [];

  // ── Tour Playback ──
  // Generate TTS for current scene — only fires when scene index changes
  useEffect(() => {
    if (!tourActive || !tour || !scene) return;

    let cancelled = false;
    setIsLoadingAudio(true);
    setAudioUrl(null);
    setRevealedWords(0);

    (async () => {
      try {
        const elevenlabsId = scene.elevenlabs_voice_id || tour?.default_elevenlabs_voice_id || '';
        const sceneVoice = scene.voice_override || tour?.default_voice || 'storm';
        const result = await generateNarrationSpeech(scene.speech || scene.text, sceneVoice, {
          elevenlabs_voice_id: elevenlabsId,
          voice_stability: scene.voice_stability,
          voice_similarity: scene.voice_similarity,
        });
        if (!cancelled) {
          setAudioUrl(result.url);
          setIsLoadingAudio(false);
        }
      } catch (err) {
        console.error('CREAPr tour TTS error:', err);
        if (!cancelled) {
          setAudioUrl(null);
          setIsLoadingAudio(false);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourSceneIndex]);

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }

    const t = tourRef.current;
    if (!t) return;

    if (tourSceneIndex >= t.scenes.length - 1) {
      completeTour();
      return;
    }

    const s = sceneRef.current;
    sceneTimerRef.current = setTimeout(() => {
      advanceTourScene();
      setRevealedWords(0);
    }, s?.pause_after_ms || 500);
  }, [tourSceneIndex, advanceTourScene, completeTour]);

  // Keep latest handleSceneComplete in a ref so the audio effect
  // doesn't re-fire when the callback identity changes
  const handleSceneCompleteRef = useRef(handleSceneComplete);
  handleSceneCompleteRef.current = handleSceneComplete;

  // Play audio + reveal words — only fires when audio URL or scene index changes
  useEffect(() => {
    if (!tourActive || isLoadingAudio || !audioUrl) return;

    const w = wordsRef.current;

    const startTimedReveal = (wArr, duration) => {
      const perWord = duration / wArr.length;
      let count = 0;
      wordTimerRef.current = setInterval(() => {
        count++;
        setRevealedWords(count);
        if (count >= wArr.length) {
          clearInterval(wordTimerRef.current);
          setTimeout(() => handleSceneCompleteRef.current(), 800);
        }
      }, perWord);
    };

    if (audioRef.current) {
      const audio = audioRef.current;
      audio.src = audioUrl;

      audio.onloadedmetadata = () => {
        const duration = audio.duration * 1000;
        const perWord = duration / w.length;

        audio.play().catch(() => {
          startTimedReveal(w, duration);
        });

        wordTimerRef.current = setInterval(() => {
          setRevealedWords(prev => {
            if (prev >= w.length) {
              clearInterval(wordTimerRef.current);
              return prev;
            }
            return prev + 1;
          });
        }, perWord);
      };

      audio.onended = () => {
        setRevealedWords(w.length);
        setTimeout(() => handleSceneCompleteRef.current(), 400);
      };

      audio.onerror = () => {
        startTimedReveal(w, 4000);
      };
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
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, isLoadingAudio, audioUrl, tourSceneIndex]);

  const handleSkip = () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (audioRef.current) audioRef.current.pause();
    skipTour();
  };

  const showTour = tourActive && tour && scene;
  const showApproval = pendingApproval && status === 'awaiting_input';

  if (!showTour && !showApproval) return null;

  return (
    <AnimatePresence>
      {(showTour || showApproval) && (
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
            onClick={showTour ? handleSkip : undefined}
            className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            {showTour ? 'Skip Tour' : ''}
          </button>

          {/* Progress dots (tour only) */}
          {showTour && tour.scenes && (
            <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5">
              {tour.scenes.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === tourSceneIndex ? 'w-6 bg-primary' : i < tourSceneIndex ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}

          <audio ref={audioRef} />

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl px-6 text-center min-h-[300px]">
            {showApproval ? (
              <ApprovalCard approval={pendingApproval} onApprove={approve} onReject={reject} />
            ) : isLoadingAudio ? (
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
                  {scene?.generated_image_url ? (
                    <motion.img
                      src={scene.generated_image_url}
                      alt="Scene visual"
                      className="max-h-64 rounded-xl object-contain"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  ) : (
                    <NarrationVisual scene={scene} />
                  )}

                  <p className={`text-base lg:text-xl ${FONT_CLASSES[scene?.font_style] || 'font-heading'} font-medium text-white leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1`}>
                    {wordsRef.current.map((word, i) => (
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

          {/* Branding */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
              {showApproval ? 'CREAPr · Approval Gate' : `CREAPr · ${tour?.name || 'Tour'}`}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Approval Card ───────────────────────────────────────────────────
function ApprovalCard({ approval, onApprove, onReject }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-berna-orange to-amber-600 flex items-center justify-center glow-orange">
        <ChevronRight className="w-8 h-8 text-white" />
      </div>
      <p className="text-lg font-heading font-medium text-white/90 leading-relaxed max-w-md">
        {approval.prompt}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onApprove}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-berna-purple to-berna-orange text-white text-sm font-heading font-semibold hover:scale-[1.02] transition-transform"
        >
          <Check className="w-4 h-4" />
          {approval.approve_label || 'Approve'}
        </button>
        {approval.reject_label && (
          <button
            onClick={onReject}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-muted-foreground text-sm font-medium hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <X className="w-4 h-4" />
            {approval.reject_label}
          </button>
        )}
      </div>
    </motion.div>
  );
}