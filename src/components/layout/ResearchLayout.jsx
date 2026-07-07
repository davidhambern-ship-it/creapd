import React from 'react';
import { Outlet } from 'react-router-dom';
import { ResearchProvider, useResearch } from '@/context/ResearchContext';
import DepartmentNavigator from '@/components/research/DepartmentNavigator';
import CreaprMessageArea from '@/components/research/CreaprMessageArea';
import ResearchProgressIndicator from '@/components/research/ResearchProgressIndicator';
import AmbientBackground from '@/components/research/AmbientBackground';
import { getProjectStatus } from '@/lib/researchConstants';

function ResearchShell() {
  const { activeProject, loadingProject } = useResearch();
  const status = activeProject ? getProjectStatus(activeProject.status) : null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <DepartmentNavigator />
      <div className="flex-1 flex flex-col relative">
        <AmbientBackground />
        <div className="relative z-10 flex flex-col h-full">
          <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-white/[0.06] glass-panel-navy rounded-none">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Project</p>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-heading font-bold text-white truncate">
                  {loadingProject ? 'Loading...' : activeProject?.production_name || 'No Project Selected'}
                </h1>
                {status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.bg} ${status.color} font-medium`}>
                    {status.label}
                  </span>
                )}
              </div>
            </div>
            <ResearchProgressIndicator />
          </header>

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>

          <CreaprMessageArea />
        </div>
      </div>
    </div>
  );
}

export default function ResearchLayout() {
  return (
    <ResearchProvider>
      <ResearchShell />
    </ResearchProvider>
  );
}