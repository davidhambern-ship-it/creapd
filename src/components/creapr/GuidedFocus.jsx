import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Circle, ArrowRight, Search, Package,
  Mic, Presentation, Download, Settings2, Lightbulb, Loader2
} from 'lucide-react';
import { POC_STAGES } from '@/lib/pocStageTracker';

const STAGE_ICONS = {
  0: Settings2,
  1: Lightbulb,
  2: Search,
  3: Package,
  4: Package,
  5: Mic,
  6: Presentation,
  7: Presentation,
  8: Download,
};

const DEPT_COLORS = {
  sift: 'text-blue-400 bg-blue-500/10',
  research: 'text-purple-400 bg-purple-500/10',
  manager: 'text-emerald-400 bg-emerald-500/10',
  apd: 'text-orange-400 bg-orange-500/10',
};

export default function GuidedFocus({ pocState, guidedFocus, activeDepartment, mode }) {
  if (!pocState) {
    return (
      <div className="glass-panel p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { stage, stageInfo, pendingAction, nextRoute } = pocState;
  const currentDept = guidedFocus?.activeDepartment;

  return (
    <div className="space-y-4">
      {/* Current Focus — Where Am I */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Current Stage</span>
          {currentDept && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${DEPT_COLORS[currentDept.key] || 'bg-muted text-muted-foreground'}`}>
              {currentDept.name}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
            {mode} mode
          </span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {React.createElement(STAGE_ICONS[stage] || Circle, { className: 'w-6 h-6 text-primary shrink-0' })}
          <div className="min-w-0">
            <h2 className="text-xl font-heading font-bold leading-tight">{stageInfo.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{stageInfo.description}</p>
          </div>
        </div>
      </div>

      {/* What's Happening — What decision is needed */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">What's Happening</p>
            <p className="text-sm font-medium leading-snug">{pendingAction}</p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link to={nextRoute}>
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* POC Pipeline — Where am I in the journey */}
      <div className="glass-panel p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Process of Creation</p>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {POC_STAGES.map((s, i) => {
            const isCurrent = s.stage === stage;
            const isDone = s.stage < stage;
            const isPending = s.stage > stage;
            const Icon = STAGE_ICONS[s.stage] || Circle;
            return (
              <React.Fragment key={s.stage}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isCurrent ? 'bg-primary text-primary-foreground scale-110 glow-purple' :
                      isDone ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-muted/50 text-muted-foreground/50'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] text-center w-16 leading-tight ${
                    isCurrent ? 'text-primary font-medium' :
                    isDone ? 'text-emerald-400' :
                    'text-muted-foreground/50'
                  }`}>
                    {s.name}
                  </span>
                </div>
                {i < POC_STAGES.length - 1 && (
                  <div className={`h-px w-4 shrink-0 ${isDone ? 'bg-emerald-500/30' : 'bg-muted/30'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}