import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function MobileBottomNav({ items, accentHsl }) {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.06] flex items-center justify-around px-1 py-1 safe-area-bottom overflow-x-auto">
      {items.map(item => {
        const isActive = location.pathname.startsWith(item.path);
        const activeStyle = accentHsl
          ? { background: `hsl(${accentHsl} / 0.15)`, color: `hsl(${accentHsl})` }
          : {};
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl min-w-0 flex-shrink-0 transition-all duration-200 ${
              isActive
                ? accentHsl ? 'scale-105' : 'bg-primary/15 text-primary m-nav-active scale-105'
                : 'text-muted-foreground active:scale-90'
            }`}
            style={isActive ? activeStyle : {}}
          >
            <item.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[9px] truncate font-medium">{item.mobileLabel || item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}