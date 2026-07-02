import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { SPIRITUAL_NAV_ITEMS } from '@/lib/spiritualConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, BookOpen, GraduationCap,
  PenTool, Sparkles, Package, Download, Settings, X, Menu, LayoutGrid, Circle, Church,
  Library, Languages, Columns2, Star, Clock3
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import MobileNavDrawer from './MobileNavDrawer';

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, BookOpen,
  GraduationCap, PenTool, Sparkles, Package, Download, Settings,
  X, Menu, LayoutGrid, Circle, Church, Library, Languages, Columns2,
  Star, Clock3
};

export default function SpiritualLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={SPIRITUAL_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="spiritual" onNavigate={() => {}} />
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

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={SPIRITUAL_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="spiritual"
      />
    </div>
  );
}