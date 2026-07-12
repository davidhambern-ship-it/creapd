import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { PP_NAV_ITEMS } from '@/lib/ppNavItems';

export default function PPNavBar({ accentHsl = '270 80% 60%' }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: 'hsl(220 20% 6% / 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid hsl(${accentHsl} / 0.18)`,
      }}
    >
      {PP_NAV_ITEMS.map((pp, i) => {
        const Icon = pp.icon;
        const isActive = location.pathname.startsWith(pp.path);
        const color = isActive ? `hsl(${accentHsl})` : '#888';
        return (
          <motion.button
            key={pp.path}
            onClick={() => navigate(pp.path)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
            style={{
              background: isActive ? `hsl(${accentHsl} / 0.15)` : 'transparent',
              borderColor: isActive ? `hsl(${accentHsl} / 0.4)` : 'rgba(255,255,255,0.06)',
              color,
            }}
            title={pp.label}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <span className="text-xs font-medium whitespace-nowrap">{pp.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}