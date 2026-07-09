import { motion } from 'framer-motion';

const COLOR_MAP = {
  pink: { active: 'rgba(255,0,255,0.15)', border: 'rgba(255,0,255,0.5)', glow: 'rgba(255,0,255,0.3)', text: '#FF00FF' },
  cyan: { active: 'rgba(0,255,255,0.12)', border: 'rgba(0,255,255,0.5)', glow: 'rgba(0,255,255,0.3)', text: '#00FFFF' },
  purple: { active: 'rgba(139,0,255,0.15)', border: 'rgba(139,0,255,0.5)', glow: 'rgba(139,0,255,0.3)', text: '#8B00FF' },
  orange: { active: 'rgba(255,107,0,0.15)', border: 'rgba(255,107,0,0.5)', glow: 'rgba(255,107,0,0.3)', text: '#FF6B00' },
  green: { active: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.5)', glow: 'rgba(0,255,136,0.3)', text: '#00FF88' },
  gold: { active: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.5)', glow: 'rgba(255,215,0,0.3)', text: '#FFD700' },
};

export default function NeonChip({ label, active, onClick, color = 'pink' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.pink;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.55 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
      style={active ? {
        background: c.active,
        borderColor: c.border,
        color: c.text,
        boxShadow: `0 0 12px ${c.glow}, inset 0 0 8px ${c.active}`,
      } : {
        background: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.1)',
        color: 'rgba(200,200,220,0.7)',
      }}
    >
      {label}
    </motion.button>
  );
}