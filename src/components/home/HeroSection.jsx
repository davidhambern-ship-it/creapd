import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Compass, MapPin } from 'lucide-react';
import CreapdLogo from '@/components/brand/CreapdLogo';
import CursorGlow from '@/components/creap/CursorGlow';

export default function HeroSection({ onStart, onExplore, onTour }) {
  return (
    <section className="relative min-h-[70vh] lg:min-h-[80vh] flex items-center justify-center overflow-hidden px-4">
      <CursorGlow />
      {/* Ambient gradient blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-berna-purple/15 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-berna-orange/15 blur-[100px]"
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-berna-emerald/10 blur-[90px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Particle dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      <div className="relative text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <CreapdLogo height="h-40 lg:h-56" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-6xl lg:text-8xl mb-4 tracking-wide digital-pop animated-gradient-text holo-shimmer"
          style={{ fontFamily: "'CreapdCustom', sans-serif" }}
        >
          Welcome to CREAPD
        </motion.h1>

        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.12, delayChildren: 0.4 }}
          className="text-2xl lg:text-4xl font-heading font-semibold mb-2 flex flex-wrap justify-center gap-x-3 gap-y-1"
          style={{ fontFamily: "'Robotica', sans-serif" }}
        >
          {[
            { word: 'Create.', color: 'text-berna-orange neon-flicker-orange' },
            { word: 'Automate.', color: 'text-berna-purple neon-flicker-purple' },
            { word: 'Produce.', color: 'text-berna-emerald neon-flicker-teal' },
            { word: 'Direct.', color: 'text-white neon-flicker-white' },
          ].map((item, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.8, filter: 'blur(8px)' },
                visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
              }}
              transition={{ duration: 0.6 }}
              className={`${item.color} tagline-word`}
            >
              {item.word}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-base lg:text-lg text-muted-foreground mb-8 tracking-[0.2em] uppercase subheader-reveal"
          style={{ textShadow: '0 0 8px hsl(270 80% 60% / 0.3)' }}
        >
          The AI Production Company
        </motion.p>


      </div>
    </section>
  );
}