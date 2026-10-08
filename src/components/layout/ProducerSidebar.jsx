import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutGrid, RadioTower } from 'lucide-react';
import { PRODUCER_NAV_SECTIONS } from '@/lib/producerNav';
import MobileBottomNav from './MobileBottomNav';

const allPodcastItems = PRODUCER_NAV_SECTIONS.flatMap(section => section.items);
const mobileItems = [
  allPodcastItems.find(item => item.path === '/news/dashboard'),
  allPodcastItems.find(item => item.path === '/news/brief'),
  allPodcastItems.find(item => item.path === '/news/queue'),
  allPodcastItems.find(item => item.path === '/news/workspace'),
  allPodcastItems.find(item => item.path === '/news/export'),
].filter(Boolean);

export default function ProducerSidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const renderNavLink = (item) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/' && location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`news-console-link ${isActive ? 'news-console-link-active' : ''}`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {isActive && <span className="news-console-live-dot" />}
      </Link>
    );
  };

  return (
    <>
      <aside className={`news-console-sidebar hidden lg:flex flex-col ${collapsed ? 'w-[76px]' : 'w-64'} transition-all duration-300 relative z-40`}>
        <div className="news-console-brand">
          <div className="news-console-brand-mark">
            <RadioTower className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">CREAPD Podcast</div>
              <div className="text-xs font-semibold text-white tracking-wide">Production Console</div>
            </div>
          )}
          {!collapsed && <span className="news-console-onair">ON AIR</span>}
        </div>

        <nav className="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden">
          {PRODUCER_NAV_SECTIONS.map((section, index) => (
            <div key={section.label} className={index ? 'mt-4' : ''}>
              {!collapsed && (
                <div className="news-console-section-label">
                  <span>{section.label}</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-orange-400/30 via-purple-400/15 to-transparent" />
                </div>
              )}
              {collapsed && index > 0 && <div className="my-3 mx-3 border-t border-white/[0.08]" />}
              <div className="space-y-1">{section.items.map(renderNavLink)}</div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-white/[0.08] bg-black/20">
          <Link to="/" className="news-console-link">
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>CREAPD Home</span>}
          </Link>
        </div>

        <button
          onClick={onToggle}
          className="h-10 border-t border-white/[0.08] text-white/45 hover:text-white hover:bg-white/[0.04] flex items-center justify-center transition-colors"
          aria-label={collapsed ? 'Expand podcast navigation' : 'Collapse podcast navigation'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <MobileBottomNav items={mobileItems} />
    </>
  );
}
