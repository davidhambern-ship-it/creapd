import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export default function ProductionReadinessPanel({ readinessPercent, completedItems, missingItems, nextStep, onNextStep }) {
  const isReady = readinessPercent >= 100;

  return (
    <div className="cc-glass-card p-4 md:p-5 cc-animate-fade-up cc-stagger-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full" style={{ background: 'hsl(152 60% 50%)' }} />
        <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-muted-foreground">Production Readiness</h2>
      </div>

      {/* Big percentage */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(220 15% 18%)" strokeWidth="4" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={isReady ? 'hsl(152 60% 50%)' : 'hsl(35 90% 55%)'} strokeWidth="4"
              strokeDasharray={`${(readinessPercent / 100) * 176} 176`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          </svg>
          <span className="text-lg font-bold font-mono" style={{ color: isReady ? 'hsl(152 60% 50%)' : 'hsl(35 90% 60%)' }}>
            {readinessPercent}%
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{isReady ? 'Ready to produce.' : 'Not ready yet.'}</p>
          <p className="text-xs text-muted-foreground">
            {completedItems.length} of {completedItems.length + missingItems.length} items complete
          </p>
        </div>
      </div>

      {/* Completed items */}
      <div className="space-y-1 mb-3">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(152 50% 50%)' }}>Complete</p>
        {completedItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: 'hsl(152 60% 50%)' }} />
            <span className="text-foreground/80">{item}</span>
          </div>
        ))}
        {completedItems.length === 0 && <p className="text-xs text-muted-foreground/40 italic">Nothing completed yet.</p>}
      </div>

      {/* Missing items */}
      <div className="space-y-1 mb-4">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(35 70% 55%)' }}>Missing</p>
        {missingItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Circle className="w-3 h-3 shrink-0 text-muted-foreground/30" />
            <span className="text-muted-foreground/60">{item}</span>
          </div>
        ))}
        {missingItems.length === 0 && <p className="text-xs text-muted-foreground/40 italic">All requirements met.</p>}
      </div>

      {/* Next step */}
      {nextStep && (
        <button onClick={onNextStep} className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg transition-all hover:gap-3"
          style={{ background: 'hsl(35 50% 15% / 0.2)', border: '1px solid hsl(35 40% 25% / 0.3)' }}>
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Next Step</p>
            <p className="text-xs font-medium" style={{ color: 'hsl(35 80% 60%)' }}>{nextStep}</p>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'hsl(35 80% 60%)' }} />
        </button>
      )}
    </div>
  );
}