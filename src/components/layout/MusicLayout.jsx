import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Music, Mic,
  List, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ListMusic: Music,
  Mic, ClipboardList: List, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Music
};

export default function MusicLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ProductionFooter variant="music" />

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