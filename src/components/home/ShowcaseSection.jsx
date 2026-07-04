import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Clock, User, Eye, Heart, Film, Newspaper, Church, Mic2, Music } from 'lucide-react';
import { getProfileByKey } from '@/lib/productionProfiles';

const PROFILE_ICONS = { news: Newspaper, spiritual: Church, talk: Mic2, music: Music };

export default function ShowcaseSection() {
  const [showcases, setShowcases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ShowcaseProduction.filter({ status: 'approved', is_public: true }, '-shared_date', 12)
      .then(setShowcases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
        <h2 className="text-lg font-heading font-bold text-white neon-underline mb-4">CREAPD Showcase</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-panel w-64 h-40 animate-pulse flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (showcases.length === 0) {
    return (
      <section className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
        <h2 className="text-lg font-heading font-bold text-white neon-underline mb-4">CREAPD Showcase</h2>
        <div className="glass-panel p-8 text-center">
          <Film className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No shared productions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Complete a production and share it with CREAPD to see it here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-heading font-bold text-white neon-underline">CREAPD Showcase</h2>
        <span className="text-[10px] text-muted-foreground">{showcases.length} shared productions</span>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto lg:grid lg:grid-cols-3 lg:gap-4 pb-2 lg:pb-0 lg:overflow-visible">
        {showcases.map((sc) => {
          const profile = getProfileByKey(sc.production_profile);
          const ProfileIcon = PROFILE_ICONS[sc.production_profile] || Film;
          return (
            <div key={sc.id} className="glass-panel overflow-hidden flex-shrink-0 w-64 lg:w-auto group hover:border-white/[0.12] transition-all">
              {/* Thumbnail with overlays */}
              <div className="relative aspect-video bg-gradient-to-br from-berna-navy to-black overflow-hidden">
                {sc.showcase_thumbnail_url ? (
                  <img src={sc.showcase_thumbnail_url} alt={sc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                {/* Profile badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                  <ProfileIcon className={`w-3 h-3 ${profile?.accent || 'text-white'}`} />
                  <span className="text-[9px] font-heading font-semibold text-white uppercase">{profile?.shortLabel || sc.production_profile}</span>
                </div>
                {/* Runtime badge */}
                {sc.runtime && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-white/70" />
                    <span className="text-[9px] font-mono text-white">{sc.runtime}</span>
                  </div>
                )}
                {/* CREAPD branding */}
                <div className="absolute bottom-2 left-2 text-[8px] font-heading font-bold tracking-wider text-white/40">
                  CREAPD
                </div>
                {/* Play button */}
                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-berna-purple/40 transition-colors">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              </div>
              {/* Info */}
              <div className="p-3">
                <h3 className="text-xs font-heading font-semibold text-white leading-snug line-clamp-2 mb-1.5">{sc.title}</h3>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  {sc.creator_name && (
                    <span className="flex items-center gap-0.5">
                      <User className="w-2.5 h-2.5" />
                      {sc.creator_name}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-2.5 h-2.5" />
                    {sc.view_count || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" />
                    {sc.like_count || 0}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}