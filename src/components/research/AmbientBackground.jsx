import React, { useEffect, useState } from 'react';

const STATUS_ITEMS = [
  { label: 'Research Feed', x: 5, y: 15, delay: 0 },
  { label: 'Source Index', x: 90, y: 25, delay: 1.5 },
  { label: 'Dossier Queue', x: 8, y: 70, delay: 3 },
  { label: 'Asset Pipeline', x: 85, y: 65, delay: 0.8 },
];

export default function AmbientBackground() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Floating gradient orbs */}
      <div className="absolute w-96 h-96 rounded-full bg-cyan-500/[0.03] blur-3xl animate-orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="absolute w-80 h-80 rounded-full bg-violet-500/[0.03] blur-3xl animate-orb-2" style={{ bottom: '10%', right: '5%' }} />
      <div className="absolute w-64 h-64 rounded-full bg-emerald-500/[0.02] blur-3xl animate-orb-3" style={{ top: '40%', left: '50%' }} />

      {/* Subtle grid */}
      <div className="absolute inset-0 creap-grid-bg opacity-30" />

      {/* Digital status indicators */}
      {STATUS_ITEMS.map((item, i) => (
        <div
          key={i}
          className="absolute hidden lg:flex flex-col items-center gap-0.5"
          style={{ left: `${item.x}%`, top: `${item.y}%`, animation: `pulse-glow 3s ease-in-out ${item.delay}s infinite` }}
        >
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[8px] text-muted-foreground/30 font-mono uppercase tracking-wider">{item.label}</span>
          </div>
          <span className="text-[8px] text-muted-foreground/20 font-mono">ACTIVE</span>
        </div>
      ))}

      {/* Digital clock */}
      <div className="absolute top-2 right-4 hidden xl:block">
        <span className="text-[9px] text-muted-foreground/20 font-mono">
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </div>
  );
}