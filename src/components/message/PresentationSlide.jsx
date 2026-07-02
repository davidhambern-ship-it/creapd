import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Quote as QuoteIcon } from 'lucide-react';
import { formatDuration } from '@/lib/spiritualConstants';

const VARIANTS = {
  'fade-up': {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
  },
  'fade-in': {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  'zoom-in': {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
  },
  'pop': {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
  },
  'slide-right': {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
  },
};

const ENTRANCE_VARIANTS = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  zoom: { initial: { opacity: 0, scale: 1.1 }, animate: { opacity: 1, scale: 1 } },
  slide_left: { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 } },
  dissolve: { initial: { opacity: 0, filter: 'blur(8px)' }, animate: { opacity: 1, filter: 'blur(0px)' } },
  none: { initial: {}, animate: {} },
};

function getVariant(name) {
  return VARIANTS[name] || VARIANTS['fade-up'];
}

function safeParse(str) {
  if (!str) return {};
  try {
    const result = typeof str === 'string' ? JSON.parse(str) : str;
    if (typeof result === 'string') return JSON.parse(result);
    return result;
  } catch {
    return {};
  }
}

function findChoreography(choreography, type, index) {
  if (!Array.isArray(choreography)) return null;
  return choreography.find(c => c.type === type && (c.index ?? 0) === (index ?? 0));
}

export default function PresentationSlide({ section }) {
  const scene = safeParse(section.scene_data);
  const hasImage = !!section.generated_image_url;
  const entrance = ENTRANCE_VARIANTS[section.transition] || ENTRANCE_VARIANTS.fade;
  const intensity = scene.motion?.intensity;

  // Parse bullets from slide_content
  const bullets = (section.slide_content || '').split('\n').filter(Boolean);

  // Scripture popups (from choreography scene_data, with fallback to old format)
  const scripturePopups = scene.scripture_popups || [];
  // Quotes (from choreography scene_data)
  const quotes = scene.quotes || [];
  // Graphics descriptions
  const graphics = scene.graphics || [];
  // Element choreography
  const choreography = scene.element_choreography || [];

  return (
    <motion.div
      className="relative w-full h-full overflow-hidden bg-berna-navy"
      initial={entrance.initial}
      animate={entrance.animate}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Background Image or Gradient */}
      {hasImage ? (
        <motion.img
          src={section.generated_image_url}
          alt={section.slide_title || section.title}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08 }}
          animate={{ scale: intensity === 'dramatic' ? 1.0 : 1.02 }}
          transition={{ duration: intensity === 'calm' ? 8 : 5, ease: 'easeOut' }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-berna-navy via-secondary to-primary/20" />
      )}

      {/* Darkening overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <motion.span
          className="px-3 py-1 rounded-full bg-primary/80 backdrop-blur-sm text-xs font-medium text-white"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {section.section_type?.replace(/_/g, ' ')}
        </motion.span>
        {section.voice_duration_seconds > 0 && (
          <motion.span
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Clock className="w-3 h-3" /> {formatDuration(section.voice_duration_seconds)}
          </motion.span>
        )}
      </div>

      {/* Scripture popup badges */}
      {scripturePopups.map((popup, idx) => {
        const choreo = findChoreography(choreography, 'scripture_popup', idx);
        const variant = getVariant(choreo?.animation || 'pop');
        return (
          <motion.div
            key={`scripture-${idx}`}
            className="absolute top-20 left-6 max-w-sm"
            initial={variant.initial}
            animate={variant.animate}
            transition={{
              delay: choreo?.delay ?? (2 + idx * 3),
              duration: choreo?.duration ?? 0.5,
              ease: 'easeOut',
            }}
          >
            <div className="px-4 py-2.5 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 shadow-lg">
              <p className="text-xs font-semibold text-white">{popup.reference}</p>
              <p className="text-xs text-white/80 line-clamp-2 mt-0.5">{popup.text}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Quote overlays */}
      {quotes.map((quote, idx) => {
        const choreo = findChoreography(choreography, 'quote', idx);
        const variant = getVariant(choreo?.animation || 'slide-right');
        return (
          <motion.div
            key={`quote-${idx}`}
            className="absolute top-1/2 -translate-y-1/2 right-8 max-w-xs"
            initial={variant.initial}
            animate={variant.animate}
            transition={{
              delay: quote.delay ?? choreo?.delay ?? 10,
              duration: choreo?.duration ?? 0.6,
              ease: 'easeOut',
            }}
          >
            <div className="flex items-start gap-2 px-5 py-4 rounded-xl bg-black/60 backdrop-blur-lg border-l-4 border-primary">
              <QuoteIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm md:text-base text-white font-medium italic leading-snug">"{quote.text}"</p>
                {quote.attribution && (
                  <p className="text-xs text-white/60 mt-1">— {quote.attribution}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        {section.slide_title && (() => {
          const choreo = findChoreography(choreography, 'title', 0);
          const variant = getVariant(choreo?.animation || 'fade-up');
          return (
            <motion.h2
              className="text-3xl md:text-5xl font-heading font-bold text-white mb-3 leading-tight drop-shadow-lg"
              initial={variant.initial}
              animate={variant.animate}
              transition={{
                delay: choreo?.delay ?? 0,
                duration: choreo?.duration ?? 0.6,
                ease: 'easeOut',
              }}
            >
              {section.slide_title}
            </motion.h2>
          );
        })()}

        {bullets.length > 0 && (
          <div className="max-w-3xl space-y-1.5">
            {bullets.map((line, idx) => {
              const choreo = findChoreography(choreography, 'bullet', idx);
              const variant = getVariant(choreo?.animation || 'fade-up');
              return (
                <motion.div
                  key={idx}
                  className="flex items-start gap-2"
                  initial={variant.initial}
                  animate={variant.animate}
                  transition={{
                    delay: choreo?.delay ?? (0.8 + idx * 0.4),
                    duration: choreo?.duration ?? 0.5,
                    ease: 'easeOut',
                  }}
                >
                  <span className="text-primary text-lg leading-snug mt-0.5">▸</span>
                  <p className="text-base md:text-lg text-white/90 drop-shadow">{line}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Graphics indicators */}
        {graphics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {graphics.map((g, idx) => {
              const choreo = findChoreography(choreography, 'graphic', idx);
              const variant = getVariant(choreo?.animation || 'fade-in');
              return (
                <motion.span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-accent/20 backdrop-blur-sm border border-accent/30 text-xs text-accent-foreground"
                  initial={variant.initial}
                  animate={variant.animate}
                  transition={{
                    delay: choreo?.delay ?? (1.5 + idx * 1),
                    duration: choreo?.duration ?? 0.4,
                  }}
                >
                  📊 {g}
                </motion.span>
              );
            })}
          </div>
        )}

        {/* Scripture reference fallback */}
        {section.scripture_references && scripturePopups.length === 0 && (
          <motion.div
            className="mt-4 flex items-start gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-white/70">{section.scripture_references}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}