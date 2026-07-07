import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain, ScrollText, Globe2, FlaskConical, BookOpen,
  Compass, CircuitBoard, Crown, Newspaper, Sparkles, History, Lightbulb,
  Cpu, Database, Radio, Network
} from 'lucide-react';

const ICON_MAP = {
  rock: Mountain,
  scroll: ScrollText,
  globe: Globe2,
  flask: FlaskConical,
  book: BookOpen,
  compass: Compass,
  circuit: CircuitBoard,
  crown: Crown,
  cpu: Cpu,
  database: Database,
  radio: Radio,
  network: Network,
};

const BOOK_COLORS = [
  { bg: 'hsl(270 80% 45%)', glow: 'hsl(270 80% 60%)' },
  { bg: 'hsl(190 90% 40%)', glow: 'hsl(190 90% 55%)' },
  { bg: 'hsl(152 60% 38%)', glow: 'hsl(152 60% 50%)' },
  { bg: 'hsl(25 95% 45%)', glow: 'hsl(25 95% 60%)' },
  { bg: 'hsl(340 75% 45%)', glow: 'hsl(340 75% 60%)' },
  { bg: 'hsl(210 80% 45%)', glow: 'hsl(210 80% 60%)' },
];

function DataShard({ color, height, delay }) {
  return (
    <motion.div
      className="w-1.5 shrink-0 rounded-t-sm"
      style={{
        background: `linear-gradient(180deg, ${color.glow} 0%, ${color.bg} 100%)`,
        height,
        boxShadow: `0 0 6px ${color.glow} / 0.4`,
      }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    />
  );
}

function BookshelfCard({ item, index, onSelect }) {
  const IconComp = ICON_MAP[item.icon_hint] || Database;
  const shardCount = 10 + (index % 5);

  return (
    <motion.button
      className="group relative w-full text-left rounded-lg overflow-hidden border transition-all"
      style={{
        borderColor: 'hsl(270 40% 30% / 0.4)',
        background: 'linear-gradient(180deg, hsl(220 40% 8% / 0.85) 0%, hsl(220 35% 5% / 0.95) 100%)',
        boxShadow: '0 0 12px hsl(270 80% 50% / 0.05), inset 0 1px 0 hsl(270 40% 20% / 0.2)',
        backdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4, borderColor: 'hsl(190 90% 50% / 0.5)' }}
      onClick={() => onSelect(item)}
    >
      {/* Data shard row at top — like a server rack */}
      <div className="flex items-end gap-0.5 px-3 pt-3 h-14" style={{ background: 'hsl(220 40% 4% / 0.7)' }}>
        {[...Array(shardCount)].map((_, i) => (
          <DataShard
            key={i}
            color={BOOK_COLORS[(i + index) % BOOK_COLORS.length]}
            height={18 + ((i * 7 + index * 3) % 28)}
            delay={index * 0.08 + i * 0.025}
          />
        ))}
      </div>
      {/* Circuit shelf line */}
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(190 90% 50% / 0.3), transparent)' }} />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <IconComp className="w-4 h-4" style={{ color: 'hsl(190 90% 55%)' }} />
          <h4 className="font-mono font-semibold text-sm uppercase tracking-wider" style={{ color: 'hsl(0 0% 90%)' }}>
            {item.name}
          </h4>
        </div>
        <p className="text-xs leading-relaxed font-mono" style={{ color: 'hsl(220 15% 55%)' }}>
          {item.description}
        </p>
      </div>

      {/* Scan line on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, hsl(190 90% 50% / 0.05) 50%, transparent 100%)',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(190 90% 50% / 0.03) 4px)',
        }}
      />
      {/* Corner accent */}
      <div
        className="absolute top-0 right-0 w-8 h-8 opacity-20"
        style={{
          borderTop: '1px solid hsl(190 90% 55%)',
          borderRight: '1px solid hsl(190 90% 55%)',
        }}
      />
    </motion.button>
  );
}

export default function LibraryShelves({ items, onSelect, variant = 'category', title }) {
  if (!items || items.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={title || 'shelves'}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-32 pt-20"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {title && (
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(190 90% 55%)', boxShadow: '0 0 6px hsl(190 90% 55%)' }} />
            <p className="text-xs uppercase tracking-[0.3em] font-mono" style={{ color: 'hsl(190 60% 55%)' }}>
              {title}
            </p>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(190 90% 55%)', boxShadow: '0 0 6px hsl(190 90% 55%)' }} />
          </motion.div>
        )}
        <div className={`grid gap-4 w-full max-w-3xl ${
          items.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'
        }`}>
          {items.map((item, i) => (
            <BookshelfCard
              key={`${item.name}-${i}`}
              item={item}
              index={i}
              onSelect={onSelect}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}