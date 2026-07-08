import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { SPORTS_NAV_ITEMS } from '@/lib/sportsConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Trophy, Users,
  ClipboardList, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle,
  Compass
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/sports/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/sports/configure' },
  { icon: Search, label: 'Knowledge', path: '/sports/research' },
  { icon: Trophy, label: 'Blueprint', path: '/sports/games' },
  { icon: Sparkles, label: 'Production', path: '/sports/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, Trophy, Users,
  ClipboardList, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Compass
};

export default function SportsLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.sports.vars}>
      <EnvironmentLayer profileKey="sports" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col env-glass-sidebar">
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
      </div>
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