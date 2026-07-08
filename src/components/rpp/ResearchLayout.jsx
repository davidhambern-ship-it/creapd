import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import { ChevronLeft } from 'lucide-react';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

export default function ResearchLayout() {
  const location = window.location.pathname;
  const activeTheme = getDepartmentThemeFromPath(location);
  const isLobby = location === '/research';

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
        {/* Back-to-lobby link on non-lobby pages */}
        {!isLobby && (
          <div className="px-4 md:px-6 pt-3 pb-1 shrink-0">
            <Link
              to="/research"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Lobby
            </Link>
          </div>
        )}
        <div className="rpp-workspace-content flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}