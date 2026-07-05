import React from 'react';

/**
 * CREAPD Logo — horizontal lockup (matches brand spec)
 * Icon: bracket "C", orange→purple gradient, teal triangle
 * Wordmark: C R E [A] P D — metallic silver gradient; "A" has orange→purple
 *   vertical gradient with a hollow triangular cutout
 * Divider: orange → white flare → teal with center glow
 * Tagline 1: "CREATE. AUTOMATE. PRODUCE. DIRECT." — orange, purple, teal, white
 * Tagline 2: "THE AI PRODUCTION COMPANY" — white, spaced
 */
export default function CreapdLogo({ showWordmark = true, height = 'h-8 lg:h-9' }) {
  const metallicStyle = {
    background:
    'linear-gradient(180deg, #E6E6E6 0%, #B8B8B8 40%, #6E6E6E 58%, #C0C0C0 100%)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent'
  };

  return (
    <div className="flex items-center gap-2 lg:gap-2.5">
      {/* Logo Icon */}
      <svg
        viewBox="0 0 40 40"
        className={`${height} w-auto`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        
        <defs>
          <linearGradient id="creapd-c-grad" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FF8C00" />
            <stop offset="1" stopColor="#8A2BE2" />
          </linearGradient>
        </defs>
        <path
          d="M30 4 H12 C7.6 4 4 7.6 4 12 V28 C4 32.4 7.6 36 12 36 H30 L26 31 H14 C11.8 31 10 29.2 10 27 V13 C10 10.8 11.8 9 14 9 H26 L30 4 Z"
          fill="url(#creapd-c-grad)" />
        
        <path d="M18 15 L28 20 L18 25 Z" fill="#00CED1" />
      </svg>

      



























































      
    </div>);

}