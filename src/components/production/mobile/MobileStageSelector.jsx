import React from 'react';
import { STAGES, getStageStatus, STATUS_STYLES } from './stageConfig';

export default function MobileStageSelector({ activeStage, onSelect, pkg, edits }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Production stages">
      {STAGES.map((stage, idx) => {
        const status = getStageStatus(stage.key, pkg, edits);
        const st = STATUS_STYLES[status];
        const isActive = idx === activeStage;
        return (
          <button
            key={stage.key}
            onClick={() => onSelect(idx)}
            role="tab"
            aria-selected={isActive}
            aria-label={`${stage.label} — ${st.label}`}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-berna-purple ${
              isActive
                ? 'bg-berna-purple/20 text-white border border-berna-purple/40'
                : 'text-muted-foreground border border-transparent hover:bg-white/[0.04]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {stage.short}
          </button>
        );
      })}
    </div>
  );
}