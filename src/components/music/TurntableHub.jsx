import React from 'react';
import { motion } from 'framer-motion';
import { Disc3 } from 'lucide-react';

/**
 * TurntableHub — the record player graphic that serves as the central hub
 * for the orbital configuration nodes. Nodes are positioned relative to
 * this hub's center point.
 *
 * Props:
 *  - canBuild: boolean — controls tonearm position, LED color, vinyl label glow
 *  - children: orbital nodes rendered as children of the hub
 */
export default function TurntableHub({ canBuild = false }) {
  return (
    <div
      className="relative pointer-events-none"
      style={{ width: '336px', height: '276px', flexShrink: 0 }}
    >
      {/* ═══ TURNTABLE DECK ═══ */}
      <div
        className="absolute"
        style={{ width: '280px', height: '230px', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.2)' }}
      >
        {/* ── Deck body (rectangular turntable base) ── */}
        <div
          className="absolute"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            borderRadius: '16px',
            background: `
              linear-gradient(180deg,
                rgba(55,58,68,0.95) 0%,
                rgba(38,40,50,0.95) 40%,
                rgba(25,27,35,0.95) 100%
              )
            `,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: `
              0 16px 48px rgba(0,0,0,0.6),
              0 0 60px rgba(255,0,255,0.05),
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -2px 6px rgba(0,0,0,0.4)
            `,
          }}
        >
          {/* Brushed metal texture overlay */}
          <div
            className="absolute inset-0 rounded-[16px] overflow-hidden"
            style={{
              background: `repeating-linear-gradient(90deg,
                rgba(255,255,255,0.015) 0px,
                rgba(255,255,255,0.015) 1px,
                transparent 1px,
                transparent 3px
              )`,
            }}
          />
          {/* Corner screws */}
          {[
            { top: '8px', left: '8px' },
            { top: '8px', right: '8px' },
            { bottom: '8px', left: '8px' },
            { bottom: '8px', right: '8px' },
          ].map((pos, i) => (
            <div key={i} className="absolute rounded-full" style={{
              ...pos, width: '5px', height: '5px',
              background: 'radial-gradient(circle, #888 0%, #333 70%)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.5)',
            }} />
          ))}
        </div>

        {/* ── Platter well (circular recess in the deck) ── */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '100px',
            transform: 'translateY(-50%)',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(10,10,15,0.95) 0%, rgba(20,20,28,0.9) 80%)',
            border: '2px solid rgba(0,0,0,0.6)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), inset 0 2px 4px rgba(0,0,0,0.5)',
          }}
        />

        {/* ── Rubber platter mat (sits inside the well) ── */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '108px',
            transform: 'translateY(-50%)',
            width: '164px',
            height: '164px',
            background: 'radial-gradient(circle, rgba(25,25,30,0.8) 0%, rgba(15,15,20,0.9) 90%)',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
          }}
        />

        {/* ── Spinning vinyl record (sitting on the mat) ── */}
        <div
          className="absolute"
          style={{
            top: '50%',
            left: '190px',
            transform: 'translate(-50%, -50%)',
            width: '160px',
            height: '160px',
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                repeating-radial-gradient(circle at center,
                  rgba(0,0,0,0.55) 0px,
                  rgba(0,0,0,0.55) 1px,
                  rgba(38,40,50,0.45) 1px,
                  rgba(38,40,50,0.45) 3px
                ),
                radial-gradient(circle, rgba(55,57,70,0.7) 0%, rgba(12,12,20,0.95) 80%)
              `,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 0 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.05)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            {/* Vinyl groove highlight rings */}
            <div className="absolute rounded-full" style={{
              top: '10%', left: '10%', right: '10%', bottom: '10%',
              border: '1px solid rgba(255,255,255,0.04)',
            }} />
            <div className="absolute rounded-full" style={{
              top: '22%', left: '22%', right: '22%', bottom: '22%',
              border: '1px solid rgba(255,255,255,0.05)',
            }} />

            {/* Center label */}
            <div
              className="absolute rounded-full flex items-center justify-center"
              style={{
                top: '34%', left: '34%', right: '34%', bottom: '34%',
                background: canBuild
                  ? 'radial-gradient(circle, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.05) 70%)'
                  : 'radial-gradient(circle, rgba(255,0,255,0.18) 0%, rgba(139,0,255,0.08) 70%)',
                border: `1px solid ${canBuild ? 'rgba(0,255,136,0.4)' : 'rgba(255,0,255,0.3)'}`,
                boxShadow: `inset 0 0 12px ${canBuild ? 'rgba(0,255,136,0.1)' : 'rgba(255,0,255,0.08)'}`,
              }}
            >
              <Disc3
                className="w-6 h-6"
                style={{
                  color: canBuild ? '#00FF88' : '#FF00FF',
                  filter: `drop-shadow(0 0 8px ${canBuild ? '#00FF88' : '#FF00FF'})`,
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* ── Center spindle (fixed, pierces through vinyl center) ── */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '190px',
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            background: 'radial-gradient(circle, #e8e8e8 0%, #aaa 40%, #555 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.3)',
            zIndex: 3,
          }}
        />

        {/* ── Tonearm assembly (mounted on the deck, right side) ── */}
        {/* Tonearm pivot mounting base on deck */}
        <div
          className="absolute rounded-full"
          style={{
            top: '24px',
            right: '16px',
            width: '22px',
            height: '22px',
            background: 'radial-gradient(circle, #aaa 0%, #666 50%, #333 100%)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)',
            zIndex: 4,
          }}
        />
        {/* Tonearm pivot center dot */}
        <div
          className="absolute rounded-full"
          style={{
            top: '31px',
            right: '23px',
            width: '8px',
            height: '8px',
            background: 'radial-gradient(circle, #ddd 0%, #777 100%)',
            zIndex: 5,
          }}
        />

        {/* Tonearm — rotates from pivot */}
        <motion.div
          className="absolute"
          style={{
            top: '34px',
            right: '27px',
            transformOrigin: 'top right',
            zIndex: 5,
          }}
          initial={{ rotate: -25 }}
          animate={{ rotate: canBuild ? 5 : -25 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Tonearm shaft (S-curved look) */}
          <div
            style={{
              width: '95px',
              height: '5px',
              background: 'linear-gradient(to bottom, #b8b8b8 0%, #888 30%, #555 60%, #444 100%)',
              borderRadius: '3px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          />
          {/* Counterweight stub (behind pivot) */}
          <div
            className="absolute"
            style={{
              top: '-3px',
              right: '-14px',
              width: '14px',
              height: '11px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #999 0%, #444 70%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          />
          {/* Cartridge headshell */}
          <div
            className="absolute"
            style={{
              bottom: '-7px',
              left: '83px',
              width: '18px',
              height: '12px',
              background: 'linear-gradient(135deg, #888 0%, #444 50%, #222 100%)',
              borderRadius: '3px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Needle / stylus */}
            {canBuild ? (
              <motion.div
                className="absolute rounded-full"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  bottom: '-4px',
                  left: '6px',
                  width: '6px',
                  height: '6px',
                  background: '#00FF88',
                  boxShadow: '0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.4)',
                }}
              />
            ) : (
              <div
                className="absolute"
                style={{
                  bottom: '-2px',
                  left: '7px',
                  width: '4px',
                  height: '4px',
                  background: '#666',
                  borderRadius: '1px',
                }}
              />
            )}
          </div>
        </motion.div>

        {/* ── Control knobs (left side of deck) ── */}
        {[
          { top: '20px', label: '33' },
          { top: '55px', label: '45' },
        ].map((knob, i) => (
          <div key={i} className="absolute" style={{ left: '18px', top: knob.top, zIndex: 2 }}>
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                width: '22px',
                height: '22px',
                background: 'radial-gradient(circle, #777 0%, #333 70%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.15)',
              }}
            >
              <span className="text-[7px] font-mono text-gray-400">{knob.label}</span>
            </div>
          </div>
        ))}

        {/* Power LED */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '20px',
            left: '22px',
            width: '6px',
            height: '6px',
            background: canBuild ? '#00FF88' : '#FF6B00',
            boxShadow: canBuild
              ? '0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.4)'
              : '0 0 6px #FF6B00',
            zIndex: 2,
          }}
        />

        {/* ── "Show Deck" brand plate — etched on the left side of the deck ── */}
        <div
          className="absolute flex flex-col items-center justify-center gap-1"
          style={{
            top: '100px',
            left: '8px',
            width: '84px',
            zIndex: 2,
          }}
        >
          <span
            className="font-mono uppercase tracking-[0.15em] whitespace-nowrap"
            style={{
              fontSize: '20px',
              lineHeight: 1,
              fontWeight: 700,
              color: 'rgba(200,200,210,0.4)',
              textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.03)',
            }}
          >
            Show
          </span>
          <span
            className="font-mono uppercase tracking-[0.15em] whitespace-nowrap"
            style={{
              fontSize: '20px',
              lineHeight: 1,
              fontWeight: 700,
              color: 'rgba(200,200,210,0.4)',
              textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.03)',
            }}
          >
            Deck
          </span>
          {/* Decorative engraving line */}
          <div
            className="mt-1"
            style={{
              width: '60px',
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(200,200,210,0.2), transparent)',
            }}
          />
        </div>

        {/* Ready pulse ring around platter */}
        {canBuild && (
          <motion.div
            className="absolute rounded-full"
            style={{
              top: '50%',
              left: '100px',
              transform: 'translateY(-50%)',
              width: '180px',
              height: '180px',
            }}
            animate={{ scale: [1, 1.15], opacity: [0.4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          >
            <div className="w-full h-full rounded-full border-2 border-green-400/40" />
          </motion.div>
        )}
      </div>

    </div>
  );
}