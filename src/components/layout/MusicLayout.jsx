import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, Search, Sparkles, Compass, ListMusic
} from 'lucide-react';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';
import { ShowPlaybackProvider } from '@/components/music/ShowPlaybackContext';
import MiniShowBar from '@/components/music/MiniShowBar';
import { PP_NAV_ITEMS } from '@/lib/ppNavItems';

const ICON_MAP = {
  LayoutDashboard, Search, ListMusic, Compass, Sparkles
};

export default function MusicLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ShowPlaybackProvider>
      <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.music.vars}>
        <EnvironmentLayer profileKey="music" />
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">

        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            <MobilePageShell>
              <Outlet />
            </MobilePageShell>
          </main>
        </div>

        <ProductionFooter variant="music" />
        </div>
        <MiniShowBar />
        <MobileBottomNav items={PP_NAV_ITEMS} />

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