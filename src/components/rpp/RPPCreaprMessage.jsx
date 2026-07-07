import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';

/**
 * CREAPr Message Area — text-only by default, voice opt-in.
 * Character-by-character typing with blinking cursor.
 * Messages persist until dismissed or replaced.
 */
export default function RPPCreaprMessage({ message, onSpeak, voiceEnabled, onToggleVoice }) {
  const [displayed, setDisplayed] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const idxRef = useRef(0);
  const intervalRef = useRef(null);

  // Reset when message changes
  useEffect(() => {
    setDismissed(false);
    setDisplayed('');
    idxRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!message) return;

    intervalRef.current = setInterval(() => {
      idxRef.current++;
      if (idxRef.current <= message.length) {
        setDisplayed(message.substring(0, idxRef.current));
      } else {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (voiceEnabled && onSpeak) onSpeak(message);
      }
    }, 25);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [message]);

  // Immediate interruption on dismiss
  const handleDismiss = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDismissed(true);
  }, []);

  if (!message || dismissed) return null;

  const typing = idxRef.current < message.length;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4" style={{ zIndex: 20 }}>
      <div className="rpp-message-panel">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mt-0.5">
            <span className="text-xs font-bold font-mono text-primary">Cr</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-primary">CREAPr</span>
              {typing && <span className="text-[10px] text-muted-foreground animate-pulse">typing...</span>}
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {displayed}
              {typing && <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleVoice}
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
              title={voiceEnabled ? 'Voice on' : 'Voice off'}
            >
              {voiceEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}