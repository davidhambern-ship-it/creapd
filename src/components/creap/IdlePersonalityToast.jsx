import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES, generateDeadSpace, IDLE_THRESHOLDS } from '@/lib/creapdPersonality';

/**
 * IdlePersonalityToast — floating dead-space commentary.
 *
 * Shows CREAPD personality messages when the producer has been idle.
 * Tracks global user activity (mouse, keyboard, scroll) and surfaces
 * dead-space messages from the personality engine.
 *
 * Behavior by mode:
 *   HYBRID    → idle nudges after 15s of inactivity
 *   AUTOPILOT → suppressed (CREAPD is actively driving, not waiting)
 *   FREE      → suppressed (only speaks when called)
 */
export default function IdlePersonalityToast() {
  const { mode } = useCREAPMode();
  const [deadSpace, setDeadSpace] = useState(null);
  const [visible, setVisible] = useState(false);
  const lastInteractionRef = useRef(Date.now());
  const lastDeadSpaceRef = useRef(null);
  const checkTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);

  // Track user activity across the whole app
  useEffect(() => {
    const resetIdle = () => {
      lastInteractionRef.current = Date.now();
      if (visible) {
        setVisible(false);
      }
    };
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('scroll', resetIdle, { passive: true });
    window.addEventListener('touchstart', resetIdle, { passive: true });
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
    };
  }, [visible]);

  // Idle check loop — only runs in HYBRID mode
  useEffect(() => {
    if (mode === CREAP_MODES.FREE || mode === CREAP_MODES.AUTOPILOT) {
      setDeadSpace(null);
      setVisible(false);
      return undefined;
    }

    const checkIdle = () => {
      const idleMs = Date.now() - lastInteractionRef.current;
      if (idleMs >= IDLE_THRESHOLDS.MEDIUM) {
        const msg = generateDeadSpace({
          idleMs,
          mode,
          isProcessing: false,
          lastResponse: lastDeadSpaceRef.current,
        });
        if (msg && msg !== lastDeadSpaceRef.current) {
          lastDeadSpaceRef.current = msg;
          setDeadSpace(msg);
          setVisible(true);
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => setVisible(false), 7000);
        }
      }
      checkTimerRef.current = setTimeout(checkIdle, 8000);
    };

    checkTimerRef.current = setTimeout(checkIdle, IDLE_THRESHOLDS.MEDIUM);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [mode]);

  if (!deadSpace || !visible) return null;

  return (
    <div className="fixed bottom-5 left-5 z-30 animate-fade-in lg:bottom-6 lg:left-6">
      <div className="glass-panel-navy px-4 py-2.5 flex items-center gap-2 max-w-xs">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 pulse-glow" />
        <p className="text-xs text-foreground">{deadSpace}</p>
        <button
          onClick={() => setVisible(false)}
          className="ml-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}