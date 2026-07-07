import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain, ScrollText, Globe2, FlaskConical, BookOpen,
  Compass, CircuitBoard, Crown, Cpu, Database, Radio, Network,
  Sparkles, ArrowRight
} from 'lucide-react';

const ICON_MAP = {
  rock: Mountain, scroll: ScrollText, globe: Globe2, flask: FlaskConical,
  book: BookOpen, compass: Compass, circuit: CircuitBoard, crown: Crown,
  cpu: Cpu, database: Database, radio: Radio, network: Network,
};

const BOOK_COLORS = [
  'hsl(350 32% 28%)', 'hsl(140 22% 24%)', 'hsl(210 32% 24%)',
  'hsl(35 38% 30%)', 'hsl(210 8% 27%)', 'hsl(300 18% 27%)',
  'hsl(180 22% 24%)', 'hsl(20 32% 27%)',
];

function BookSpine({ height, color, width = 28, interactive, label }) {
  return (
    <div
      className={`plib-book-spine ${interactive ? 'plib-book-spine-interactive' : ''}`}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        background: `linear-gradient(180deg, ${color} 0%, hsl(0 0% 0% / 0.25) 100%)`,
      }}
    >
      {label && (
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono text-white/50 whitespace-nowrap pointer-events-none"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {label.length > 12 ? label.substring(0, 12) + '…' : label}
        </span>
      )}
    </div>
  );
}

function WingShelf({ item, index, focused, onSelect }) {
  const IconComp = ICON_MAP[item.icon_hint] || Database;
  const bookCount = 7 + (index % 4);
  const interactiveIdx = index % 3;

  return (
    <motion.div
      className={`plib-wing ${focused ? 'plib-wing-focused' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="plib-shelf-label">
          <IconComp className="w-3 h-3" />
          {item.name}
        </div>
      </div>

      <div className="flex items-end gap-1 mb-1 px-1" style={{ height: '76px' }}>
        {[...Array(bookCount)].map((_, i) => (
          <BookSpine
            key={i}
            height={44 + ((i * 7 + index * 3) % 30)}
            color={BOOK_COLORS[(i + index) % BOOK_COLORS.length]}
            width={18 + (i % 4) * 4}
            interactive={i === interactiveIdx}
            label={i === interactiveIdx ? item.name : null}
          />
        ))}
      </div>

      <div className="plib-shelf-plank" />

      <p className="text-xs leading-relaxed mt-3" style={{ color: 'hsl(35 12% 57%)', fontFamily: 'Georgia, serif' }}>
        {item.description}
      </p>

      <div className="flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wider" style={{ color: 'hsl(152 38% 45%)' }}>
        <span>Enter wing</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </motion.div>
  );
}

function FeaturedBook({ item, index, onSelect }) {
  const color = BOOK_COLORS[index % BOOK_COLORS.length];
  return (
    <motion.button
      className="plib-wing text-left"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(item)}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3 h-3" style={{ color: 'hsl(38 55% 52%)' }} />
        <div className="plib-shelf-label" style={{ color: 'hsl(38 45% 58%)' }}>
          {item.name}
        </div>
      </div>
      <div className="flex items-end gap-1 mb-1 px-1" style={{ height: '76px' }}>
        <BookSpine height={60} color={color} width={30} interactive label={item.name} />
        {[...Array(5)].map((_, i) => (
          <BookSpine key={i} height={36 + (i * 5) % 18} color={BOOK_COLORS[(i + index + 1) % BOOK_COLORS.length]} width={16 + (i % 3) * 3} />
        ))}
      </div>
      <div className="plib-shelf-plank" />
      <p className="text-xs leading-relaxed mt-3" style={{ color: 'hsl(35 12% 57%)', fontFamily: 'Georgia, serif' }}>
        {item.description}
      </p>
    </motion.button>
  );
}

export default function LibraryWings({ items, variant = 'category', title, focusedWing, onSelect }) {
  if (!items || items.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={title || 'wings'}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-36 pt-24"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {title && (
          <motion.div
            className="flex items-center gap-3 mb-6"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-1 h-1 rounded-full plib-status-dot" style={{ background: 'hsl(38 55% 52%)', color: 'hsl(38 55% 52%)' }} />
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'hsl(40 28% 52%)', fontFamily: '"Oswald", sans-serif' }}>
              {title}
            </p>
            <div className="w-1 h-1 rounded-full plib-status-dot" style={{ background: 'hsl(38 55% 52%)', color: 'hsl(38 55% 52%)' }} />
          </motion.div>
        )}
        <div className={`plib-wings-grid grid gap-4 w-full max-w-3xl ${
          items.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3'
        }`}>
          {items.map((item, i) =>
            variant === 'featured' ? (
              <FeaturedBook key={`${item.name}-${i}`} item={item} index={i} onSelect={onSelect} />
            ) : (
              <WingShelf key={`${item.name}-${i}`} item={item} index={i} focused={focusedWing === item.name} onSelect={onSelect} />
            )
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}