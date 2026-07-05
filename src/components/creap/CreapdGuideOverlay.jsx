import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronLeft, ChevronRight, Check, Compass, Layers, Rocket, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GUIDE_STEPS = [
  {
    targetId: null,
    icon: Sparkles,
    title: 'Welcome to CREAPD',
    body: "I'm your AI production partner. I can sift stories, build packages, and generate presentations across seven production verticals. Let me show you around.",
    accent: 'purple',
  },
  {
    targetId: 'profiles',
    icon: Compass,
    title: 'Production Profiles',
    body: 'Pick a vertical — News, Talk, Cooking, Sports, Music, Cosmo, or Spiritual. Each one has its own workflow, research engine, and asset pipeline.',
    accent: 'orange',
  },
  {
    targetId: 'pipeline',
    icon: Layers,
    title: 'The Pipeline',
    body: 'Stories flow through five stages: Intelligence, Selection, Packaging, Presentation, and Export. I can drive any or all of these stages.',
    accent: 'emerald',
  },
  {
    targetId: 'quicklaunch',
    icon: Rocket,
    title: 'Quick Launch',
    body: 'Jump straight into active productions, recent work, or start something new from here.',
    accent: 'purple',
  },
  {
    targetId: 'showcase',
    icon: Trophy,
    title: 'Showcase',
    body: "See what's been produced. Get inspired, or borrow a format for your next show.",
    accent: 'orange',
  },
  {
    targetId: null,
    icon: Sparkles,
    title: "I'm Always Here",
    body: "Tap the CREAPD button anytime — in the sidebar or the floating launcher. I'll adapt to whatever page you're on, suggesting next steps and running automations.",
    accent: 'emerald',
  },
];

const ACCENT_COLORS = {
  purple: { text: 'text-berna-purple', bg: 'bg-berna-purple/10', border: 'border-berna-purple/20' },
  orange: { text: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/20' },
  emerald: { text: 'text-berna-emerald', bg: 'bg-berna-emerald/10', border: 'border-berna-emerald/20' },
};

export default function CreapdGuideOverlay({ open, onClose }) {
  const [step, setStep] = useState(0);

  const currentStep = GUIDE_STEPS[step];
  const isLast = step === GUIDE_STEPS.length - 1;
  const Icon = currentStep.icon;
  const accent = ACCENT_COLORS[currentStep.accent];

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Clear all previous highlights
    document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));

    if (!currentStep.targetId) return;

    const el = document.getElementById(currentStep.targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => el.classList.add('guide-highlight'), 400);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('.guide-highlight').forEach((e) => e.classList.remove('guide-highlight'));
    };
  }, [step, open, currentStep.targetId]);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!open) {
      document.querySelectorAll('.guide-highlight').forEach((el) => el.classList.remove('guide-highlight'));
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Guide card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[61] w-[90vw] max-w-md"
          >
            <div className="glass-panel-navy p-5 border-2 border-white/10 shadow-2xl">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${accent.bg} border ${accent.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${accent.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-heading font-bold text-white">{currentStep.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    Step {step + 1} of {GUIDE_STEPS.length}
                  </p>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-white shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <p className="text-xs text-white/70 leading-relaxed mb-4">{currentStep.body}</p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {GUIDE_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground" onClick={onClose}>
                  Skip tour
                </Button>
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setStep(step - 1)}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </Button>
                  )}
                  {isLast ? (
                    <Button size="sm" className="text-xs h-8 bg-gradient-to-r from-berna-purple to-berna-emerald hover:opacity-90" onClick={onClose}>
                      <Check className="w-3.5 h-3.5" /> Got it
                    </Button>
                  ) : (
                    <Button size="sm" className="text-xs h-8 bg-primary" onClick={() => setStep(step + 1)}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}