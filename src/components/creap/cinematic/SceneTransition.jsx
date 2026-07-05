import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import { generateNarrationSpeech } from '@/lib/clonedVoice';
import { getNarration } from '@/lib/systemNarration';

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
const TRANSITION_DURATION = 1800; // ms — brief, not lingering

// Brief spoken lines for pages without their own narration
const GENERIC_LINES = [
  'Come on...',
  'Right this way...',
  'Let me take you there...',
  'Follow me...',
];

export default function SceneTransition() {
  const { mode, isLoadingPrefs } = useCREAPMode();
  const location = useLocation();
  const pathname = location.pathname;

  const [transitioning, setTransitioning] = useState(false);
  const [transitionText, setTransitionText] = useState('Come on...');
  const [audioUrl, setAudioUrl] = useState(null);
  const prevPathRef = useRef(pathname);

  // Check if this page has a full narration
  const hasFullNarration = !!getNarration(pathname);

  useEffect(() => {
    if (isLoadingPrefs || mode !== CREAP_MODES.AUTOPILOT) return;

    // Only transition on actual route changes (not initial load)
    if (prevPathRef.current === pathname) return;

    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;

    // Skip transition for auth pages
    if (pathname.startsWith('/login') || pathname.startsWith('/register') ||
        pathname.startsWith('/forgot') || pathname.startsWith('/reset')) {
      return;
    }

    // If the destination page has a full narration, the narration IS the
    // transition — don't show a separate transition overlay that would
    // compete with it.
    if (hasFullNarration) return;

    // Pick transition text
    const text = GENERIC_LINES[Math.floor(Math.random() * GENERIC_LINES.length)];
    setTransitionText(text);

    // Start transition
    setTransitioning(true);
    setAudioUrl(null);

    // Generate brief TTS
    let cancelled = false;
    (async () => {
      try {
        const result = await generateNarrationSpeech(text);
        if (!cancelled) {
          setAudioUrl(result.url);
        }
      } catch {
        // silent fallback
      }
    })();

    // Auto-end transition after duration (fallback in case TTS is slow)
    const timer = setTimeout(() => {
      setTransitioning(false);
    }, TRANSITION_DURATION);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [pathname, mode, isLoadingPrefs, hasFullNarration]);

  // Play audio when available
  useEffect(() => {
    if (!audioUrl || !transitioning) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
    const timer = setTimeout(() => {
      setTransitioning(false);
    }, TRANSITION_DURATION);
    return () => {
      audio.pause();
      clearTimeout(timer);
    };
  }, [audioUrl, transitioning]);

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
          <p className="text-base font-heading font-medium text-white/80">
            {transitionText}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}