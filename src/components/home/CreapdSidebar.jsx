import React from 'react';
import { ArrowRight, Info, Lock } from 'lucide-react';
import CreapdLogo from '@/components/brand/CreapdLogo';
import { PRODUCTION_PROFILES } from '@/lib/productionProfiles';

export default function CreapdSidebar({ onGetStarted, onShowDetails }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/[0.06]">
        <CreapdLogo height="h-7" />
      </div>

      {/* Profile tabs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="px-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Production Profiles
        </p>
        {PRODUCTION_PROFILES.map((profile) => {
          const Icon = profile.icon;
          return (
            <div
              key={profile.key}
              className={`rounded-lg border transition-all ${
                profile.available
                  ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                  : 'border-white/[0.03] bg-white/[0.01] opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${profile.gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${profile.accent}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-heading font-semibold text-white truncate">{profile.shortLabel}</p>
                  {profile.available && profile.spotlightFeature && (
                    <p className="text-[9px] text-muted-foreground truncate">✦ {profile.spotlightFeature}</p>
                  )}
                  {!profile.available && (
                    <p className="text-[9px] text-muted-foreground">Coming Soon</p>
                  )}
                </div>
              </div>

              {profile.available && (
                <div className="flex items-center gap-1 px-2 pb-2">
                  <button
                    onClick={() => onGetStarted(profile)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-heading font-semibold transition-all ${
                      profile.path
                        ? `${profile.accentBg} ${profile.accent} border ${profile.accentBorder} hover:scale-[1.02]`
                        : 'bg-white/[0.04] text-muted-foreground border border-white/[0.04]'
                    }`}
                  >
                    Get Started
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                  <button
                    onClick={() => onShowDetails(profile)}
                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-[10px] font-medium border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <Info className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              {!profile.available && (
                <div className="px-3 pb-2">
                  <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Lock className="w-2.5 h-2.5" />
                    Coming Soon
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}