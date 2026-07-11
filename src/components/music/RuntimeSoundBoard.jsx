import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sliders } from 'lucide-react';

/**
 * Fader — vertical slider styled like a physical mixing board channel fader.
 * Drag the cap up/down to change value. Track has tick marks and a
 * colored fill from the bottom to the cap position.
 */
export function Fader({ label, value, min = 0, max = 90, onChange, color = '#FF00FF', disabled = false, unit = 'min' }) {
  const trackRef = useRef(null);
  const dragState = useRef({ startY: 0, startVal: 0, trackH: 0, dragging: false });

  const pct = max > min ? (value - min) / (max - min) : 0;
  const clampedPct = Math.max(0, Math.min(1, pct));
  const trackHeight = 160; // px of the fader track
  const capBottom = clampedPct * trackHeight;

  // Tick marks — major every 10 units, minor every 5
  const ticks = [];
  const step = (max - min) / 10;
  for (let i = 0; i <= 10; i++) {
    ticks.push({
      pct: (i * step) / (max - min),
      major: i % 2 === 0,
      label: String(Math.round(min + i * step)),
    });
  }

  const updateFromPointer = useCallback((clientY) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    let p = 1 - (clientY - rect.top) / rect.height;
    p = Math.max(0, Math.min(1, p));
    let newVal = min + p * (max - min);
    newVal = Math.max(min, Math.min(max, Math.round(newVal)));
    onChange(newVal);
  }, [min, max, onChange]);

  const onPointerDown = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragState.current = { startY: e.clientY, startVal: value, dragging: true };
    // Click-to-set: jump immediately to the click position
    updateFromPointer(e.clientY);
  }, [value, disabled, updateFromPointer]);

  const onPointerMove = useCallback((e) => {
    if (!dragState.current.dragging || disabled) return;
    updateFromPointer(e.clientY);
  }, [disabled, updateFromPointer]);

  const onPointerUp = useCallback((e) => {
    dragState.current.dragging = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5 select-none w-full">
      {/* Label */}
      <span className="text-[10px] font-heading font-semibold text-gray-300 text-center leading-tight tracking-wide">
        {label}
      </span>

      {/* Fader area: ticks on left, track+cap on right, VU on far right */}
      <div className="flex items-stretch gap-1">
        {/* Tick marks / scale */}
        <div className="relative w-5" style={{ height: trackHeight }}>
          {ticks.map((t, i) => {
            const bottom = t.pct * trackHeight;
            return (
              <div key={i} className="absolute left-0 right-0 flex items-center" style={{ bottom, transform: 'translateY(50%)' }}>
                <div className={t.major ? 'w-2 h-[1px] bg-gray-500' : 'w-1.5 h-[1px] bg-gray-700'} />
                {t.major && (
                  <span className="text-[6px] font-mono text-gray-600 ml-0.5 leading-none">{t.label}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Track + cap */}
        <div
          ref={trackRef}
          className="relative w-6 rounded-sm cursor-pointer"
          style={{
            height: trackHeight,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Colored fill from bottom to cap */}
          <div
            className="absolute left-0 right-0 bottom-0 rounded-b-sm"
            style={{
              height: capBottom,
              background: `linear-gradient(180deg, ${color}80 0%, ${color}20 100%)`,
              boxShadow: `0 0 8px ${color}40`,
              opacity: disabled ? 0.4 : 1,
            }}
          />

          {/* Center guide line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-white/5"
            style={{ top: 0, bottom: 0 }}
          />

          {/* Fader cap */}
          <motion.div
            animate={{ bottom: capBottom - 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing touch-none"
            style={{
              width: 28,
              height: 20,
              borderRadius: 3,
              background: disabled
                ? 'linear-gradient(180deg, #3a3a42, #1a1a1e)'
                : 'linear-gradient(180deg, #4a4a55, #2a2a30)',
              border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : color + '70'}`,
              boxShadow: disabled
                ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.4)'
                : `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.5), 0 0 8px ${color}40`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Cap grip lines */}
            <div className="absolute inset-0 flex flex-col justify-center items-center gap-[1.5px] py-1">
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="w-4 h-[1px] rounded-full" style={{
                  background: disabled ? 'rgba(255,255,255,0.1)' : color + '60',
                }} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* VU meter */}
        <div className="w-2.5 flex justify-center">
          <VUMeter value={value} max={max} color={color} height={trackHeight} />
        </div>
      </div>

      {/* Value readout */}
      <div className="flex items-baseline gap-0.5 px-2 py-0.5 rounded" style={{
        background: 'rgba(0,0,0,0.4)',
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : color + '30'}`,
      }}>
        <span className="text-xs font-mono font-bold" style={{ color: disabled ? 'rgba(200,200,220,0.5)' : color }}>
          {value}
        </span>
        <span className="text-[8px] text-gray-500">{unit}</span>
      </div>
    </div>
  );
}

function VUMeter({ value, max, color, height = 64 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const segments = Math.floor(height / 6);
  const lit = Math.round((pct / 100) * segments);
  return (
    <div className="flex flex-col-reverse gap-[1.5px]" style={{ height }}>
      {Array.from({ length: segments }, (_, i) => {
        const active = i < lit;
        const ratio = i / segments;
        const segColor = ratio >= 0.85 ? '#FF3333' : ratio >= 0.65 ? '#FFAA00' : color;
        return (
          <div
            key={i}
            className="w-full rounded-[1px] transition-all"
            style={{
              height: 3,
              background: active ? segColor : 'rgba(255,255,255,0.05)',
              boxShadow: active ? `0 0 3px ${segColor}80` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function ChannelStrip({ channel, index }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1.5 py-3 rounded-lg relative" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.3) 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderTop: `2px solid ${channel.color}40`,
    }}>
      {/* Channel number badge */}
      <div className="mb-1">
        <span className="text-[7px] font-mono text-gray-600 tracking-widest">CH{String(index + 1).padStart(2, '0')}</span>
      </div>
      {/* Fader */}
      <Fader {...channel} />
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

  const channels = [
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
          {channels.map((ch, i) => (
            <ChannelStrip key={ch.field} channel={ch} index={i} />
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
          <span className="text-[#FF00FF] font-semibold">Music Runtime</span> is always <span className="text-white font-semibold">50% of Total Show</span> — drag the <span className="text-white font-semibold">Total Show</span> fader to scale everything.
        </p>
      </div>
    </div>
  );
}