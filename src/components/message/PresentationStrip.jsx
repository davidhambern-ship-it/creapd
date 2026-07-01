import React from 'react';
import { Presentation, BookOpen } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function PresentationStrip({ sections, assets, onSlideClick }) {
  const sectionSlides = sections.map(section => {
    const slide = assets.find(a => a.associated_section_id === section.id);
    return { section, slide };
  });

  const globalSlides = assets.filter(a =>
    !a.associated_section_id && ['scripture_slide', 'title_slide', 'closing_slide', 'call_to_action_slide'].includes(a.asset_type)
  );

  const totalSlides = sectionSlides.length + globalSlides.length;

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Presentation className="w-4 h-4" /> Presentation Overview
        <span className="text-xs normal-case">({totalSlides} slides)</span>
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sectionSlides.map(({ section, slide }, idx) => (
          <button
            key={section.id || idx}
            onClick={() => onSlideClick?.(section.id)}
            className="shrink-0 w-40 h-24 rounded-lg border border-border bg-secondary/30 hover:border-primary/40 transition-colors p-2 text-left group"
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{section.order || idx + 1}</span>
              {slide ? (
                <Presentation className="w-3 h-3 text-primary" />
              ) : (
                <BookOpen className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs font-medium truncate group-hover:text-primary">{slide?.title || section.title}</p>
            <p className="text-xs text-muted-foreground truncate">{slide?.content?.substring(0, 40) || section.content?.substring(0, 40)}</p>
          </button>
        ))}
        {globalSlides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="shrink-0 w-40 h-24 rounded-lg border border-border bg-secondary/20 p-2"
          >
            <div className="flex items-center gap-1 mb-1">
              <BookOpen className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">{ASSET_TYPE_LABELS[slide.asset_type] || slide.asset_type}</span>
            </div>
            <p className="text-xs font-medium truncate">{slide.title}</p>
            <p className="text-xs text-muted-foreground truncate">{slide.content?.substring(0, 40)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}