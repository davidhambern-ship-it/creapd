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
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/spiritual/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Church className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-foreground">Spiritual Production</p>
              <p className="text-xs text-muted-foreground">Producer</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <SidebarNavSections items={SPIRITUAL_NAV_ITEMS} iconMap={ICON_MAP} />
          <AdminSidebarSection variant="spiritual" onNavigate={() => {}} />
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/production-types"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Switch Production Type
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <Link to="/spiritual/dashboard" className="flex items-center gap-2">
            <Church className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-sm">Spiritual Production</span>
          </Link>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileNavOpen && (
          <nav className="md:hidden p-3 space-y-0.5 border-b border-border bg-sidebar max-h-[70vh] overflow-y-auto">
            <SidebarNavSections items={SPIRITUAL_NAV_ITEMS} iconMap={ICON_MAP} onNavigate={() => setMobileNavOpen(false)} />
            <AdminSidebarSection variant="spiritual" onNavigate={() => setMobileNavOpen(false)} />
          </nav>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}