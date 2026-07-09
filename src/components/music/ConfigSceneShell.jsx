import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function ConfigSceneShell({
  step, totalSteps, title, narration, accentColor,
  canProceed, onBack, onNext, isLast, children,
}) {
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8"
    >
      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-white/40 tracking-widest">STEP {step + 1} / {totalSteps}</span>
          <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>{title}</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}80` }}
          />
        </div>
      </motion.div>

      {/* CREAPr narration */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="max-w-lg text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">CREAPr</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{narration}</p>
      </motion.div>

      {/* Scene content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {children}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 mt-8"
      >
        {step > 0 && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: `${accentColor}20`,
            border: `1px solid ${accentColor}60`,
            color: accentColor,
            boxShadow: canProceed ? `0 0 16px ${accentColor}30` : 'none',
          }}
        >
          {isLast ? (
            <>Build Production <Check className="w-4 h-4" /></>
          ) : (
            <>Next <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}