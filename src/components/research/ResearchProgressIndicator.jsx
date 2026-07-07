import React from 'react';
import { useResearch } from '@/context/ResearchContext';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'topics', label: 'Topic', field: 'research_question' },
  { key: 'research', label: 'Research', field: 'progress_research' },
  { key: 'dossier', label: 'Dossier', field: 'progress_dossier' },
  { key: 'develop', label: 'Develop', field: 'progress_develop' },
  { key: 'packet', label: 'Packet', field: 'progress_packet' },
];

export default function ResearchProgressIndicator() {
  const { activeProject } = useResearch();

  if (!activeProject) return null;

  const getProgress = (stage) => {
    if (stage.field === 'research_question') return activeProject.research_question ? 100 : 0;
    return activeProject[stage.field] || 0;
  };

  return (
    <div className="hidden md:flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const progress = getProgress(stage);
        const isComplete = progress >= 100;
        const isInProgress = progress > 0 && progress < 100;

        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  isComplete
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                    : isInProgress
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-white/10'
                )}
              />
              <span className={cn('text-[8px] mt-0.5 font-medium', isComplete || isInProgress ? 'text-foreground/70' : 'text-muted-foreground/40')}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={cn('w-4 h-px', isComplete ? 'bg-emerald-400/30' : 'bg-white/5')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}