import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import VinylCoverForm from '@/components/music/VinylCoverForm';
import TurntableHub from '@/components/music/TurntableHub';
import OrbitalVinylNode from '@/components/music/OrbitalVinylNode';
import RecordingOverlay from '@/components/music/RecordingOverlay';

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
  completedModules,
  recording,
  onFlyComplete,
  onComplete,
  totalModules = 0,
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

  // Elliptical orbit — deck is wider than tall, so radiusX > radiusY.
  // hubCenter is the geometric center of the full TurntableHub wrapper,
  // NOT the vinyl platter. All nodes + rings reference this same origin.
  const radiusX = isMobile ? 175 : 340;
  const radiusY = isMobile ? 135 : 245;
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
              {/* Outer orbital ring (elliptical to match deck proportions) */}
              <div
                className="absolute rounded-full"
                style={{
                  width: radiusX * 2,
                  height: radiusY * 2,
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 0 100px rgba(255,0,255,0.05), inset 0 0 80px rgba(0,255,255,0.025)',
                }}
              />
              {/* Inner dashed ring */}
              <div
                className="absolute rounded-full border border-dashed"
                style={{
                  width: radiusX * 1.35,
                  height: radiusY * 1.35,
                  borderColor: 'rgba(255,255,255,0.03)',
                }}
              />
            </div>

            {/* ═══ Central Hub — turntable + nodes share same absolute center ═══ */}
            <div className="absolute inset-0">
              {/* Turntable deck — centered on the full wrapper bounding box.
                  hubCenter = 50%/50% of this container. Nodes and rings
                  use this same origin. No shift — the deck center IS the orbit center. */}
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <TurntableHub
                  recordingPhase={recording?.phase}
                  completedCount={completedModules?.size || 0}
                  totalModules={totalModules || rooms.length}
                />
                <RecordingOverlay
                  phase={recording?.phase}
                  roomLabel={rooms.find(r => r.id === recording?.roomId)?.label}
                />
              </div>

              {/* Build is automatic when all modules are recorded */}

              {/* Orbital Nodes — elliptical orbit around hubCenter (deck center).
                  Static positioning on the outer div keeps the node center
                  anchored to the exact calculated coordinate; Framer Motion
                  animations live on the inner motion.button so they never
                  override the translate(-50%,-50%) centering. */}
              {rooms.map((room, i) => {
                // Skip completed nodes (they've been recorded into the deck)
                if (completedModules?.has(room.id) && recording?.roomId !== room.id) return null;
                // Skip the node currently flying to the deck (unless still in flying phase)
                if (recording?.roomId === room.id && recording?.phase !== 'flying') return null;

                const angle = (i / rooms.length) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * radiusX;
                const y = Math.sin(angle) * radiusY;
                const Icon = room.icon;
                const isCompleted = completedModules?.has(room.id);

                return (
                  <div
                    key={room.id}
                    className="absolute z-20"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <motion.button
                      type="button"
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
                    >
                      <OrbitalVinylNode
                        label={room.label}
                        summary={typeof room.summary === 'function' ? room.summary() : ''}
                        color={room.color}
                        Icon={Icon}
                      />
                    </motion.button>
                  </div>
                );
              })}

              {/* Flying vinyl — animates from orbital position to deck center */}
              {recording?.phase === 'flying' && (() => {
                const roomIndex = rooms.findIndex(r => r.id === recording.roomId);
                if (roomIndex === -1) return null;
                const room = rooms[roomIndex];
                const angle = (roomIndex / rooms.length) * Math.PI * 2 - Math.PI / 2;
                const startX = Math.cos(angle) * radiusX;
                const startY = Math.sin(angle) * radiusY;
                const Icon = room.icon;
                return (
                  <motion.div
                    key="flying-vinyl"
                    className="absolute z-40"
                    style={{ left: '50%', top: '50%' }}
                    initial={{ x: startX, y: startY, scale: 1 }}
                    animate={{ x: 0, y: 0, scale: 0.5 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    onAnimationComplete={onFlyComplete}
                  >
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                      <OrbitalVinylNode
                        label={room.label}
                        color={room.color}
                        Icon={Icon}
                      />
                    </div>
                  </motion.div>
                );
              })()}

              {/* Progress indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center">
                <p className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                  {completedModules?.size || 0} / {rooms.length} modules recorded
                </p>
              </div>
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
                onComplete={onComplete}
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