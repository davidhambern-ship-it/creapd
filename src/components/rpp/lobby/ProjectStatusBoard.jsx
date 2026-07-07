import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Loader2, AlertCircle, Ban } from 'lucide-react';

const STATUS_ICONS = {
  not_started: { icon: Circle, color: 'hsl(220 10% 35%)', label: 'Not Started' },
  in_progress: { icon: Loader2, color: 'hsl(35 90% 55%)', label: 'In Progress' },
  complete: { icon: CheckCircle2, color: 'hsl(152 60% 50%)', label: 'Complete' },
  needs_review: { icon: AlertCircle, color: 'hsl(270 70% 60%)', label: 'Needs Review' },
  blocked: { icon: Ban, color: 'hsl(0 72% 51%)', label: 'Blocked' },
};

export default function ProjectStatusBoard({ stages }) {
  const navigate = useNavigate();

  return (
    <div className="cc-glass-card p-4 md:p-5 cc-animate-fade-up cc-stagger-1">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 rounded-full" style={{ background: 'hsl(190 80% 55%)' }} />
        <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-muted-foreground">Production Pipeline</h2>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const cfg = STATUS_ICONS[stage.status] || STATUS_ICONS.not_started;
          const Icon = cfg.icon;
          return (
            <React.Fragment key={stage.id}>
              <button
                onClick={() => navigate(stage.path)}
                className="flex flex-col items-center gap-1.5 min-w-[80px] p-2 rounded-lg transition-colors hover:bg-white/5"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  background: `${cfg.color.replace(')', ' / 0.15)')}`,
                  border: `1px solid ${cfg.color.replace(')', ' / 0.4)')}`,
                }}>
                  <Icon className="w-4 h-4" style={{
                    color: cfg.color,
                    animation: stage.status === 'in_progress' ? 'spin 1.5s linear infinite' : 'none',
                  }} />
                </div>
                <span className="text-[11px] font-medium whitespace-nowrap">{stage.name}</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
              </button>
              {i < stages.length - 1 && (
                <div className="flex-1 h-px min-w-[12px]" style={{
                  background: stages[i + 1].status !== 'not_started'
                    ? `linear-gradient(90deg, ${cfg.color}, ${STATUS_ICONS[stages[i + 1].status].color})`
                    : 'hsl(220 10% 20%)',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}