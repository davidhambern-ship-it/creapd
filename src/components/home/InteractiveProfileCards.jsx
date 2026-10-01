import React from 'react';
import { ArrowRight, Construction } from 'lucide-react';

const PROFILE_VISUALS = {
  radio:    { x: '14.286%', accent: '#a855f7', tagline: 'Build the show. Run the room.' },
  podcast:  { x: '0%',      accent: '#ff6a00', tagline: 'Prepare. Approve. Package. Produce.' },
  research: { x: '100%',    accent: '#10b981', tagline: 'Data In. Insight Out. Action Forward.' },
};

function ProfileScene({ profileKey, label }) {
  const visual = PROFILE_VISUALS[profileKey] || PROFILE_VISUALS.podcast;

  return (
    <div
      className="relative aspect-[10/9] overflow-hidden rounded-t-2xl bg-black"
      role="img"
      aria-label={`${label} production format environment`}
      style={{
        backgroundImage: "url('/assets/home/CREAPD_Home_backdrop.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: '800% auto',
        backgroundPosition: `${visual.x} 44%`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${visual.accent}, transparent)` }}
      />
    </div>
  );
}

export default function InteractiveProfileCards({ profiles = [], onEnter }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {profiles.map((profile) => {
        const visual = PROFILE_VISUALS[profile.key] || PROFILE_VISUALS.podcast;
        const Icon = profile.icon;

        return (
          <article
            key={profile.key}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090f]/95 transition-all duration-200 hover:-translate-y-1"
            style={{
              boxShadow: '0 14px 32px rgba(0,0,0,.28)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                boxShadow: `inset 0 0 0 1px ${visual.accent}88, 0 0 30px ${visual.accent}22`,
              }}
            />

            <ProfileScene profileKey={profile.key} label={profile.shortLabel || profile.label} />

            <div className="relative p-4">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-9 w-9 place-items-center rounded-xl border bg-black/40"
                  style={{ borderColor: `${visual.accent}66`, color: visual.accent }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    {profile.shortLabel || profile.label}
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Production Format</p>
                </div>
              </div>

              <p className="mt-3 min-h-[40px] text-sm leading-5 text-white/66">
                {visual.tagline}
              </p>

              <button
                type="button"
                onClick={() => onEnter?.(profile)}
                className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 ${profile.available ? 'bg-black/45 text-white hover:bg-white/[0.07]' : 'bg-amber-400/[0.07] text-amber-200'}`}
                style={{
                  borderColor: profile.available ? `${visual.accent}88` : 'rgba(251,191,36,.28)',
                  '--tw-ring-color': profile.available ? visual.accent : '#fbbf24',
                }}
              >
                {profile.available ? (
                  <>Enter {profile.shortLabel || profile.label}<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>
                ) : (
                  <><Construction className="h-4 w-4" />Unavailable</>
                )}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
