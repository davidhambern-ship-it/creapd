import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, X, Volume2, VolumeX, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/spiritualConstants';

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

const ANIM_IN = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.15 } },
  slide_left: { initial: { opacity: 0, x: 80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -80 } },
  slide_right: { initial: { opacity: 0, x: -80 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 80 } },
  pop: { initial: { opacity: 0, scale: 0.4 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.4 } },
  dissolve: { initial: { opacity: 0, filter: 'blur(10px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(10px)' } },
  lower_third: { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 40 } },
  none: { initial: {}, animate: {}, exit: {} },
};

const POSITION_CLASSES = {
  center: 'items-center justify-center text-center',
  top: 'items-start justify-center text-center pt-20',
  bottom: 'items-end justify-center text-center pb-24',
  left: 'items-center justify-start text-left pl-16',
  right: 'items-center justify-end text-right pr-16',
  full_screen: 'items-center justify-center text-center',
  lower_third: 'items-end justify-start pb-16 pl-12',
};

const TYPE_STYLES = {
  title: 'text-5xl md:text-7xl font-heading font-bold text-white',
  emphasis: 'text-3xl md:text-5xl font-heading font-semibold text-white',
  subtitle: 'text-xl md:text-2xl font-body text-white/90',
  lower_third: 'text-lg md:text-xl font-medium text-white bg-black/60 backdrop-blur-md px-6 py-3 rounded-lg border-l-4 border-primary inline-block',
  quote: 'text-3xl md:text-4xl font-heading italic text-white',
  question: 'text-3xl md:text-4xl font-heading font-semibold text-white',
  closing: 'text-4xl md:text-6xl font-heading font-bold text-white',
  default: 'text-2xl md:text-3xl font-heading text-white',
};

function getAnim(name) {
  return ANIM_IN[name] || ANIM_IN.fade;
}

function getPositionClass(pos) {
  return POSITION_CLASSES[pos] || POSITION_CLASSES.center;
}

function getTypeStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.default;
}

