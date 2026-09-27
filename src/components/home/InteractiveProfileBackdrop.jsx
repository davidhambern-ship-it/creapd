import React from 'react';

const PROFILE_ORDER = [
  'news',
  'music',
  'talk',
  'cooking',
  'sports',
  'cosmo',
  'spiritual',
  'research',
];

export default function InteractiveProfileBackdrop({ profiles = [], onEnter }) {
  const byKey = new Map(profiles.map(profile => [profile.key, profile]));

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl">
      <img
        src="/assets/home/CREAPD_Home_backdrop.png"
        alt="CREAPD Production Profiles"
        className="block w-full h-auto select-none"
        draggable="false"
      />

      <div
        className="absolute left-[0.45%] right-[0.45%] top-[26.1%] bottom-[23.1%] grid grid-cols-8 gap-[0.22%]"
        aria-label="CREAPD Production Profiles"
      >
        {PROFILE_ORDER.map((key) => {
          const profile = byKey.get(key);
          if (!profile) return <div key={key} aria-hidden="true" />;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onEnter?.(profile)}
              className="group relative min-w-0 rounded-[1.2vw] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
              aria-label={`Enter ${profile.shortLabel || profile.label}`}
            >
              <span className="absolute inset-0 rounded-[1.2vw] border border-transparent transition-all duration-200 group-hover:border-white/55 group-hover:bg-white/[0.025] group-hover:shadow-[0_0_34px_rgba(138,43,226,.24)]" />
              <span className="absolute left-1/2 bottom-[4.4%] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-black/70 px-2.5 py-1 text-[clamp(7px,.72vw,12px)] font-semibold text-white opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                Enter {profile.shortLabel || profile.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.04]" />
    </div>
  );
}
