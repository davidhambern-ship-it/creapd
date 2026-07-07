import React from 'react';
import { Outlet } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import RPPDepartmentNav from './RPPDepartmentNav';

export default function ResearchLayout() {
  const { config, topics, points, packages, dossiers } = useResearchProduction();

  const location = window.location.pathname;
  const activeTheme = getDepartmentThemeFromPath(location);

  const progressStages = {
    assignment: topics.length > 0,
    research: points.length > 0 || (dossiers?.length > 0),
    dossier: dossiers?.some(d => d.status === 'ready') || false,
    assets: packages.length > 0,
    packet: packages.some(p => p.status === 'approved' || p.status === 'finalized'),
  };

  return (
    <div
      className="rpp-shell"
      style={{
        '--dept-accent': activeTheme.accentHsl,
        '--dept-ambient': activeTheme.ambientHsl,
        '--dept-glow': activeTheme.glowHsl,
      }}
    >
      <div className="rpp-ambient-bg" />

      <RPPDepartmentNav
        config={config}
        progressStages={progressStages}
        researchingCount={topics.filter(t => t.status === 'researching').length}
      />

      <main className="rpp-workspace flex flex-col">
        <div className="rpp-workspace-content flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}