import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'briefing_complete', label: 'Briefing Complete', auto: 'briefing' },
  { key: 'stories_selected', label: 'Stories Selected', auto: 'stories' },
  { key: 'story_order_finalized', label: 'Story Order Finalized' },
  { key: 'scripts_approved', label: 'Scripts Approved', auto: 'scripts' },
  { key: 'graphics_ready', label: 'Graphics Ready', auto: 'graphics' },
  { key: 'fact_check_complete', label: 'Fact Check Complete' },
  { key: 'producer_review_complete', label: 'Producer Review Complete' },
  { key: 'export_ready', label: 'Export Ready', auto: 'export' },
];

export default function WorkspaceChecklist({ checklist, onToggle, autoValues }) {
  return (
    <div className="glass-panel p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white neon-underline">Production Checklist</h3>
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map(item => {
          const isAuto = item.auto && autoValues && autoValues[item.auto];
          const isChecked = checklist[item.key] || isAuto;
          return (
            <button
              key={item.key}
              onClick={() => !isAuto && onToggle(item.key)}
              className={`flex items-center gap-2 w-full p-1.5 rounded-lg transition-colors text-left ${isAuto ? 'cursor-default' : 'hover:bg-white/[0.04] cursor-pointer'}`}
            >
              {isChecked ? (
                <CheckCircle className="w-4 h-4 text-berna-emerald flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
              )}
              <span className={`text-xs ${isChecked ? 'text-white' : 'text-muted-foreground'}`}>
                {item.label}
                {isAuto && <span className="text-[9px] text-muted-foreground/50 ml-1">(auto)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}