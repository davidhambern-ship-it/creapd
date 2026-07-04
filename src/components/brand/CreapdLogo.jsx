import React from 'react';

/**
 * CREAPD Logo — horizontal lockup
 * Icon: stylized "C" bracket, orange→purple gradient, teal triangle
 * Wordmark: "CREAPD" bold geometric sans
 * Brand colors: Orange #FF6A00, Purple #8A2BE2, Teal #00C884
 */
export default function CreapdLogo({ showWordmark = true, height = 'h-8 lg:h-10' }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Logo Icon — bracket "C" with gradient + teal triangle */}
      <svg
        viewBox="0 0 40 40"
        className={`${height} w-auto`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="creapd-c-gradient" x1="0" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FF6A00" />
            <stop offset="1" stopColor="#8A2BE2" />
          </linearGradient>
        </defs>
        {/* Bracket "C" shape */}
        <path
          d="M30 4 H12 C7.6 4 4 7.6 4 12 V28 C4 32.4 7.6 36 12 36 H30 L26 31 H14 C11.8 31 10 29.2 10 27 V13 C10 10.8 11.8 9 14 9 H26 L30 4 Z"
          fill="url(#creapd-c-gradient)"
        />
        {/* Teal triangle pointing right inside the C */}
        <path d="M18 15 L28 20 L18 25 Z" fill="#00C884" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-heading font-extrabold tracking-tight text-white text-lg lg:text-xl"
            style={{ fontFamily: "'Poppins', 'Inter', sans-serif", display: 'inline-flex', alignItems: 'center' }}
          >
            CRE
            <svg
              style={{ width: '0.64em', height: '0.92em', display: 'inline-block', margin: '0 -0.02em' }}
              viewBox="0 0 14 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* A with hollowed-out triangle center (evenodd cutout) */}
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M1 20 L7 1 L13 20 L10.5 20 L9.2 16 L4.8 16 L3.5 20 Z M5 14.2 L9 14.2 L7 7.5 Z"
                fill="currentColor"
              />
              {/* Teal triangle accent mirroring the brand icon */}
              <path d="M5.4 13.4 L8.6 13.4 L7 9 Z" fill="#00C884" />
            </svg>
            PD
          </span>
          <span className="text-[7px] lg:text-[8px] font-mono text-muted-foreground tracking-[0.12em] uppercase mt-0.5">
            Create. Automate. Produce. Direct.
          </span>
        </div>
      )}
    </div>
  );
}