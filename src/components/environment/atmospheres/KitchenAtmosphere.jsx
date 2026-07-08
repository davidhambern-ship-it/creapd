import React from 'react';

// Professional Test Kitchen — warm copper/brass tones, overhead lighting, steam particles, steel sheen
export default function KitchenAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 40% at 50% 0%, hsl(25 70% 30% / 0.15) 0%, transparent 60%),
                     radial-gradient(ellipse 50% 50% at 80% 80%, hsl(140 40% 25% / 0.05) 0%, transparent 55%),
                     hsl(var(--env-bg))`
      }} />
      {/* Warm overhead light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full" style={{
        background: `radial-gradient(ellipse, hsl(25 80% 50% / 0.08) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      {/* Copper orbs */}
      <div className="absolute top-1/3 left-10 w-64 h-64 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(25 70% 40% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(140 40% 35% / 0.04) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      {/* Steam particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${10 + i * 8}%`,
          bottom: '0',
          width: `${20 + (i % 3) * 10}px`,
          height: `${20 + (i % 3) * 10}px`,
          background: `hsl(25 40% 70% / 0.04)`,
          filter: 'blur(8px)',
          animation: `plib-dust-float ${8 + i * 0.5}s linear infinite`,
          animationDelay: `${i * 0.8}s`
        }} />
      ))}
      {/* Steel sheen line */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(25 60% 50% / 0.15), transparent)`
      }} />
    </div>
  );
}