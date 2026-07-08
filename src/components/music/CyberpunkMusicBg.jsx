import React from 'react';

const CP_BG = 'https://media.base44.com/images/public/6a4126962e5804304cc84b12/97fafc255_generated_image.png';

export default function CyberpunkMusicBg({ variant = 'default' }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${CP_BG})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />
      <div className="fixed inset-0 cp-grid-floor pointer-events-none" />
      {variant === 'eq' && (
        <div className="fixed bottom-8 right-8 flex items-end gap-1 h-16 pointer-events-none opacity-30">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="cp-eq-bar w-1.5 rounded-t"
              style={{
                animationDelay: `${i * 0.1}s`,
                background: i % 2 === 0 ? '#FF00FF' : '#00FFFF',
                boxShadow: `0 0 8px ${i % 2 === 0 ? '#FF00FF' : '#00FFFF'}`,
              }}
            />
          ))}
        </div>
      )}
      {variant === 'left' && (
        <div className="fixed top-1/4 left-8 flex flex-col gap-1 h-32 pointer-events-none opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="cp-eq-bar w-1.5 rounded-r"
              style={{
                animationDelay: `${i * 0.15}s`,
                background: i % 2 === 0 ? '#FF00FF' : '#00FFFF',
                boxShadow: `0 0 6px ${i % 2 === 0 ? '#FF00FF' : '#00FFFF'}`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}