import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, Search, Sparkles, Compass, ListMusic
} from 'lucide-react';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/music/configure' },
  { icon: Search, label: 'Knowledge', path: '/music/research' },
  { icon: ListMusic, label: 'Blueprint', path: '/music/playlist' },
  { icon: Sparkles, label: 'Production', path: '/music/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Search, ListMusic, Compass, Sparkles
};

export default function MusicLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.music.vars}>
      <EnvironmentLayer profileKey="music" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </main>
      </div>

      <ProductionFooter variant="music" />
      </div>

      {/* Floating Playlist Room nav icon */}
      <Link
        to="/music/playlist"
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-12 h-12 rounded-xl items-center justify-center transition-all hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #8B00FF, #FF00FF)',
          boxShadow: '0 0 20px rgba(139,0,255,0.4), 0 4px 16px rgba(0,0,0,0.4)',
        }}
        title="Playlist Room"
      >
        <ListMusic className="w-5 h-5 text-white" />
      </Link>

      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={MUSIC_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="music"
      />
    </div>
  );
}