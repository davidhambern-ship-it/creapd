import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Clapperboard, Package, Volume2, Presentation, Share2 } from 'lucide-react';
import CircuitBackground from './CircuitBackground';

const PIPELINE_STEPS = [
  { icon: Lightbulb, label: 'Idea', color: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/50', glow: 'shadow-[0_0_20px_hsl(25_95%_55%/0.3)]', description: 'Start with a concept — a story, topic, or message you want to produce.' },
  { icon: Clapperboard, label: 'Production Profile', color: 'text-berna-purple', bg: 'bg-berna-purple/10', border: 'border-berna-purple/50', glow: 'shadow-[0_0_20px_hsl(270_80%_60%/0.3)]', description: 'Pick a vertical — News, Talk, Cooking, Sports, Music, Cosmo, or Spiritual.' },
  { icon: Package, label: 'Story / Message Package', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', border: 'border-berna-emerald/50', glow: 'shadow-[0_0_20px_hsl(152_60%_45%/0.3)]', description: 'CREAPD sifts sources and assembles a structured production package.' },
  { icon: Volume2, label: 'Voice + Media', color: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/50', glow: 'shadow-[0_0_20px_hsl(25_95%_55%/0.3)]', description: 'Generate AI voiceovers, thumbnails, and media assets.' },
  { icon: Presentation, label: 'Presentation', color: 'text-berna-purple', bg: 'bg-berna-purple/10', border: 'border-berna-purple/50', glow: 'shadow-[0_0_20px_hsl(270_80%_60%/0.3)]', description: 'Combine everything into a timed, scene-by-scene presentation.' },
  { icon: Share2, label: 'Export / Share', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', border: 'border-berna-emerald/50', glow: 'shadow-[0_0_20px_hsl(152_60%_45%/0.3)]', description: 'Export your finished production or share it to your platform.' },
];

const cardVariants = {
  hidden: { opacity: 0, rotateY: -90, scale: 0.3 },
  visible: (i) => ({
    opacity: 1,
    rotateY: 0,
    scale: 1,
    transition: {
      delay: i * 0.15,
      type: 'spring',
      stiffness: 120,
      damping: 12,
    },
  }),
};

const arrowVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: (i) => ({
    opacity: 1,
    scaleX: 1,
    transition: {
      delay: i * 0.15 + 0.3,
      duration: 0.4,
      ease: 'easeOut',
    },
  }),
};

function FlipCard({ step, idx }) {
  const [flipped, setFlipped] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      custom={idx}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="flex-1 lg:max-w-[180px] origin-center"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onHoverStart={() => setFlipped(true)}
        onHoverEnd={() => setFlipped(false)}
        onClick={() => setFlipped(!flipped)}
        className="relative w-full cursor-pointer"
        style={{ transformStyle: 'preserve-3d', minHeight: '120px' }}
      >
        {/* Front face */}
        <div
          className={`absolute inset-0 flex items-center gap-3 lg:flex-col lg:text-center glass-panel border ${step.border} ${step.glow} px-4 py-3 lg:px-3 lg:py-4 transition-shadow duration-300`}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${step.color}`} />
          </div>
          <span className="text-xs lg:text-[11px] font-heading font-semibold text-white/90 leading-tight">
            {step.label}
          </span>
        </div>

        {/* Back face — description */}
        <div
          className={`absolute inset-0 flex items-center justify-center glass-panel border ${step.border} px-4 py-3 lg:px-3 lg:py-4`}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <p className={`text-[10px] leading-tight text-center overflow-hidden ${step.color}`}>
            {step.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PipelineExplainer() {
  return (
    <section className="relative px-4 lg:px-6 py-8 lg:py-12 max-w-5xl mx-auto overflow-hidden rounded-xl">
      {/* Animated circuit board background */}
      <CircuitBackground />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/70 rounded-xl pointer-events-none" />

      <div className="relative text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-xl lg:text-2xl font-heading font-bold text-white inline-block"
          style={{ textShadow: '0 0 8px hsl(270 80% 60% / 0.6), 0 0 20px hsl(270 80% 60% / 0.3)' }}
        >
          What Is <span className="text-2xl lg:text-3xl" style={{ fontFamily: "'01 Digitall', sans-serif", letterSpacing: '0.05em' }}>CREAPD</span>?
        </motion.h2>
        <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
          CREAPD helps creators turn ideas into complete productions. Choose a Production Profile,
          generate a structured package, create voice, media, and presentation assets, direct the
          final presentation, then export or share your finished production.
        </p>
      </div>

      {/* Pipeline — horizontal on desktop, vertical on mobile */}
      <div
        className="flex flex-col lg:flex-row items-stretch justify-center gap-2 lg:gap-1"
        style={{ perspective: '1000px' }}
      >
        {PIPELINE_STEPS.map((step, idx) => (
          <React.Fragment key={step.label}>
            <FlipCard step={step} idx={idx} />
            {idx !== PIPELINE_STEPS.length - 1 && (
              <motion.div
                custom={idx}
                variants={arrowVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="flex items-center justify-center lg:px-0.5 origin-left"
              >
                <motion.svg
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.2 }}
                  className="w-4 h-4 text-berna-emerald rotate-90 lg:rotate-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  style={{ filter: 'drop-shadow(0 0 4px hsl(152 60% 45% / 0.6))' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </motion.svg>
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}