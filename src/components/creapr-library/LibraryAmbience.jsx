import React, { useEffect, useRef, useMemo } from 'react';

const BINARY_CHARS = '01';

function generateBinaryStream(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += BINARY_CHARS[Math.floor(Math.random() * 2)];
    if ((i + 1) % 1 === 0) result += '\n';
  }
  return result;
}

export default function LibraryAmbience({ intensity = 'calm' }) {
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const noiseGainRef = useRef(null);

  useEffect(() => {
    let ctx, source, gain, filter;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 80;
      filter.Q.value = 0.3;
      gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 3);
      noiseSourceRef.current = source;
      noiseGainRef.current = gain;
    } catch {}
    return () => {
      try {
        if (gain && ctx) gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => {
          try { source?.stop(); } catch {}
          try { ctx?.close(); } catch {}
        }, 1500);
      } catch {}
    };
  }, []);

  const orbIntensity = intensity === 'assembling' ? 0.18 : intensity === 'active' ? 0.12 : 0.07;

  // Pre-generate binary streams
  const binaryStreams = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      left: `${(i * 7.5 + 3) % 100}%`,
      duration: `${12 + (i % 5) * 4}s`,
      delay: `${i * 1.8}s`,
      color: i % 4 === 0 ? 'hsl(190 90% 55% / 0.15)' : i % 4 === 1 ? 'hsl(270 80% 65% / 0.13)' : i % 4 === 2 ? 'hsl(152 60% 50% / 0.12)' : 'hsl(25 95% 60% / 0.10)',
      content: generateBinaryStream(40),
    }));
  }, []);

  // Pre-generate data nodes
  const dataNodes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      top: `${15 + (i * 11) % 70}%`,
      left: `${(i * 13 + 5) % 90}%`,
      size: 3 + (i % 3),
      color: i % 3 === 0 ? 'hsl(270 80% 60%)' : i % 3 === 1 ? 'hsl(190 90% 55%)' : 'hsl(152 60% 50%)',
      delay: `${i * 0.8}s`,
      duration: `${3 + (i % 4)}s`,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Deep tech background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, hsl(270 60% 15% / 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, hsl(190 70% 12% / 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(220 40% 8% / 0.5) 0%, transparent 60%),
            hsl(220 35% 3%)
          `,
        }}
      />

      {/* Circuit grid */}
      <div
        className="absolute inset-0 creap-grid-bg"
        style={{ opacity: 0.4 }}
      />

      {/* Glowing orbs */}
      <div
        className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full blur-3xl animate-orb-1"
        style={{ background: `radial-gradient(circle, hsl(270 80% 50% / ${orbIntensity}) 0%, transparent 70%)` }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[24rem] h-[24rem] rounded-full blur-3xl animate-orb-2"
        style={{ background: `radial-gradient(circle, hsl(190 90% 45% / ${orbIntensity}) 0%, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[20rem] h-[20rem] rounded-full blur-3xl animate-orb-3"
        style={{ background: `radial-gradient(circle, hsl(152 60% 40% / ${orbIntensity * 0.8}) 0%, transparent 70%)` }}
      />

      {/* Circuit lines — horizontal */}
      <div className="circuit-line w-full h-px" style={{ top: '15%', animationDelay: '0s' }} />
      <div className="circuit-line w-full h-px" style={{ top: '38%', animationDelay: '1.5s', background: 'linear-gradient(90deg, transparent, hsl(190 90% 55% / 0.25), transparent)' }} />
      <div className="circuit-line w-full h-px" style={{ top: '62%', animationDelay: '3s' }} />
      <div className="circuit-line w-full h-px" style={{ top: '85%', animationDelay: '4.5s', background: 'linear-gradient(90deg, transparent, hsl(152 60% 50% / 0.2), transparent)' }} />

      {/* Circuit lines — vertical */}
      <div className="circuit-line h-full w-px" style={{ left: '12%', animationDelay: '0.5s', background: 'linear-gradient(180deg, transparent, hsl(270 80% 60% / 0.2), transparent)' }} />
      <div className="circuit-line h-full w-px" style={{ left: '45%', animationDelay: '2s', background: 'linear-gradient(180deg, transparent, hsl(190 90% 55% / 0.15), transparent)' }} />
      <div className="circuit-line h-full w-px" style={{ left: '78%', animationDelay: '3.5s', background: 'linear-gradient(180deg, transparent, hsl(25 95% 55% / 0.15), transparent)' }} />

      {/* Digital pulse rings */}
      <div className="digital-ring w-48 h-48" style={{ top: '20%', left: '15%', animationDelay: '0s' }} />
      <div className="digital-ring w-72 h-72" style={{ bottom: '15%', right: '20%', animationDelay: '3s' }} />
      <div className="digital-ring w-36 h-36" style={{ top: '50%', right: '35%', animationDelay: '5s' }} />

      {/* Scan line sweep */}
      <div className="scan-line-overlay" />

      {/* Binary rain streams */}
      {binaryStreams.map((stream, i) => (
        <div
          key={`binary-${i}`}
          className="binary-stream"
          style={{
            left: stream.left,
            animationDuration: stream.duration,
            animationDelay: stream.delay,
            color: stream.color,
          }}
        >
          {stream.content}
        </div>
      ))}

      {/* Data nodes — pulsing connection points */}
      {dataNodes.map((node, i) => (
        <div
          key={`node-${i}`}
          className="absolute rounded-full"
          style={{
            top: node.top,
            left: node.left,
            width: `${node.size}px`,
            height: `${node.size}px`,
            background: node.color,
            boxShadow: `0 0 8px ${node.color}, 0 0 20px ${node.color}`,
            animation: `pulse-glow ${node.duration} ease-in-out infinite`,
            animationDelay: node.delay,
          }}
        />
      ))}

      {/* Floating data particles */}
      {[...Array(16)].map((_, i) => (
        <span
          key={`particle-${i}`}
          className="particle-dot"
          style={{
            left: `${(i * 6.5 + 2) % 100}%`,
            bottom: '-10px',
            animationDuration: `${14 + (i % 5) * 4}s`,
            animationDelay: `${i * 1.3}s`,
            background: i % 3 === 0 ? 'hsl(270 80% 65% / 0.4)' : i % 3 === 1 ? 'hsl(190 90% 55% / 0.35)' : 'hsl(152 60% 50% / 0.3)',
          }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, hsl(220 35% 3% / 0.85) 100%)',
        }}
      />

      {/* Top scan line overlay for CRT effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, hsl(0 0% 0% / 0.03) 3px, transparent 4px)',
          opacity: 0.5,
        }}
      />
    </div>
  );
}