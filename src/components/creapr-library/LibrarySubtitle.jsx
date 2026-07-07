import React, { useState, useEffect, useRef } from 'react';

export default function LibrarySubtitle({ lines, onAllLinesShown }) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [visible, setVisible] = useState(false);
  const charIdxRef = useRef(0);
  const typeTimerRef = useRef(null);

  // Reset when new lines arrive
  useEffect(() => {
    if (!lines || lines.length === 0) {
      setVisible(false);
      return;
    }
    setCurrentLineIdx(0);
    setTypedText('');
    charIdxRef.current = 0;
    setVisible(true);
  }, [lines]);

  // Typewriter effect — character by character
  useEffect(() => {
    if (!visible || !lines || currentLineIdx >= lines.length) return;
    const line = lines[currentLineIdx];

    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    typeTimerRef.current = setInterval(() => {
      charIdxRef.current++;
      if (charIdxRef.current <= line.length) {
        setTypedText(line.substring(0, charIdxRef.current));
      } else {
        clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        // Hold the full line briefly, then advance
        const wordCount = line.split(' ').length;
        const holdTime = Math.max(2000, wordCount * 150 + 800);
        setTimeout(() => {
          if (!lines || currentLineIdx >= lines.length - 1) {
            setVisible(false);
            setTimeout(() => onAllLinesShown?.(), 400);
          } else {
            setCurrentLineIdx(prev => prev + 1);
            charIdxRef.current = 0;
            setTypedText('');
          }
        }, holdTime);
      }
    }, 38);

    return () => {
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    };
  }, [visible, currentLineIdx, lines, onAllLinesShown]);

  if (!visible || !lines || currentLineIdx >= lines.length) return null;

  return (
    <div
      className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[85%] max-w-2xl"
      style={{ zIndex: 20 }}
    >
      <p
        className="text-center text-base md:text-xl font-mono leading-relaxed"
        style={{
          color: 'hsl(190 90% 72%)',
          textShadow: '0 0 12px hsl(190 90% 55% / 0.4)',
          minHeight: '1.5em',
        }}
      >
        {typedText}
        <span
          className="inline-block w-[0.5em] ml-0.5 align-middle animate-pulse"
          style={{
            height: '1em',
            background: 'hsl(190 90% 60%)',
            boxShadow: '0 0 6px hsl(190 90% 60% / 0.6)',
          }}
        />
      </p>
    </div>
  );
}