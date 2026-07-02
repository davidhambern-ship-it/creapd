import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Music, Mic,
  List, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ListMusic: Music,
  Mic, ClipboardList: List, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Music
};

export default function MusicLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/music/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-foreground">Music Production</p>
              <p className="text-xs text-muted-foreground">Producer</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {MUSIC_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || Circle;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <AdminSidebarSection variant="music" onNavigate={() => {}} />
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

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <Link to="/music/dashboard" className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold text-sm">Music Production</span>
          </Link>
          <button onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <nav className="md:hidden p-3 space-y-1 border-b border-border bg-sidebar">
            {MUSIC_NAV_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon] || Circle;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-primary/15 text-primary font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            <AdminSidebarSection variant="music" onNavigate={() => setMobileNavOpen(false)} />
          </nav>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}