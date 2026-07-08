import React from 'react';

// Broadcast Sports Center — bold green/black base, electric blue accents, field lines, scoreboard glow
export default function SportsAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 70% 50% at 50% 0%, hsl(150 60% 25% / 0.12) 0%, transparent 60%),
                     radial-gradient(ellipse 60% 50% at 80% 100%, hsl(200 70% 25% / 0.08) 0%, transparent 55%),
                     hsl(var(--env-bg))`
      }} />
      {/* Field line pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3" style={{
        backgroundImage: `linear-gradient(hsl(150 60% 40% / 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, hsl(150 60% 40% / 0.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'linear-gradient(to top, hsl(0 0% 0% / 1), transparent)',
        WebkitMaskImage: 'linear-gradient(to top, hsl(0 0% 0% / 1), transparent)'
      }} />
      {/* Center field glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full" style={{
        background: `radial-gradient(ellipse, hsl(150 60% 40% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(60px)'
      }} />
      {/* Electric orbs */}
      <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(150 60% 35% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(200 70% 40% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      {/* Scoreboard glow strip */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(150 70% 45% / 0.3), hsl(200 80% 50% / 0.2), hsl(150 70% 45% / 0.3), transparent)`,
        boxShadow: `0 0 12px hsl(150 70% 45% / 0.2)`
      }} />
      <div className="cc-scan-line" />
    </div>
  );
}