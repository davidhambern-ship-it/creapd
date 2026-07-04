import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { PRODUCER_NAV_SECTIONS } from '@/lib/producerNav';
import AdminSidebarSection from './AdminSidebarSection';
import MobileBottomNav from './MobileBottomNav';

const mobileItems = [
  PRODUCER_NAV_SECTIONS[0].items[0], // Dashboard
  PRODUCER_NAV_SECTIONS[1].items[0], // Daily Brief
  PRODUCER_NAV_SECTIONS[2].items[0], // Story Queue
  PRODUCER_NAV_SECTIONS[2].items[1], // Story Manager
  PRODUCER_NAV_SECTIONS[3].items[0], // Production
];

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();

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
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto overflow-x-hidden">
          {PRODUCER_NAV_SECTIONS.map((section, si) => (
            <div key={section.label || `section-${si}`}>
              {!collapsed && section.label && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              {collapsed && section.label && si > 0 && (
                <div className="my-2 mx-3 border-t border-white/[0.06]" />
              )}
              {section.items.map(renderNavLink)}
            </div>
          ))}
          <AdminSidebarSection collapsed={collapsed} variant="producer" />
        </nav>
        <div className="p-2 border-t border-white/[0.06]">
          <Link
            to="/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">CREAPD Home</span>}
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
      <MobileBottomNav items={mobileItems} />
    </>
  );
}