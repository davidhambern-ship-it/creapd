import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Music, Mic,
  List, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle,
  Compass, ListMusic, ClipboardList, Database, Package, Library
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
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
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ListMusic: Music,
  Mic, ClipboardList: List, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Music, Compass, Database, Package, Library
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
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col env-glass-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={MUSIC_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="music" onNavigate={() => {}} />
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <Link to="/production-types" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
              Switch Production Type
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </main>
      </div>

      <ProductionFooter variant="music" />
      </div>
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