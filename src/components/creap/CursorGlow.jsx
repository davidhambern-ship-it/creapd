import React, { useEffect, useRef } from 'react';

/**
 * CursorGlow — a soft radial glow that follows the cursor.
 * Performance: uses requestAnimationFrame with lerp for smooth trailing.
 * Pointer-events: none, so it never interferes with clicks.
 */
export default function CursorGlow() {
  const ref = useRef(null);

  useEffect(() => {
    let raf;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      if (ref.current) {
        ref.current.style.transform = `translate(${currentX - 250}px, ${currentY - 250}px)`;
      }
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-0 will-change-transform"
      style={{
        background:
          'radial-gradient(circle, hsl(270 80% 60% / 0.07) 0%, hsl(25 95% 55% / 0.03) 40%, transparent 70%)',
      }}
    />
  );
}