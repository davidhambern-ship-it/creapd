import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward, ChevronRight } from 'lucide-react';

export default function CinematicIntro({ videoUrl, onEnter }) {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Video */}
      <video
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoEnded(true)}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90" />

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scan-line-overlay" />
      </div>

      {/* CREAPr narration overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-lg text-center px-6 z-10"
      >
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#FF00FF] animate-pulse" style={{ boxShadow: '0 0 8px #FF00FF' }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">CREAPr</span>
        </div>
        <p className="font-conv text-lg leading-relaxed">
          <span className="animate-word-reveal" style={{ animationDelay: '1.5s', color: '#fff' }}>Welcome to the </span>
          <span className="animate-word-reveal" style={{ animationDelay: '1.8s', color: '#FF00FF', textShadow: '0 0 12px #FF00FF80' }}>Discovery Room</span>
          <span className="animate-word-reveal" style={{ animationDelay: '2.1s', color: '#fff' }}>. </span>
          <span className="animate-word-reveal" style={{ animationDelay: '2.4s', color: 'rgba(255,255,255,0.7)' }}>Let's craft your show together.</span>
        </p>
      </motion.div>

      {/* Enter button (appears after video) */}
      <AnimatePresence>
        {videoEnded && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={onEnter}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-8 py-3 rounded-full cp-btn-gradient text-white font-heading font-bold text-sm"
          >
            Enter Studio <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Skip button */}
      {!videoEnded && (
        <button
          onClick={onEnter}
          className="absolute top-6 right-6 z-20 flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors"
        >
          Skip <SkipForward className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}