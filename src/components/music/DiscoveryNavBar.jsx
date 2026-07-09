import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dices } from 'lucide-react';

export default function DiscoveryNavBar({ rooms, onRoulette, rouletteColor = '#FF00FF' }) {
  const navigate = useNavigate();

  return (
    <div
      className="sticky top-0 z-40 -mx-4 px-4 py-2 mb-2"
      style={{
        background: 'linear-gradient(180deg, hsl(220 20% 6% / 0.95), hsl(220 20% 6% / 0.85))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,0,255,0.12)',
      }}
    >
      <div className="dnav-bar flex items-center gap-1.5 overflow-x-auto pb-0">
        <style>{`.dnav-bar::-webkit-scrollbar { display: none; }`}</style>
        <style>{`.dnav-bar { scrollbar-width: none; }`}</style>

        {/* Show Roulette Button */}
        <motion.button
          onClick={onRoulette}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium border"
          style={{
            background: `linear-gradient(135deg, ${rouletteColor}22, rgba(0,255,255,0.08))`,
            borderColor: `${rouletteColor}50`,
            color: rouletteColor,
            boxShadow: `0 0 12px ${rouletteColor}20`,
          }}
        >
          <motion.span
            animate={{ rotate: [0, -12, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Dices className="w-4 h-4" />
          </motion.span>
          <span className="hidden sm:inline">Roulette</span>
        </motion.button>

        {/* Divider */}
        <div className="flex-shrink-0 h-6 w-px bg-white/10" />

        {/* Room Icons — uniform pill buttons that fit the bar */}
        {rooms.map((room, i) => {
          const Icon = room.icon;
          return (
            <motion.button
              key={room.path}
              onClick={() => navigate(room.path)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="flex-shrink-0 flex items-center gap-1.5 h-9 px-2.5 rounded-lg border transition-colors"
              style={{
                background: `${room.color}14`,
                borderColor: `${room.color}30`,
                color: room.color,
              }}
              title={room.label}
            >
              <Icon className="w-4 h-4" style={{ color: room.color }} />
              <span className="text-xs font-medium whitespace-nowrap hidden lg:inline">{room.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}