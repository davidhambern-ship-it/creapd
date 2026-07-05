import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { SPORTS_NAV_ITEMS } from '@/lib/sportsConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Trophy, Users,
  ClipboardList, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import ProfileIntroOverlay from '@/components/creap/cinematic/ProfileIntroOverlay';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/sports/dashboard' },
  { icon: Search, label: 'Research', path: '/sports/research' },
  { icon: Trophy, label: 'Games', path: '/sports/games' },
  { icon: Users, label: 'Athletes', path: '/sports/athletes' },
  { icon: ClipboardList, label: 'Rundown', path: '/sports/rundown' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, Trophy, Users,
  ClipboardList, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle
};

export default function SportsLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={SPORTS_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="sports" onNavigate={() => {}} />
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <Link to="/home" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
              CREAPD Home
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <ProductionFooter variant="sports" />
      <ProfileIntroOverlay profileKey="sports" />
      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={SPORTS_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="sports"
      />
    </div>
  );
}