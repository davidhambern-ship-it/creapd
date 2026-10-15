import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import RppRoomNavBar from '@/components/rpp/RppRoomNavBar';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';
import FormatSwitcher from '@/components/layout/FormatSwitcher';
import { FlaskConical } from 'lucide-react';

export default function ResearchLayout() {
  const location = useLocation();
  const activeTheme = getDepartmentThemeFromPath(location.pathname);

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
        <header
          className="h-12 shrink-0 border-b px-3 md:px-4 backdrop-blur-xl flex items-center justify-between gap-3"
          style={{
            background: 'hsl(210 40% 5% / 0.90)',
            borderColor: 'hsl(190 50% 28% / 0.28)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg border"
              style={{
                color: 'hsl(190 80% 60%)',
                background: 'hsl(190 65% 18% / 0.20)',
                borderColor: 'hsl(190 60% 35% / 0.32)',
              }}
            >
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">CREAPD Format</p>
              <p className="truncate text-xs font-semibold text-white/85">Research</p>
            </div>
          </div>

          <FormatSwitcher format="research" compact />
        </header>

        <RppRoomNavBar />
        <div className="rpp-workspace-content flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </div>
      </main>
    </div>
  );
}