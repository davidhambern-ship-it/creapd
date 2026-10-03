import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, Search, Sparkles, Compass, ListMusic, Menu, Radio
} from 'lucide-react';
import MobileNavDrawer from './MobileNavDrawer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';
import { ShowPlaybackProvider } from '@/components/music/ShowPlaybackContext';
import MiniShowBar from '@/components/music/MiniShowBar';
import FormatSwitcher from './FormatSwitcher';

const ICON_MAP = {
  LayoutDashboard, Search, ListMusic, Compass, Sparkles
};

export default function MusicLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ShowPlaybackProvider>
      <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.music.vars}>
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          <header className="h-12 shrink-0 border-b border-fuchsia-400/15 bg-[#080a10]/90 px-3 md:px-4 backdrop-blur-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 text-[11px] font-semibold text-cyan-100"
                title="Open Radio navigation"
              >
                <Menu className="w-3.5 h-3.5" />
                Menu
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10">
                  <Radio className="h-4 w-4 text-fuchsia-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">CREAPD Format</p>
                  <p className="truncate text-xs font-semibold text-white/85">Radio</p>
                </div>
              </div>
            </div>

            <FormatSwitcher format="radio" compact />
          </header>

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <MobilePageShell>
              <Outlet />
            </MobilePageShell>
          </main>
        </div>

        </div>
        <MiniShowBar />

        <MobileNavDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          navItems={MUSIC_NAV_ITEMS}
          iconMap={ICON_MAP}
          variant="music"
        />
      </div>
    </ShowPlaybackProvider>
  );
}