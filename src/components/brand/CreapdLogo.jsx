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

      {showWordmark &&
      <div className="flex flex-col leading-none hidden">
          {/* Wordmark */}
          <div
          className="flex items-center tracking-tight text-lg lg:text-xl"
          style={{ fontFamily: "'Ethnocentric', 'Poppins', sans-serif", fontWeight: 400 }}>
          
            <span style={metallicStyle} className="hidden">CRE</span>
            <svg
            style={{ width: '0.6em', height: '0.88em', display: 'inline-block', margin: '0 -0.02em' }}
            viewBox="0 0 14 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            
              <defs>
                <linearGradient id="creapd-a-grad" x1="0" y1="20" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#FF8C00" />
                  <stop offset="1" stopColor="#8A2BE2" />
                </linearGradient>
              </defs>
              {/* A with hollow triangle cutout (evenodd) */}
              <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1 20 L7 1 L13 20 L10.5 20 L9.2 16 L4.8 16 L3.5 20 Z M5 14.2 L9 14.2 L7 7.5 Z"
              fill="url(#creapd-a-grad)" />
            
            </svg>
            <span style={metallicStyle} className="hidden">PD</span>
          </div>

          {/* Divider: orange → white flare → teal */}
          <div
          className="mt-0.5 h-px w-full"
          style={{
            background:
            'linear-gradient(90deg, #FF8C00 0%, rgba(255,140,0,0.3) 30%, #FFFFFF 50%, rgba(0,206,209,0.3) 70%, #00CED1 100%)',
            boxShadow: '0 0 3px rgba(255,255,255,0.35)'
          }} />
        

          {/* Tagline row 1 */}
          <div
          className="mt-0.5 text-[6px] lg:text-[7px] font-heading font-semibold tracking-[0.06em] flex gap-[3px]"
          style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
          
            <span style={{ color: '#FF8C00' }} className="hidden">CREATE.</span>
            <span style={{ color: '#8A2BE2' }} className="hidden">AUTOMATE.</span>
            <span style={{ color: '#00CED1' }} className="hidden">PRODUCE.</span>
            <span style={{ color: '#FFFFFF' }} className="hidden">DIRECT.</span>
          </div>

          {/* Tagline row 2 */}
          <div
          className="text-[5px] lg:text-[6px] text-white/60 tracking-[0.2em] font-medium mt-px hidden"
          style={{ fontFamily: "'Inter', sans-serif" }}>
          
            THE AI PRODUCTION COMPANY
          </div>
        </div>
      }
    </div>);

}