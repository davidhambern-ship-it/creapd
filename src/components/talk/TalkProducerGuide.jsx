import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Circle, Compass } from 'lucide-react';

const STEPS = [
  { key: 'setup', label: 'Setup', path: '/talk/configure' },
  { key: 'research', label: 'Research', path: '/talk/research' },
  { key: 'topics', label: 'Topics', path: '/talk/topics' },
  { key: 'guests', label: 'Guests', path: '/talk/guests' },
  { key: 'rundown', label: 'Rundown', path: '/talk/rundown' },
  { key: 'assets', label: 'AI Assets', path: '/talk/assets' },
  { key: 'export', label: 'Export', path: '/talk/export' },
  { key: 'live', label: 'Live Studio', path: '/talk/live' },
];

export default function TalkProducerGuide({
  currentStep,
  title,
  instructions = [],
  readyText,
  nextPath,
  nextLabel,
  nextDescription,
  nextDisabled = false,
  note,
}) {
  const currentIndex = Math.max(0, STEPS.findIndex(step => step.key === currentStep));

  return (
    <div className="glass-panel p-5 border-primary/20 space-y-4">
      <div className="!flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="!flex items-center gap-2 text-primary mb-1">
            <Compass className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Producer Guide</span>
          </div>
          <h2 className="font-heading font-semibold text-lg">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">Step {currentIndex + 1} of {STEPS.length}</p>
        </div>

        <div className="!flex flex-wrap gap-1.5">
          {STEPS.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isPast = index < currentIndex;
            return (
              <Link
                key={step.key}
                to={step.path}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors !flex items-center gap-1 ${
                  isCurrent
                    ? 'border-primary bg-primary/15 text-primary'
                    : isPast
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                }`}
              >
                {isPast ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {step.label}
              </Link>
            );
          })}
        </div>
      </div>

      {instructions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {instructions.map((instruction, index) => (
            <div key={index} className="rounded-lg bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">{index + 1}</p>
              <p className="text-sm">{instruction}</p>
            </div>
          ))}
        </div>
      )}

      {note && (
        <p className="text-xs text-muted-foreground">{note}</p>
      )}

      <div className="!flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1 border-t border-white/[0.05]">
        <div>
          {readyText && <p className="text-sm font-medium">{readyText}</p>}
          {nextDescription && <p className="text-xs text-muted-foreground mt-0.5">{nextDescription}</p>}
        </div>
        {nextPath && nextLabel && (
          <Button asChild disabled={nextDisabled} className={nextDisabled ? 'pointer-events-none opacity-50' : ''}>
            <Link to={nextPath} aria-disabled={nextDisabled}>
              {nextLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
