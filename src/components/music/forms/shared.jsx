import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';

export function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export const inputClass = "bg-black/50 border-white/10 text-white text-xs placeholder-gray-600 h-8";

export function FieldLabel({ children, accent }) {
  return <Label className="text-[9px] text-gray-400 mb-0.5 block uppercase tracking-wide" style={{ textShadow: `0 0 6px ${accent}22` }}>{children}</Label>;
}

export function NeonChip({ label, active, onClick, color = '#FF00FF' }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-2 py-0.5 rounded text-[10px] font-medium border backdrop-blur-sm"
      style={active ? {
        background: `${color}22`,
        borderColor: `${color}80`,
        color: color,
        boxShadow: `0 0 8px ${color}33, inset 0 0 4px ${color}18`,
      } : {
        background: 'rgba(0,0,0,0.4)',
        borderColor: 'rgba(255,255,255,0.08)',
        color: 'rgba(200,200,220,0.65)',
      }}
    >
      {label}
    </motion.button>
  );
}

/**
 * FormInsert — an independent configuration form card mounted on the album cover.
 * Each insert is a self-contained form with its own title, completion state, and data.
 */
export function FormInsert({ title, icon: Icon, accent, isComplete, highlighted, delay = 0, children, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
      className="flex flex-col rounded-lg overflow-hidden"
      style={{
        ...style,
        background: 'rgba(8,6,12,0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${highlighted ? accent + '99' : (isComplete ? accent + '44' : 'rgba(255,255,255,0.1)')}`,
        boxShadow: highlighted
          ? `0 0 24px ${accent}33, 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
          : `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Header bar — form identity */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b shrink-0" style={{ borderColor: `${accent}22`, background: `${accent}08` }}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 shrink-0" style={{ color: accent }} />
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] font-bold" style={{ color: accent }}>{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-bold" style={{ color: isComplete ? accent : 'rgba(255,255,255,0.3)' }}>
            {isComplete ? 'READY' : 'DRAFT'}
          </span>
          <div className="w-2 h-2 rounded-full" style={{
            background: isComplete ? accent : 'rgba(255,255,255,0.15)',
            boxShadow: isComplete ? `0 0 8px ${accent}88` : 'none',
            transition: 'all 0.3s ease',
          }} />
        </div>
      </div>

      {/* Body — form fields */}
      <div className="p-2 flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'none' }}>
        {children}
      </div>
    </motion.div>
  );
}