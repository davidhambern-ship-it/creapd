import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  Archive, Settings, Activity, ChevronLeft, ChevronRight, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark, ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, LayoutGrid, Database, Globe, Cpu, BookOpen
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarDays, label: 'Weekly Planner', path: '/planner' },
  { icon: FileText, label: "Today's Brief", path: '/brief' },
  { icon: Layers, label: 'Story Queue', path: '/queue' },
  { icon: Bookmark, label: 'Story Library', path: '/library' },
  { icon: ClipboardList, label: 'Story Manager', path: '/workspace' },
  { icon: Package, label: 'Production', path: '/production' },
  { icon: Palette, label: 'Brand Profiles', path: '/brands' },
  { icon: Tv, label: 'Show Profiles', path: '/shows' },
  { icon: ImageIcon, label: 'Image/Video Library', path: '/images' },
  { icon: Download, label: 'Export Center', path: '/export' },
  { icon: Search, label: 'Research Desk', path: '/research' },
  { icon: Radio, label: 'Sources', path: '/sources' },
  { icon: FileInput, label: 'Import URL', path: '/import' },
  { icon: Archive, label: 'Archive', path: '/archive' },
  { icon: LayoutTemplate, label: 'Templates', path: '/templates' },
  { icon: ImageIcon, label: 'Graphics Templates', path: '/graphics-templates' },
  { icon: MessageSquareCode, label: 'Prompt Templates', path: '/prompt-templates' },
  { icon: ShieldCheck, label: 'Security & Privacy', path: '/security' },
  { icon: Activity, label: 'Automation', path: '/automation' },
  { icon: Building2, label: 'Organizations', path: '/organizations' },
  { icon: Bell, label: 'Activity Center', path: '/activity' },
  { icon: UserCircle, label: 'My Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const adminItems = [
  { icon: Globe, label: 'Scripture Registry', path: '/admin/world-scripture-registry' },
  { icon: Cpu, label: 'Content Acquisition', path: '/admin/content-acquisition-engine' },
  { icon: Database, label: 'Source Management', path: '/admin/source-management-center' },
  { icon: BookOpen, label: 'Foundation Seeder', path: '/admin/foundation-seeder' },
];

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const renderNavLink = (item) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
          isActive
            ? 'bg-white/[0.06] text-white'
            : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />
        )}
        <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-berna-purple' : 'group-hover:text-berna-purple/70'}`} />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-r border-white/[0.06] relative z-40`}>
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(renderNavLink)}
          {isAdmin && (
            <>
              {!collapsed && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Administration
                </p>
              )}
              {adminItems.map(renderNavLink)}
            </>
          )}
        </nav>
        <div className="p-2 border-t border-white/[0.06]">
          <Link
            to="/production-types"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Switch Production Type</span>}
          </Link>
        </div>
        <button
          onClick={onToggle}
          className="p-3 text-muted-foreground hover:text-white border-t border-white/[0.06] flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.06] flex items-center justify-around px-1 py-1 safe-area-bottom">
        {navItems.slice(0, 5).map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 ${
                isActive ? 'text-berna-purple' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <Link to="/production-types" className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${location.pathname === '/production-types' ? 'text-berna-purple' : 'text-muted-foreground'}`}>
          <LayoutGrid className="w-4 h-4" />
          <span className="text-[9px]">Switch</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${location.pathname === '/settings' ? 'text-berna-purple' : 'text-muted-foreground'}`}>
          <Settings className="w-4 h-4" />
          <span className="text-[9px]">More</span>
        </Link>
      </nav>
    </>
  );
}