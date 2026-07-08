import React from 'react';

// Late-Night Television Studio — deep black stage, warm spotlight cones, stage haze, LED strip glow
export default function StageAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 60% 40% at 50% 0%, hsl(35 80% 30% / 0.12) 0%, transparent 60%),
                     radial-gradient(ellipse 50% 60% at 50% 100%, hsl(280 50% 20% / 0.06) 0%, transparent 55%),
                     hsl(var(--env-bg))`
      }} />
      {/* Spotlight cones */}
      <div className="absolute top-0 left-1/4 w-2 h-screen" style={{
        background: `linear-gradient(180deg, hsl(35 90% 60% / 0.12) 0%, transparent 70%)`,
        filter: 'blur(40px)',
        transform: 'rotate(8deg)',
        transformOrigin: 'top'
      }} />
      <div className="absolute top-0 right-1/4 w-2 h-screen" style={{
        background: `linear-gradient(180deg, hsl(35 90% 60% / 0.12) 0%, transparent 70%)`,
        filter: 'blur(40px)',
        transform: 'rotate(-8deg)',
        transformOrigin: 'top'
      }} />
      {/* Stage haze */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
        background: `linear-gradient(180deg, transparent 0%, hsl(35 40% 30% / 0.04) 50%, hsl(35 30% 20% / 0.08) 100%)`,
        filter: 'blur(20px)'
      }} />
      {/* LED strip glow at top */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(35 90% 55% / 0.4), hsl(280 70% 55% / 0.3), hsl(35 90% 55% / 0.4), transparent)`,
        boxShadow: `0 0 12px hsl(35 90% 55% / 0.3)`
      }} />
      {/* Purple backstage glow */}
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full" style={{
        background: `radial-gradient(circle, hsl(280 60% 35% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full" style={{
        background: `radial-gradient(circle, hsl(35 70% 35% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
    </div>
  );
}