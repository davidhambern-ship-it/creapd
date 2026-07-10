import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import VinylCoverForm from '@/components/music/VinylCoverForm';
import TurntableHub from '@/components/music/TurntableHub';

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
  children,
  config,
  updateConfig,
  toggleArrayItem,
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

  const radius = isMobile ? 145 : 230;
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
            style={{ height: isMobile ? '560px' : 'calc(100vh - 160px)', minHeight: isMobile ? '560px' : '720px' }}
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

            {/* ═══ Central Hub — turntable + nodes share same absolute center ═══ */}
            <div className="absolute inset-0">
              {/* Turntable deck — absolutely centered at 50%/50% */}
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <TurntableHub canBuild={canBuild} />
              </div>

              {/* Build button below deck */}
              {canBuild && (
                <motion.button
                  onClick={onBuild}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  className="absolute z-30 px-7 py-2.5 rounded-full text-sm font-bold flex items-center gap-2"
                  style={{
                    top: 'calc(50% + 170px)',
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

              {/* Orbital Nodes — floating around the deck center */}
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
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 font-mono whitespace-nowrap z-20">
                  Set a show name &amp; date to unlock build
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          /* ── FOCUSED VIEW — Vinyl Cover Form ── */
          <motion.div
            key="focused"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center py-4"
          >
            {config && updateConfig ? (
              <VinylCoverForm
                room={focusedRoom}
                config={config}
                updateConfig={updateConfig}
                toggleArrayItem={toggleArrayItem}
                onBack={() => onFocusRoom?.(null)}
              />
            ) : (
              <>
                <button
                  onClick={() => onFocusRoom?.(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors mb-4"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Orbit
                </button>
                {children}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}