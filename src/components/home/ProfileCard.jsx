import React from 'react';
import { ArrowRight, Info, Sparkles, Lock } from 'lucide-react';

export default function ProfileCard({ profile, onGetStarted, onShowDetails, index }) {
  const Icon = profile.icon;
  const isAvailable = profile.available;

  return (
    <div
      className={`relative glass-panel p-5 flex flex-col transition-all ${
        isAvailable ? 'hover:border-white/[0.15] hover:scale-[1.01]' : 'opacity-60'
      }`}
    >
      {/* Spotlight badge */}
      {isAvailable && profile.spotlightFeature && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-berna-orange/20 to-berna-purple/20 border border-berna-purple/30 text-[9px] font-heading font-bold text-berna-purple uppercase tracking-wider">
          ✦ Spotlight
        </div>
      )}

      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${profile.gradient} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${profile.accent}`} />
      </div>

      <h3 className="font-heading font-bold text-base text-white mb-1">{profile.label}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed flex-1">{profile.description}</p>

      {/* Spotlight Feature */}
      {isAvailable && profile.spotlightFeature && (
        <div className={`mb-4 p-2.5 rounded-lg ${profile.accentBg} border ${profile.accentBorder}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className={`w-3 h-3 ${profile.accent}`} />
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white">
              {profile.spotlightFeature}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{profile.spotlightDescription}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <>
            <button
              onClick={() => onGetStarted(profile)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
                profile.path
                  ? `bg-gradient-to-r ${profile.gradient} ${profile.accent} hover:scale-[1.02] border ${profile.accentBorder}`
                  : `${profile.accentBg} ${profile.accent} border ${profile.accentBorder} opacity-70`
              }`}
            >
              Get Started
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onShowDetails(profile)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-white/70 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <Info className="w-3 h-3" />
              Details
            </button>
          </>
        ) : (
          <div className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground border border-white/5">
            <Lock className="w-3 h-3" />
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
}