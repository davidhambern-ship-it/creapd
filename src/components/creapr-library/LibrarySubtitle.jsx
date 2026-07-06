import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Library Subtitle Bar — cinematic subtitles near the bottom of the screen.
 * Displays CREAPr's spoken lines with elegant word-by-word reveal.
 */
export default function LibrarySubtitle({ lines, onAllLinesShown }) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lines || lines.length === 0) {
      setVisible(false);
      return;
    }
    setCurrentLineIdx(0);
    setVisible(true);
  }, [lines]);

  // Advance through lines
  useEffect(() => {
    if (!visible || !lines || currentLineIdx >= lines.length) return;
    const line = lines[currentLineIdx];
    // Duration based on line length — roughly 150ms per word + 1.5s base
    const wordCount = line.split(' ').length;
    const displayTime = Math.max(2500, wordCount * 200 + 1000);
    const timer = setTimeout(() => {
      if (currentLineIdx < lines.length - 1) {
        setCurrentLineIdx(prev => prev + 1);
      } else {
        // All lines shown
        setVisible(false);
        setTimeout(() => onAllLinesShown?.(), 500);
      }
    }, displayTime);
    return () => clearTimeout(timer);
  }, [visible, currentLineIdx, lines, onAllLinesShown]);

  if (!visible || !lines || currentLineIdx >= lines.length) return null;

  const currentLine = lines[currentLineIdx];
  const words = currentLine.split(' ');

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentLineIdx}
        className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[80%] max-w-2xl text-center"
        style={{ zIndex: 20 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div
          className="px-8 py-4 rounded-2xl backdrop-blur-md"
          style={{
            background: 'hsl(220 30% 4% / 0.6)',
            border: '1px solid hsl(40 30% 20% / 0.15)',
          }}
        >
          <p className="text-lg md:text-xl font-serif leading-relaxed" style={{ color: 'hsl(40 30% 92%)' }}>
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
              >
                {word}
              </motion.span>
            ))}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}