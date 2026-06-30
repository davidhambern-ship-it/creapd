import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Layers, Search,
  Archive, Settings, Activity, ChevronLeft, ChevronRight, CalendarDays,
  Package, Clapperboard,
  Building2, UserCircle, Bell, LayoutTemplate, Bookmark, ClipboardList, FileInput, ImageIcon, MessageSquareCode,
  ShieldCheck, ChevronDown, ChevronUp, Palette, Tv
} from 'lucide-react';

// Navigation sections
const navSections = [
  {
    name: 'Production',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: CalendarDays, label: 'Weekly Planner', path: '/planner' },
      { icon: FileText, label: "Today's Brief", path: '/brief' },
      { icon: Layers, label: 'Story Queue', path: '/queue' },
      { icon: Bookmark, label: 'Story Library', path: '/library' },
      { icon: ClipboardList, label: 'Story Manager', path: '/workspace' },
      { icon: Clapperboard, label: 'Production Profiles', path: '/production-profiles' },
      { icon: Package, label: 'Production', path: '/production' },
    ]
  },
  {
    name: 'Research & Assets',
    items: [
      { icon: Search, label: 'Research Desk', path: '/research' },
      { icon: ImageIcon, label: 'Image/Video Library', path: '/images' },
    ]
  },
  {
    name: 'Templates',
    items: [
      { icon: LayoutTemplate, label: 'All Templates', path: '/templates' },
      { icon: Palette, label: 'Graphics Templates', path: '/graphics-templates' },
      { icon: MessageSquareCode, label: 'Prompt Templates', path: '/prompt-templates' },
    ]
  },
  {
    name: 'Network',
    items: [
      { icon: Building2, label: 'Network Profiles', path: '/organizations' },
      { icon: Palette, label: 'Brand Profiles', path: '/brands' },
      { icon: Tv, label: 'Show Profiles', path: '/shows' },
    ]
  },
  {
    name: 'Activity & Settings',
    items: [
      { icon: Activity, label: 'Activity Center', path: '/activity' },
      { icon: Archive, label: 'Archive', path: '/archive' },
      { icon: FileInput, label: 'Import URL', path: '/import' },
      { icon: Search, label: 'Sources', path: '/sources' },
      { icon: ShieldCheck, label: 'Security & Privacy', path: '/security' },
      { icon: Settings, label: 'Settings', path: '/settings' },
      { icon: UserCircle, label: 'My Profile', path: '/profile' },
    ]
  },
];

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    'Production': true,
    'Research & Assets': true,
    'Templates': true,
    'Network': true,
    'Activity & Settings': true,
  });

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const isActive = (path) => location.pathname === path;

  const renderNavItem = (item) => (
    <Link
      key={item.path}
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
        isActive(item.path)
          ? 'bg-white/[0.06] text-white'
          : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      {isActive(item.path) && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />
      )}
      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive(item.path) ? 'text-berna-purple' : 'group-hover:text-berna-purple/70'}`} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? 'w-16' : 'w-56'} transition-all duration-300 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-r border-white/[0.06] relative z-40`}>
        <nav className="flex-1 py-4 space-y-4 px-2 overflow-y-auto overflow-x-hidden">
          {navSections.map(section => (
            <div key={section.name}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.name)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-white transition-colors w-full"
                >
                  {expandedSections[section.name] ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronUp className="w-3 h-3" />
                  )}
                  {section.name}
                </button>
              )}
              {expandedSections[section.name] && (
                <div className="space-y-1 mt-1">
                  {section.items.map(renderNavItem)}
                </div>
              )}
            </div>
          ))}
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
        {navSections[0].items.slice(0, 5).map(item => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 ${
                active ? 'text-berna-purple' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px] truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <Link to="/settings" className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${isActive('/settings') ? 'text-berna-purple' : 'text-muted-foreground'}`}>
          <Settings className="w-4 h-4" />
          <span className="text-[9px]">More</span>
        </Link>
      </nav>
    </>
  );
}