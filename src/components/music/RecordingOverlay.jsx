import React from 'react';
import { motion } from 'framer-motion';

/**
 * RecordingOverlay — visual feedback rendered on top of the TurntableHub
 * during the vinyl recording animation sequence.
 *
 * Phases:
 *  - 'recording': "● REC" label + animated waveform bars
 *  - 'pulse':     expanding green ring (data captured)
 *  - 'complete':  "Discovery Complete" text
 */
export default function RecordingOverlay({ phase, roomLabel }) {
  if (!phase || phase === 'flying') return null;

  if (phase === 'recording') {
    return (
      <div
        className="absolute pointer-events-none z-30"
        style={{ bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '100%' }}
      >
        <div className="text-center">
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-[9px] font-mono font-bold whitespace-nowrap"
            style={{ color: '#FF0044', textShadow: '0 0 6px rgba(255,0,68,0.6)' }}
          >
            ● REC{roomLabel ? ` · ${roomLabel}` : ''}
          </motion.p>
          <div className="flex gap-px mt-1 justify-center items-end" style={{ height: '14px' }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [2, 12, 2] }}
                transition={{ duration: 0.25, repeat: Infinity, delay: i * 0.03, ease: 'easeInOut' }}
                style={{ width: 2, background: '#FF0044', borderRadius: 1 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'pulse') {
    return (
      <motion.div
        className="absolute pointer-events-none z-30 rounded-full"
        style={{ top: '50%', left: '50%' }}
        initial={{ width: 80, height: 80, x: '-50%', y: '-50%', opacity: 0.9 }}
        animate={{ width: 260, height: 260, x: '-50%', y: '-50%', opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div
          className="w-full h-full rounded-full border-2"
          style={{ borderColor: '#00FF88', boxShadow: '0 0 20px rgba(0,255,136,0.4)' }}
        />
      </motion.div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
        <motion.p
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-xs font-heading font-bold"
          style={{ color: '#00FF88', textShadow: '0 0 16px rgba(0,255,136,0.8)', marginBottom: '100px' }}
        >
          Discovery Complete
        </motion.p>
      </div>
    );
  }

  return null;
}