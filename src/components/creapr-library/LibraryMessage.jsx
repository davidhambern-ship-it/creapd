import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibraryMessage({ lines, phase, stopTyping, onComplete }) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [completedLines, setCompletedLines] = useState([]);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const charIdxRef = useRef(0);
  const typeTimerRef = useRef(null);

  const typography = useMemo(() => {
    const isGreeting = phase === 'greeting' || phase === 'confirming';
    const isDisplay = phase === 'assembling' || phase === 'reveal';

    if (isGreeting) {
      return { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400, fontStyle: 'normal', letterSpacing: '0.01em' };
    }
    if (isDisplay) {
      return { fontFamily: '"Oswald", sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' };
    }
    return { fontFamily: '"Inter", sans-serif', fontWeight: 400, fontStyle: 'normal' };
  }, [phase]);

  // Reset when new lines arrive
  useEffect(() => {
    if (!lines || lines.length === 0) {
      setVisible(false);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
      return;
    }
    setCurrentLineIdx(0);
    setTypedText('');
    setCompletedLines([]);
    setDone(false);
    charIdxRef.current = 0;
    setVisible(true);
  }, [lines]);

  // Stop typing immediately when producer begins responding
  useEffect(() => {
    if (!stopTyping || !visible || !lines) return;
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    // Show all remaining lines as completed
    const remaining = lines.slice(currentLineIdx);
    setCompletedLines(prev => [...prev, ...remaining]);
    setTypedText('');

    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 700);

    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [stopTyping]);

  // Typewriter effect
  useEffect(() => {
    if (!visible || !lines || currentLineIdx >= lines.length || stopTyping) return;
    const line = lines[currentLineIdx];

    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    typeTimerRef.current = setInterval(() => {
      charIdxRef.current++;
      if (charIdxRef.current <= line.length) {
        setTypedText(line.substring(0, charIdxRef.current));
      } else {
        clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        const wordCount = line.split(' ').length;
        const holdTime = Math.max(1400, wordCount * 110 + 500);
        setTimeout(() => {
          if (!lines || currentLineIdx >= lines.length - 1) {
            // Final line complete — move it to completed, clear typing
            setCompletedLines(prev => [...prev, line]);
            setTypedText('');
            setDone(true);
            setVisible(false);
            setTimeout(() => onComplete?.(), 350);
          } else {
            // Move current line to completed, start next
            setCompletedLines(prev => [...prev, line]);
            setCurrentLineIdx(prev => prev + 1);
            charIdxRef.current = 0;
            setTypedText('');
          }
        }, holdTime);
      }
    }, 32);

    return () => {
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    };
    // eslint-disable-next-line
  }, [visible, currentLineIdx, lines, stopTyping]);

  if (!visible && done) return null;
  if (!lines || currentLineIdx >= lines.length) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="absolute top-[11%] left-1/2 -translate-x-1/2 w-[85%] max-w-2xl plib-message-panel px-6 py-4 max-h-[60vh] overflow-y-auto"
          style={{ zIndex: 20 }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center text-base md:text-lg leading-relaxed space-y-1" style={typography}>
            {completedLines.map((line, i) => (
              <p key={i} style={{ minHeight: '1.5em' }}>{line}</p>
            ))}
            {typedText && (
              <p style={{ minHeight: '1.5em' }}>
                {typedText}
                <span className={`plib-cursor ${done ? 'plib-cursor-faded' : ''}`} />
              </p>
            )}
            {!typedText && completedLines.length > 0 && !done && (
              <p style={{ minHeight: '1.5em' }}>
                <span className="plib-cursor" />
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}