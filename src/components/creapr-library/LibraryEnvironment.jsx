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

const BG_BOOK_COLORS = [
  'hsl(350 25% 18%)', 'hsl(140 15% 15%)', 'hsl(210 20% 16%)',
  'hsl(35 28% 18%)', 'hsl(210 6% 17%)', 'hsl(300 12% 17%)',
  'hsl(180 15% 15%)', 'hsl(20 22% 16%)',
];

function BackgroundShelfRow({ top, books = 20 }) {
  return (
    <div className="absolute left-0 right-0 flex items-end gap-px px-4" style={{ top, height: '64px', opacity: 0.35 }}>
      {[...Array(books)].map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-t-sm"
          style={{
            width: `${20 + (i % 5) * 4}px`,
            height: `${40 + ((i * 7 + top) % 22)}px`,
            background: `linear-gradient(180deg, ${BG_BOOK_COLORS[(i + Math.floor(top)) % BG_BOOK_COLORS.length]} 0%, hsl(0 0% 0% / 0.3) 100%)`,
            boxShadow: 'inset -1px 0 2px hsl(0 0% 0% / 0.4)',
          }}
        />
      ))}
    </div>
  );
}

function BackgroundShelf({ top, left, width, rows = 3 }) {
  return (
    <div className="absolute" style={{ top, left, width }}>
      {[...Array(rows)].map((_, r) => (
        <div key={r} style={{ marginBottom: '4px' }}>
          <BackgroundShelfRow top={0} books={Math.floor(width / 26)} />
          <div style={{ height: '6px', background: 'linear-gradient(180deg, hsl(30 22% 14%) 0%, hsl(28 18% 9%) 100%)', borderRadius: '2px', boxShadow: '0 2px 4px hsl(0 0% 0% / 0.4)' }} />
        </div>
      ))}
    </div>
  );
}

export default function LibraryEnvironment({ intensity = 'calm' }) {
  const orbIntensity = intensity === 'assembling' ? 0.22 : intensity === 'active' ? 0.16 : 0.10;

  const dustParticles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      left: `${(i * 5.1 + 2) % 100}%`,
      duration: `${22 + (i % 6) * 5}s`,
      delay: `${i * 1.8}s`,
      size: 1 + (i % 3),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Warm library interior base */}
      <div className="absolute inset-0 plib-scene" />

      {/* Wood paneling */}
      <div className="absolute inset-0 plib-wood-panels" />

      {/* Background bookshelves — left wall */}
      <div className="plib-bg-shelves">
        <BackgroundShelf top="8%" left="-2%" width="22%" rows={4} />
        <BackgroundShelf top="8%" right="-2%" left="auto" width="22%" rows={4} />
      </div>

      {/* Perspective floor */}
      <div className="plib-floor" />

      {/* Warm breathing light orbs — like ceiling lamps */}
      <div
        className="absolute top-0 left-1/4 w-[20rem] h-[16rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(42 55% 38% / ${orbIntensity}) 0%, transparent 70%)`,
          animation: 'plib-breathe 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-0 right-1/4 w-[20rem] h-[16rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(38 50% 35% / ${orbIntensity}) 0%, transparent 70%)`,
          animation: 'plib-breathe 10s ease-in-out 2s infinite',
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28rem] h-[12rem] blur-3xl"
        style={{
          background: `radial-gradient(ellipse, hsl(35 45% 30% / ${orbIntensity * 0.7}) 0%, transparent 70%)`,
          animation: 'plib-breathe 12s ease-in-out 4s infinite',
        }}
      />

      {/* Dust particles */}
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
          background: 'radial-gradient(ellipse 80% 70% at center, transparent 40%, hsl(28 20% 4% / 0.5) 100%)',
        }}
      />

      {/* RSS shelf at bottom — live knowledge display */}
      <div className="absolute bottom-0 left-0 right-0 plib-rss-shelf">
        <div className="plib-rss-track">
          {[...RSS_ITEMS, ...RSS_ITEMS].map((item, i) => (
            <div key={i} className="plib-rss-item">
              <span style={{ color: 'hsl(42 45% 58%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Oswald", sans-serif' }}>
                {item.source}
              </span>
              <span style={{ color: 'hsl(35 15% 58%)', fontFamily: 'Georgia, serif' }}>
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