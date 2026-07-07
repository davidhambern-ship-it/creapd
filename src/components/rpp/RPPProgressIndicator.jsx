import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RPP_PROGRESS_STAGES, RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { CheckCircle2, Circle } from 'lucide-react';

export default function RPPProgressIndicator({ stages = {} }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1.5">
      {RPP_PROGRESS_STAGES.map((stage, idx) => {
        const done = stages[stage.id];
        const dept = RPP_DEPARTMENTS.find(d => d.id === stage.department);
        return (
          <React.Fragment key={stage.id}>
            <button
              onClick={() => dept && navigate(dept.path)}
              className="flex items-center gap-1.5 group"
              title={stage.label}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              )}
              <span className={`hidden xl:inline text-xs font-medium transition-colors ${
                done ? 'text-amber-400' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
              }`}>
                {stage.label}
              </span>
            </button>
            {idx < RPP_PROGRESS_STAGES.length - 1 && (
              <div className={`hidden xl:block w-6 h-px ${done ? 'bg-amber-400/40' : 'bg-border/50'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}