import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    if (!visible || !lines || currentLineIdx >= lines.length) return;
    const line = lines[currentLineIdx];
    const wordCount = line.split(' ').length;
    const displayTime = Math.max(2500, wordCount * 200 + 1000);
    const timer = setTimeout(() => {
      if (currentLineIdx < lines.length - 1) {
        setCurrentLineIdx(prev => prev + 1);
      } else {
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
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div
          className="px-8 py-4 rounded-lg backdrop-blur-md relative overflow-hidden"
          style={{
            background: 'hsl(220 35% 4% / 0.7)',
            border: '1px solid hsl(190 60% 40% / 0.3)',
            boxShadow: '0 0 20px hsl(270 80% 50% / 0.1), inset 0 1px 0 hsl(190 50% 30% / 0.1)',
          }}
        >
          {/* Top scan line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(190 90% 55% / 0.5), transparent)' }}
          />
          {/* Corner accents */}
          <div className="absolute top-1.5 left-1.5 w-2 h-2 border-l border-t" style={{ borderColor: 'hsl(190 90% 55% / 0.6)' }} />
          <div className="absolute top-1.5 right-1.5 w-2 h-2 border-r border-t" style={{ borderColor: 'hsl(190 90% 55% / 0.6)' }} />
          <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-l border-b" style={{ borderColor: 'hsl(190 90% 55% / 0.6)' }} />
          <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-r border-b" style={{ borderColor: 'hsl(190 90% 55% / 0.6)' }} />

          <p className="text-base md:text-lg font-mono leading-relaxed" style={{ color: 'hsl(0 0% 92%)' }}>
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.25em]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
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