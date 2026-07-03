import React from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Volume2, Image, CheckSquare, Copy, CheckCircle, Clapperboard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STAGES, getStageAction } from './stageConfig';

const ACTION_ICONS = {
  generate_all: Sparkles,
  regenerate_script: FileText,
  generate_voice: Volume2,
  generate_media: Image,
  generate_presentation: Clapperboard,
  mark_factcheck: CheckSquare,
  copy_caption: Copy,
  approve: CheckCircle,
};

export default function MobileProductionActionBar({ activeStage, total, onPrev, onNext, onAction, actionLabel, actionDisabled, actionLoading, hasEdits }) {
  const canPrev = activeStage > 0;
  const canNext = activeStage < total - 1;
  const action = getStageAction(STAGES[activeStage]?.key);
  const ActionIcon = (action && ACTION_ICONS[action.key]) || Sparkles;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.08] px-3 py-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {hasEdits && <div className="text-[9px] text-berna-orange text-center mb-1">● Unsaved edits</div>}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onPrev} disabled={!canPrev} aria-label="Previous stage">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{STAGES[activeStage]?.label}</p>
          <p className="text-[9px] text-muted-foreground/60">{activeStage + 1} / {total}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onNext} disabled={!canNext} aria-label="Next stage">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          className="h-8 flex-shrink-0 bg-berna-purple hover:bg-berna-purple/90 text-white text-[10px] px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-berna-purple/50"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ActionIcon className="w-3.5 h-3.5 mr-1" />}
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}