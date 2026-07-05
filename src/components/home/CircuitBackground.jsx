import React, { useMemo } from 'react';

const CIRCUIT_COLORS = ['#8A2BE2', '#FF8C00', '#00CED1'];

function makeTraces() {
  const traces = [];
  let id = 0;

  // Horizontal traces with right-angle turns — desktop layout
  const horizontal = [
    'M0,60 L200,60 L220,80 L420,80 L440,60 L640,60 L660,80 L860,80 L880,60 L1080,60',
    'M0,120 L160,120 L180,140 L380,140 L400,120 L560,120 L580,100 L780,100 L800,120 L960,120 L980,140 L1140,140',
    'M0,200 L240,200 L260,220 L460,220 L480,200 L680,200 L700,220 L900,220 L920,200 L1120,200',
    'M0,280 L180,280 L200,300 L400,300 L420,280 L620,280 L640,300 L840,300 L860,280 L1060,280 L1080,300 L1200,300',
    'M0,360 L220,360 L240,380 L440,380 L460,360 L660,360 L680,380 L880,380 L900,360 L1100,360',
    'M0,440 L140,440 L160,460 L360,460 L380,440 L580,440 L600,460 L800,460 L820,440 L1020,440 L1040,460 L1240,460',
    'M0,520 L200,520 L220,500 L420,500 L440,520 L640,520 L660,500 L860,500 L880,520 L1080,520',
    'M0,600 L260,600 L280,580 L480,580 L500,600 L700,600 L720,580 L920,580 L940,600 L1140,600',
    'M0,680 L180,680 L200,700 L400,700 L420,680 L620,680 L640,700 L840,700 L860,680 L1060,680 L1080,700 L1280,700',
    'M0,760 L220,760 L240,740 L440,740 L460,760 L660,760 L680,740 L880,740 L900,760 L1100,760',
  ];

  horizontal.forEach((d) => {
    traces.push({
      id: id++,
      d,
      color: CIRCUIT_COLORS[id % 3],
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      direction: id % 2 === 0 ? 1 : -1,
    });
  });

  // Vertical traces
  const vertical = [
    'M100,0 L100,160 L120,180 L120,340 L100,360 L100,520 L120,540 L120,700',
    'M300,0 L300,100 L280,120 L280,280 L300,300 L300,460 L280,480 L280,640 L300,660 L300,800',
    'M500,0 L500,200 L520,220 L520,380 L500,400 L500,560 L520,580 L520,740',
    'M700,0 L700,120 L680,140 L680,300 L700,320 L700,480 L680,500 L680,660 L700,680 L700,800',
    'M900,0 L900,80 L920,100 L920,260 L900,280 L900,440 L920,460 L920,620 L900,640 L900,800',
    'M1100,0 L1100,140 L1080,160 L1080,320 L1100,340 L1100,500 L1080,520 L1080,680',
  ];

  vertical.forEach((d) => {
    traces.push({
      id: id++,
      d,
      color: CIRCUIT_COLORS[id % 3],
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      direction: id % 2 === 0 ? 1 : -1,
    });
  });

  return traces;
}

export default function CircuitBackground() {
  const traces = useMemo(() => makeTraces(), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
      {/* Base dark background — semi-transparent so page shows through */}
      <div className="absolute inset-0 bg-[#0d0d10]/40" />

      {/* Faint static circuit traces */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.15]"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {traces.map((t) => (
          <path
            key={`trace-${t.id}`}
            d={t.d}
            stroke={t.color}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* Circuit nodes (dots at trace endpoints) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {traces.map((t) => {
          const points = t.d.match(/L(\d+),(\d+)/g) || [];
          const lastPoint = points[points.length - 1]?.replace('L', '').split(',');
          return (
            <circle
              key={`node-${t.id}`}
              cx={lastPoint ? lastPoint[0] : 0}
              cy={lastPoint ? lastPoint[1] : 0}
              r="3"
              fill={t.color}
            >
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur={`${2 + Math.random() * 2}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </svg>

      {/* Animated light streaks traveling along each trace */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {traces.map((t) => (
          <g key={`streak-${t.id}`}>
            <path id={`streak-path-${t.id}`} d={t.d} stroke="none" fill="none" />
            {/* Main glowing streak */}
            <circle r="3.5" fill={t.color} style={{ filter: `drop-shadow(0 0 6px ${t.color}) drop-shadow(0 0 12px ${t.color}80)` }}>
              <animateMotion
                dur={`${t.duration}s`}
                begin={`${t.delay}s`}
                repeatCount="indefinite"
                keyPoints={t.direction > 0 ? '0;1' : '1;0'}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#streak-path-${t.id}`} />
              </animateMotion>
            </circle>
            {/* Trailing comet */}
            <circle r="2" fill={t.color} opacity="0.5" style={{ filter: `drop-shadow(0 0 4px ${t.color})` }}>
              <animateMotion
                dur={`${t.duration}s`}
                begin={`${t.delay + 0.15}s`}
                repeatCount="indefinite"
                keyPoints={t.direction > 0 ? '0;1' : '1;0'}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#streak-path-${t.id}`} />
              </animateMotion>
            </circle>
          </g>
        ))}
      </svg>

      {/* Subtle vignette — transparent so light streaks stay bright */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(13,13,16,0.2) 100%)',
        }}
      />
    </div>
  );
}