import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, LayoutGrid } from 'lucide-react';

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
        <ChevronRight className="w-4 h-4" />
        <span className="text-[9px]">More</span>
      </Link>
    </nav>
  );
}