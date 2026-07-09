import React from 'react';

/**
 * Animated stage light beams emanating from behind a title element.
 * Renders colored light cones that sweep around like a concert light show.
 */
export default function StageLights() {
  const lights = [
    { color: 'hsl(25 95% 55%)', startX: '10%', angle: -30, delay: 0, duration: 6 },
    { color: 'hsl(270 80% 60%)', startX: '30%', angle: 20, delay: 1.5, duration: 7 },
    { color: 'hsl(152 60% 45%)', startX: '50%', angle: -15, delay: 0.8, duration: 5.5 },
    { color: 'hsl(270 80% 60%)', startX: '70%', angle: 25, delay: 2.2, duration: 6.5 },
    { color: 'hsl(25 95% 55%)', startX: '90%', angle: -40, delay: 1.2, duration: 7.5 },
    { color: 'hsl(152 60% 45%)', startX: '20%', angle: 35, delay: 3, duration: 6 },
    { color: 'hsl(270 80% 70%)', startX: '80%', angle: -25, delay: 2.5, duration: 8 },
    { color: 'hsl(25 95% 60%)', startX: '45%', angle: 10, delay: 0.4, duration: 5 },
  ];

  return (
    <div className="absolute inset-0 flex items-start justify-center pointer-events-none overflow-hidden">
      {/* Central glow burst */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[80px] opacity-30"
        style={{
          background: 'radial-gradient(ellipse, hsl(270 80% 60% / 0.4), hsl(25 95% 55% / 0.2) 40%, transparent 70%)',
          animation: 'stage-glow-pulse 4s ease-in-out infinite',
        }}
      />

      {/* Light beams */}
      {lights.map((light, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: light.startX,
            transformOrigin: 'top center',
            animation: `stage-light-sweep-${i} ${light.duration}s ease-in-out infinite`,
            animationDelay: `${light.delay}s`,
          }}
        >
          <div
            className="stage-beam"
            style={{
              width: '180px',
              height: '400px',
              background: `linear-gradient(to bottom, ${light.color} 0%, ${light.color.replace(')', ' / 0.15)')} 30%, transparent 80%)`,
              clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)',
              filter: `blur(6px)`,
              opacity: 0.5,
            }}
          />
        </div>
      ))}

      {/* Floating color orbs that drift around the title */}
      {[
        { color: 'hsl(25 95% 55%)', size: 80, top: '20%', left: '15%', delay: 0, dur: 8 },
        { color: 'hsl(270 80% 60%)', size: 100, top: '30%', left: '75%', delay: 2, dur: 10 },
        { color: 'hsl(152 60% 45%)', size: 70, top: '50%', left: '25%', delay: 1, dur: 9 },
        { color: 'hsl(25 95% 60%)', size: 90, top: '10%', left: '60%', delay: 3, dur: 7 },
        { color: 'hsl(270 80% 70%)', size: 60, top: '40%', left: '50%', delay: 1.5, dur: 11 },
      ].map((orb, i) => (
        <div
          key={`orb-${i}`}
          className="absolute rounded-full blur-[40px]"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: orb.color,
            opacity: 0.25,
            animation: `stage-orb-drift-${i} ${orb.dur}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes stage-glow-pulse {
          0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(0.9); }
          50% { opacity: 0.4; transform: translateX(-50%) scale(1.1); }
        }

        @keyframes stage-orb-drift-0 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(40px, 20px); }
          50% { transform: translate(-20px, 40px); }
          75% { transform: translate(30px, -10px); }
        }
        @keyframes stage-orb-drift-1 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-50px, 30px); }
          50% { transform: translate(30px, -20px); }
          75% { transform: translate(-10px, 50px); }
        }
        @keyframes stage-orb-drift-2 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(50px, -30px); }
          50% { transform: translate(-30px, 20px); }
          75% { transform: translate(20px, 40px); }
        }
        @keyframes stage-orb-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-30px, 40px); }
          50% { transform: translate(40px, -30px); }
          75% { transform: translate(-20px, -10px); }
        }
        @keyframes stage-orb-drift-4 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -40px); }
          50% { transform: translate(-40px, 10px); }
          75% { transform: translate(50px, 30px); }
        }

        @keyframes stage-light-sweep-0 {
          0%, 100% { transform: rotate(-30deg) scaleY(1); opacity: 0.4; }
          50% { transform: rotate(20deg) scaleY(1.2); opacity: 0.6; }
        }
        @keyframes stage-light-sweep-1 {
          0%, 100% { transform: rotate(20deg) scaleY(1.1); opacity: 0.5; }
          50% { transform: rotate(-25deg) scaleY(0.9); opacity: 0.7; }
        }
        @keyframes stage-light-sweep-2 {
          0%, 100% { transform: rotate(-15deg) scaleY(0.9); opacity: 0.6; }
          50% { transform: rotate(30deg) scaleY(1.2); opacity: 0.4; }
        }
        @keyframes stage-light-sweep-3 {
          0%, 100% { transform: rotate(25deg) scaleY(1); opacity: 0.5; }
          50% { transform: rotate(-20deg) scaleY(1.1); opacity: 0.7; }
        }
        @keyframes stage-light-sweep-4 {
          0%, 100% { transform: rotate(-40deg) scaleY(1.2); opacity: 0.4; }
          50% { transform: rotate(15deg) scaleY(0.9); opacity: 0.6; }
        }
        @keyframes stage-light-sweep-5 {
          0%, 100% { transform: rotate(35deg) scaleY(1); opacity: 0.5; }
          50% { transform: rotate(-30deg) scaleY(1.2); opacity: 0.6; }
        }
        @keyframes stage-light-sweep-6 {
          0%, 100% { transform: rotate(-25deg) scaleY(1.1); opacity: 0.4; }
          50% { transform: rotate(25deg) scaleY(0.95); opacity: 0.6; }
        }
        @keyframes stage-light-sweep-7 {
          0%, 100% { transform: rotate(10deg) scaleY(0.9); opacity: 0.6; }
          50% { transform: rotate(-35deg) scaleY(1.15); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}