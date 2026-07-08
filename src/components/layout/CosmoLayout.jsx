import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { COSMO_NAV_ITEMS } from '@/lib/cosmoConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Sparkles, Users,
  ClipboardList, Wand2, Download, Settings, X, Menu, LayoutGrid, Circle,
  Compass
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/cosmo/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/cosmo/configure' },
  { icon: Search, label: 'Knowledge', path: '/cosmo/research' },
  { icon: Sparkles, label: 'Blueprint', path: '/cosmo/topics' },
  { icon: Wand2, label: 'Production', path: '/cosmo/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, Sparkles, Users,
  ClipboardList, Wand2, Download, Settings,
  X, Menu, LayoutGrid, Circle, Compass
};

export default function CosmoLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={COSMO_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="cosmo" onNavigate={() => {}} />
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

      <ProductionFooter variant="cosmo" />
      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={COSMO_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="cosmo"
      />
    </div>
  );
}