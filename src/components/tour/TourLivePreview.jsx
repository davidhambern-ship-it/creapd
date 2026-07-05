import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, Loader2, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import { resolveTourIcon, FONT_CLASSES, TEXT_SIZE_CLASSES, TEXT_ALIGN_CLASSES, BACKGROUND_CLASSES } from '@/lib/tourIcons';
import NarrationVisual from '@/components/system/NarrationVisual';

/**
 * TourLivePreview — inline (non-modal) live preview of a tour scene.
 *
 * Renders the selected scene in real-time as the producer edits it,
 * with optional audio playback and scene navigation.
 */
export default function TourLivePreview({
  scenes,
  activeIndex = 0,
  defaultVoice = 'storm',
  defaultElevenLabsVoiceId = '',
  onNavigate,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [revealedWords, setRevealedWords] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const sceneTimerRef = useRef(null);

  const scene = scenes[activeIndex];
  const words = scene?.text?.split(' ') || [];

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setRevealedWords(0);
    if (wordTimerRef.current) { clearInterval(wordTimerRef.current); wordTimerRef.current = null; }
    if (sceneTimerRef.current) { clearTimeout(sceneTimerRef.current); sceneTimerRef.current = null; }
    if (audioRef.current) audioRef.current.pause();
    setAudioUrl(null);
  }, []);

  // Stop playback when scene changes or component unmounts
  useEffect(() => {
    stopPlayback();
  }, [activeIndex]);

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  // Generate TTS for current scene when playing
  useEffect(() => {
    if (!isPlaying || !scene) return;

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
        console.error('Live preview TTS error:', err);
        if (!cancelled) {
          setAudioUrl(null);
          setIsLoadingAudio(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [isPlaying, activeIndex, scene, defaultVoice, defaultElevenLabsVoiceId]);

  const handleSceneComplete = useCallback(() => {
    if (wordTimerRef.current) { clearInterval(wordTimerRef.current); wordTimerRef.current = null; }
    if (activeIndex >= scenes.length - 1) {
      stopPlayback();
      return;
    }
    sceneTimerRef.current = setTimeout(() => {
      onNavigate?.(activeIndex + 1);
      setRevealedWords(0);
      setAudioUrl(null);
    }, 500);
  }, [activeIndex, scenes.length, onNavigate, stopPlayback]);

  // Play audio + reveal words
  useEffect(() => {
    if (!isPlaying || isLoadingAudio || !audioUrl || !scene) return;

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
            if (prev >= words.length) { clearInterval(wordTimerRef.current); return prev; }
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
  }, [isPlaying, isLoadingAudio, audioUrl, activeIndex]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      setIsPlaying(true);
      setRevealedWords(0);
    }
  };

  const goPrev = () => {
    if (activeIndex > 0) onNavigate?.(activeIndex - 1);
  };
  const goNext = () => {
    if (activeIndex < scenes.length - 1) onNavigate?.(activeIndex + 1);
  };

  // Build runtime-compatible scene object for NarrationVisual
  const runtimeScene = scene ? {
    visual: scene.visual_type,
    icon: resolveTourIcon(scene.icon_name),
    color: scene.icon_color,
    font_style: scene.font_style,
  } : null;

  const bgClass = scene ? (BACKGROUND_CLASSES[scene.background_type] || BACKGROUND_CLASSES['default']) : BACKGROUND_CLASSES['default'];

  return (
    <div className="sticky top-6 flex flex-col h-[calc(100vh-7rem)]">
      <div className={`relative flex-1 rounded-2xl overflow-hidden border border-white/[0.08] ${bgClass} flex flex-col items-center justify-center`}>
        {/* Ambient gradient background */}
        <motion.div
          className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-berna-purple/8 blur-[150px] pointer-events-none"
          animate={{ x: [0, 60, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-berna-orange/8 blur-[130px] pointer-events-none"
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Scene navigation */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
          {scenes.map((_, i) => (
            <button
              key={i}
              onClick={() => onNavigate?.(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 bg-primary' : i < activeIndex ? 'w-3 bg-primary/40' : 'w-3 bg-white/10 hover:bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Scene label */}
        <div className="absolute top-3 right-3 z-20">
          <span className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-wider px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
            Scene {activeIndex + 1} / {scenes.length}
          </span>
        </div>

        <audio ref={audioRef} />

        {/* Main preview content */}
        <div className="relative z-10 flex flex-col items-center justify-center max-w-md px-6 text-center min-h-[280px] w-full">
          {!scene ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs">No scene selected</p>
            </div>
          ) : isPlaying && isLoadingAudio ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground/60 font-mono uppercase">Generating audio…</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                className="flex flex-col items-center gap-6 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {scene.generated_image_url ? (
                  <motion.img
                    src={scene.generated_image_url}
                    alt="Scene visual"
                    className="max-h-48 rounded-xl object-contain"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                ) : (
                  runtimeScene && <NarrationVisual scene={runtimeScene} />
                )}
                <p className={`${FONT_CLASSES[scene.font_style] || 'font-heading'} ${TEXT_SIZE_CLASSES[scene.text_size] || 'text-lg'} ${scene.text_color || 'text-white'} ${TEXT_ALIGN_CLASSES[scene.text_alignment] || 'text-center'} font-medium leading-relaxed min-h-[3em] flex flex-wrap justify-center gap-x-1.5 gap-y-1 w-full`}>
                  {words.map((word, i) => (
                    <span
                      key={i}
                      className={`transition-all duration-200 ${isPlaying ? (i < revealedWords ? 'opacity-100' : 'opacity-0') : 'opacity-100'}`}
                      style={{ filter: isPlaying ? (i < revealedWords ? 'blur(0px)' : 'blur(4px)') : 'blur(0px)' }}
                    >
                      {word}
                    </span>
                  ))}
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Playback controls */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
            onClick={goPrev}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handlePlayPause}
            disabled={!scene}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08]"
            onClick={goNext}
            disabled={activeIndex >= scenes.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {isPlaying && (
          <button
            onClick={stopPlayback}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-muted-foreground hover:text-white transition-all"
          >
            <SkipForward className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {/* Scene meta strip */}
      {scene && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="font-mono">{scene.scene_id || `scene-${activeIndex}`}</span>
          <span className="text-white/10">·</span>
          <span className="capitalize">{scene.visual_type}</span>
          {scene.voice_override && (
            <>
              <span className="text-white/10">·</span>
              <span className="capitalize">Voice: {scene.voice_override}</span>
            </>
          )}
          {scene.elevenlabs_voice_id && (
            <>
              <span className="text-white/10">·</span>
              <span className="text-berna-purple font-mono">EL: {scene.elevenlabs_voice_id.slice(0, 8)}…</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}