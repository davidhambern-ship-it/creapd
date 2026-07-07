import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useResearch } from '@/context/ResearchContext';
import { DEPARTMENTS } from '@/lib/researchConstants';
import { cn } from '@/lib/utils';

export default function DepartmentNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProject } = useResearch();

  const activeKey = DEPARTMENTS.find(d => location.pathname.startsWith(d.path))?.key || 'lobby';

  const getProgress = (key) => {
    if (!activeProject) return 0;
    const map = {
      topics: activeProject.research_question ? 100 : 0,
      research: activeProject.progress_research || 0,
      dossier: activeProject.progress_dossier || 0,
      develop: activeProject.progress_develop || 0,
      packet: activeProject.progress_packet || 0,
    };
    return map[key] || 0;
  };

  return (
    <nav className="w-14 lg:w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-3 lg:p-4 border-b border-sidebar-border">
        <p className="hidden lg:block text-[10px] uppercase tracking-wider text-muted-foreground font-heading">CREAPr Research</p>
        <p className="hidden lg:block text-xs font-heading font-bold text-white mt-0.5">Production Profile</p>
        <div className="lg:hidden flex items-center justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-bold text-xs">R</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {DEPARTMENTS.map((dept) => {
          const Icon = dept.icon;
          const isActive = activeKey === dept.key;
          const progress = getProgress(dept.key);

          return (
            <button
              key={dept.key}
              onClick={() => navigate(dept.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 text-left transition-all relative group',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              {isActive && (
                <span className={cn('absolute left-0 top-0 bottom-0 w-0.5', dept.color.replace('text-', 'bg-'))} />
              )}
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? dept.color : '')} />
              <div className="hidden lg:block flex-1 min-w-0">
                <p className={cn('text-xs font-medium truncate', isActive && 'text-white')}>{dept.shortLabel}</p>
                {progress > 0 && (
                  <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', dept.color.replace('text-', 'bg-'))} style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              {progress === 100 && (
                <span className="hidden lg:block w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-sidebar-border">
        <p className="hidden lg:block text-[10px] text-muted-foreground/50 text-center">
          CREAPD Research Institute
        </p>
      </div>
    </nav>
  );
}