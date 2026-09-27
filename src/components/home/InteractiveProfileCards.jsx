import React from 'react';
import { ArrowRight } from 'lucide-react';

const PROFILE_VISUALS = {
  news:      { x: '0%',      accent: '#ff6a00', tagline: 'Real Stories. Real People. Bigger Solutions.' },
  music:     { x: '14.286%', accent: '#a855f7', tagline: 'From Ideas to Industry.' },
  talk:      { x: '28.571%', accent: '#ff6a3d', tagline: 'Conversations that Create Change.' },
  cooking:   { x: '42.857%', accent: '#f59e0b', tagline: 'Flavors. Culture. Opportunities.' },
  sports:    { x: '57.143%', accent: '#3b82f6', tagline: 'The Game Beyond the Game.' },
  cosmo:     { x: '71.429%', accent: '#ec4899', tagline: 'Hair. Nails. Skin. Makeup. Beauty.' },
  spiritual: { x: '85.714%', accent: '#a855f7', tagline: 'Higher Perspective. Real Conversations.' },
  research:  { x: '100%',    accent: '#10b981', tagline: 'Data In. Insight Out. Action Forward.' },
};

function ProfileScene({ profileKey, label }) {
  const visual = PROFILE_VISUALS[profileKey] || PROFILE_VISUALS.news;

  return (
    <div
      className="relative aspect-[10/9] overflow-hidden rounded-t-2xl bg-black"
      role="img"
      aria-label={`${label} Production Profile environment`}
      style={profileKey === 'cosmo' ? {
        background:
          'radial-gradient(circle at 72% 25%, rgba(244,114,182,.30), transparent 30%), radial-gradient(circle at 24% 70%, rgba(168,85,247,.24), transparent 32%), linear-gradient(135deg, #26101f 0%, #120b18 52%, #301024 100%)',
      } : {
        backgroundImage: "url('/assets/home/CREAPD_Home_backdrop.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: '800% auto',
        backgroundPosition: `${visual.x} 44%`,
      }}
    >
      {profileKey === 'cosmo' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[72%] w-[72%] rounded-[2rem] border border-pink-300/20 bg-pink-50/[0.04] shadow-[inset_0_0_50px_rgba(236,72,153,.08)]">
            <div className="absolute left-[12%] top-[18%] h-[52%] w-[30%] rounded-t-full border border-pink-200/20 bg-gradient-to-b from-pink-200/10 to-fuchsia-500/10" />
            <div className="absolute right-[13%] top-[22%] h-[34%] w-[30%] rounded-xl border border-fuchsia-200/20 bg-black/20" />
            <div className="absolute bottom-[14%] left-[18%] right-[18%] h-[12%] rounded-full bg-gradient-to-r from-pink-500/20 via-fuchsia-400/25 to-purple-500/20" />
            <span className="absolute inset-x-0 bottom-[31%] text-center text-[clamp(10px,1vw,16px)] font-semibold tracking-[0.24em] text-pink-100/80">BEAUTY STUDIO</span>
          </div>
        </div>
      )}
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
        const visual = PROFILE_VISUALS[profile.key] || PROFILE_VISUALS.news;
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
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">Production Profile</p>
                </div>
              </div>

              <p className="mt-3 min-h-[40px] text-sm leading-5 text-white/66">
                {visual.tagline}
              </p>

              <button
                type="button"
                onClick={() => onEnter?.(profile)}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-black/45 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2"
                style={{
                  borderColor: `${visual.accent}88`,
                  '--tw-ring-color': visual.accent,
                }}
              >
                Enter {profile.shortLabel || profile.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
