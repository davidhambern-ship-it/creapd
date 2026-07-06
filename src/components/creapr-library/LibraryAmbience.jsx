import React, { useEffect, useRef } from 'react';

/**
 * Library Ambience — animated background + subtle ambient audio.
 * Creates the atmospheric "library interior" feeling.
 * Uses Web Audio API for procedural ambient sound (no external files needed).
 */
export default function LibraryAmbience({ intensity = 'calm' }) {
  const audioCtxRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const noiseGainRef = useRef(null);

  // Procedural ambient audio — low filtered noise (fireplace/room tone)
  useEffect(() => {
    let ctx, source, gain, filter;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      // Create noise buffer
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
      filter.frequency.value = 100;
      filter.Q.value = 0.5;

      gain = ctx.createGain();
      gain.gain.value = 0;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      // Fade in
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3);

      noiseSourceRef.current = source;
      noiseGainRef.current = gain;
    } catch {
      // Audio not supported — visuals still work
    }

    return () => {
      try {
        if (gain && ctx) {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        }
        setTimeout(() => {
          try { source?.stop(); } catch {}
          try { ctx?.close(); } catch {}
        }, 1500);
      } catch {}
    };
  }, []);

  const orbOpacity = intensity === 'assembling' ? '0.15' : intensity === 'active' ? '0.10' : '0.06';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Deep warm dark background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, hsl(35 40% 12% / 0.6) 0%, transparent 60%),
            radial-gradient(ellipse at 30% 80%, hsl(270 30% 8% / 0.4) 0%, transparent 50%),
            hsl(220 30% 4%)
          `,
        }}
      />

      {/* Warm overhead light glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] rounded-full blur-3xl"
        style={{ background: `radial-gradient(ellipse, hsl(40 60% 30% / ${orbOpacity}) 0%, transparent 70%)` }}
      />

      {/* Subtle floating dust particles — warm golden */}
      {[...Array(20)].map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${(i * 4.7) % 100}%`,
            top: `${(i * 7.3) % 100}%`,
            width: `${1 + (i % 3)}px`,
            height: `${1 + (i % 3)}px`,
            background: `hsl(40 50% 70% / ${0.08 + (i % 4) * 0.03})`,
            animation: `particle-float ${20 + (i % 5) * 6}s linear infinite`,
            animationDelay: `${i * 1.2}s`,
          }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, hsl(220 30% 4% / 0.8) 100%)',
        }}
      />
    </div>
  );
}