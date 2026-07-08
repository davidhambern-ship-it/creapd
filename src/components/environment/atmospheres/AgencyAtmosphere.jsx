import React from 'react';

// Modern Creative Agency — bright rose/pink base, gradient orbs, geometric shapes, airy open feel
export default function AgencyAtmosphere() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 60% 50% at 20% 20%, hsl(330 80% 50% / 0.08) 0%, transparent 55%),
                     radial-gradient(ellipse 60% 50% at 80% 80%, hsl(280 60% 50% / 0.06) 0%, transparent 55%),
                     radial-gradient(ellipse 50% 40% at 50% 50%, hsl(340 40% 40% / 0.03) 0%, transparent 60%),
                     hsl(var(--env-bg))`
      }} />
      {/* Floating gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full animate-orb-1" style={{
        background: `radial-gradient(circle, hsl(330 80% 50% / 0.07) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full animate-orb-2" style={{
        background: `radial-gradient(circle, hsl(280 60% 55% / 0.06) 0%, transparent 70%)`,
        filter: 'blur(50px)'
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full animate-orb-3" style={{
        background: `radial-gradient(circle, hsl(340 50% 50% / 0.03) 0%, transparent 70%)`,
        filter: 'blur(60px)'
      }} />
      {/* Geometric accent shapes */}
      <div className="absolute top-1/3 right-1/4 w-32 h-32 rounded-2xl rotate-12" style={{
        border: `1px solid hsl(330 60% 55% / 0.08)`,
        background: `hsl(330 50% 50% / 0.02)`,
        animation: 'cc-fade-in 1s ease-out both, gentle-float 6s ease-in-out infinite'
      }} />
      <div className="absolute bottom-1/3 left-1/4 w-24 h-24 rounded-full" style={{
        border: `1px solid hsl(280 50% 55% / 0.08)`,
        background: `hsl(280 40% 50% / 0.02)`,
        animation: 'cc-fade-in 1.2s ease-out both, gentle-float 7s ease-in-out infinite reverse'
      }} />
      {/* Soft top light */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, hsl(330 80% 60% / 0.15), hsl(280 60% 65% / 0.1), transparent)`
      }} />
    </div>
  );
}