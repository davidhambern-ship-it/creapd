import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import { resolveTourIcon, FONT_CLASSES } from '@/lib/tourIcons';
import NarrationVisual from '@/components/system/NarrationVisual';

export default function TourPreview({ open, onOpenChange, scenes, defaultVoice = 'storm', defaultElevenLabsVoiceId = '', startIndex = 0 }) {
  const [currentScene, setCurrentScene] = useState(startIndex);
  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setCurrentScene(startIndex);
      setRevealedWords(0);
      setAudioUrl(null);
    }
  }, [open, startIndex]);

  const scene = scenes[currentScene];
  const words = scene?.text?.split(' ') || [];

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
    if (currentScene >= scenes.length - 1) {
      onOpenChange(false);
      return;
    }
    sceneTimerRef.current = setTimeout(() => {
      setCurrentScene(prev => prev + 1);
      setRevealedWords(0);
      setAudioUrl(null);
    }, 500);
  }, [currentScene, scenes.length, onOpenChange]);

  // Generate TTS for current scene
  useEffect(() => {
    if (!open || !scene) return;

    let cancelled = false;
    setIsLoadingAudio(true);
    setAudioUrl(null);

    (async () => {
      try {
        const elevenlabsId = scene.elevenlabs_voice_id || defaultElevenLabsVoiceId || '';
        const voice = scene.voice_override || defaultVoice || 'storm';
        const result = await generateNarrationSpeech(scene.speech_text || scene.text, voice, {
          elevenlabs_voice_id: elevenlabsId,
          voice_stability: scene.voice_stability,
          voice_similarity: scene.voice_similarity,
        });
        if (!cancelled) {
          setAudioUrl(result.url);
          setIsLoadingAudio(false);
        }
      } catch (err) {
        console.error('Preview TTS error:', err);
        if (!cancelled) {
          setAudioUrl(null);
          setIsLoadingAudio(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [open, currentScene, scene, defaultVoice]);

  // Play audio + reveal words
  useEffect(() => {
    if (!open || isLoadingAudio || !audioUrl || !scene) return;

    const startTimedReveal = (w, duration) => {
      const perWord = duration / w.length;
      let count = 0;
      wordTimerRef.current = setInterval(() => {
        count++;
        setRevealedWords(count);
        if (count >= w.length) {
          clearInterval(wordTimerRef.current);
          setTimeout(handleSceneComplete, 800);
        }
      }, perWord);
    };

    if (audioRef.current) {
      const audio = audioRef.current;
      audio.src = audioUrl;
      audio.onloadedmetadata = () => {
        const duration = audio.duration * 1000;
        const perWord = duration / words.length;
        audio.play().catch(() => startTimedReveal(words, duration));
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
      audio.onerror = () => startTimedReveal(words, 4000);
    }

    return () => {
      if (wordTimerRef.current) { clearInterval(wordTimerRef.current); wordTimerRef.current = null; }
      if (sceneTimerRef.current) { clearTimeout(sceneTimerRef.current); sceneTimerRef.current = null; }
      if (audioRef.current) audioRef.current.pause();
    };
  }, [open, isLoadingAudio, audioUrl, currentScene]);

  const handleSkip = () => {
    if (wordTimerRef.current) clearInterval(wordTimerRef.current);
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (audioRef.current) audioRef.current.pause();
    onOpenChange(false);
  };

  // Build runtime-compatible scene object for NarrationVisual
  const runtimeScene = scene ? {
    visual: scene.visual_type,
    icon: resolveTourIcon(scene.icon_name),
    color: scene.icon_color,
    font_style: scene.font_style,
  } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-white/[0.08]">
        <div className="relative min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white transition-all"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Stop Preview
          </button>

          {/* Progress dots */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5">
            {scenes.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentScene ? 'w-6 bg-primary' : i < currentScene ? 'w-3 bg-primary/40' : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>

          <audio ref={audioRef} />

          <div className="relative z-10 flex flex-col items-center justify-center max-w-xl px-6 text-center min-h-[300px]">
            {isLoadingAudio ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentScene}
                  className="flex flex-col items-center gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {runtimeScene && <NarrationVisual scene={runtimeScene} />}
                  <p className={`text-base lg:text-xl ${FONT_CLASSES[scene?.font_style] || 'font-heading'} font-medium text-white leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1`}>
                    {words.map((word, i) => (
                      <span
                        key={i}
                        className={`transition-all duration-200 ${i < revealedWords ? 'opacity-100' : 'opacity-0'}`}
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

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-[0.3em]">
              PREVIEW · Scene {currentScene + 1} of {scenes.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}