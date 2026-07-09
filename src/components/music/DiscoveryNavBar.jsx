import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dices } from 'lucide-react';

export default function DiscoveryNavBar({ rooms, onRoulette, rouletteColor = '#FF00FF' }) {
  const navigate = useNavigate();

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: 'hsl(220 20% 6% / 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,0,255,0.12)',
      }}
    >
      {/* Show Roulette Button */}
      <motion.button
        onClick={onRoulette}
        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border"
        style={{
          background: `linear-gradient(135deg, ${rouletteColor}22, rgba(0,255,255,0.08))`,
          borderColor: `${rouletteColor}50`,
          color: rouletteColor,
        }}
      >
        <motion.span
          animate={{ rotate: [0, -12, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Dices className="w-4 h-4" />
        </motion.span>
        <span className="hidden sm:inline">Show Roulette</span>
      </motion.button>

      {/* Divider */}
      <div className="flex-shrink-0 h-6 w-px bg-white/10" />

      {/* Room Icons */}
      {rooms.map((room, i) => {
        const Icon = room.icon;
        return (
          <motion.button
            key={room.path}
            onClick={() => navigate(room.path)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border"
            style={{
              background: `${room.color}14`,
              borderColor: `${room.color}30`,
              color: room.color,
            }}
            title={room.label}
          >
            <Icon className="w-4 h-4" style={{ color: room.color }} />
            <span className="text-xs font-medium whitespace-nowrap hidden md:inline">{room.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}