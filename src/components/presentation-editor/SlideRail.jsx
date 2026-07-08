import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Copy, Trash2, FileText, GripVertical } from 'lucide-react';

function parseBG(slide) {
  try {
    const bg = JSON.parse(slide?.background || '{}');
    return bg.color || bg.gradient || '#0a0a0a';
  } catch { return '#0a0a0a'; }
}

export default function SlideRail({
  slides, activeIndex, onSelect, onAdd, onDuplicate, onDelete, onReorder,
}) {
  const [dragIndex, setDragIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
    setDragIndex(null);
  };

  return (
    <div className="w-44 flex-shrink-0 bg-card border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">Slides</span>
        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onAdd}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {slides.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <Button variant="outline" size="sm" onClick={onAdd}><Plus className="w-3 h-3" /> Add Slide</Button>
          </div>
        )}

        {slides.map((slide, index) => (
          <div
            key={slide.id || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => onSelect(index)}
            className={`group relative rounded-lg border-2 transition-all cursor-pointer ${
              index === activeIndex ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            } ${dragIndex === index ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-0.5">
                <GripVertical className="w-3 h-3 text-muted-foreground/40 cursor-grab" />
                <span className="text-[10px] font-mono text-muted-foreground">{index + 1}</span>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                  className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="aspect-video mx-1 mt-1 mb-1 rounded overflow-hidden border border-border"
              style={{ background: parseBG(slide) }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-1">
                <p className="text-[7px] font-bold text-white/90 text-center line-clamp-1">{slide.title || 'Untitled'}</p>
                <p className="text-[5px] text-white/50 text-center line-clamp-2 mt-0.5">{slide.body_text || ''}</p>
              </div>
            </div>

            {slide.status && <StatusDot status={slide.status} />}
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

function StatusDot({ status }) {
  const color = status === 'approved' || status === 'passed' ? 'bg-emerald-500'
    : status === 'needs_revision' ? 'bg-yellow-500'
    : status === 'failed' ? 'bg-red-500'
    : 'bg-muted-foreground/40';
  return (
    <div className="absolute bottom-1 right-1">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
    </div>
  );
}