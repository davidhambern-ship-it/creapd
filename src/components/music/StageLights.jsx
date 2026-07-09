import React from 'react';

const FIXTURES = [
  { offset: 5, color: 'hsl(25 95% 55%)', baseAngle: -35, sweep: 70, delay: 0, dur: 8 },
  { offset: 18, color: 'hsl(270 80% 60%)', baseAngle: -20, sweep: 60, delay: 1.5, dur: 7 },
  { offset: 32, color: 'hsl(152 60% 45%)', baseAngle: -45, sweep: 90, delay: 0.8, dur: 9 },
  { offset: 46, color: 'hsl(270 80% 70%)', baseAngle: 10, sweep: 50, delay: 2.2, dur: 6.5 },
  { offset: 58, color: 'hsl(25 95% 60%)', baseAngle: 30, sweep: 65, delay: 1.2, dur: 7.5 },
  { offset: 72, color: 'hsl(152 60% 50%)', baseAngle: -10, sweep: 55, delay: 3, dur: 8.5 },
  { offset: 86, color: 'hsl(270 80% 65%)', baseAngle: 40, sweep: 75, delay: 0.4, dur: 9.5 },
  { offset: 96, color: 'hsl(25 95% 55%)', baseAngle: -25, sweep: 60, delay: 2.8, dur: 7 },
];

const POOLS = [
  { color: 'hsl(25 95% 55%)', top: '80%', left: '20%', delay: 0, dur: 10 },
  { color: 'hsl(270 80% 60%)', top: '75%', left: '50%', delay: 2, dur: 12 },
  { color: 'hsl(152 60% 45%)', top: '85%', left: '75%', delay: 1, dur: 11 },
  { color: 'hsl(270 80% 70%)', top: '90%', left: '35%', delay: 3, dur: 9 },
  { color: 'hsl(25 95% 60%)', top: '82%', left: '65%', delay: 1.5, dur: 13 },
];

export default function StageLights() {
  return (
    <>
      {/* ── Fixed full-page overlay: beams + floor pools ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Beams — originate from top of viewport, sweep across entire page */}
        {FIXTURES.map((fx, i) => (
          <div
            key={`beam-${i}`}
            className="absolute top-0"
            style={{
              left: `${fx.offset}%`,
              transformOrigin: 'top center',
              animation: `stage-beam-${i} ${fx.dur}s ease-in-out infinite`,
              animationDelay: `${fx.delay}s`,
            }}
          >
            <div
              className="absolute"
              style={{
                left: '-90px',
                width: '180px',
                height: '120vh',
                background: `linear-gradient(to bottom, ${fx.color} 0%, ${fx.color.replace(')', ' / 0.12)')} 20%, transparent 60%)`,
                clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)',
                filter: 'blur(10px)',
                opacity: 0.35,
              }}
            />
          </div>
        ))}

        {/* Floor pools of moving colored light */}
        {POOLS.map((p, i) => (
          <div
            key={`pool-${i}`}
            className="absolute rounded-full blur-[60px]"
            style={{
              width: '220px',
              height: '220px',
              top: p.top,
              left: p.left,
              background: p.color,
              opacity: 0.07,
              animation: `stage-pool-${i} ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>



      <style>{`
        @keyframes bulb-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.2); }
        }
        ${FIXTURES.map((fx, i) => `
          @keyframes stage-beam-${i} {
            0%, 100% { transform: rotate(${fx.baseAngle - fx.sweep / 2}deg); opacity: 0.3; }
            50% { transform: rotate(${fx.baseAngle + fx.sweep / 2}deg); opacity: 0.5; }
          }
        `).join('')}
        ${POOLS.map((_, i) => `
          @keyframes stage-pool-${i} {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(${i % 2 ? -50 : 60}px, ${i % 2 ? 20 : -30}px) scale(1.2); }
            66% { transform: translate(${i % 2 ? 40 : -40}px, ${i % 2 ? -40 : 20}px) scale(0.9); }
          }
        `).join('')}
      `}</style>
    </>
  );
}