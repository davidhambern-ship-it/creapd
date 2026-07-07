import React, { useMemo } from 'react';

// Floating translucent bookshelf silhouettes — parallax layers
function HoloBookshelf({ style, delay }) {
  const books = useMemo(
    () => Array.from({ length: 12 + Math.floor(Math.random() * 8) }, () => ({
      h: 40 + Math.random() * 50,
      w: 3 + Math.random() * 5,
      hue: 190 + Math.random() * 30,
      sat: 40 + Math.random() * 30,
      lit: 20 + Math.random() * 15,
      op: 0.15 + Math.random() * 0.2,
    })),
    []
  );

  return (
    <div
      className="holo-shelf"
      style={{
        ...style,
        animationDelay: `${delay}s`,
      }}
    >
      <div className="holo-shelf-track">
        {books.map((b, i) => (
          <div
            key={i}
            className="holo-book"
            style={{
              height: `${b.h}%`,
              width: `${b.w}px`,
              background: `hsl(${b.hue} ${b.sat}% ${b.lit}% / ${b.op})`,
              boxShadow: `0 0 6px hsl(${b.hue} 60% 40% / ${b.op * 0.6})`,
            }}
          />
        ))}
      </div>
      {/* Shelf plank glow */}
      <div className="holo-shelf-plank" />
    </div>
  );
}

// Circular energy ring overhead
function EnergyRing() {
  return (
    <div className="energy-ring-container">
      <div className="energy-ring" />
      <div className="energy-ring-glow" />
      <div className="energy-ring-particles" />
    </div>
  );
}

// Side data panels — abstract technical readouts
function DataPanel({ side }) {
  const lines = useMemo(
    () => Array.from({ length: 8 }, () => ({
      w: 30 + Math.random() * 60,
      op: 0.1 + Math.random() * 0.25,
    })),
    []
  );
  return (
    <div className={`holo-data-panel holo-data-panel-${side}`}>
      <div className="holo-data-header">
        <span className="holo-data-dot" />
        <span className="holo-data-label">SYS</span>
      </div>
      <div className="holo-data-lines">
        {lines.map((l, i) => (
          <div
            key={i}
            className="holo-data-line"
            style={{ width: `${l.w}%`, opacity: l.op, animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LobbyHoloBackground() {
  return (
    <div className="lobby-holo-bg">
      {/* Base gradient — deep dark with cyan/purple ambient */}
      <div className="lobby-holo-base" />

      {/* Perspective grid floor */}
      <div className="lobby-holo-floor" />

      {/* Overhead energy ring */}
      <EnergyRing />

      {/* Floating bookshelves — background layer (further, dimmer) */}
      <HoloBookshelf style={{ left: '5%', bottom: '15%', width: '180px', height: '280px', opacity: 0.4 }} delay={0} />
      <HoloBookshelf style={{ right: '8%', bottom: '12%', width: '200px', height: '300px', opacity: 0.35 }} delay={2} />
      <HoloBookshelf style={{ left: '20%', bottom: '10%', width: '160px', height: '240px', opacity: 0.3 }} delay={4} />
      <HoloBookshelf style={{ right: '25%', bottom: '14%', width: '170px', height: '260px', opacity: 0.3 }} delay={1.5} />

      {/* Side data panels */}
      <DataPanel side="left" />
      <DataPanel side="right" />

      {/* Ambient glow orbs */}
      <div className="lobby-orb lobby-orb-cyan" />
      <div className="lobby-orb lobby-orb-purple" />

      {/* Floating particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="lobby-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${12 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 10}s`,
            opacity: 0.2 + Math.random() * 0.3,
          }}
        />
      ))}

      {/* Scan line sweep */}
      <div className="lobby-scan-sweep" />

      {/* Vignette */}
      <div className="lobby-vignette" />
    </div>
  );
}