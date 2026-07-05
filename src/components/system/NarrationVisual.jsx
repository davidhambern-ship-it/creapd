import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Bot, Newspaper, Package, Presentation, Download,
  ArrowDown, Zap, Music, Trophy, ChefHat, Mic2, Church, Users,
} from 'lucide-react';
import CreapdLogo from '@/components/brand/CreapdLogo';

const PROFILE_ICONS = [
  { icon: Newspaper, color: 'text-berna-orange', label: 'News' },
  { icon: Music, color: 'text-berna-purple', label: 'Music' },
  { icon: Mic2, color: 'text-berna-emerald', label: 'Talk' },
  { icon: Trophy, color: 'text-amber-400', label: 'Sports' },
  { icon: ChefHat, color: 'text-orange-400', label: 'Cooking' },
  { icon: Church, color: 'text-blue-400', label: 'Spiritual' },
  { icon: Users, color: 'text-pink-400', label: 'Cosmo' },
];

export default function NarrationVisual({ visual }) {
  switch (visual) {
    case 'persona':
      return (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-berna-purple/20 blur-2xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-berna-purple to-purple-800 flex items-center justify-center glow-purple">
            <Bot className="w-12 h-12 text-white" />
          </div>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-berna-orange"
              style={{ top: '50%', left: '50%' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="absolute w-2 h-2 rounded-full bg-berna-orange"
                style={{ transform: `translateX(${48 + i * 8}px)` }}
              />
            </motion.div>
          ))}
        </motion.div>
      );

    case 'pipeline':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {[
            { icon: Newspaper, label: 'Sift', color: 'text-berna-orange' },
            { icon: Package, label: 'Build', color: 'text-berna-purple' },
            { icon: Presentation, label: 'Direct', color: 'text-berna-emerald' },
            { icon: Download, label: 'Deliver', color: 'text-white' },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.3 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-mono uppercase">{step.label}</span>
                </motion.div>
                {i < 3 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 16 }}
                    transition={{ delay: i * 0.3 + 0.2 }}
                    className="h-px bg-gradient-to-r from-white/20 to-transparent"
                  />
                )}
              </React.Fragment>
            );
          })}
        </motion.div>
      );

    case 'tagline':
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <CreapdLogo height="h-14" />
          <motion.div
            className="flex gap-2 flex-wrap justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {['Create.', 'Automate.', 'Produce.', 'Direct.'].map((word, i) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                className={`font-heading font-bold text-base ${
                  ['text-berna-orange', 'text-berna-purple', 'text-berna-emerald', 'text-white'][i]
                }`}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      );

    case 'profiles':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-wrap gap-3 justify-center max-w-md"
        >
          {PROFILE_ICONS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.label}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.12 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono uppercase">{p.label}</span>
              </motion.div>
            );
          })}
        </motion.div>
      );

    case 'arrow-down':
      return (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple"
          >
            <ArrowDown className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
      );

    case 'reveal':
      return (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-berna-emerald to-berna-purple flex items-center justify-center glow-emerald"
        >
          <Zap className="w-10 h-10 text-white" />
        </motion.div>
      );

    default:
      return null;
  }
}