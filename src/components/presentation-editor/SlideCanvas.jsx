import React, { useRef } from 'react';
import CanvasElement from './CanvasElement';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const CANVAS_W = 1280;
const CANVAS_H = 720;

export default function SlideCanvas({
  slide, elements, selectedElementId, zoom, previewMode,
  onSelectElement, onUpdateElement, onDeleteElement, onCanvasAction,
}) {
  const canvasRef = useRef(null);

  const bg = (() => { try { return JSON.parse(slide?.background || '{}'); } catch { return {}; } })();
  const bgStyle = {};
  if (bg.color) bgStyle.background = bg.color;
  else if (bg.gradient) bgStyle.background = bg.gradient;
  else if (bg.image_url) bgStyle.backgroundImage = `url(${bg.image_url})`;
  else bgStyle.background = '#0a0a0a';

  const sortedElements = [...(elements || [])].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card">
        <span className="text-xs text-muted-foreground">
          {slide?.title || 'Untitled Slide'} — {slide?.slide_type || 'content_slide'}
          {previewMode && <span className="ml-2 text-primary font-medium">Preview Mode</span>}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onCanvasAction('zoom-out')} className="p-1 hover:bg-muted rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => onCanvasAction('zoom-in')} className="p-1 hover:bg-muted rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => onCanvasAction('zoom-fit')} className="p-1 hover:bg-muted rounded">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-start justify-center p-8" onClick={() => !previewMode && onSelectElement(null)}>
        <div
          ref={canvasRef}
          className="relative flex-shrink-0 shadow-2xl"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            ...bgStyle,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {slide?.title && !elements?.some(el => el._isTitle) && (
            <div
              style={{
                position: 'absolute', top: 40, left: 60, right: 60,
                zIndex: 1,
                fontSize: '36px', fontWeight: 'bold', color: '#ffffff',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                cursor: previewMode ? 'default' : 'pointer',
              }}
              onClick={() => !previewMode && onSelectElement('__title__')}
              className={selectedElementId === '__title__' ? 'ring-2 ring-primary' : ''}
            >
              {slide.title}
            </div>
          )}

          {slide?.body_text && !elements?.some(el => el._isBody) && (
            <div
              style={{
                position: 'absolute', top: 120, left: 60, right: 60,
                zIndex: 1,
                fontSize: '20px', color: '#e0e0e0', lineHeight: '1.5',
                cursor: previewMode ? 'default' : 'pointer',
              }}
              onClick={() => !previewMode && onSelectElement('__body__')}
              className={`whitespace-pre-wrap ${selectedElementId === '__body__' ? 'ring-2 ring-primary' : ''}`}
            >
              {slide.body_text}
            </div>
          )}

          {sortedElements.map(el => (
            <CanvasElement
              key={el.id}
              element={el}
              isSelected={selectedElementId === el.id}
              zoom={zoom}
              previewMode={previewMode}
              onSelect={onSelectElement}
              onUpdate={onUpdateElement}
              onDelete={onDeleteElement}
            />
          ))}

          {(!slide?.title && !slide?.body_text && (!elements || elements.length === 0)) && (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
              {previewMode ? 'No content to preview' : 'Click "Add" in the toolbar to add elements'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}