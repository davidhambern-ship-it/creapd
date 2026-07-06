import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain, ScrollText, Globe2, FlaskConical, BookOpen,
  Compass, CircuitBoard, Crown, Newspaper, Sparkles, History, Lightbulb
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
};

const BOOK_COLORS = [
  'hsl(15 55% 35%)',
  'hsl(200 40% 30%)',
  'hsl(35 50% 35%)',
  'hsl(140 35% 28%)',
  'hsl(280 35% 35%)',
  'hsl(0 45% 32%)',
  'hsl(180 30% 30%)',
  'hsl(45 45% 33%)',
];

function BookSpine({ color, height, delay }) {
  return (
    <motion.div
      className="w-2 rounded-t-sm shrink-0"
      style={{ background: color, height }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height, opacity: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    />
  );
}

function BookshelfCard({ item, index, onSelect, variant = 'category' }) {
  const IconComp = ICON_MAP[item.icon_hint] || BookOpen;
  const bookCount = 8 + (index % 4);

  return (
    <motion.button
      className="group relative w-full text-left rounded-xl overflow-hidden border transition-all hover:scale-[1.02]"
      style={{
        borderColor: 'hsl(40 25% 18% / 0.3)',
        background: 'linear-gradient(180deg, hsl(30 25% 10% / 0.8) 0%, hsl(25 20% 6% / 0.9) 100%)',
      }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      onClick={() => onSelect(item)}
    >
      {/* Bookshelf row at top */}
      <div className="flex items-end gap-0.5 px-3 pt-3 h-16" style={{ background: 'hsl(25 20% 5% / 0.6)' }}>
        {[...Array(bookCount)].map((_, i) => (
          <BookSpine
            key={i}
            color={BOOK_COLORS[(i + index) % BOOK_COLORS.length]}
            height={20 + ((i * 7 + index * 3) % 30)}
            delay={index * 0.08 + i * 0.03}
          />
        ))}
      </div>
      {/* Shelf line */}
      <div className="h-1" style={{ background: 'hsl(30 25% 15% / 0.6)' }} />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <IconComp className="w-4 h-4" style={{ color: 'hsl(40 40% 55%)' }} />
          <h4 className="font-heading font-semibold text-sm" style={{ color: 'hsl(40 30% 90%)' }}>
            {item.name}
          </h4>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'hsl(220 10% 55%)' }}>
          {item.description}
        </p>
      </div>

      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(40 50% 30% / 0.08) 0%, transparent 60%)' }}
      />
    </motion.button>
  );
}

/**
 * Library Shelves — displays category bookshelves or featured discovery books.
 */
export default function LibraryShelves({ items, onSelect, variant = 'category', title }) {
  if (!items || items.length === 0) return null;

  const isFeatured = variant === 'featured';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={title || 'shelves'}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-32 pt-20"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {title && (
          <motion.p
            className="text-sm uppercase tracking-[0.3em] mb-6"
            style={{ color: 'hsl(40 30% 50%)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.p>
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
              variant={variant}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}