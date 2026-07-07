import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import { ChevronLeft, BookOpen } from 'lucide-react';

export default function RPPDepartmentNav({ config, progressStages = {}, researchingCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeDept = RPP_DEPARTMENTS.find(d =>
    d.path === '/research' ? location.pathname === '/research' : location.pathname.startsWith(d.path)
  ) || RPP_DEPARTMENTS[0];

  const completedCount = Object.values(progressStages).filter(Boolean).length;
  const totalCount = Object.keys(progressStages).length;
  const readinessPercent = Math.round((completedCount / Math.max(totalCount, 1)) * 100);

  return (
    <aside className="rpp-sidebar">
      {/* Header */}
      <div className="rpp-sidebar-header">
        <Link to="/home" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-medium">CREAPD</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-500/80" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-heading font-semibold tracking-wide">Research Library</h1>
            {config ? (
              <p className="text-[11px] text-muted-foreground truncate">{config.production_name}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No production set</p>
            )}
          </div>
        </div>
      </div>

      {/* Book-spine navigation */}
      <nav className="rpp-sidebar-nav">
        <div className="shelf-label">Departments</div>
        {RPP_DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeDept.id === dept.id;
          const isResearching = dept.id === 'research' && researchingCount > 0;
          return (
            <button
              key={dept.id}
              onClick={() => navigate(dept.path)}
              className={`book-spine-item ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0 text-left">
                <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {dept.name}
                </p>
              </div>
              {isResearching && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer — Progress */}
      <div className="rpp-sidebar-footer">
        <div className="shelf-label" style={{ padding: '0 0 0.375rem' }}>Progress</div>
        <div className="space-y-1.5">
          {[
            { label: 'Assignment', done: progressStages.assignment },
            { label: 'Research', done: progressStages.research },
            { label: 'Dossier', done: progressStages.dossier },
            { label: 'Assets', done: progressStages.assets },
            { label: 'Packet', done: progressStages.packet },
          ].map((stage) => (
            <div key={stage.label} className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${stage.done ? 'bg-amber-400' : 'bg-muted-foreground/20'}`} />
              <span className={`text-xs ${stage.done ? 'text-amber-400/80' : 'text-muted-foreground/50'}`}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Readiness</span>
            <span className="text-xs font-bold text-amber-400">{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${readinessPercent}%`,
                background: 'linear-gradient(90deg, hsl(35 70% 50%), hsl(25 80% 55%))',
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}