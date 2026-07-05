import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';

/**
 * SceneTransition — Conversational Navigation
 *
 * In AUTOPILOT mode, when the producer navigates to a new page, this
 * component plays a brief scene transition: the screen dissolves, CREAP
 * says "Come on..." (or a brief contextual line), and the new page
 * slides into view. This replaces hard page cuts with directed transitions.
 *
 * This fires BEFORE the SystemNarrationOverlay's per-page narration,
 * creating a two-phase arrival: transition → narration.
 *
 * To avoid double-narration, if a page has a full narration script,
 * the transition is silent (just a visual dissolve + "Come on..." text).
 * If a page has NO narration script, CREAP speaks a brief line about
 * where you're going.
 */
const TRANSITION_DURATION = 1000; // ms — brief visual dissolve only

export default function SceneTransition() {
  const { mode, isLoadingPrefs } = useCREAPMode();
  const location = useLocation();
  const pathname = location.pathname;

  const [transitioning, setTransitioning] = useState(false);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (isLoadingPrefs || mode !== CREAP_MODES.AUTOPILOT) return;

    // Only transition on actual route changes (not initial load)
    if (prevPathRef.current === pathname) return;

    prevPathRef.current = pathname;

    // Skip transition for auth pages
    if (pathname.startsWith('/login') || pathname.startsWith('/register') ||
        pathname.startsWith('/forgot') || pathname.startsWith('/reset')) {
      return;
    }

    // Brief visual-only dissolve — CREAPr's tour overlay handles all audio
    setTransitioning(true);
    const timer = setTimeout(() => {
      setTransitioning(false);
    }, TRANSITION_DURATION);

    return () => { clearTimeout(timer); };
  }, [pathname, mode, isLoadingPrefs]);

  if (!transitioning) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[99] bg-background flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Ambient glow */}
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bg-berna-purple/8 blur-[120px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}