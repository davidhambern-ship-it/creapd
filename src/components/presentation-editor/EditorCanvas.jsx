import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import CanvasItem from './CanvasItem';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseBG(slide) {
  try {
    const bg = JSON.parse(slide?.background || '{}');
    if (bg.image_url) return { backgroundImage: `url(${bg.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (bg.gradient) return { background: bg.gradient };
    if (bg.color) return { background: bg.color };
  } catch {}
  return { background: '#0a0a0a' };
}

export default function EditorCanvas({
  slide, elements, selectedId, zoom, mode,
  onSelect, onUpdate, onDelete, onZoom,
}) {
  const previewMode = mode === 'preview';
  const sorted = [...(elements || [])].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card">
        <span className="text-xs text-muted-foreground truncate">
          {slide?.title || 'Untitled'} · {slide?.slide_type?.replace(/_/g, ' ') || 'content slide'}
          {previewMode && <span className="ml-2 text-primary font-medium">Preview</span>}
        </span>
        <div className="flex items-center gap-1">
          <ZoomBtn onClick={() => onZoom('out')}><ZoomOut className="w-4 h-4" /></ZoomBtn>
          <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <ZoomBtn onClick={() => onZoom('in')}><ZoomIn className="w-4 h-4" /></ZoomBtn>
          <ZoomBtn onClick={() => onZoom('fit')}><Maximize2 className="w-4 h-4" /></ZoomBtn>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto flex items-start justify-center p-8"
        onClick={() => !previewMode && onSelect(null)}
      >
        <div
          className="relative flex-shrink-0 shadow-2xl rounded-sm overflow-hidden"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            ...parseBG(slide),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Built-in title/body */}
          {slide?.title && (
            <div
              style={{
                position: 'absolute', top: 40, left: 60, right: 60, zIndex: 1,
                fontSize: '36px', fontWeight: 'bold', color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                cursor: previewMode ? 'default' : 'pointer',
              }}
              onClick={() => !previewMode && onSelect('__title__')}
              className={selectedId === '__title__' ? 'ring-2 ring-primary' : ''}
            >
              {slide.title}
            </div>
          )}
          {slide?.body_text && (
            <div
              style={{
                position: 'absolute', top: 120, left: 60, right: 60, zIndex: 1,
                fontSize: '20px', color: '#e0e0e0', lineHeight: '1.5',
                cursor: previewMode ? 'default' : 'pointer',
              }}
              onClick={() => !previewMode && onSelect('__body__')}
              className={`whitespace-pre-wrap ${selectedId === '__body__' ? 'ring-2 ring-primary' : ''}`}
            >
              {slide.body_text}
            </div>
          )}

          {sorted.map(el => (
            <CanvasItem
              key={el.id}
              element={el}
              isSelected={selectedId === el.id}
              zoom={zoom}
              previewMode={previewMode}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}

          {!slide?.title && !slide?.body_text && sorted.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              {previewMode ? 'No content' : 'Use "Add" in the toolbar to insert elements'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ZoomBtn({ children, onClick }) {
  return (
    <button onClick={onClick} className="p-1 hover:bg-muted rounded transition-colors">{children}</button>
  );
}