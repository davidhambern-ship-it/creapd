import React from 'react';

/**
 * OrbitalVinylNode — renders a single config "room" as a vinyl record
 * with its label text curved along the top arc of the record.
 *
 * Props:
 *  - label:  top curved label (room.label)
 *  - summary: bottom summary text (small, straight, inside label)
 *  - color:  hex color for accents / glow
 *  - Icon:   lucide icon component
 */
export default function OrbitalVinylNode({ label = '', summary = '', color = '#FF00FF', Icon }) {
  const size = 150;          // total vinyl diameter (px)
  const labelRadius = 38;    // inner label circle radius
  const arcRadius = 60;      // radius of the curved text arc

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* ═══ Vinyl record disc ═══ */}
      <div
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
          boxShadow: `
            inset 0 0 24px rgba(0,0,0,0.6),
            0 2px 12px rgba(0,0,0,0.6),
            0 0 24px ${color}15,
            0 0 1px rgba(255,255,255,0.05)
          `,
        }}
      >
        {/* Groove highlight rings */}
        <div className="absolute rounded-full" style={{
          top: '10%', left: '10%', right: '10%', bottom: '10%',
          border: '1px solid rgba(255,255,255,0.04)',
        }} />
        <div className="absolute rounded-full" style={{
          top: '18%', left: '18%', right: '18%', bottom: '18%',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />

        {/* Center label disc */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: labelRadius * 2, height: labelRadius * 2,
            background: `radial-gradient(circle, ${color}22 0%, ${color}08 70%)`,
            border: `1px solid ${color}40`,
            boxShadow: `inset 0 0 12px ${color}15`,
          }}
        >
          {Icon && (
            <Icon className="w-6 h-6" style={{ color, filter: `drop-shadow(0 0 6px ${color}80)` }} />
          )}
          {/* Summary text inside label */}
          {summary && (
            <span
              className="absolute font-mono text-[7px] leading-tight text-center px-2"
              style={{ color: `${color}cc`, bottom: '4px', maxWidth: labelRadius * 1.6 }}
            >
              {summary}
            </span>
          )}
        </div>

        {/* Center spindle hole */}
        <div
          className="absolute rounded-full"
          style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '5px', height: '5px',
            background: 'radial-gradient(circle, #000 0%, #1a1a1a 100%)',
            boxShadow: 'inset 0 0 2px rgba(0,0,0,0.8)',
            zIndex: 2,
          }}
        />
      </div>

      {/* ═══ Curved label text (SVG textPath along top arc) ═══ */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <path
            id={`arc-${label.replace(/\s+/g, '')}`}
            d={`M ${size / 2 - arcRadius},${size / 2} A ${arcRadius},${arcRadius} 0 0,1 ${size / 2 + arcRadius},${size / 2}`}
            fill="none"
          />
        </defs>
        <text
          fill={color}
          fontSize="11"
          fontWeight="700"
          fontFamily="var(--font-heading, Inter, sans-serif)"
          letterSpacing="0.08em"
          style={{ textShadow: `0 0 8px ${color}60` }}
        >
          <textPath
            href={`#arc-${label.replace(/\s+/g, '')}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {label.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </div>
  );
}