import React from 'react';

// Newsroom Command Center — amber studio lights, command grid, scan lines, data panel silhouettes
export default function NewsroomAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(25 80% 25% / 0.18) 0%, transparent 60%),
                     radial-gradient(ellipse at 15% 80%, hsl(210 60% 20% / 0.12) 0%, transparent 50%),
                     radial-gradient(ellipse at 85% 70%, hsl(25 70% 20% / 0.08) 0%, transparent 50%),
                     hsl(var(--env-bg))`
      }} />
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(hsl(25 50% 40% / 0.03) 1px, transparent 1px),
                          linear-gradient(90deg, hsl(25 50% 40% / 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
        animation: 'cc-grid-floor-pan 30s linear infinite'
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full" style={{
        background: `radial-gradient(ellipse, hsl(25 90% 50% / 0.08) 0%, transparent 70%)`,
        filter: 'blur(60px)'
      }} />
      <div className="absolute top-1/4 left-10 w-64 h-64 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(25 80% 40% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(210 70% 40% / 0.05) 0%, transparent 70%)`,
        filter: 'blur(40px)'
      }} />
      <div className="cc-scan-line" />
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(25 90% 50% / 0.2), transparent)`
      }} />
    </div>
  );
}