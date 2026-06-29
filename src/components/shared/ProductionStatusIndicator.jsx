import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'stories_reviewed', label: 'Stories Reviewed' },
  { key: 'stories_selected', label: 'Stories Selected' },
  { key: 'package_generated', label: 'Package Generated' },
  { key: 'editing_complete', label: 'Editing Complete' },
  { key: 'ready_for_export', label: 'Ready for Export' },
  { key: 'exported', label: 'Exported' },
];

/**
 * Production Status Indicator — shows progress through production stages.
 * @param {string} currentStage - One of: briefing, stories_reviewed, stories_selected,
 *   package_generated, editing_complete, ready_for_export, exported
 * @param {string} size - 'sm' (default) or 'md'
 */
export default function ProductionStatusIndicator({ currentStage, size = 'sm' }) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  const completed = currentIndex >= 0 ? currentIndex : -1;

  const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'md' ? 'text-[10px]' : 'text-[9px]';
  const gap = size === 'md' ? 'gap-1' : 'gap-0.5';

  return (
    <div className="flex items-center w-full">
      {STAGES.map((stage, i) => {
        const isComplete = i < completed || i === completed;
        const isCurrent = i === completed;
        const isFuture = i > completed;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center flex-shrink-0">
              {isComplete && !isCurrent && (
                <CheckCircle className={`${iconSize} text-berna-emerald`} />
              )}
              {isCurrent && (
                <div className={`${iconSize} relative`}>
                  <Clock className={`${iconSize} text-berna-orange animate-pulse`} />
                </div>
              )}
              {isFuture && (
                <Circle className={`${iconSize} text-muted-foreground/30`} />
              )}
              <span className={`${textSize} mt-0.5 ${isComplete ? 'text-berna-emerald' : isCurrent ? 'text-berna-orange font-medium' : 'text-muted-foreground/40'} hidden sm:block`}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${i < completed ? 'bg-berna-emerald/40' : 'bg-white/[0.06]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}