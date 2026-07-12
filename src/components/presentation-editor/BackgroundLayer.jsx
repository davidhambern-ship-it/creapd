import React from 'react';

export function parseBG(slide) {
  try {
    const bg = JSON.parse(slide?.background || '{}');
    if (bg.image_url) return { backgroundImage: `url(${bg.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (bg.gradient) return { background: bg.gradient };
    if (bg.color) return { background: bg.color };
  } catch {}
  return { background: '#0a0a0a' };
}

export default function BackgroundLayer({ slide }) {
  return <div className="absolute inset-0" style={{ zIndex: 0, ...parseBG(slide) }} />;
}