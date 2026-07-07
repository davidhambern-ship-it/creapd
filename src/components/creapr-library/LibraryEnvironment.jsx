import React, { useMemo } from 'react';

const RSS_ITEMS = [
  { source: 'Nature', headline: 'Quantum computing milestone achieved in lattice cryptography' },
  { source: 'Science', headline: 'Researchers map deep-sea microbial ecosystems' },
  { source: 'Tech Review', headline: 'AI model demonstrates emergent reasoning capabilities' },
  { source: 'Journal of Politics', headline: 'New study on electoral reform trends worldwide' },
  { source: 'Economic Weekly', headline: 'Global supply chain analysis reveals shift in manufacturing' },
  { source: 'History Today', headline: 'Archaeological discovery reshapes Mesopotamian timeline' },
  { source: 'Scientific American', headline: 'Breakthrough in fusion energy sustainment' },
  { source: 'Industry Report', headline: 'Creator economy surpasses traditional media revenue' },
];

const BOOK_COLORS = [
  'hsl(350 35% 28%)', 'hsl(140 25% 22%)', 'hsl(210 35% 24%)',
  'hsl(35 40% 30%)', 'hsl(210 10% 22%)', 'hsl(300 20% 24%)',
  'hsl(180 22% 22%)', 'hsl(20 30% 26%)', 'hsl(60 15% 28%)',
  'hsl(280 18% 24%)',
];

const BOOK_TITLES = [
  'Principia', 'Critique', 'The Republic', 'Meditations', 'Origin',
  'Cosmos', 'Genome', 'Synthesis', 'Paradigm', 'Aether',
  'Veritas', 'Lumen', 'Cortex', 'Equilibrium', 'Nexus',
];

function BookSpineBg({ height, color, width, title }) {
  return (
    <div
      className="flex-shrink-0 rounded-t-sm relative"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: `linear-gradient(180deg, ${color} 0%, hsl(0 0% 0% / 0.4) 100%)`,
        boxShadow: 'inset -2px 0 3px hsl(0 0% 0% / 0.4), inset 2px 0 1px hsl(0 0% 100% / 0.06)',
      }}
    >
      <div style={{ position: 'absolute', top: '15%', left: '2px', right: '2px', height: '1px', background: 'hsl(0 0% 100% / 0.12)' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '2px', right: '2px', height: '1px', background: 'hsl(0 0% 100% / 0.12)' }} />
      {title && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            fontSize: '6px',
            color: 'hsl(40 30% 70% / 0.5)',
            whiteSpace: 'nowrap',
            fontFamily: 'Georgia, serif',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </span>
      )}
    </div>
  );
}

function ShelfRow({ books = 10, startIndex = 0 }) {
  return (
    <div className="flex items-end gap-px px-1" style={{ height: '72px' }}>
      {[...Array(books)].map((_, i) => {
        const idx = (i + startIndex) % BOOK_COLORS.length;
        const tIdx = (i + startIndex) % BOOK_TITLES.length;
        const h = 48 + ((i * 11 + startIndex * 7) % 28);
        const w = 14 + (i % 4) * 5;
        return (
          <BookSpineBg
            key={i}
            height={h}
            color={BOOK_COLORS[idx]}
            width={w}
            title={i % 3 === 0 ? BOOK_TITLES[tIdx] : null}
          />
        );
      })}
    </div>
  );
}

