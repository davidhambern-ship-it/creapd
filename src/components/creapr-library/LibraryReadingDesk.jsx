import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Feather } from 'lucide-react';

/**
 * A central reading desk that anchors the library scene.
 * Shows an open book with a warm lamp glow when in idle/overview state.
 */
export default function LibraryReadingDesk({ thinking, greeting, message }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2"
      style={{
        bottom: '28%',
        zIndex: 5,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      {/* Desk lamp arm — reaches from right */}
      <div
        className="absolute"
        style={{
          right: '-60px',
          top: '-80px',
          width: '100px',
          height: '4px',
          background: 'linear-gradient(90deg, hsl(35 20% 20%) 0%, hsl(35 25% 28%) 100%)',
          borderRadius: '2px',
          transform: 'rotate(25deg)',
          transformOrigin: 'right center',
          boxShadow: '0 2px 4px hsl(0 0% 0% / 0.3)',
        }}
      />
      {/* Lamp shade */}
      <div
        className="absolute"
        style={{
          right: '-70px',
          top: '-92px',
          width: '36px',
          height: '28px',
          background: 'linear-gradient(180deg, hsl(35 30% 25%) 0%, hsl(35 35% 30%) 50%, hsl(38 40% 35%) 100%)',
          borderRadius: '50% 50% 8px 8px',
          boxShadow: '0 4px 12px hsl(0 0% 0% / 0.4), 0 0 24px hsl(40 55% 40% / 0.3)',
          transform: 'rotate(-15deg)',
        }}
      />
      {/* Lamp light cone — warm pool on the desk */}
      <div
        className="absolute"
        style={{
          right: '-50px',
          top: '-70px',
          width: '120px',
          height: '80px',
          background: 'radial-gradient(ellipse at top, hsl(40 60% 50% / 0.25) 0%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />

      {/* Open book on the desk */}
      <div
        className="relative flex"
        style={{
          width: '280px',
          filter: 'drop-shadow(0 12px 24px hsl(0 0% 0% / 0.4))',
        }}
      >
        {/* Left page */}
        <div
          className="flex-1 p-4 relative overflow-hidden"
          style={{
            minHeight: '120px',
            background: 'linear-gradient(135deg, hsl(36 30% 88%) 0%, hsl(34 25% 82%) 100%)',
            borderRadius: '4px 0 0 4px',
            boxShadow: 'inset -3px 0 6px hsl(0 0% 0% / 0.08)',
          }}
        >
          {/* Page lines */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: '1px',
                background: 'hsl(30 20% 60% / 0.3)',
                marginBottom: '8px',
                width: `${75 - i * 5}%`,
              }}
            />
          ))}
          {/* Page curl */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '20px',
              height: '20px',
              background: 'linear-gradient(135deg, transparent 50%, hsl(34 25% 75%) 50%)',
            }}
          />
        </div>

        {/* Book spine center */}
        <div
          style={{
            width: '4px',
            background: 'linear-gradient(180deg, hsl(0 0% 40% / 0.3) 0%, hsl(0 0% 10% / 0.5) 50%, hsl(0 0% 40% / 0.3) 100%)',
            boxShadow: '0 0 6px hsl(0 0% 0% / 0.3)',
          }}
        />

        {/* Right page — CREAPr narration */}
        <div
          className="flex-1 p-4 relative overflow-hidden flex flex-col"
          style={{
            minHeight: '120px',
            background: 'linear-gradient(225deg, hsl(36 30% 88%) 0%, hsl(34 25% 82%) 100%)',
            borderRadius: '0 4px 4px 0',
            boxShadow: 'inset 3px 0 6px hsl(0 0% 0% / 0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <BookOpen style={{ width: '12px', height: '12px', color: 'hsl(35 35% 40%)' }} />
            <span style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'hsl(35 25% 45%)', fontFamily: '"Oswald", sans-serif', fontWeight: 600 }}>
              CREAPr Journal
            </span>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {message ? (
              <motion.p
                key={message}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  fontSize: '10px',
                  lineHeight: '1.6',
                  color: 'hsl(30 25% 20%)',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {message}
                {!thinking && <span className="plib-cursor" />}
              </motion.p>
            ) : (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '1px',
                    background: 'hsl(30 20% 60% / 0.3)',
                    marginBottom: '8px',
                    width: `${80 - i * 8}%`,
                  }}
                />
              ))
            )}
          </div>
          {thinking && (
            <motion.div
              className="absolute bottom-3 right-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Feather className="w-4 h-4" style={{ color: 'hsl(38 40% 40%)' }} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Desk surface — wooden plank under the book */}
      <div
        style={{
          width: '340px',
          height: '8px',
          margin: '-2px auto 0',
          background: 'linear-gradient(180deg, hsl(30 28% 22%) 0%, hsl(28 22% 16%) 50%, hsl(26 18% 11%) 100%)',
          borderRadius: '2px',
          boxShadow: '0 4px 12px hsl(0 0% 0% / 0.4)',
        }}
      />
    </motion.div>
  );
}