import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power, Sparkles, Bot, Newspaper, Package, Presentation,
  Download, Filter, X, Check, MousePointerClick, ArrowRight,
} from 'lucide-react';
import CreapdLogo from '@/components/brand/CreapdLogo';

// ─── Scene 1: Black screen, logo slowly appears ───
export function BlackLogoReveal() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2.5, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <CreapdLogo height="h-14" />
    </motion.div>
  );
}

// ─── Scene 2: Logo expands, particles emerge ───
export function LogoExpand() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-berna-orange"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
          animate={{
            x: (Math.cos((i / 12) * Math.PI * 2) * 120),
            y: (Math.sin((i / 12) * Math.PI * 2) * 120),
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 2, delay: i * 0.08, repeat: Infinity, repeatDelay: 1 }}
        />
      ))}
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <CreapdLogo height="h-16" />
      </motion.div>
    </div>
  );
}

// ─── Scene 3: Avatar with glow + orbiting dots ───
export function AvatarIntro() {
  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full bg-berna-purple/20 blur-2xl"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-berna-purple to-purple-800 flex items-center justify-center glow-purple"
      >
        <Bot className="w-12 h-12 text-white" />
      </motion.div>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2"
          animate={{ rotate: 360 }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute w-2 h-2 rounded-full bg-berna-orange"
            style={{ transform: `translateX(${48 + i * 8}px)` }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Scene 4: Story Queue self-demonstration ───
export function StoryQueueDemo() {
  const [stage, setStage] = useState(0);
  // 0: queue slides in, 1: cards appear, 2: sift highlights, 3: rejects fade, 4: packet collects

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 600),
      setTimeout(() => setStage(2), 1800),
      setTimeout(() => setStage(3), 3000),
      setTimeout(() => setStage(4), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stories = [
    { title: 'Breaking: Markets surge', kept: true },
    { title: 'Local hero saves family', kept: true },
    { title: 'Celebrity gossip roundup', kept: false },
    { title: 'Tech giant unveils AI chip', kept: true },
    { title: 'Clickbait headline here', kept: false },
    { title: 'Climate summit update', kept: true },
  ];

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      <div className="glass-panel p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Story Queue</span>
          <motion.div
            animate={stage >= 2 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: stage >= 2 && stage < 4 ? 2 : 0 }}
          >
            <Filter className={`w-3.5 h-3.5 ${stage >= 2 ? 'text-berna-orange' : 'text-muted-foreground'}`} />
          </motion.div>
        </div>

        {/* Story cards */}
        <div className="space-y-1.5">
          {stories.map((story, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{
                opacity: stage <= 1 ? 0 : (stage >= 3 && !story.kept) ? 0.15 : 1,
                x: 0,
              }}
              transition={{ delay: stage >= 1 ? i * 0.15 : 0, duration: 0.3 }}
              className={`flex items-center gap-2 p-1.5 rounded-md text-[10px] ${
                stage >= 3 && !story.kept
                  ? 'bg-destructive/5 line-through'
                  : 'bg-white/[0.03]'
              }`}
            >
              <span className={`flex-1 truncate ${stage >= 3 && !story.kept ? 'text-muted-foreground/40' : 'text-white/70'}`}>
                {story.title}
              </span>
              {stage >= 3 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {story.kept
                    ? <Check className="w-3 h-3 text-berna-emerald" />
                    : <X className="w-3 h-3 text-destructive/50" />
                  }
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Decision Packet */}
        <AnimatePresence>
          {stage >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              className="mt-2 p-2 rounded-md bg-berna-emerald/10 border border-berna-emerald/20 flex items-center gap-2"
            >
              <Package className="w-3.5 h-3.5 text-berna-emerald" />
              <span className="text-[10px] font-mono text-berna-emerald">Decision Packet · 4 stories approved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Scene 5: Busy dashboard flash → dissolve → spotlight ───
export function SpotlightFocus() {
  const [phase, setPhase] = useState('busy'); // busy → dissolve → spotlight

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dissolve'), 1500);
    const t2 = setTimeout(() => setPhase('spotlight'), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'spotlight') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md h-48 flex items-center justify-center"
      >
        {/* Spotlight radial gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, hsl(270 80% 60% / 0.15) 0%, transparent 50%), radial-gradient(circle at center, transparent 30%, hsl(220 20% 6%) 70%)',
          }}
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 w-28 h-28 rounded-xl bg-white/[0.04] border border-berna-purple/30 flex items-center justify-center glow-purple"
        >
          <Newspaper className="w-10 h-10 text-berna-purple" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={phase === 'dissolve' ? { filter: 'blur(12px)', opacity: 0, scale: 1.1 } : { filter: 'blur(0px)', opacity: 1, scale: 1 }}
      transition={{ duration: 0.7 }}
      className="w-full max-w-md opacity-60"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded ${i % 3 === 0 ? 'h-8 bg-white/[0.06]' : i % 3 === 1 ? 'h-8 bg-berna-purple/10' : 'h-8 bg-berna-orange/10'}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Scene 6: Automation flow visualization ───
export function AutomationFlow() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),  // click ripple
      setTimeout(() => setStage(2), 1200), // stories flow
      setTimeout(() => setStage(3), 2200), // packages appear
      setTimeout(() => setStage(4), 3200), // slides build
      setTimeout(() => setStage(5), 4200), // presentation assembles
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stages = [
    { icon: Newspaper, label: 'Stories', color: 'text-berna-orange', active: stage >= 2 },
    { icon: Package, label: 'Packages', color: 'text-berna-purple', active: stage >= 3 },
    { icon: Presentation, label: 'Slides', color: 'text-berna-emerald', active: stage >= 4 },
    { icon: Download, label: 'Deliver', color: 'text-white', active: stage >= 5 },
  ];

  return (
    <div className="w-full max-w-lg">
      {/* Click ripple */}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <MousePointerClick className="w-8 h-8 text-berna-orange" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-berna-orange"
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flow pipeline */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {stages.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 10 }}
                animate={step.active ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.15, scale: 0.9, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={`w-11 h-11 rounded-xl bg-white/[0.04] border ${step.active ? 'border-white/15' : 'border-white/5'} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${step.active ? step.color : 'text-muted-foreground/30'}`} />
                </div>
                <span className="text-[9px] font-mono uppercase text-muted-foreground">{step.label}</span>
              </motion.div>
              {i < stages.length - 1 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: step.active ? 12 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-px bg-gradient-to-r from-white/20 to-transparent"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Assembled presentation preview */}
      <AnimatePresence>
        {stage >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-5 mx-auto max-w-xs glass-panel p-2"
          >
            <div className="aspect-video rounded bg-gradient-to-br from-berna-purple/20 to-berna-orange/10 flex items-center justify-center">
              <Presentation className="w-6 h-6 text-white/40" />
            </div>
            <p className="text-[9px] font-mono text-muted-foreground mt-1.5 text-center">Presentation Assembled · Ready</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Scene 7: Fade to black → "Let's CREAP" → home slides in ───
export function FadeTransition() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="flex items-center justify-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple"
      >
        <ArrowRight className="w-10 h-10 text-white" />
      </motion.div>
    </motion.div>
  );
}