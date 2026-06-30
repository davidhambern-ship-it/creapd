import React from 'react';
import { Star, Archive, Clock, Film } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  archived: 'bg-muted/20 text-muted-foreground border-white/[0.08]',
};

const TYPE_LABELS = {
  ai_generated: 'AI',
  uploaded: 'Upload',
  approved_graphic: 'Approved',
  archived_graphic: 'Archived',
  brand_asset: 'Brand',
  thumbnail: 'Thumb',
};

export default function ImageAssetCard({ image, onClick, onToggleFavorite }) {
  return (
    <div
      onClick={onClick}
      className="glass-panel overflow-hidden cursor-pointer hover:border-white/[0.14] transition-all group relative"
    >
      <div className="aspect-square bg-black/20 relative overflow-hidden">
        {image.image_url ? (
          image.asset_type === 'video' ? (
            <>
              <video
                src={image.image_url}
                muted
                preload="metadata"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                  <Film className="w-4 h-4 text-white ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <img
              src={image.image_url}
              alt={image.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">No media</div>
        )}

        {/* Top overlay badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide border ${STATUS_STYLES[image.approval_status] || STATUS_STYLES.pending}`}>
            {image.approval_status || 'pending'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <Star className={`w-3 h-3 ${image.is_favorite ? 'text-berna-orange fill-berna-orange' : 'text-white/50'}`} />
          </button>
        </div>

        {/* Bottom type label */}
        <div className="absolute bottom-1.5 left-1.5">
          <span className="px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[8px] font-medium text-white/80">
            {TYPE_LABELS[image.image_type] || 'Image'}
          </span>
        </div>
      </div>

      <div className="p-2">
        <p className="text-[11px] text-white font-medium truncate">{image.title || 'Untitled'}</p>
        {image.tags && (
          <p className="text-[9px] text-muted-foreground truncate mt-0.5">{image.tags.split(',').slice(0, 2).join(', ')}</p>
        )}
      </div>
    </div>
  );
}