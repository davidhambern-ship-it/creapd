import React from 'react';

// Modern Recording Studio — deep indigo/purple base, neon orbs, soundwave pattern, mixing console glow
export default function StudioAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 50% at 30% 0%, hsl(270 80% 30% / 0.12) 0%, transparent 60%),
                     radial-gradient(ellipse 60% 50% at 80% 100%, hsl(190 80% 30% / 0.08) 0%, transparent 55%),
                     hsl(var(--env-bg))`
      }} />
      {/* Soundwave pattern at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-1 opacity-20" style={{ paddingBottom: '2rem' }}>
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="flex-1 max-w-[4px] rounded-full cp-eq-bar" style={{
            background: `hsl(${i % 2 === 0 ? '270 80% 60%' : '190 80% 50%'})`,
            animationDelay: `${i * 0.05}s`,
            animationDuration: `${0.6 + (i % 4) * 0.2}s`
          }} />
        ))}
      </div>
      {/* Neon orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(270 80% 40% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(190 80% 40% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full animate-orb-3" style={{
        background: `radial-gradient(circle, hsl(270 60% 35% / 0.03) 0%, transparent 70%)`,
        filter: 'blur(60px)'
      }} />
      <div className="cc-scan-line" />
    </div>
  );
}