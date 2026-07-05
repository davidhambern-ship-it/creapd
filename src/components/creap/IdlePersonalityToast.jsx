import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES, generateDeadSpace, IDLE_THRESHOLDS } from '@/lib/creapdPersonality';

const ROUTE_NUDGES = {
  '/news/queue': "Fresh stories in the queue. Want me to sift them?",
  '/news/production': "Packages looking good. I can generate more if you want.",
  '/news/brief': "Today's brief is ready. Want me to walk you through it?",
  '/news/library': "Your story library is deep. Ask me to find something specific.",
  '/news/workspace': "Ready to build a rundown? I can arrange stories by priority.",
  '/news/export': "Time to export? I can package everything for the teleprompter.",
  '/news/review': "New stories to review. I can pre-filter them if you want.",
  '/spiritual/library': "The library is deep. Ask me to find something specific.",
  '/spiritual/study': "Starting a study session? I can pull related passages.",
  '/music/dashboard': "Let's build a show. I can research tracks and build a playlist.",
  '/talk/dashboard': "Talk show ready to roll? I can find topics and research guests.",
  '/cooking/dashboard': "Time to cook! I can find recipes and plan segments.",
  '/sports/dashboard': "Game day! I can research matchups and pull stats.",
  '/cosmo/dashboard': "Let's get trending. I can find hot topics and viral moments.",
};

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
  const location = useLocation();
  const [deadSpace, setDeadSpace] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isRouteNudge, setIsRouteNudge] = useState(false);
  const lastInteractionRef = useRef(Date.now());
  const lastDeadSpaceRef = useRef(null);
  const checkTimerRef = useRef(null);
  const dismissTimerRef = useRef(null);
  const routeNudgeTimerRef = useRef(null);

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

  // Route-aware nudge — fires 2.5s after navigating to a new page
  useEffect(() => {
    if (mode === CREAP_MODES.FREE) return;

    const nudge = ROUTE_NUDGES[location.pathname];
    if (!nudge) return;

    // Clear any existing state
    setVisible(false);
    setDeadSpace(null);
    if (routeNudgeTimerRef.current) clearTimeout(routeNudgeTimerRef.current);

    routeNudgeTimerRef.current = setTimeout(() => {
      setDeadSpace(nudge);
      setIsRouteNudge(true);
      setVisible(true);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setVisible(false), 8000);
    }, 2500);

    return () => {
      if (routeNudgeTimerRef.current) clearTimeout(routeNudgeTimerRef.current);
    };
  }, [location.pathname, mode]);

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
          setIsRouteNudge(false);
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
    <AnimatePresence>
      <motion.div
        key={deadSpace}
        initial={{ opacity: 0, x: -30, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed bottom-5 left-5 z-30 lg:bottom-6 lg:left-6"
      >
        <div className={`glass-panel-navy px-4 py-2.5 flex items-center gap-2 max-w-xs ${isRouteNudge ? 'border-primary/30' : ''}`}>
          <Sparkles className={`w-3.5 h-3.5 shrink-0 pulse-glow ${isRouteNudge ? 'text-berna-orange' : 'text-primary'}`} />
          <p className="text-xs text-foreground flex-1">{deadSpace}</p>
          {isRouteNudge && (
            <button
              onClick={() => setVisible(false)}
              className="ml-1 text-primary hover:text-primary-foreground shrink-0 transition-colors"
              title="Open CREAPD"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}