import React, { useState } from 'react';
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
    <div className="cpe-rail w-44 flex-shrink-0 flex flex-col">
      <div className="cpe-rail-header flex items-center justify-between px-3 py-2.5">
        <span className="cpe-rail-label">Slides</span>
        <button className="cpe-icon-btn" onClick={onAdd} title="Add Slide"><Plus className="w-4 h-4" /></button>
      </div>

      <div className="cpe-rail-scroll flex-1 overflow-y-auto p-2 space-y-2">
        {slides.length === 0 && (
          <div className="cpe-empty">
            <FileText className="cpe-empty-icon" />
            <p className="cpe-empty-text">No StorySlides yet.</p>
            <button className="cpe-mini-btn px-3" onClick={onAdd}><Plus className="w-3 h-3" /> Add Slide</button>
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
            className={`cpe-slide-card ${index === activeIndex ? 'active' : ''} ${dragIndex === index ? 'dragging' : ''}`}
          >
            <div className="flex items-center justify-between px-1.5 pt-1.5">
              <div className="flex items-center gap-1">
                <GripVertical className="w-3 h-3 opacity-30 cursor-grab" />
                <span className="cpe-slide-num">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="cpe-slide-actions flex gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(index); }}
                  className="cpe-slide-action-btn">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                  className="cpe-slide-action-btn danger">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="aspect-video mx-1.5 mt-1 mb-1.5 rounded overflow-hidden"
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
        <div className="p-2 border-t border-white/[0.04]">
          <button className="cpe-mini-btn w-full" onClick={onAdd}>
            <Plus className="w-3 h-3" /> Add Slide
          </button>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }) {
  const color = status === 'approved' || status === 'passed' ? 'hsl(152 50% 50%)'
    : status === 'needs_revision' ? 'hsl(38 80% 50%)'
    : status === 'failed' ? 'hsl(0 60% 50%)'
    : 'hsl(220 8% 40%)';
  return (
    <div className="absolute bottom-1.5 right-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
}