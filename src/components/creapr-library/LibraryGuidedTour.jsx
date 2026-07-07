import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

export default function LibraryGuidedTour({ steps, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  // Track target element position
  useEffect(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }
    const findEl = () => document.querySelector(`[data-tour="${step.target}"]`);
    let el = findEl();
    if (!el) {
      setTargetRect(null);
      return;
    }
    const updateRect = () => {
      el = findEl();
      if (!el) { setTargetRect(null); return; }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) { setTargetRect(null); return; }
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    updateRect();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(updateRect, 500);

    const observer = new ResizeObserver(updateRect);
    if (el) observer.observe(el);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      clearTimeout(t);
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentStep, step]);

  // Typewriter for narration
  useEffect(() => {
    const fullText = step?.narration || '';
    setTypedText('');
    setTypingDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(fullText.substring(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTypingDone(true);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [currentStep, step]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLast, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  const showBelow = targetRect && targetRect.top + targetRect.height / 2 < window.innerHeight / 2;

  const cardStyle = targetRect
    ? {
        position: 'absolute',
        ...(showBelow
          ? { top: targetRect.top + targetRect.height + 20, left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 420)) }
          : { top: Math.max(16, targetRect.top - 220), left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 420)) }),
        width: 'min(400px, calc(100vw - 32px))',
      }
    : {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, 90vw)',
      };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 200 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Spotlight or dark overlay */}
        {targetRect ? (
          <div
            className="absolute pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: 14,
              boxShadow: '0 0 0 9999px hsl(220 20% 4% / 0.85)',
              border: '2px solid hsl(270 80% 60% / 0.5)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: 'hsl(220 20% 4% / 0.85)' }} />
        )}

        {/* Narration card */}
        <motion.div
          key={currentStep}
          style={cardStyle}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: 'hsl(220 20% 8% / 0.97)',
              border: '1px solid hsl(270 50% 35% / 0.4)',
              boxShadow: '0 12px 48px hsl(0 0% 0% / 0.5), 0 0 32px hsl(270 80% 60% / 0.1)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header bar */}
            <div
              className="flex items-center justify-between px-5 py-2.5"
              style={{ borderBottom: '1px solid hsl(270 30% 25% / 0.3)', background: 'hsl(270 40% 15% / 0.15)' }}
            >
              <span
                className="text-[10px] uppercase tracking-[0.2em] font-medium"
                style={{ color: 'hsl(270 60% 68%)', fontFamily: '"Oswald", sans-serif' }}
              >
                Library Tour · {currentStep + 1}/{steps.length}
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded transition-colors hover:bg-white/10"
                style={{ color: 'hsl(220 10% 50%)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <h3
                className="font-heading font-semibold text-base mb-2"
                style={{ color: 'hsl(0 0% 92%)' }}
              >
                {step?.title}
              </h3>
              <p
                className="text-sm leading-relaxed mb-4"
                style={{ color: 'hsl(35 15% 70%)', fontFamily: 'Georgia, serif', minHeight: '3em' }}
              >
                {typedText}
                {!typingDone && <span className="plib-cursor" />}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === currentStep ? '24px' : '6px',
                      background: i === currentStep
                        ? 'hsl(270 80% 60%)'
                        : i < currentStep
                          ? 'hsl(270 40% 35%)'
                          : 'hsl(220 10% 22%)',
                    }}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-25"
                  style={{ color: 'hsl(35 12% 60%)', border: '1px solid hsl(35 12% 25% / 0.3)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(270 60% 52%), hsl(270 50% 42%))',
                    color: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(270 60% 55% / 0.5)',
                    boxShadow: '0 4px 14px hsl(270 60% 40% / 0.25)',
                  }}
                >
                  {isLast ? 'Begin' : 'Next'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}