function FullBookshelf({ rows = 5, startIndex = 0 }) {
  return (
    <div className="flex flex-col gap-0">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="relative">
          <ShelfRow books={10} startIndex={r * 3 + startIndex} />
          <div
            style={{
              height: '7px',
              background: 'linear-gradient(180deg, hsl(30 28% 20%) 0%, hsl(28 22% 14%) 50%, hsl(26 18% 9%) 100%)',
              borderRadius: '2px',
              boxShadow: '0 2px 6px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(35 30% 26% / 0.4)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function LibraryEnvironment({ intensity = 'calm' }) {
  const orbIntensity = intensity === 'assembling' ? 0.28 : intensity === 'active' ? 0.20 : 0.14;
  const lampGlow = intensity === 'assembling' ? 0.55 : intensity === 'active' ? 0.42 : 0.32;

  const dustParticles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${(i * 4.3 + 2) % 100}%`,
      duration: `${20 + (i % 7) * 4}s`,
      delay: `${i * 1.5}s`,
      size: 1 + (i % 3),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Warm library interior base */}
      <div className="absolute inset-0 plib-scene" />

      {/* Wood paneling */}
      <div className="absolute inset-0 plib-wood-panels" />

      {/* Full bookshelf walls — left side */}
      <div
        className="absolute"
        style={{
          top: '0',
          left: '0',
          width: '20%',
          height: '100%',
          opacity: 0.65,
          background: 'linear-gradient(90deg, hsl(28 20% 7%) 0%, hsl(28 20% 9%) 70%, transparent 100%)',
          paddingTop: '0.5rem',
        }}
      >
        <FullBookshelf rows={6} startIndex={0} />
      </div>

      {/* Full bookshelf walls — right side */}
      <div
        className="absolute"
        style={{
          top: '0',
          right: '0',
          width: '20%',
          height: '100%',
          opacity: 0.65,
          background: 'linear-gradient(270deg, hsl(28 20% 7%) 0%, hsl(28 20% 9%) 70%, transparent 100%)',
          paddingTop: '0.5rem',
        }}
      >
        <FullBookshelf rows={6} startIndex={5} />
      </div>

      {/* Back wall bookshelf — center top, fainter */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: '0',
          width: '50%',
          height: '45%',
          opacity: 0.3,
        }}
      >
        <FullBookshelf rows={3} startIndex={10} />
      </div>

      {/* Perspective floor */}
      <div className="plib-floor" />

      {/* Central reading desk lamp glow — warm pool of light */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '15%',
          width: '32rem',
          height: '20rem',
          background: `radial-gradient(ellipse, hsl(40 55% 42% / ${lampGlow}) 0%, hsl(38 45% 35% / ${lampGlow * 0.5}) 30%, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* Warm breathing light orbs — ceiling lamps */}
      <div
        className="absolute top-0 left-1/4 w-[18rem] h-[14rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(42 60% 40% / ${orbIntensity}) 0%, transparent 70%)`,
          animation: 'plib-breathe 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-0 right-1/4 w-[18rem] h-[14rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(38 55% 38% / ${orbIntensity}) 0%, transparent 70%)`,
          animation: 'plib-breathe 10s ease-in-out 2s infinite',
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[22rem] h-[16rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(40 50% 36% / ${orbIntensity * 0.8}) 0%, transparent 70%)`,
          animation: 'plib-breathe 9s ease-in-out 1s infinite',
        }}
      />

      {/* Dust particles in the light */}
      {dustParticles.map((p, i) => (
        <span
          key={`dust-${i}`}
          className="plib-dust"
          style={{
            left: p.left,
            bottom: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Glass reflection sweep */}
      <div className="plib-glass-sweep" />

      {/* Vignette — focuses attention center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 85% 75% at center, transparent 35%, hsl(28 22% 4% / 0.6) 100%)',
        }}
      />

      {/* RSS shelf at bottom — live knowledge display */}
      <div className="absolute bottom-0 left-0 right-0 plib-rss-shelf">
        <div className="plib-rss-track">
          {[...RSS_ITEMS, ...RSS_ITEMS].map((item, i) => (
            <div key={i} className="plib-rss-item">
              <span style={{ color: 'hsl(42 50% 60%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Oswald", sans-serif' }}>
                {item.source}
              </span>
              <span style={{ color: 'hsl(35 18% 60%)', fontFamily: 'Georgia, serif' }}>
                {item.headline}
              </span>
              <span style={{ color: 'hsl(35 12% 30%)' }}>·</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}