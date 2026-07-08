import React from 'react';

// Zen Sanctuary — warm sand/stone base, soft golden light, natural textures, peaceful serene glow
export default function SanctuaryAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 0%, hsl(40 50% 30% / 0.12) 0%, transparent 60%),
                     radial-gradient(ellipse 60% 50% at 30% 80%, hsl(150 30% 25% / 0.05) 0%, transparent 55%),
                     radial-gradient(ellipse 50% 50% at 80% 70%, hsl(40 40% 25% / 0.04) 0%, transparent 55%),
                     hsl(var(--env-bg))`
      }} />
      {/* Soft golden light from above */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full" style={{
        background: `radial-gradient(ellipse, hsl(40 60% 50% / 0.07) 0%, transparent 70%)`,
        filter: 'blur(60px)',
        animation: 'plib-breathe 8s ease-in-out infinite'
      }} />
      {/* Warm orbs */}
      <div className="absolute top-1/3 left-10 w-64 h-64 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(40 50% 45% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(45px)'
      }} />
      <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(150 30% 40% / 0.04) 0%, transparent 70%)`,
        filter: 'blur(45px)'
      }} />
      {/* Natural texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, hsl(40 30% 60%) 0px, hsl(40 30% 60%) 1px, transparent 1px, transparent 4px)`
      }} />
      {/* Soft floating particles (dust in light) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="absolute rounded-full" style={{
          left: `${15 + i * 10}%`,
          bottom: '0',
          width: '3px',
          height: '3px',
          background: `hsl(40 50% 70% / 0.3)`,
          animation: `plib-dust-float ${12 + i}s linear infinite`,
          animationDelay: `${i * 1.5}s`
        }} />
      ))}
      {/* Warm floor glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(40 50% 50% / 0.12), transparent)`
      }} />
    </div>
  );
}