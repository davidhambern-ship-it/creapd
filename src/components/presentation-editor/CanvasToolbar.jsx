import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid3x3, Square } from 'lucide-react';

export default function CanvasToolbar({
  slide, zoom, mode, showGrid, showSafeAreas,
  onZoomIn, onZoomOut, onZoomFit, onZoom100,
  onToggleGrid, onToggleSafeAreas,
}) {
  return (
    <div className="cpe-canvas-toolbar flex items-center justify-between px-3 py-1.5">
      <span className="cpe-canvas-info truncate">
        {slide?.title || 'Untitled'} · {slide?.slide_type?.replace(/_/g, ' ') || 'content slide'}
        {mode === 'preview' && <span className="badge ml-2">Preview</span>}
      </span>
      <div className="flex items-center gap-1">
        <button className="cpe-icon-btn" onClick={onToggleGrid} title="Toggle Grid (G)" style={{ opacity: showGrid ? 1 : 0.4 }}>
          <Grid3x3 className="w-3.5 h-3.5" />
        </button>
        <button className="cpe-icon-btn" onClick={onToggleSafeAreas} title="Safe Areas" style={{ opacity: showSafeAreas ? 1 : 0.4 }}>
          <Square className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button className="cpe-icon-btn" onClick={onZoomOut} title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
        <span className="cpe-zoom-display">{Math.round(zoom * 100)}%</span>
        <button className="cpe-icon-btn" onClick={onZoomIn} title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
        <button className="cpe-icon-btn" onClick={onZoomFit} title="Fit Slide"><Maximize2 className="w-4 h-4" /></button>
        <button className="cpe-icon-btn" onClick={onZoom100} title="100%"><span className="text-xs font-mono">1:1</span></button>
      </div>
    </div>
  );
}