function TextElement({ element, elapsed }) {
  const visible = elapsed >= element.start_time && elapsed < element.end_time;
  const anim = getAnim(element.animation_in);
  const posClass = getPositionClass(element.position);
  const typeStyle = getTypeStyle(element.element_type);
  const isWordByWord = element.animation_in === 'word_by_word';

  if (!visible) return null;

  // Word-by-word animation
  if (isWordByWord) {
    const words = (element.text || '').split(' ');
    const wordDelay = 0.15;
    const wordsShown = Math.min(words.length, Math.floor((elapsed - element.start_time) / wordDelay) + 1);

    return (
      <div className={`absolute inset-0 flex ${posClass} px-8`}>
        <div className="max-w-4xl">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
              animate={i < wordsShown ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 15, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`inline-block mr-[0.25em] ${typeStyle}`}
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
            >
              {word}
            </motion.span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 flex ${posClass} px-8`}>
      <motion.div
        initial={anim.initial}
        animate={anim.animate}
        exit={anim.exit}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-4xl"
      >
        <p className={typeStyle} style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {element.text}
        </p>
      </motion.div>
    </div>
  );
}

function ScriptureElement({ element, elapsed }) {
  const visible = elapsed >= element.start_time && elapsed < element.end_time;
  if (!visible) return null;
  const anim = getAnim(element.animation_in);
  const posClass = getPositionClass(element.position);

  return (
    <div className={`absolute inset-0 flex ${posClass} px-8`}>
      <motion.div
        initial={anim.initial}
        animate={anim.animate}
        exit={anim.exit}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="max-w-2xl"
      >
        <div className="bg-black/50 backdrop-blur-md rounded-2xl border-l-4 border-primary px-6 py-5">
          <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">{element.reference}</p>
          <p className="text-lg md:text-xl text-white/95 leading-relaxed italic" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
            "{element.text}"
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function DirectorPreview({ scenes, sections, config, onClose }) {
  const [globalTime, setGlobalTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const lastSectionIdRef = useRef(null);

  const totalDuration = scenes.length > 0 ? scenes[scenes.length - 1].voice_end_time : 0;

  // Map sections by id for quick lookup
  const sectionMap = useMemo(() => {
    const map = {};
    sections.forEach(s => { map[s.id] = s; });
    return map;
  }, [sections]);

  // Determine which section's audio should be playing based on globalTime
  const currentSection = useMemo(() => {
    const activeScene = scenes.find(s => globalTime >= s.voice_start_time && globalTime < s.voice_end_time);
    if (!activeScene) return null;
    return sectionMap[activeScene.section_id] || null;
  }, [globalTime, scenes, sectionMap]);

  // Find section start time (first scene of this section)
  const sectionStartTime = useMemo(() => {
    if (!currentSection) return 0;
    const firstScene = scenes.find(s => s.section_id === currentSection.id);
    return firstScene ? firstScene.voice_start_time : 0;
  }, [currentSection, scenes]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }

    const tick = () => {
      const audio = audioRef.current;
      if (audio && currentSection?.voice_url && !audio.paused) {
        // Use audio currentTime for sync
        setGlobalTime(sectionStartTime + audio.currentTime);
      } else if (!currentSection?.voice_url) {
        // No audio for this section — use timer
        setGlobalTime(prev => {
          const next = prev + 0.05;
          return next >= totalDuration ? totalDuration : next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, currentSection, sectionStartTime, totalDuration]);

  // Handle audio playback when section changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSection) return;

    const sectionId = currentSection.id;
    if (lastSectionIdRef.current !== sectionId) {
      lastSectionIdRef.current = sectionId;
      if (currentSection.voice_url) {
        audio.src = currentSection.voice_url;
        audio.muted = muted;
        audio.currentTime = Math.max(0, globalTime - sectionStartTime);
        if (isPlaying) audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [currentSection, isPlaying, muted, globalTime, sectionStartTime]);

  // Handle audio ended — advance to next section
  const handleAudioEnded = useCallback(() => {
    const lastSceneOfSection = [...scenes].reverse().find(s => s.section_id === currentSection?.id);
    if (lastSceneOfSection) {
      const nextScene = scenes.find(s => s.voice_start_time >= lastSceneOfSection.voice_end_time);
      if (nextScene) {
        setGlobalTime(nextScene.voice_start_time);
      } else {
        setIsPlaying(false);
      }
    }
  }, [scenes, currentSection]);

  // Determine active scene
  const activeScene = scenes.find(s => globalTime >= s.voice_start_time && globalTime < s.voice_end_time) || scenes[0];
  const sceneRelativeTime = activeScene ? globalTime - activeScene.voice_start_time : 0;
  const activeSection = activeScene ? sectionMap[activeScene.section_id] : null;

  // Parse elements
  const textElements = activeScene ? safeParse(activeScene.text_elements) : [];
  const scriptureElements = activeScene ? safeParse(activeScene.scripture_elements) : [];

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handlePrev = () => {
    const prevScene = [...scenes].reverse().find(s => s.voice_end_time <= globalTime - 1);
    if (prevScene) setGlobalTime(prevScene.voice_start_time);
    else setGlobalTime(0);
  };

  const handleNext = () => {
    const nextScene = scenes.find(s => s.voice_start_time > globalTime + 1);
    if (nextScene) setGlobalTime(nextScene.voice_start_time);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScene?.id || 'empty'}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background */}
            {activeSection?.generated_image_url ? (
              <motion.img
                src={activeSection.generated_image_url}
                alt={activeScene?.slide_title}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1.02 }}
                transition={{ duration: 8, ease: 'easeOut' }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-berna-navy via-secondary to-primary/20" />
            )}

            {/* Darkening overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />

            {/* Scene badge */}
            <motion.div
              className="absolute top-6 left-6 z-10 flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="px-3 py-1 rounded-full bg-accent/80 backdrop-blur-sm text-xs font-medium text-white">
                {activeScene?.beat_type?.replace(/_/g, ' ')}
              </span>
            </motion.div>

            {/* Text elements */}
            <AnimatePresence>
              {textElements.map((el, idx) => (
                <TextElement key={`text-${idx}`} element={el} elapsed={sceneRelativeTime} />
              ))}
            </AnimatePresence>

            {/* Scripture elements */}
            <AnimatePresence>
              {scriptureElements.map((el, idx) => (
                <ScriptureElement key={`scripture-${idx}`} element={el} elapsed={sceneRelativeTime} />
              ))}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-20"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors z-20"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-black/95 border-t border-white/10 px-6 py-4">
        {/* Timeline progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-white/60 font-mono w-12">{formatDuration(globalTime)}</span>
          <div
            className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setGlobalTime(pct * totalDuration);
            }}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-100"
              style={{ width: `${totalDuration > 0 ? (globalTime / totalDuration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-white/60 font-mono w-12">{formatDuration(totalDuration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => {
                setMuted(!muted);
                if (audioRef.current) audioRef.current.muted = !muted;
              }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="text-sm text-white/70">
              <span className="font-medium text-white">{activeScene?.slide_title}</span>
              <span className="ml-2 text-xs text-white/50 flex items-center gap-1 inline-flex">
                <Clock className="w-3 h-3" /> {formatDuration(sceneRelativeTime)} / {formatDuration(activeScene?.duration_seconds || 0)}
              </span>
            </div>
          </div>
          <div className="text-xs text-white/40">
            {config?.production_name}
          </div>
        </div>
      </div>
    </div>
  );
}