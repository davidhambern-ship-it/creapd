import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { ChevronRight, CheckCircle2, Circle, ArrowRight, Sparkles } from 'lucide-react';

const STATUS_CONFIG = {
  not_started: { color: 'hsl(220 10% 35%)', label: 'Not Started' },
  in_progress: { color: 'hsl(35 90% 55%)', label: 'In Progress' },
  complete: { color: 'hsl(152 60% 50%)', label: 'Complete' },
  needs_review: { color: 'hsl(270 70% 60%)', label: 'Needs Review' },
  blocked: { color: 'hsl(0 72% 51%)', label: 'Blocked' },
};

function DeptCard({ dept, status, count, recommended, index }) {
  const navigate = useNavigate();
  const Icon = dept.icon;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;

  return (
    <button
      onClick={() => navigate(dept.path)}
      className={`cc-dept-tile group text-left cc-animate-fade-up cc-stagger-${Math.min(index + 1, 5)}`}
    >
      {recommended && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium z-10"
          style={{ background: 'hsl(35 80% 20% / 0.4)', color: 'hsl(35 90% 60%)', border: '1px solid hsl(35 50% 30% / 0.4)' }}>
          <Sparkles className="w-2.5 h-2.5" /> Next
        </div>
      )}
      <div className="flex items-start gap-2 mb-3">
        <div className="cc-dept-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'hsl(35 25% 12% / 0.3)' }}>
          <Icon className="w-4 h-4" style={{ color: 'hsl(35 60% 55% / 0.7)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm">{dept.name}</h3>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{dept.subtitle}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 leading-relaxed mb-3 line-clamp-2">{dept.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-border/20">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{
            background: statusCfg.color,
            boxShadow: status === 'in_progress' ? `0 0 8px ${statusCfg.color}` : 'none',
            animation: status === 'in_progress' ? 'pulse-glow 2s ease-in-out infinite' : 'none',
          }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
        </div>
        {count > 0 && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'hsl(35 25% 12% / 0.3)', color: 'hsl(35 60% 55%)' }}>{count}</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wider transition-all group-hover:gap-2" style={{ color: 'hsl(190 70% 55%)' }}>
        Enter <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  );
}

export default function DepartmentDirectory({ departments }) {
  return (
    <div className="cc-animate-fade-up cc-stagger-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full" style={{ background: 'hsl(35 80% 55%)' }} />
        <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-muted-foreground">Department Directory</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {departments.map((d, i) => (
          <DeptCard key={d.id} dept={d.dept} status={d.status} count={d.count} recommended={d.recommended} index={i} />
        ))}
      </div>
    </div>
  );
}