import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { getDepartmentThemeFromPath } from '@/lib/rppDepartmentThemes';
import { ChevronLeft } from 'lucide-react';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import PPNavBar from '@/components/layout/PPNavBar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { PP_NAV_ITEMS } from '@/lib/ppNavItems';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

const RESEARCH_ACCENT = '190 80% 55%';

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

      {/* Desktop top nav — themed to Research PP cyan */}
      <div className="hidden lg:flex absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <PPNavBar accentHsl={RESEARCH_ACCENT} />
      </div>

      <main className="rpp-workspace flex flex-col min-w-0">
        {/* Back-to-lobby link on non-lobby pages */}
        {!isLobby && (
          <div className="px-4 md:px-6 pt-3 pb-1 shrink-0 lg:pt-12">
            <Link
              to="/research"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Lobby
            </Link>
          </div>
        )}
        <div className="rpp-workspace-content flex-1 flex flex-col min-w-0 overflow-x-hidden pb-16 lg:pb-0">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </div>
      </main>

      {/* Mobile bottom nav — themed to Research PP cyan */}
      <MobileBottomNav items={PP_NAV_ITEMS} accentHsl={RESEARCH_ACCENT} />
    </div>
  );
}