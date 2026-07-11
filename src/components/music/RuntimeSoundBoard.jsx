import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sliders } from 'lucide-react';
import { Label } from '@/components/ui/label';

/**
 * Rotary Knob — vertical-drag to change value.
 * Drag up = increase, drag down = decrease.
 * 270° sweep from -135° (min) to +135° (max).
 */
function Knob({ label, value, min = 0, max = 90, onChange, color = '#FF00FF', disabled = false, unit = 'min' }) {
  const dragState = useRef({ startY: 0, startVal: 0, dragging: false });

  const angleRange = 270; // total degrees of sweep
  const minAngle = -135;
  const pct = max > min ? (value - min) / (max - min) : 0;
  const clampedPct = Math.max(0, Math.min(1, pct));
  const rotation = minAngle + clampedPct * angleRange;

  const onPointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragState.current = { startY: e.clientY, startVal: value, dragging: true };
  }, [value, disabled]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.dragging || disabled) return;
    const dy = dragState.current.startY - e.clientY; // up = positive
    const sensitivity = 200; // px to traverse full range
    const delta = (dy / sensitivity) * (max - min);
    let newVal = dragState.current.startVal + delta;
    newVal = Math.max(min, Math.min(max, Math.round(newVal)));
    onChange(newVal);
  }, [min, max, onChange, disabled]);

  const onPointerUp = useCallback((e) => {
    dragState.current.dragging = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  // Tick marks around the knob
  const ticks = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <Label className="text-[11px] text-gray-300 text-center leading-tight">{label}</Label>
      <div className="relative" style={{ width: 72, height: 72 }}>
        {/* Tick marks */}
        <svg className="absolute inset-0" width="72" height="72" viewBox="0 0 72 72">
          {ticks.map((i) => {
            const tickAngle = minAngle + (i / (ticks.length - 1)) * angleRange;
            const rad = (tickAngle - 90) * (Math.PI / 180);
            const r1 = 38;
            const r2 = 34;
            const x1 = 36 + r1 * Math.cos(rad);
            const y1 = 36 + r1 * Math.sin(rad);
            const x2 = 36 + r2 * Math.cos(rad);
            const y2 = 36 + r2 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i / (ticks.length - 1) <= clampedPct ? color : 'rgba(255,255,255,0.12)'}
                strokeWidth={1.5}
                style={{ transition: 'stroke 0.15s' }}
              />
            );
          })}
        </svg>
        {/* Knob body */}
        <motion.div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="absolute inset-[10px] rounded-full cursor-grab active:cursor-grabbing touch-none"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${color}40, rgba(20,20,30,0.95) 60%)`,
            border: `2px solid ${disabled ? 'rgba(255,255,255,0.15)' : color + '60'}`,
            boxShadow: disabled
              ? 'inset 0 2px 6px rgba(0,0,0,0.5)'
              : `inset 0 2px 6px rgba(0,0,0,0.5), 0 0 12px ${color}30`,
          }}
        >
          {/* Indicator line */}
          <div
            className="absolute left-1/2 top-1 w-[3px] rounded-full"
            style={{
              height: '40%',
              transform: 'translateX(-50%)',
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
          {/* Center cap */}
          <div
            className="absolute inset-0 m-auto rounded-full"
            style={{
              width: 8, height: 8,
              background: color,
              boxShadow: `0 0 4px ${color}`,
            }}
          />
        </motion.div>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-mono font-bold" style={{ color: disabled ? 'rgba(200,200,220,0.5)' : color }}>
          {value}
        </span>
        <span className="text-[10px] text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

export default function RuntimeSoundBoard({ config, updateConfig }) {
  const totalMax = 90;
  const total = Math.min(config.total_show_runtime || 90, totalMax);
  const music = Math.floor(total / 2);

  const handleTotalChange = (v) => {
    updateConfig('total_show_runtime', v);
    updateConfig('required_music_runtime', Math.floor(v / 2));
  };

  const knobs = [
    { label: 'Total Show', field: 'total_show_runtime', value: total, max: totalMax, color: '#FFFFFF', onChange: handleTotalChange },
    { label: 'Music (50%)', field: 'required_music_runtime', value: music, max: totalMax / 2, color: '#FF00FF', disabled: true, onChange: () => {} },
    { label: 'Talk', field: 'talk_segment_runtime', value: config.talk_segment_runtime || 0, max: 45, color: '#00FFFF', onChange: v => updateConfig('talk_segment_runtime', v) },
    { label: 'Sponsors', field: 'commercial_sponsor_runtime', value: config.commercial_sponsor_runtime || 0, max: 20, color: '#FF6B00', onChange: v => updateConfig('commercial_sponsor_runtime', v) },
    { label: 'Intro', field: 'intro_runtime', value: config.intro_runtime || 0, max: 10, color: '#FFD700', onChange: v => updateConfig('intro_runtime', v) },
    { label: 'Outro', field: 'outro_runtime', value: config.outro_runtime || 0, max: 10, color: '#FFD700', onChange: v => updateConfig('outro_runtime', v) },
  ];

  return (
    <div className="space-y-4">
      {/* Mix bar visualization */}
      <div>
        <div className="flex h-3 rounded-full overflow-hidden mb-1">
          <motion.div animate={{ width: `${(config.intro_runtime / config.total_show_runtime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
          <motion.div animate={{ width: `${(config.required_music_runtime / config.total_show_runtime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF00FF' }} />
          <motion.div animate={{ width: `${(config.talk_segment_runtime / config.total_show_runtime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#00FFFF' }} />
          <motion.div animate={{ width: `${(config.commercial_sponsor_runtime / config.total_show_runtime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF6B00' }} />
          <motion.div animate={{ width: `${(config.outro_runtime / config.total_show_runtime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FFD700' }} />Intro</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FF00FF' }} />Music</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#00FFFF' }} />Talk</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FF6B00' }} />Sponsors</span>
        </div>
      </div>

      {/* 50% music note */}
      <div className="rounded-lg p-3 border border-[#FF00FF]/20 bg-[#FF00FF]/5">
        <p className="text-[11px] text-gray-400 text-center">
          <span className="text-[#FF00FF] font-semibold">Music Runtime</span> is always <span className="text-white font-semibold">50% of Total Show</span>. The AI determines the best split for the remaining time across talk, sponsors, intro &amp; outro.
        </p>
      </div>

      {/* Sound Board */}
      <div className="rounded-xl p-4 border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4" style={{ color: '#00FFFF' }} />
          <span className="text-xs font-heading font-semibold text-white">Runtime Mixer</span>
          <span className="text-[10px] text-gray-500">— Drag knobs up/down to adjust</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 place-items-center py-2">
          {knobs.map((k) => (
            <Knob key={k.field} {...k} />
          ))}
        </div>
      </div>
    </div>
  );
}