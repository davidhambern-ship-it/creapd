import React from 'react';
import { motion } from 'framer-motion';
import { Disc3 } from 'lucide-react';

/**
 * TurntableHub — just the spinning vinyl record + spindle.
 * The record center IS the hub center, so orbital nodes align perfectly.
 *
 * Props:
 *  - canBuild: boolean — controls vinyl label glow
 */
export default function TurntableHub({ canBuild = false }) {
  return (
    <div
      className="pointer-events-none relative flex items-center justify-center"
      style={{ width: '192px', height: '192px', flexShrink: 0 }}
    >
      {/* ── Rubber platter mat (subtle dark circle behind vinyl) ── */}
      <div
        className="absolute rounded-full"
        style={{
          width: '184px',
          height: '184px',
          background: 'radial-gradient(circle, rgba(25,25,30,0.8) 0%, rgba(15,15,20,0.9) 90%)',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 0 60px rgba(255,0,255,0.05)',
        }}
      />

      {/* ── Spinning vinyl record ── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '180px',
          height: '180px',
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
          width: '10px',
          height: '10px',
          background: 'radial-gradient(circle, #e8e8e8 0%, #aaa 40%, #555 100%)',
          boxShadow: '0 0 8px rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.3)',
          zIndex: 3,
        }}
      />

      {/* Ready pulse ring */}
      {canBuild && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: '184px', height: '184px' }}
          animate={{ scale: [1, 1.15], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        >
          <div className="w-full h-full rounded-full border-2 border-green-400/40" />
        </motion.div>
      )}
    </div>
  );
}