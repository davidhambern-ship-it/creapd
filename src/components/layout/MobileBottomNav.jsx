import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function MobileBottomNav({ items }) {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel-navy border-t border-white/[0.06] flex items-center justify-around px-1 py-1 safe-area-bottom">
      {items.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-0 transition-all duration-200 ${
              isActive
                ? 'bg-primary/15 text-primary m-nav-active scale-105'
                : 'text-muted-foreground active:scale-90'
            }`}
          >
            <item.icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
            <span className="text-[9px] truncate font-medium">{item.mobileLabel || item.label}</span>
          </Link>
        );
      })}

      <Link
        to="/news/settings"
        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
          location.pathname === '/news/settings'
            ? 'bg-primary/15 text-primary m-nav-active scale-105'
            : 'text-muted-foreground active:scale-90'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
        <span className="text-[9px] font-medium">More</span>
      </Link>
    </nav>
  );
}