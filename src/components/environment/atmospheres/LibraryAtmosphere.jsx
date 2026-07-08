import React from 'react';

// Executive Digital Library — warm wood tones, bookshelf silhouettes, ambient light, dust particles
export default function LibraryAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 0%, hsl(38 45% 25% / 0.15) 0%, transparent 60%),
                     radial-gradient(ellipse 60% 50% at 50% 100%, hsl(190 40% 20% / 0.05) 0%, transparent 55%),
                     radial-gradient(circle at 15% 50%, hsl(28 30% 18% / 0.08) 0%, transparent 40%),
                     radial-gradient(circle at 85% 50%, hsl(28 30% 18% / 0.08) 0%, transparent 40%),
                     hsl(var(--env-bg))`
      }} />
      {/* Wood paneling texture */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0px, transparent 120px, hsl(25 20% 6% / 0.5) 120px, hsl(25 20% 6% / 0.5) 122px, transparent 122px, transparent 124px)`
      }} />
      {/* Warm overhead light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full" style={{
        background: `radial-gradient(ellipse, hsl(38 50% 50% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(50px)',
        animation: 'plib-breathe 10s ease-in-out infinite'
      }} />
      {/* Bookshelf silhouettes — left */}
      <div className="absolute left-0 top-1/4 bottom-0 w-32 opacity-20" style={{
        background: `linear-gradient(90deg, hsl(28 20% 12%) 0%, transparent 100%)`
      }} />
      {/* Bookshelf silhouettes — right */}
      <div className="absolute right-0 top-1/4 bottom-0 w-32 opacity-20" style={{
        background: `linear-gradient(270deg, hsl(28 20% 12%) 0%, transparent 100%)`
      }} />
      {/* Teal accent orb */}
      <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(190 50% 40% / 0.04) 0%, transparent 70%)`,
        filter: 'blur(45px)'
      }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(40 45% 40% / 0.04) 0%, transparent 70%)`,
        filter: 'blur(45px)'
      }} />
      {/* Dust particles */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${10 + i * 9}%`,
          bottom: '0',
          width: '3px',
          height: '3px',
          background: `hsl(40 50% 75% / 0.3)`,
          animation: `plib-dust-float ${14 + i}s linear infinite`,
          animationDelay: `${i * 1.2}s`
        }} />
      ))}
      {/* Glass reflection sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px]" style={{
          background: `linear-gradient(90deg, transparent, hsl(190 50% 50% / 0.15), transparent)`
        }} />
      </div>
    </div>
  );
}