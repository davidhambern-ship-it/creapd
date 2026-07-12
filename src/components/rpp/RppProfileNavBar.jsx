import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PP_NAV_ITEMS } from '@/lib/ppNavItems';

/**
 * RppProfileNavBar — bottom navigation bar for switching between
 * Production Profiles (News, Music, Talk, Cooking, Sports, Cosmo, Spiritual, Research).
 */
export default function RppProfileNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="sticky bottom-0 z-30 flex items-center gap-1 px-3 py-2 overflow-x-auto"
      style={{
        background: 'hsl(210 40% 5% / 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid hsl(190 40% 20% / 0.25)',
      }}
    >
      {PP_NAV_ITEMS.map((pp) => {
        const Icon = pp.icon;
        const isActive = location.pathname.startsWith(pp.path);
        return (
          <button
            key={pp.path}
            onClick={() => navigate(pp.path)}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: isActive ? 'hsl(190 50% 15% / 0.4)' : 'transparent',
              border: isActive
                ? '1px solid hsl(190 50% 28% / 0.5)'
                : '1px solid transparent',
              color: isActive ? 'hsl(190 80% 55%)' : 'hsl(220 10% 55%)',
            }}
            title={pp.label}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] font-medium whitespace-nowrap">{pp.label}</span>
          </button>
        );
      })}
    </nav>
  );
}