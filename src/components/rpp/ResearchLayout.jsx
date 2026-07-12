import React from 'react';
import { Outlet } from 'react-router-dom';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import RppRoomNavBar from '@/components/rpp/RppRoomNavBar';
import RppProfileNavBar from '@/components/rpp/RppProfileNavBar';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

export default function ResearchLayout() {
  const location = window.location.pathname;
  const activeTheme = getDepartmentThemeFromPath(location);

  return (
    <div
      className="rpp-shell"
      style={{
        ...PRODUCTION_PROFILE_THEMES.research.vars,
        '--dept-accent': activeTheme.accentHsl,
        '--dept-ambient': activeTheme.ambientHsl,
        '--dept-glow': activeTheme.glowHsl,
      }}
    >
      <EnvironmentLayer profileKey="research" />

      <main className="rpp-workspace flex flex-col min-w-0">
        <RppRoomNavBar />
        <div className="rpp-workspace-content flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </div>
        <RppProfileNavBar />
      </main>
    </div>
  );
}