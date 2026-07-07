import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, GripVertical, FileText } from 'lucide-react';

export default function SlideThumbnailSidebar({
  slides, activeIndex, onSelect, onReorder, onAdd, onDuplicate, onDelete
}) {
  return (
    <div className="w-48 flex-shrink-0 bg-card border-r border-border flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">Slides</span>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No slides yet</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onAdd}>
              <Plus className="w-3 h-3" /> Add Slide
            </Button>
          </div>
        )}

        {slides.map((slide, index) => (
          <div
            key={slide.id || `temp-${index}`}
            className={`group relative rounded-lg border-2 transition-all cursor-pointer ${
              index === activeIndex
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 bg-background'
            }`}
            onClick={() => onSelect(index)}
          >
            <div className="absolute left-0 top-0 bottom-0 flex items-center pl-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-muted-foreground" />
            </div>

            <div className="absolute top-1 left-5 text-[10px] font-mono text-muted-foreground">
              {index + 1}
            </div>

            <div className="aspect-video mx-1 mt-4 mb-1 rounded bg-background overflow-hidden border border-border">
              <div
                className="w-full h-full flex flex-col items-center justify-center p-1"
                style={{
                  background: (() => { try { const bg = JSON.parse(slide.background || '{}'); return bg.color || bg.gradient || '#0a0a0a'; } catch { return '#0a0a0a'; } })()
                }}
              >
                <p className="text-[7px] font-bold text-white/90 text-center line-clamp-1 px-1">
                  {slide.title || 'Untitled'}
                </p>
                <p className="text-[5px] text-white/50 text-center line-clamp-2 mt-0.5 px-1">
                  {slide.body_text || ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-0.5 pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {slide.status && (
              <div className="absolute bottom-1 right-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  slide.status === 'approved' || slide.status === 'passed' ? 'bg-emerald-500' :
                  slide.status === 'needs_revision' ? 'bg-yellow-500' :
                  slide.status === 'failed' ? 'bg-red-500' :
                  'bg-muted-foreground/40'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 0 && (
        <div className="p-2 border-t border-border">
          <Button variant="outline" size="sm" className="w-full" onClick={onAdd}>
            <Plus className="w-3 h-3" /> Add Slide
          </Button>
        </div>
      )}
    </div>
  );
}