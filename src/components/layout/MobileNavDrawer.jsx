import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, ChevronRight, LayoutGrid } from 'lucide-react';
import { PRODUCTION_MODES, getActiveProductionMode } from '@/lib/producerNav';
import AdminSidebarSection from './AdminSidebarSection';

export default function MobileNavDrawer({ open, onClose, navItems, iconMap, variant }) {
  const location = useLocation();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  // Convert flat nav items (with section field) to grouped sections
  const sections = [];
  const sectionMap = {};
  navItems.forEach(item => {
    const sectionKey = item.section || null;
    if (!sectionMap[sectionKey]) {
      sectionMap[sectionKey] = { label: sectionKey, items: [] };
      sections.push(sectionMap[sectionKey]);
    }
    sectionMap[sectionKey].items.push(item);
  });

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm z-[70] bg-gradient-to-b from-[hsl(220,20%,10%)] to-[hsl(220,20%,6%)] border-r border-white/[0.08] flex flex-col lg:hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06] flex-shrink-0">
          <Link to="/" onClick={onClose} className="flex items-center">
            <img
              src="https://media.base44.com/images/public/6a4126962e5804304cc84b12/3a30f6e3d_Producer.png"
              alt="Producer"
              className="h-8 w-auto"
              style={{ mixBlendMode: 'screen' }}
            />
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Production Mode Switcher */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Production Mode</p>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTION_MODES.map(mode => {
              const activeMode = getActiveProductionMode(location.pathname);
              const isActive = activeMode === mode.key;
              return (
                <Link
                  key={mode.key}
                  to={mode.path}
                  onClick={onClose}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-white/[0.03] text-muted-foreground border border-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  <mode.icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium">{mode.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {sections.map((section, si) => (
            <div key={section.label || `section-${si}`}>
              {section.label && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section.label}
                </p>
              )}
              {section.items.map(item => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon && typeof item.icon === 'string' ? (iconMap?.[item.icon] || ChevronRight) : item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/[0.06] text-white'
                        : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-berna-orange rounded-r" />}
                    {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-berna-purple' : ''}`} />}
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />}
                  </Link>
                );
              })}
            </div>
          ))}
          <AdminSidebarSection variant={variant} onNavigate={onClose} />
        </nav>

        {/* Switch Production Type */}
        <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
          <Link
            to="/production-types"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Switch Production Type
          </Link>
        </div>
      </aside>
    </>
  );
}