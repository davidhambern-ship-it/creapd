import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, Volume2 } from 'lucide-react';
import { useOrchestrator } from '@/context/OrchestratorProvider';

/**
 * AutopilotOverlay — the AUTOPILOT mode interface layer.
 *
 * Renders two types of prompts:
 *  1. Narration: CREAP speaks to the user (text + browser TTS).
 *     Auto-advances after duration, or shows a Continue button.
 *  2. Approval Gate: the engine pauses and asks the user to confirm
 *     before proceeding (e.g. "Ready to generate packages?").
 *
 * This overlay floats above all page content and persists across
 * route changes (rendered in CREAPModeLayout).
 */
export default function AutopilotOverlay() {
  const { state, approve, reject, dismissNarration } = useOrchestrator();
  const { narration, pendingApproval, status } = state;
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  const showNarration = narration && status !== 'awaiting_input';
  const showApproval = pendingApproval && status === 'awaiting_input';

  // Play TTS via browser SpeechSynthesis when narration appears
  useEffect(() => {
    if (!showNarration || !narration?.speech) return;

    const utterance = new SpeechSynthesisUtterance(narration.speech);
    utterance.rate = narration.speed || 0.95;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);

    return () => {
      speechSynthesis.cancel();
    };
  }, [narration, showNarration]);

  // Progress bar for auto-advance narration
  useEffect(() => {
    if (!showNarration || !narration?.auto_advance) {
      setProgress(0);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    const duration = narration.duration || 4000;
    const tickMs = 50;
    const increment = (tickMs / duration) * 100;
    setProgress(0);

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => Math.min(prev + increment, 100));
    }, tickMs);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [narration, showNarration]);

  const isActive = showNarration || showApproval;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] w-full max-w-xl px-4"
        >
          <div className="glass-panel-navy p-4 shadow-2xl border-berna-purple/20">
            {showApproval ? (
              <ApprovalCard
                approval={pendingApproval}
                onApprove={approve}
                onReject={reject}
              />
            ) : (
              <NarrationCard
                narration={narration}
                progress={progress}
                onDismiss={dismissNarration}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Narration Card ──────────────────────────────────────────────────
function NarrationCard({ narration, progress, onDismiss }) {
  return (
    <div className="flex items-start gap-3">
      {/* CREAP Orb */}
      <div className="relative shrink-0 mt-0.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple">
          <Volume2 className="w-4 h-4 text-white" />
        </div>
        <div className="absolute -inset-1 rounded-full border border-berna-purple/30 animate-pulse" />
      </div>

      {/* Text + Controls */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 leading-relaxed font-body">
          {narration.text}
        </p>

        {narration.auto_advance ? (
          <div className="mt-2.5 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-berna-purple to-berna-orange"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : (
          <button
            onClick={onDismiss}
            className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-berna-purple/15 text-berna-purple text-xs font-heading font-semibold hover:bg-berna-purple/25 transition-colors"
          >
            Continue
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Approval Card ───────────────────────────────────────────────────
function ApprovalCard({ approval, onApprove, onReject }) {
  return (
    <div className="flex items-start gap-3">
      {/* CREAP Orb */}
      <div className="shrink-0 mt-0.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-berna-orange to-amber-600 flex items-center justify-center glow-orange">
          <ChevronRight className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Prompt + Buttons */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 leading-relaxed font-body mb-3">
          {approval.prompt}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-berna-purple to-berna-orange text-white text-xs font-heading font-semibold hover:scale-[1.02] transition-transform"
          >
            <Check className="w-3.5 h-3.5" />
            {approval.approve_label || 'Approve'}
          </button>
          {approval.reject_label && (
            <button
              onClick={onReject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-muted-foreground text-xs font-medium hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <X className="w-3.5 h-3.5" />
              {approval.reject_label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}