import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { RESEARCH_STEPS, safeJsonParse } from '@/lib/studyConstants';

export default function ResearchProgress({ session }) {
  const plan = safeJsonParse(session.research_plan, []);
  const steps = plan.length > 0 ? plan : RESEARCH_STEPS.map(label => ({ label, status: 'pending' }));

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <h3 className="font-heading font-semibold">Research In Progress</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Producer is assembling a fully documented research project from approved sources. This takes about 30-60 seconds.
      </p>
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isDone = step.status === 'completed' || step.status === 'done';
          const isActive = step.status === 'active' || step.status === 'running';
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-berna-emerald shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={isDone ? 'text-foreground' : isActive ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}