import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, Info, Play, Clock, User, Eye, Heart, Film,
  Clapperboard, Layers, Newspaper, Church, Lightbulb, Package,
  Volume2, Presentation, Share2,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CreapdLogo from '@/components/brand/CreapdLogo';
import { ACTIVE_PROFILES, getProfileByKey } from '@/lib/productionProfiles';

const QUICK_ACTIONS = [
  { icon: Clapperboard, label: 'Editor', path: '/editor', color: 'text-berna-purple', bg: 'bg-berna-purple/10' },
  { icon: Clock, label: 'Last Prod', path: '/news/production', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Newspaper, label: 'News', path: '/news/dashboard', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Church, label: 'Message', path: '/spiritual/message', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { icon: Layers, label: 'Stories', path: '/news/workspace', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
  { icon: Sparkles, label: 'Build', path: null, color: 'text-berna-purple', bg: 'bg-berna-purple/10', action: 'build' },
];

const PIPELINE_STEPS = [
  { icon: Lightbulb, label: 'Idea', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Clapperboard, label: 'Profile', color: 'text-berna-purple', bg: 'bg-berna-purple/10' },
  { icon: Package, label: 'Package', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
  { icon: Volume2, label: 'Voice', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Presentation, label: 'Present', color: 'text-berna-purple', bg: 'bg-berna-purple/10' },
  { icon: Share2, label: 'Export', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
];

export default function MobileHome({ onGetStarted, onShowDetails, onBuildWithCREAPD }) {
  const [showcases, setShowcases] = useState([]);
  const [loadingShowcase, setLoadingShowcase] = useState(true);

  useEffect(() => {
    base44.entities.ShowcaseProduction.filter({ status: 'approved', is_public: true }, '-shared_date', 8)
      .then(setShowcases)
      .catch(() => {})
      .finally(() => setLoadingShowcase(false));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto relative z-10 pb-20 creapd-bg-gradient">
      {/* ── Hero Card ── */}
      <section className="px-3 pt-3">
        <div className="m-hero-card p-5 m-animate-enter">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-berna-purple/10 blur-3xl m-bg-drift" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-berna-orange/8 blur-2xl m-bg-drift" style={{ animationDelay: '5s' }} />
          <div className="relative">
            <div className="flex items-center justify-center mb-3">
              <CreapdLogo height="h-20" />
            </div>
            <div className="text-center mb-4">
              <h1 className="text-3xl font-bold digital-pop animated-gradient-text mb-1" style={{ fontFamily: "'CreapdCustom', sans-serif" }}>
                CREAPD
              </h1>
              <div className="flex flex-wrap justify-center gap-x-2 text-base font-semibold" style={{ fontFamily: "'Robotica', sans-serif" }}>
                <span className="text-berna-orange neon-flicker-orange">Create.</span>
                <span className="text-berna-purple neon-flicker-purple">Automate.</span>
                <span className="text-berna-emerald neon-flicker-teal">Produce.</span>
                <span className="text-white neon-flicker-white">Direct.</span>
              </div>
              <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mt-1.5">The AI Production Company</p>
            </div>
            <button
              onClick={onBuildWithCREAPD}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-berna-emerald to-berna-purple text-white text-sm font-heading font-semibold transition-all active:scale-95 glow-purple"
            >
              <Sparkles className="w-4 h-4" />
              Build with CREAPD
            </button>
          </div>
        </div>
      </section>

      {/* ── Production Profiles Carousel ── */}
      <section className="pt-5">
        <div className="px-3 mb-2 flex items-center justify-between">
          <h2 className="text-sm font-heading font-bold text-white neon-underline">Production Profiles</h2>
          <span className="text-[9px] text-muted-foreground">{ACTIVE_PROFILES.length} active</span>
        </div>
        <div className="m-carousel px-3">
          {ACTIVE_PROFILES.map((profile, i) => {
            const Icon = profile.icon;
            return (
              <div key={profile.key} className="w-60 m-dept-card m-animate-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className={`h-20 bg-gradient-to-br ${profile.gradient} flex items-center justify-center relative overflow-hidden`}>
                  <Icon className={`w-8 h-8 ${profile.accent} opacity-80`} />
                  {profile.spotlightFeature && (
                    <span className="absolute top-2 right-2 m-glow-chip bg-berna-purple/20 border border-berna-purple/30 text-berna-purple text-[8px]">
                      ✦ Spotlight
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <h3 className="font-heading font-bold text-sm text-white mb-1">{profile.label}</h3>
                  <p className="text-[10px] text-muted-foreground leading-snug mb-3 line-clamp-2">{profile.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onGetStarted(profile)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-heading font-semibold bg-gradient-to-r ${profile.gradient} ${profile.accent} border ${profile.accentBorder} transition-all active:scale-95`}
                    >
                      Start <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onShowDetails(profile)}
                      className="flex items-center justify-center px-2.5 py-2 rounded-lg text-[11px] border border-white/10 text-white/60 active:scale-90"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Quick Launch Tiles ── */}
      <section className="px-3 pt-5">
        <h2 className="text-sm font-heading font-bold text-white neon-underline mb-2">Quick Launch</h2>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            const content = (
              <>
                <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center mb-1.5`}>
                  <Icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <span className="text-[10px] font-heading font-semibold text-white/85 leading-tight">{action.label}</span>
              </>
            );
            if (action.action === 'build') {
              return (
                <button key={action.label} onClick={onBuildWithCREAPD} className="m-mini-tile p-2.5 flex flex-col items-start text-left m-animate-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                  {content}
                </button>
              );
            }
            return (
              <Link key={action.label} to={action.path} className="m-mini-tile p-2.5 flex flex-col items-start m-animate-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Pipeline Rail ── */}
      <section className="pt-5">
        <h2 className="text-sm font-heading font-bold text-white neon-underline mb-2 px-3">How It Works</h2>
        <div className="m-carousel px-3">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="w-24 m-card p-3 flex flex-col items-center text-center m-animate-enter" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className={`w-9 h-9 rounded-xl ${step.bg} flex items-center justify-center mb-1.5 m-icon-animate`} style={{ animationDelay: `${i * 0.3}s` }}>
                  <Icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <span className="text-[9px] font-heading font-semibold text-white/85">{step.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Showcase Rail ── */}
      <section className="pt-5 pb-4">
        <h2 className="text-sm font-heading font-bold text-white neon-underline mb-2 px-3">Showcase</h2>
        {loadingShowcase ? (
          <div className="m-carousel px-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-52 h-28 rounded-xl m-shimmer" />
            ))}
          </div>
        ) : showcases.length === 0 ? (
          <div className="px-3">
            <div className="m-card p-5 text-center">
              <Film className="w-8 h-8 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-[11px] text-muted-foreground">No shared productions yet.</p>
            </div>
          </div>
        ) : (
          <div className="m-carousel px-3">
            {showcases.map((sc, i) => {
              const profile = getProfileByKey(sc.production_profile);
              const ProfileIcon = profile?.icon || Film;
              return (
                <div key={sc.id} className="w-52 m-card overflow-hidden m-animate-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="relative aspect-video bg-gradient-to-br from-berna-navy to-black overflow-hidden">
                    {sc.showcase_thumbnail_url ? (
                      <img src={sc.showcase_thumbnail_url} alt={sc.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                      <ProfileIcon className={`w-2.5 h-2.5 ${profile?.accent || 'text-white'}`} />
                      <span className="text-[7px] font-heading font-semibold text-white uppercase">{profile?.shortLabel || sc.production_profile}</span>
                    </div>
                    {sc.runtime && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-0.5">
                        <Clock className="w-2 h-2 text-white/70" />
                        <span className="text-[7px] font-mono text-white">{sc.runtime}</span>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-[11px] font-heading font-semibold text-white leading-snug line-clamp-2 mb-1">{sc.title}</h3>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      {sc.creator_name && (
                        <span className="flex items-center gap-0.5">
                          <User className="w-2 h-2" />
                          {sc.creator_name}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-2 h-2" />
                        {sc.view_count || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-2 h-2" />
                        {sc.like_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="px-3 py-4">
        <p className="text-center text-[9px] text-muted-foreground">
          CREAPD · The AI Production Company · Create. Automate. Produce. Direct.
        </p>
      </footer>
    </div>
  );
}