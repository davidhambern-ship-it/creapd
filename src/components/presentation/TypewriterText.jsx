import React, { useState, useEffect, useRef } from 'react';

export default function TypewriterText({ text, shouldStart, speedMs = 35, className, style }) {
  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!shouldStart || !text) {
      setCharCount(0);
      setDone(false);
      return;
    }

    setCharCount(0);
    setDone(false);

    let current = 0;
    intervalRef.current = setInterval(() => {
      current++;
      setCharCount(current);
      if (current >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
      }
    }, speedMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldStart, text, speedMs]);

  if (!text) return null;

  return (
    <span className={className} style={style}>
      {shouldStart ? text.substring(0, charCount) : ''}
      {!done && shouldStart && (
        <span className="inline-block w-[2px] h-[0.85em] bg-current ml-[2px] align-middle rounded-sm animate-typewriter-cursor" />
      )}
    </span>
  );
}