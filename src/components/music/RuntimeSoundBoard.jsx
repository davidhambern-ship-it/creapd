import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sliders } from 'lucide-react';
import { Label } from '@/components/ui/label';

/**
 * Rotary Knob — vertical-drag to change value.
 * Drag up = increase, drag down = decrease.
 * 270° sweep from -135° (min) to +135° (max).
 */
export function Knob({ label, value, min = 0, max = 90, onChange, color = '#FF00FF', disabled = false, unit = 'min', size = 72 }) {
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
      <div className="relative" style={{ width: size, height: size }}>
        {/* Tick marks */}
        <svg className="absolute inset-0" width={size} height={size} viewBox="0 0 72 72">
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

function VUMeter({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const segments = 12;
  const lit = Math.round((pct / 100) * segments);
  return (
    <div className="flex flex-col-reverse gap-[2px] h-16">
      {Array.from({ length: segments }, (_, i) => {
        const active = i < lit;
        const segColor = i >= segments - 2 ? '#FF3333' : i >= segments - 5 ? '#FFAA00' : color;
        return (
          <div
            key={i}
            className="w-full h-1 rounded-[1px] transition-all"
            style={{
              background: active ? segColor : 'rgba(255,255,255,0.06)',
              boxShadow: active ? `0 0 4px ${segColor}80` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function ChannelStrip({ knob, index }) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-3 rounded-lg relative" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.3) 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderTop: `2px solid ${knob.color}40`,
    }}>
      {/* Channel number badge */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2">
        <span className="text-[7px] font-mono text-gray-600 tracking-widest">CH{String(index + 1).padStart(2, '0')}</span>
      </div>
      {/* VU meter */}
      <div className="w-6 flex justify-center mt-3">
        <VUMeter value={knob.value} max={knob.max} color={knob.color} />
      </div>
      {/* Knob */}
      <Knob {...knob} size={56} />
      {/* Fader track */}
      <div className="relative w-1.5 h-10 rounded-full bg-black/50 mt-1">
        <div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-sm"
          style={{
            bottom: `${(knob.value / knob.max) * 100}%`,
            background: knob.color,
            boxShadow: `0 0 6px ${knob.color}`,
          }}
        />
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
    { label: 'Music 50%', field: 'required_music_runtime', value: music, max: totalMax / 2, color: '#FF00FF', disabled: true, onChange: () => {} },
    { label: 'Talk', field: 'talk_segment_runtime', value: config.talk_segment_runtime || 0, max: 45, color: '#00FFFF', onChange: v => updateConfig('talk_segment_runtime', v) },
    { label: 'Sponsors', field: 'commercial_sponsor_runtime', value: config.commercial_sponsor_runtime || 0, max: 20, color: '#FF6B00', onChange: v => updateConfig('commercial_sponsor_runtime', v) },
    { label: 'Intro', field: 'intro_runtime', value: config.intro_runtime || 0, max: 10, color: '#FFD700', onChange: v => updateConfig('intro_runtime', v) },
    { label: 'Outro', field: 'outro_runtime', value: config.outro_runtime || 0, max: 10, color: '#FFD700', onChange: v => updateConfig('outro_runtime', v) },
  ];

  const totalRuntime = config.total_show_runtime || 90;

  return (
    <div className="space-y-3">
      {/* ── Mixing Console Panel ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1a1a22 0%, #0d0d12 40%, #14141c 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {/* Top vent strip */}
        <div className="h-1.5 flex" style={{ background: 'linear-gradient(90deg, #0a0a0e, #2a2a36, #0a0a0e)' }}>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} className="flex-1 border-r border-black/40" />
          ))}
        </div>

        {/* Console header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)' }}>
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5" style={{ color: '#00FFFF' }} />
            <span className="text-[11px] font-heading font-bold tracking-wider text-gray-200">RUNTIME MIXER</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Power LED */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
              <span className="text-[8px] font-mono text-gray-500">PWR</span>
            </div>
            {/* Status LED */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00FFFF', boxShadow: '0 0 6px rgba(0,255,255,0.6)', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              <span className="text-[8px] font-mono text-gray-500">LIVE</span>
            </div>
          </div>
        </div>

        {/* Mix bus visualization */}
        <div className="px-4 pt-3 pb-2 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-mono text-gray-600 tracking-wider">MIX BUS</span>
            <span className="text-[8px] font-mono text-gray-500">{totalRuntime} min total</span>
          </div>
          <div className="flex h-2.5 rounded-sm overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <motion.div animate={{ width: `${((config.intro_runtime || 0) / totalRuntime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.4)' }} />
            <motion.div animate={{ width: `${((config.required_music_runtime || 0) / totalRuntime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF00FF', boxShadow: '0 0 8px rgba(255,0,255,0.4)' }} />
            <motion.div animate={{ width: `${((config.talk_segment_runtime || 0) / totalRuntime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#00FFFF', boxShadow: '0 0 8px rgba(0,255,255,0.4)' }} />
            <motion.div animate={{ width: `${((config.commercial_sponsor_runtime || 0) / totalRuntime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF6B00', boxShadow: '0 0 8px rgba(255,107,0,0.4)' }} />
            <motion.div animate={{ width: `${((config.outro_runtime || 0) / totalRuntime) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700', boxShadow: '0 0 8px rgba(255,215,0,0.4)' }} />
          </div>
        </div>

        {/* Channel strips */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 p-3">
          {knobs.map((k, i) => (
            <ChannelStrip key={k.field} knob={k} index={i} />
          ))}
        </div>

        {/* Corner screws */}
        {[
          'top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'
        ].map((pos) => (
          <div key={pos} className={`absolute ${pos} w-2 h-2 rounded-full`} style={{
            background: 'radial-gradient(circle at 35% 35%, #555, #1a1a1e)',
            boxShadow: 'inset 0 0 2px rgba(0,0,0,0.8), 0 1px 1px rgba(0,0,0,0.3)',
          }}>
            <div className="absolute inset-0 m-auto w-1 h-[1px] bg-black/60" style={{ transform: 'rotate(45deg)', top: '50%', marginTop: '-0.5px' }} />
          </div>
        ))}

        {/* Bottom vent strip */}
        <div className="h-1.5 flex" style={{ background: 'linear-gradient(90deg, #0a0a0e, #2a2a36, #0a0a0e)' }}>
          {Array.from({ length: 40 }, (_, i) => (
            <div key={i} className="flex-1 border-r border-black/40" />
          ))}
        </div>
      </div>

      {/* 50% music note */}
      <div className="rounded-lg p-2.5 border border-[#FF00FF]/20 bg-[#FF00FF]/5">
        <p className="text-[10px] text-gray-400 text-center">
          <span className="text-[#FF00FF] font-semibold">Music Runtime</span> is always <span className="text-white font-semibold">50% of Total Show</span> — drag the <span className="text-white font-semibold">Total Show</span> knob to scale everything.
        </p>
      </div>
    </div>
  );
}