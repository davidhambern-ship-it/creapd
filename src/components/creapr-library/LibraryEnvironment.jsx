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

export default function LibraryEnvironment({ intensity = 'calm' }) {
  const orbIntensity = intensity === 'assembling' ? 0.16 : intensity === 'active' ? 0.11 : 0.07;

  const dustParticles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${(i * 4.2 + 2) % 100}%`,
      duration: `${20 + (i % 7) * 5}s`,
      delay: `${i * 1.5}s`,
      size: 1 + (i % 3),
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Warm gradient base */}
      <div className="absolute inset-0 plib-scene" />

      {/* Breathing ambient light orbs */}
      <div
        className="absolute -top-20 -left-20 w-[32rem] h-[32rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, hsl(38 55% 42% / ${orbIntensity}) 0%, transparent 70%)`,
          animation: 'plib-breathe 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, hsl(28 45% 38% / ${orbIntensity * 0.8}) 0%, transparent 70%)`,
          animation: 'plib-breathe 10s ease-in-out 2s infinite',
        }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[24rem] h-[24rem] rounded-full blur-3xl"
        style={{
          background: `radial-gradient(circle, hsl(35 35% 33% / ${orbIntensity * 0.6}) 0%, transparent 70%)`,
          animation: 'plib-breathe 12s ease-in-out 4s infinite',
        }}
      />

      {/* Subtle wood texture */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 80px, hsl(28 12% 10% / 0.03) 80px, hsl(28 12% 10% / 0.03) 81px)`,
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

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, hsl(30 8% 3% / 0.5) 100%)',
        }}
      />

      {/* RSS shelf at bottom */}
      <div className="absolute bottom-0 left-0 right-0 plib-rss-shelf">
        <div className="plib-rss-track">
          {[...RSS_ITEMS, ...RSS_ITEMS].map((item, i) => (
            <div key={i} className="plib-rss-item">
              <span style={{ color: 'hsl(40 40% 52%)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {item.source}
              </span>
              <span style={{ color: 'hsl(35 12% 55%)' }}>
                {item.headline}
              </span>
              <span style={{ color: 'hsl(35 15% 30%)' }}>·</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}