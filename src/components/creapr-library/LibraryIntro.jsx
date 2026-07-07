import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Library Intro Sequence — cinematic door opening.
 * Fades in from black, shows antique wooden double doors with warm light,
 * doors slowly open, camera pushes through.
 */
export default function LibraryIntro({ onComplete }) {
  const [stage, setStage] = useState('black'); // black → doors → opening → entering

  useEffect(() => {
    const t1 = setTimeout(() => setStage('doors'), 400);
    const t2 = setTimeout(() => setStage('opening'), 1800);
    const t3 = setTimeout(() => setStage('entering'), 4200);
    const t4 = setTimeout(() => onComplete(), 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden" style={{ perspective: '1200px' }}>
      {/* Warm light behind doors */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[60vh] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, hsl(40 80% 50% / 0.7) 0%, hsl(35 70% 35% / 0.3) 40%, transparent 70%)',
          opacity: stage === 'black' ? 0 : stage === 'doors' ? 0.4 : stage === 'opening' ? 0.7 : 1,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* Left door */}
      <motion.div
        className="absolute top-0 bottom-0 right-1/2 origin-right"
        style={{
          width: '50%',
          background: `
            linear-gradient(90deg,
              hsl(25 30% 8%) 0%,
              hsl(28 35% 12%) 30%,
              hsl(30 40% 15%) 50%,
              hsl(28 35% 10%) 70%,
              hsl(25 30% 6%) 100%
            )
          `,
          boxShadow: 'inset -4px 0 12px hsl(0 0% 0% / 0.5)',
          transformStyle: 'preserve-3d',
        }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: stage === 'opening' || stage === 'entering' ? -85 : 0 }}
        transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Door panel details */}
        <div className="absolute inset-4 border-2 rounded-lg" style={{ borderColor: 'hsl(35 30% 18% / 0.6)' }} />
        <div className="absolute inset-8 border rounded-lg" style={{ borderColor: 'hsl(35 25% 15% / 0.4)' }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3 h-12 rounded-full" style={{ background: 'hsl(40 50% 30% / 0.5)' }} />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-3 h-12 rounded-full" style={{ background: 'hsl(40 50% 30% / 0.5)' }} />
      </motion.div>

      {/* Right door */}
      <motion.div
        className="absolute top-0 bottom-0 left-1/2 origin-left"
        style={{
          width: '50%',
          background: `
            linear-gradient(90deg,
              hsl(25 30% 6%) 0%,
              hsl(28 35% 10%) 30%,
              hsl(30 40% 15%) 50%,
              hsl(28 35% 12%) 70%,
              hsl(25 30% 8%) 100%
            )
          `,
          boxShadow: 'inset 4px 0 12px hsl(0 0% 0% / 0.5)',
          transformStyle: 'preserve-3d',
        }}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: stage === 'opening' || stage === 'entering' ? 85 : 0 }}
        transition={{ duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="absolute inset-4 border-2 rounded-lg" style={{ borderColor: 'hsl(35 30% 18% / 0.6)' }} />
        <div className="absolute inset-8 border rounded-lg" style={{ borderColor: 'hsl(35 25% 15% / 0.4)' }} />
        <div className="absolute top-1/4 right-1/2 translate-x-1/2 w-3 h-12 rounded-full" style={{ background: 'hsl(40 50% 30% / 0.5)' }} />
        <div className="absolute bottom-1/4 right-1/2 translate-x-1/2 w-3 h-12 rounded-full" style={{ background: 'hsl(40 50% 30% / 0.5)' }} />
      </motion.div>

      {/* Camera push-through zoom */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1 }}
        animate={{ scale: stage === 'entering' ? 2.5 : 1 }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
        style={{ pointerEvents: 'none' }}
      >
        {/* Fade to black on exit */}
        <AnimatePresence>
          {stage === 'entering' && (
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.4 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}