import React, { useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import CanvasItem from './CanvasItem';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseFonts(slide) {
  try {
    const meta = JSON.parse(slide?.slide_metadata || '{}');
    return meta.fonts || {};
  } catch {}
  return {};
}

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
  slide, elements, selectedId, zoom, mode, isPlaying, currentTime,
  onSelect, onUpdate, onDelete, onZoom,
}) {
  const previewMode = mode === 'preview';
  const sorted = [...(elements || [])].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
  const fonts = parseFonts(slide);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fit = () => {
      const pad = 64;
      const availW = el.clientWidth - pad;
      const availH = el.clientHeight - pad;
      if (availW <= 0 || availH <= 0) return;
      const fitZoom = Math.min(availW / CANVAS_W, availH / CANVAS_H, 1);
      onZoom(fitZoom);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  return (
    <div className="cpe-canvas-area flex-1 flex flex-col overflow-hidden">
      <div className="cpe-canvas-toolbar flex items-center justify-between px-3 py-1.5">
        <span className="cpe-canvas-info truncate">
          {slide?.title || 'Untitled'} · {slide?.slide_type?.replace(/_/g, ' ') || 'content slide'}
          {previewMode && <span className="badge ml-2">Preview</span>}
        </span>
        <div className="flex items-center gap-1">
          <button className="cpe-icon-btn" onClick={() => onZoom('out')} title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
          <span className="cpe-zoom-display">{Math.round(zoom * 100)}%</span>
          <button className="cpe-icon-btn" onClick={() => onZoom('in')} title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          <button className="cpe-icon-btn" onClick={() => onZoom('fit')} title="Fit"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex items-center justify-center p-8"
        onClick={() => !previewMode && onSelect(null)}
      >
        <div
          style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="cpe-slide-frame relative overflow-hidden"
            style={{
              width: CANVAS_W, height: CANVAS_H,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              ...parseBG(slide),
            }}
          >
            {slide?.title && (
              <div
                style={{
                  position: 'absolute', top: 40, left: 60, right: 60, zIndex: 1,
                  fontFamily: fonts.titleFont || 'Poppins, sans-serif',
                  fontSize: `${fonts.titleSize || 48}px`,
                  fontWeight: fonts.titleBold === false ? 'normal' : 'bold',
                  fontStyle: fonts.titleItalic ? 'italic' : 'normal',
                  color: fonts.titleColor || '#fff',
                  textAlign: fonts.titleAlign || 'left',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  cursor: previewMode ? 'default' : 'pointer',
                }}
                onClick={() => !previewMode && onSelect('__title__')}
                className={selectedId === '__title__' ? 'ring-2 ring-emerald-400' : ''}
              >
                {slide.title}
              </div>
            )}
            {slide?.body_text && (
              <div
                style={{
                  position: 'absolute', top: 120, left: 60, right: 60, zIndex: 1,
                  fontFamily: fonts.bodyFont || 'Inter, sans-serif',
                  fontSize: `${fonts.bodySize || 24}px`,
                  fontWeight: fonts.bodyBold ? 'bold' : 'normal',
                  fontStyle: fonts.bodyItalic ? 'italic' : 'normal',
                  color: fonts.bodyColor || '#e0e0e0',
                  textAlign: fonts.bodyAlign || 'left',
                  lineHeight: '1.5',
                  cursor: previewMode ? 'default' : 'pointer',
                }}
                onClick={() => !previewMode && onSelect('__body__')}
                className={`whitespace-pre-wrap ${selectedId === '__body__' ? 'ring-2 ring-emerald-400' : ''}`}
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
                isPlaying={isPlaying}
                currentTime={currentTime}
                onSelect={onSelect}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}

            {!slide?.title && !slide?.body_text && sorted.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                {previewMode ? 'No content' : 'Use "Add" in the toolbar to insert elements'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}