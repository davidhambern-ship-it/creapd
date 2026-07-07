import React, { useMemo } from 'react';

/**
 * Animated ambient background for the Command Center.
 * Renders floating particle dots, drifting glow orbs, and a scan line sweep.
 */
export default function CommandCenterAmbience() {
  // Generate stable random particle positions once
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 12,
      duration: 12 + Math.random() * 18,
      hue: i % 3 === 0 ? 'hsl(190 80% 55%)' : i % 3 === 1 ? 'hsl(35 90% 60%)' : 'hsl(152 60% 55%)',
      opacity: 0.15 + Math.random() * 0.25,
    }));
  }, []);

  const orbs = useMemo(() => {
    return [
      { size: 320, top: '5%', left: '60%', hue: 'hsl(190 60% 35% / 0.05)', delay: 0, anim: 'cc-orb-1' },
      { size: 260, top: '40%', left: '10%', hue: 'hsl(35 70% 30% / 0.04)', delay: 3, anim: 'cc-orb-2' },
      { size: 200, top: '70%', left: '80%', hue: 'hsl(152 50% 35% / 0.04)', delay: 1.5, anim: 'cc-orb-3' },
    ];
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Drifting glow orbs */}
      {orbs.map((orb, i) => (
        <div
          key={`orb-${i}`}
          className={orb.anim}
          style={{
            position: 'absolute',
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.hue} 0%, transparent 70%)`,
            filter: 'blur(60px)',
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}

      {/* Scan line sweep */}
      <div className="cc-scan-line" />

      {/* Floating particle dots */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="cc-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.hue,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            boxShadow: `0 0 ${p.size * 3}px ${p.hue}`,
          }}
        />
      ))}

      {/* Animated grid floor effect at bottom */}
      <div className="cc-grid-floor" />
    </div>
  );
}