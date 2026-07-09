import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Disc3, Sparkles } from 'lucide-react';

/**
 * 2.5D Orbital Configuration Canvas
 * Renders config "rooms" as floating nodes on a tilted perspective plane
 * orbiting a central hub. Clicking a node transitions to a focused panel.
 *
 * Visual tilt layer (rings/hub) is separated from the interactive node layer
 * so 3D transforms never break click hit-testing.
 */
export default function OrbitalConfigCanvas({
  rooms = [],
  focusedRoom = null,
  onFocusRoom,
  canBuild = false,
  onBuild,
  children
}) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 10, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Subtle parallax on mouse move (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const el = containerRef.current;
    if (!el) return;
    const handleMouse = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      setTilt({ x: 10 + dy * 4, y: dx * 8 });
    };
    el.addEventListener('mousemove', handleMouse);
    return () => el.removeEventListener('mousemove', handleMouse);
  }, [isMobile]);

  const radius = isMobile ? 160 : 290;
  const isFocused = focusedRoom !== null && focusedRoom !== undefined;

  return (
    <div ref={containerRef} className="relative w-full" style={{ perspective: '1200px' }}>
      <AnimatePresence mode="wait">
        {!isFocused ? (
          /* ── ORBIT VIEW ── */
          <motion.div
            key="orbit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="relative flex items-center justify-center"
            style={{ height: isMobile ? '520px' : 'calc(100vh - 200px)', minHeight: isMobile ? '520px' : '620px' }}
          >
            {/* ═══ VISUAL LAYER — tilted, non-interactive ═══ */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: isMobile ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {/* Outer orbital ring */}
              <div
                className="absolute rounded-full"
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 0 100px rgba(255,0,255,0.05), inset 0 0 80px rgba(0,255,255,0.025)',
                }}
              />
              {/* Inner dashed ring */}
              <div
                className="absolute rounded-full border border-dashed"
                style={{
                  width: radius * 1.35,
                  height: radius * 1.35,
                  borderColor: 'rgba(255,255,255,0.03)',
                }}
              />
            </div>

            {/* ═══ Central Hub — Record Player Platter ═══ */}
            <div
              className="absolute z-15 flex flex-col items-center pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* ═══ TURNTABLE DECK ═══ */}
              <div className="relative" style={{ width: '280px', height: '230px' }}>
                {/* ── Deck body (rectangular turntable base) ── */}
                <div
                  className="absolute"
                  style={{
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    borderRadius: '16px',
                    background: `
                      linear-gradient(180deg,
                        rgba(55,58,68,0.95) 0%,
                        rgba(38,40,50,0.95) 40%,
                        rgba(25,27,35,0.95) 100%
                      )
                    `,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: `
                      0 16px 48px rgba(0,0,0,0.6),
                      0 0 60px rgba(255,0,255,0.05),
                      inset 0 1px 0 rgba(255,255,255,0.08),
                      inset 0 -2px 6px rgba(0,0,0,0.4)
                    `,
                  }}
                >
                  {/* Brushed metal texture overlay */}
                  <div
                    className="absolute inset-0 rounded-[16px] overflow-hidden"
                    style={{
                      background: `repeating-linear-gradient(90deg,
                        rgba(255,255,255,0.015) 0px,
                        rgba(255,255,255,0.015) 1px,
                        transparent 1px,
                        transparent 3px
                      )`,
                    }}
                  />
                  {/* Corner screws */}
                  {[
                    { top: '8px', left: '8px' },
                    { top: '8px', right: '8px' },
                    { bottom: '8px', left: '8px' },
                    { bottom: '8px', right: '8px' },
                  ].map((pos, i) => (
                    <div key={i} className="absolute rounded-full" style={{
                      ...pos, width: '5px', height: '5px',
                      background: 'radial-gradient(circle, #888 0%, #333 70%)',
                      boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
                    }} />
                  ))}
                </div>

                {/* ── Platter well (circular recess in the deck) ── */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '50%',
                    left: '100px',
                    transform: 'translateY(-50%)',
                    width: '180px',
                    height: '180px',
                    background: 'radial-gradient(circle, rgba(10,10,15,0.95) 0%, rgba(20,20,28,0.9) 80%)',
                    border: '2px solid rgba(0,0,0,0.6)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)',
                  }}
                />

                {/* ── Rubber platter mat (sits inside the well) ── */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '50%',
                    left: '108px',
                    transform: 'translateY(-50%)',
                    width: '164px',
                    height: '164px',
                    background: 'radial-gradient(circle, rgba(25,25,30,0.8) 0%, rgba(15,15,20,0.9) 90%)',
                    boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
                  }}
                />

                {/* ── Spinning vinyl record (sitting on the mat) ── */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    top: '50%',
                    left: '110px',
                    transform: 'translateY(-50%)',
                    width: '160px',
                    height: '160px',
                    background: `
                      repeating-radial-gradient(circle at center,
                        rgba(0,0,0,0.55) 0px,
                        rgba(0,0,0,0.55) 1px,
                        rgba(38,40,50,0.45) 1px,
                        rgba(38,40,50,0.45) 3px
                      ),
                      radial-gradient(circle, rgba(55,57,70,0.7) 0%, rgba(12,12,20,0.95) 80%)
                    `,
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  {/* Vinyl groove highlight rings */}
                  <div className="absolute rounded-full" style={{
                    top: '10%', left: '10%', right: '10%', bottom: '10%',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }} />
                  <div className="absolute rounded-full" style={{
                    top: '22%', left: '22%', right: '22%', bottom: '22%',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }} />

                  {/* Center label */}
                  <div
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      top: '34%', left: '34%', right: '34%', bottom: '34%',
                      background: canBuild
                        ? 'radial-gradient(circle, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.05) 70%)'
                        : 'radial-gradient(circle, rgba(255,0,255,0.18) 0%, rgba(139,0,255,0.08) 70%)',
                      border: `1px solid ${canBuild ? 'rgba(0,255,136,0.4)' : 'rgba(255,0,255,0.3)'}`,
                      boxShadow: `inset 0 0 12px ${canBuild ? 'rgba(0,255,136,0.1)' : 'rgba(255,0,255,0.08)'}`,
                    }}
                  >
                    <Disc3
                      className="w-6 h-6"
                      style={{
                        color: canBuild ? '#00FF88' : '#FF00FF',
                        filter: `drop-shadow(0 0 8px ${canBuild ? '#00FF88' : '#FF00FF'})`,
                      }}
                    />
                  </div>
                </motion.div>

                {/* ── Center spindle (fixed, pierces through vinyl center) ── */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '50%',
                    left: '190px',
                    transform: 'translate(-50%, -50%)',
                    width: '10px',
                    height: '10px',
                    background: 'radial-gradient(circle, #e8e8e8 0%, #aaa 40%, #555 100%)',
                    boxShadow: '0 0 8px rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.3)',
                    zIndex: 3,
                  }}
                />

                {/* ── Tonearm assembly (mounted on the deck, right side) ── */}
                {/* Tonearm pivot mounting base on deck */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '24px',
                    right: '16px',
                    width: '22px',
                    height: '22px',
                    background: 'radial-gradient(circle, #aaa 0%, #666 50%, #333 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)',
                    zIndex: 4,
                  }}
                />
                {/* Tonearm pivot center dot */}
                <div
                  className="absolute rounded-full"
                  style={{
                    top: '31px',
                    right: '23px',
                    width: '8px',
                    height: '8px',
                    background: 'radial-gradient(circle, #ddd 0%, #777 100%)',
                    zIndex: 5,
                  }}
                />

                {/* Tonearm — rotates from pivot */}
                <motion.div
                  className="absolute"
                  style={{
                    top: '34px',
                    right: '27px',
                    transformOrigin: 'top right',
                    zIndex: 5,
                  }}
                  initial={{ rotate: -25 }}
                  animate={{ rotate: canBuild ? 5 : -25 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                >
                  {/* Tonearm shaft (S-curved look) */}
                  <div
                    style={{
                      width: '95px',
                      height: '5px',
                      background: 'linear-gradient(to bottom, #b8b8b8 0%, #888 30%, #555 60%, #444 100%)',
                      borderRadius: '3px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                  />
                  {/* Counterweight stub (behind pivot) */}
                  <div
                    className="absolute"
                    style={{
                      top: '-3px',
                      right: '-14px',
                      width: '14px',
                      height: '11px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, #999 0%, #444 70%)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                  />
                  {/* Cartridge headshell */}
                  <div
                    className="absolute"
                    style={{
                      bottom: '-7px',
                      left: '83px',
                      width: '18px',
                      height: '12px',
                      background: 'linear-gradient(135deg, #888 0%, #444 50%, #222 100%)',
                      borderRadius: '3px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Needle / stylus */}
                    {canBuild ? (
                      <motion.div
                        className="absolute rounded-full"
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.3, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          bottom: '-4px',
                          left: '6px',
                          width: '6px',
                          height: '6px',
                          background: '#00FF88',
                          boxShadow: '0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.4)',
                        }}
                      />
                    ) : (
                      <div
                        className="absolute"
                        style={{
                          bottom: '-2px',
                          left: '7px',
                          width: '4px',
                          height: '4px',
                          background: '#666',
                          borderRadius: '1px',
                        }}
                      />
                    )}
                  </div>
                </motion.div>

                {/* ── Control knobs (left side of deck) ── */}
                {[
                  { top: '20px', label: '33' },
                  { top: '55px', label: '45' },
                ].map((knob, i) => (
                  <div key={i} className="absolute" style={{ left: '18px', top: knob.top, zIndex: 2 }}>
                    <div
                      className="rounded-full flex items-center justify-center"
                      style={{
                        width: '22px',
                        height: '22px',
                        background: 'radial-gradient(circle, #777 0%, #333 70%)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
                      }}
                    >
                      <span className="text-[7px] font-mono text-gray-400">{knob.label}</span>
                    </div>
                  </div>
                ))}

                {/* Power LED */}
                <div
                  className="absolute rounded-full"
                  style={{
                    bottom: '20px',
                    left: '22px',
                    width: '6px',
                    height: '6px',
                    background: canBuild ? '#00FF88' : '#FF6B00',
                    boxShadow: canBuild
                      ? '0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.4)'
                      : '0 0 6px #FF6B00',
                    zIndex: 2,
                  }}
                />

                {/* Ready pulse ring around platter */}
                {canBuild && (
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      top: '50%',
                      left: '100px',
                      transform: 'translateY(-50%)',
                      width: '180px',
                      height: '180px',
                    }}
                    animate={{ scale: [1, 1.15], opacity: [0.4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  >
                    <div className="w-full h-full rounded-full border-2 border-green-400/40" />
                  </motion.div>
                )}
              </div>

              <p className="text-[11px] text-gray-500 mt-4 font-mono uppercase tracking-[0.25em]">Show Deck</p>
            </div>

            {/* ═══ INTERACTIVE LAYER — flat, clickable ═══ */}
            {/* Build button on hub */}
            {canBuild && (
              <motion.button
                onClick={onBuild}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="absolute z-30 px-7 py-2.5 rounded-full text-sm font-bold flex items-center gap-2"
                style={{
                  top: 'calc(50% + 85px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(255,0,255,0.1))',
                  border: '1px solid rgba(0,255,136,0.4)',
                  color: '#00FF88',
                  boxShadow: '0 0 24px rgba(0,255,136,0.15)',
                }}
              >
                <Sparkles className="w-4 h-4" />
                Build Show
              </motion.button>
            )}

            {/* Orbital Nodes — positioned in flat 2D space, always clickable */}
            {rooms.map((room, i) => {
              const angle = (i / rooms.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const Icon = room.icon;
              return (
                <motion.button
                  key={room.id}
                  onClick={() => onFocusRoom?.(room.id)}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -8, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.4, delay: i * 0.06 },
                    scale: { duration: 0.4, delay: i * 0.06 },
                    y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 },
                  }}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute z-20"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className="flex flex-col items-center gap-1.5 p-4 rounded-2xl border min-w-[130px] backdrop-blur-sm"
                    style={{
                      background: `${room.color}0A`,
                      borderColor: `${room.color}30`,
                      boxShadow: `0 4px 32px ${room.color}0A, 0 0 24px ${room.color}08`,
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ background: `${room.color}18`, border: `1px solid ${room.color}40` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: room.color }} />
                    </div>
                    <span className="text-xs font-heading font-bold text-white whitespace-nowrap">{room.label}</span>
                    <span className="text-[9px] font-mono truncate max-w-[120px] opacity-60" style={{ color: room.color }}>
                      {typeof room.summary === 'function' ? room.summary() : ''}
                    </span>
                  </div>
                </motion.button>
              );
            })}

            {/* Hint when not ready to build */}
            {!canBuild && (
              <p className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 font-mono whitespace-nowrap">
                Set a show name &amp; date to unlock build
              </p>
            )}
          </motion.div>
        ) : (
          /* ── FOCUSED VIEW ── */
          <motion.div
            key="focused"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <button
              onClick={() => onFocusRoom?.(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Orbit
            </button>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}