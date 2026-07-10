import React from 'react';
import { motion } from 'framer-motion';
import TurntableHub from '@/components/music/TurntableHub';
import RecordingOverlay from '@/components/music/RecordingOverlay';

/**
 * MobileConfigLayout — replaces the orbital canvas on mobile.
 * Shows a compact turntable hub at top, then a 2-column grid of
 * room cards below. No overlap, clean, scrollable.
 *
 * Recording/flying animation: when a module is recording, the card
 * scales down and fades toward the hub, mirroring the desktop fly-to-deck.
 */
export default function MobileConfigLayout({
  rooms = [],
  focusedRoom = null,
  onFocusRoom,
  completedModules,
  recording,
  onFlyComplete,
  totalModules = 0,
}) {
  const isRecording = (roomId) => recording?.roomId === roomId;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Compact hub */}
      <div className="relative" style={{ transform: 'scale(0.4)', transformOrigin: 'top center', marginBottom: '-40px' }}>
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

      {/* Progress */}
      <p className="text-[10px] text-gray-500 font-mono mb-3">
        {completedModules?.size || 0} / {rooms.length} modules recorded
      </p>

      {/* Room grid */}
      <div className="grid grid-cols-2 gap-3 w-full px-1">
        {rooms.map((room, i) => {
          const isDone = completedModules?.has(room.id);
          const isFlying = isRecording(room.id) && recording?.phase === 'flying';
          const isRecordingThis = isRecording(room.id) && recording?.phase !== 'flying';
          const Icon = room.icon;
          const summary = typeof room.summary === 'function' ? room.summary() : '';

          if (isDone && !isRecording(room.id)) return null;

          return (
            <motion.button
              key={room.id}
              type="button"
              onClick={() => !isRecording(room.id) && onFocusRoom?.(room.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={
                isFlying
                  ? { opacity: 0, scale: 0.3, y: -120 }
                  : isRecordingThis
                    ? { opacity: 0.4, scale: 0.9 }
                    : { opacity: 1, y: 0, scale: 1 }
              }
              transition={{
                opacity: { duration: 0.4, delay: i * 0.05 },
                y: { duration: 0.4, delay: i * 0.05 },
                scale: isFlying ? { duration: 0.8, ease: [0.4, 0, 0.2, 1] } : { duration: 0.3 },
              }}
              onAnimationComplete={() => isFlying && onFlyComplete?.()}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center"
              style={{
                background: `${room.color}0a`,
                border: `1px solid ${room.color}30`,
                boxShadow: isRecordingThis ? `0 0 20px ${room.color}40` : 'none',
              }}
            >
              {/* Vinyl disc mini */}
              <div
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
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
                  boxShadow: `0 0 12px ${room.color}20`,
                }}
              >
                <div
                  className="absolute rounded-full flex items-center justify-center"
                  style={{
                    width: 28,
                    height: 28,
                    background: `radial-gradient(circle, ${room.color}22 0%, ${room.color}08 70%)`,
                    border: `1px solid ${room.color}40`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: room.color, filter: `drop-shadow(0 0 4px ${room.color}80)` }} />
                </div>
              </div>

              <div>
                <p className="text-xs font-heading font-semibold text-white leading-tight">{room.label}</p>
                {summary && <p className="text-[9px] text-gray-500 mt-0.5 truncate max-w-[120px]">{summary}</p>}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}