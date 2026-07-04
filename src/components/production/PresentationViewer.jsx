import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

function safeParse(str) {
  if (!str) return [];
  try {
    const result = typeof str === 'string' ? JSON.parse(str) : str;
    if (typeof result === 'string') return JSON.parse(result);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

const ENTRANCE = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  zoom: { initial: { opacity: 0, scale: 1.1 }, animate: { opacity: 1, scale: 1 } },
  slide_left: { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 } },
  slide_right: { initial: { opacity: 0, x: -60 }, animate: { opacity: 1, x: 0 } },
  pop: { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 } },
  dissolve: { initial: { opacity: 0, filter: 'blur(8px)' }, animate: { opacity: 1, filter: 'blur(0px)' } },
  typewriter: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  word_by_word: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  lower_third: { initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } },
  none: { initial: {}, animate: {} },
};

const POS_CLASSES = {
  center: 'items-center justify-center text-center',
  top: 'items-start justify-center text-center pt-16',
  bottom: 'items-end justify-center text-center pb-20',
  left: 'items-center justify-start text-left pl-12',
  right: 'items-center justify-end text-right pr-12',
  full_screen: 'items-center justify-center text-center',
  lower_third: 'items-end justify-start pb-16 pl-12 text-left',
};

function fmt(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SceneSlide({ scene }) {
  const textElements = safeParse(scene.text_elements);
  const imageElements = safeParse(scene.image_elements);
  const hasBgImage = !!scene.generated_image_url;

  return (
    <div className="relative w-full h-full overflow-hidden bg-berna-navy">
      {/* Background */}
      {hasBgImage ? (
        <motion.img
          src={scene.generated_image_url}
          alt={scene.slide_title}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1.02 }}
          transition={{ duration: 8, ease: 'easeOut' }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-berna-navy via-secondary to-primary/20" />
      )}

      {/* Darkening overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Beat type badge */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <motion.span
          className="px-3 py-1 rounded-full bg-primary/80 backdrop-blur-sm text-xs font-medium text-white capitalize"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {scene.beat_type?.replace(/_/g, ' ') || 'Scene'}
        </motion.span>
        {scene.duration_seconds > 0 && (
          <motion.span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Clock className="w-3 h-3" /> {fmt(scene.duration_seconds)}
          </motion.span>
        )}
      </div>

      {/* Slide title */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10">
        <motion.h2
          className="text-3xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight drop-shadow-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
        >
          {scene.slide_title}
        </motion.h2>

        {/* Text elements */}
        <div className="space-y-2">
          {textElements.map((el, idx) => {
            const variant = ENTRANCE[el.animation_in] || ENTRANCE.fade;
            const posClass = POS_CLASSES[el.position] || POS_CLASSES.center;
            const isLowerThird = el.element_type === 'lower_third' || el.position === 'lower_third';
            return (
              <motion.div
                key={`text-${idx}`}
                className={isLowerThird ? '' : `flex ${posClass}`}
                initial={variant.initial}
                animate={variant.animate}
                transition={{ delay: 0.5 + idx * 0.3, duration: 0.5, ease: 'easeOut' }}
              >
                <div className={isLowerThird
                  ? 'inline-block px-4 py-2 rounded-lg bg-black/70 backdrop-blur-md border-l-4 border-accent'
                  : 'max-w-3xl'
                }>
                  <p className={isLowerThird
                    ? 'text-sm md:text-base text-white font-medium'
                    : 'text-base md:text-xl text-white/90 drop-shadow'
                  }>
                    {el.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Visual theme indicator */}
      {scene.visual_theme && (
        <motion.div
          className="absolute top-20 right-6 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="text-xs text-white/60">🎨 {scene.visual_theme}</p>
        </motion.div>
      )}
    </div>
  );
}

export default function PresentationViewer({ scenes, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  const currentScene = scenes[currentIdx];
  const isLast = currentIdx === scenes.length - 1;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goToNext = useCallback(() => {
    if (currentIdx < scenes.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIdx, scenes.length]);

  useEffect(() => {
    clearTimer();
    if (isPlaying) {
      const duration = currentScene?.duration_seconds || 5;
      timerRef.current = setTimeout(goToNext, duration * 1000);
    }
    return clearTimer;
  }, [isPlaying, currentIdx, currentScene, goToNext]);

  const handlePrev = () => {
    clearTimer();
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleNext = () => {
    clearTimer();
    if (currentIdx < scenes.length - 1) setCurrentIdx(prev => prev + 1);
  };

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const elapsedDuration = scenes.slice(0, currentIdx).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Slide area */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-full h-full max-w-[1920px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene?.id || currentIdx}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {currentScene && <SceneSlide scene={currentScene} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Nav arrows */}
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          disabled={isLast}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-black/95 border-t border-white/10 px-6 py-4">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-white/60 font-mono w-8">{currentIdx + 1}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((currentIdx + 1) / scenes.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/60 font-mono w-8">{scenes.length}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <div className="text-sm text-white/70">
              <span className="font-medium text-white">{currentScene?.slide_title}</span>
              <span className="ml-2 text-xs text-white/50">
                {fmt(elapsedDuration)} / {fmt(totalDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}