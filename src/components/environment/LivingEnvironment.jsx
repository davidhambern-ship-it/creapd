import React, { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import '@/styles/motion-system.css';

/**
 * LivingEnvironment — Global ambient motion overlay.
 *
 * Mounts once at the app root (via CREAPModeLayout) and provides:
 *  • Breathing glow orbs (slow-drifting, low-opacity color washes)
 *  • Floating particles (tiny CSS-animated dots rising upward)
 *  • Periodic scan line sweep (thin light traveling down the screen)
 *  • Worker activity indicators (pulsing status lights at the bottom edge)
 *
 * All animations are pure CSS (transform/opacity only) for GPU acceleration.
 * No JavaScript animation loops. Particle count reduces on mobile for performance.
 * Honors `prefers-reduced-motion` via CSS media query in motion-system.css.
 */
export default function LivingEnvironment() {
  const isMobile = useIsMobile();
  const particleCount = isMobile ? 8 : 16;

  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }).map((_, i) => ({
        id: i,
        left: `${(i * 37 + 7) % 100}%`,
        top: `${(i * 53 + 13) % 100}%`,
        duration: `${10 + (i % 6) * 3}s`,
        delay: `${(i * 0.7) % 5}s`,
        size: `${2 + (i % 3)}px`,
      })),
    [particleCount]
  );

  return (
    <div className="living-env-root" aria-hidden="true">
      {/* Breathing glow orbs */}
      <div className="living-env-orb living-env-orb-purple" />
      <div className="living-env-orb living-env-orb-orange" />
      <div className="living-env-orb living-env-orb-emerald" />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="living-env-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}

      {/* Scan line sweep */}
      <div className="living-env-scan" />

      {/* Worker activity indicators */}
      <div className="living-env-worker-bar">
        <div className="living-env-worker-dots">
          <span className="living-env-worker-dot" style={{ animationDelay: '0s' }} />
          <span className="living-env-worker-dot" style={{ animationDelay: '0.4s' }} />
          <span className="living-env-worker-dot" style={{ animationDelay: '0.8s' }} />
          <span className="living-env-worker-dot" style={{ animationDelay: '1.2s' }} />
        </div>
        <span className="living-env-worker-label">AI WORKERS ACTIVE</span>
      </div>
    </div>
  );
}