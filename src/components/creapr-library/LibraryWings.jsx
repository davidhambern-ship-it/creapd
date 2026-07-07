import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain, ScrollText, Globe2, FlaskConical, BookOpen,
  Compass, CircuitBoard, Crown, Cpu, Database, Radio, Network,
  Sparkles, ArrowRight, BookMarked
} from 'lucide-react';

const ICON_MAP = {
  rock: Mountain, scroll: ScrollText, globe: Globe2, flask: FlaskConical,
  book: BookOpen, compass: Compass, circuit: CircuitBoard, crown: Crown,
  cpu: Cpu, database: Database, radio: Radio, network: Network,
};

const BOOK_COLORS = [
  'hsl(350 28% 22%)', 'hsl(140 18% 18%)', 'hsl(210 25% 20%)',
  'hsl(35 32% 22%)', 'hsl(210 8% 20%)', 'hsl(300 15% 20%)',
  'hsl(180 18% 18%)', 'hsl(20 25% 20%)',
];

const BOOK_HEIGHTS = [58, 64, 52, 68, 56, 62, 50, 66, 54, 60];

function BookSpine({ height, color, width = 24, interactive, label }) {
  return (
    <div
      className={`plib-book-spine ${interactive ? 'plib-book-spine-interactive' : ''}`}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        background: `linear-gradient(180deg, ${color} 0%, hsl(0 0% 0% / 0.25) 100%)`,
      }}
    >
      {/* Decorative bands on spine */}
      <div style={{ position: 'absolute', top: '20%', left: '2px', right: '2px', height: '2px', background: 'hsl(0 0% 100% / 0.1)', borderRadius: '1px' }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '2px', right: '2px', height: '2px', background: 'hsl(0 0% 100% / 0.1)', borderRadius: '1px' }} />
      {label && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '7px',
            color: 'hsl(0 0% 90% / 0.6)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontFamily: 'Georgia, serif',
          }}
        >
          {label.length > 14 ? label.substring(0, 14) + '…' : label}
        </span>
      )}
    </div>
  );
}

function BookshelfRow({ books, startIndex, interactiveIdx, label }) {
  return (
    <div className="flex items-end gap-px px-2" style={{ height: '70px' }}>
      {books.map((book, i) => (
        <BookSpine
          key={i}
          height={BOOK_HEIGHTS[(i + startIndex) % BOOK_HEIGHTS.length]}
          color={BOOK_COLORS[(i + startIndex) % BOOK_COLORS.length]}
          width={16 + (i % 4) * 4}
          interactive={i === interactiveIdx}
          label={i === interactiveIdx ? label : null}
        />
      ))}
    </div>
  );
}

function WingShelf({ item, index, focused, onSelect }) {
  const IconComp = ICON_MAP[item.icon_hint] || BookMarked;
  const rows = 2;
  const booksPerRow = 8;

  return (
    <motion.div
      className={`plib-wing ${focused ? 'plib-wing-focused' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(item)}
    >
      {/* OLED shelf label header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid hsl(32 18% 16% / 0.4)',
        background: 'hsl(28 20% 7% / 0.5)',
      }}>
        <IconComp style={{ width: '14px', height: '14px', color: 'hsl(42 45% 52%)' }} />
        <span style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'hsl(40 28% 62%)',
          fontFamily: '"Oswald", sans-serif',
          fontWeight: 500,
        }}>
          {item.name}
        </span>
      </div>

      {/* Bookshelf rows */}
      <div style={{ padding: '0.5rem 0.5rem 0.25rem', background: 'hsl(28 18% 6% / 0.3)' }}>
        {[...Array(rows)].map((_, r) => (
          <div key={r}>
            <BookshelfRow
              books={[...Array(booksPerRow)]}
              startIndex={r * 3 + index * 2}
              interactiveIdx={r === 0 ? index % booksPerRow : -1}
              label={item.name}
            />
            <div className="plib-shelf-plank" style={{ margin: '2px 0' }} />
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ padding: '0.625rem 0.75rem' }}>
        <p style={{
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'hsl(35 15% 58%)',
          fontFamily: 'Georgia, serif',
        }}>
          {item.description}
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '6px',
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'hsl(152 35% 45%)',
          fontFamily: '"Oswald", sans-serif',
        }}>
          <span>Enter Wing</span>
          <ArrowRight style={{ width: '10px', height: '10px' }} />
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedBook({ item, index, onSelect }) {
  const color = BOOK_COLORS[index % BOOK_COLORS.length];
  return (
    <motion.div
      className="plib-wing"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(item)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid hsl(32 18% 16% / 0.4)',
        background: 'hsl(28 20% 7% / 0.5)',
      }}>
        <Sparkles style={{ width: '14px', height: '14px', color: 'hsl(42 55% 52%)' }} />
        <span style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'hsl(42 45% 58%)',
          fontFamily: '"Oswald", sans-serif',
          fontWeight: 500,
        }}>
          {item.name}
        </span>
      </div>

      <div style={{ padding: '0.5rem 0.5rem 0.25rem', background: 'hsl(28 18% 6% / 0.3)' }}>
        <div className="flex items-end gap-px px-2" style={{ height: '70px' }}>
          <BookSpine height={66} color={color} width={32} interactive label={item.name} />
          {[...Array(6)].map((_, i) => (
            <BookSpine
              key={i}
              height={BOOK_HEIGHTS[(i + index) % BOOK_HEIGHTS.length]}
              color={BOOK_COLORS[(i + index + 1) % BOOK_COLORS.length]}
              width={16 + (i % 3) * 4}
            />
          ))}
        </div>
        <div className="plib-shelf-plank" style={{ margin: '2px 0' }} />
      </div>

      <div style={{ padding: '0.625rem 0.75rem' }}>
        <p style={{
          fontSize: '12px',
          lineHeight: '1.5',
          color: 'hsl(35 15% 58%)',
          fontFamily: 'Georgia, serif',
        }}>
          {item.description}
        </p>
      </div>
    </motion.div>
  );
}

export default function LibraryWings({ items, variant = 'category', title, focusedWing, onSelect }) {
  if (!items || items.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={title || 'wings'}
        className="absolute inset-0 flex flex-col items-center px-4 pb-32 pt-16 overflow-y-auto"
        style={{ zIndex: 10 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {title && (
          <motion.div
            className="flex items-center gap-3 mb-5"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-1.5 h-1.5 rounded-full plib-status-dot" style={{ background: 'hsl(42 55% 52%)', color: 'hsl(42 55% 52%)' }} />
            <p style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: 'hsl(40 28% 55%)',
              fontFamily: '"Oswald", sans-serif',
            }}>
              {title}
            </p>
            <div className="w-1.5 h-1.5 rounded-full plib-status-dot" style={{ background: 'hsl(42 55% 52%)', color: 'hsl(42 55% 52%)' }} />
          </motion.div>
        )}
        <div className={`plib-wings-grid grid gap-3 w-full max-w-3xl ${
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