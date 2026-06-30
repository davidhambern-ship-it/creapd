import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, FileText, Layers, Search, Radio,
  Archive, Settings, Activity, ChevronLeft, ChevronRight, CalendarDays, Package, Palette, Tv, Download,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark, ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, Sparkles, Mic, ChefHat, Trophy, MessageCircle, Video, Church, GraduationCap, Briefcase, Gamepad2
} from 'lucide-react';

const navItems = [
  { icon: Sparkles, label: 'Select Production Type', path: '/select-production-type', highlight: true },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: CalendarDays, label: 'Weekly Planner', path: '/planner' },
  { icon: FileText, label: "Today's Brief", path: '/brief' },
  { icon: Layers, label: 'Item Queue', path: '/queue' },
  { icon: Bookmark, label: 'Item Library', path: '/library' },
  { icon: ClipboardList, label: 'Production Manager', path: '/workspace' },
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

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('activeProductionProfile');
    if (stored) {
      setActiveProfile(JSON.parse(stored));
    }
  }, []);

  // Update nav items based on profile type
  const currentNavItems = useMemo(() => {
    const profileType = activeProfile?.type;
    
    if (profileType === 'music_show') {
      return navItems.map(item => {
        if (item.path === '/queue') return { ...item, label: 'Songs Queue' };
        if (item.path === '/library') return { ...item, label: 'Songs Library' };
        if (item.path === '/workspace') return { ...item, label: 'Playlist Builder' };
        return item;
      });
    }
    
    return navItems;
  }, [activeProfile]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-r border-white/[0.06] relative z-40`}>
        {/* Active Profile Badge */}
        {!collapsed && activeProfile && (
          <div className="px-3 py-2 mb-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Production Type</div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-berna-purple/10 border border-berna-purple/20">
              <Sparkles className="w-3 h-3 text-berna-purple" />
              <span className="text-xs font-medium text-white truncate">{activeProfile.name}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto overflow-x-hidden">
          {currentNavItems.map(item => {
            const isActive = location.pathname === item.path;
            const isHighlight = item.highlight;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                  isActive
                    ? 'bg-white/[0.06] text-white'
                    : isHighlight 
                      ? 'bg-gradient-to-r from-berna-purple/10 to-berna-orange/10 border border-berna-purple/20 text-white'
                      : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />
                )}
                <item.icon className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-berna-purple' : 
                  isHighlight ? 'text-berna-purple' :
                  'group-hover:text-berna-purple/70'
                }`} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={onToggle}
          className="p-3 text-muted-foreground hover:text-white border-t border-white/[0.06] flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.06] flex items-center justify-around px-1 py-1 safe-area-bottom">
        {currentNavItems.slice(0, 5).map(item => {
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
        <Link to="/settings" className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${location.pathname === '/settings' ? 'text-berna-purple' : 'text-muted-foreground'}`}>
          <Settings className="w-4 h-4" />
          <span className="text-[9px]">More</span>
        </Link>
      </nav>
    </>
  );
}