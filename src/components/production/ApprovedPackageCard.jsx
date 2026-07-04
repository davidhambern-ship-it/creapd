import React from 'react';
import { Clock, ImageIcon, Film, Volume2, CheckCircle } from 'lucide-react';
import CategoryBadge from '@/components/shared/CategoryBadge';
import ShareWithCreapdButton from '@/components/production/ShareWithCreapdButton';

export default function ApprovedPackageCard({ pkg, article, index }) {
  const hasMedia = (url) => !!url;

  return (
    <div className="glass-panel p-4 transition-all hover:border-white/[0.12]">
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-berna-purple font-bold flex-shrink-0 w-6">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[9px] text-berna-emerald flex items-center gap-0.5">
              <CheckCircle className="w-3 h-3" />Approved
            </span>
            {pkg.estimated_runtime && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{pkg.estimated_runtime}
              </span>
            )}
            {article?.category && <CategoryBadge category={article.category} />}
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug mb-2">{article?.title || 'Untitled Story'}</h3>

          {pkg.teleprompter_script && (
            <p className="text-[11px] text-muted-foreground line-clamp-3 mb-2">{pkg.teleprompter_script}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className={`text-[9px] flex items-center gap-0.5 ${hasMedia(pkg.generated_thumbnail_url) ? 'text-berna-emerald' : 'text-muted-foreground/40'}`}>
              <ImageIcon className="w-3 h-3" />Thumb
            </span>
            <span className={`text-[9px] flex items-center gap-0.5 ${hasMedia(pkg.generated_image_url) ? 'text-berna-emerald' : 'text-muted-foreground/40'}`}>
              <ImageIcon className="w-3 h-3" />Image
            </span>
            <span className={`text-[9px] flex items-center gap-0.5 ${hasMedia(pkg.generated_audio_url) ? 'text-berna-emerald' : 'text-muted-foreground/40'}`}>
              <Volume2 className="w-3 h-3" />Audio
            </span>
            <span className={`text-[9px] flex items-center gap-0.5 ${hasMedia(pkg.generated_video_url) ? 'text-berna-emerald' : 'text-muted-foreground/40'}`}>
              <Film className="w-3 h-3" />Video
            </span>
          </div>

          <div className="mt-2">
            <ShareWithCreapdButton pkg={pkg} article={article} />
          </div>
        </div>

        {pkg.generated_thumbnail_url && (
          <img src={pkg.generated_thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover border border-white/[0.06] flex-shrink-0" />
        )}
      </div>
    </div>
  );
}