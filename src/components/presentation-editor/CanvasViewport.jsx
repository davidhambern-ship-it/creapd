import React, { useRef, useEffect, useCallback, useState } from 'react';
import { calculateFit, zoomAtPoint } from '@/lib/canvasUtils';

export default function CanvasViewport({
  zoom, panX, panY, zoomMode,
  onViewportChange, onZoomModeChange,
  previewMode, children,
}) {
  const containerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStartRef = useRef(null);

  // Fit calculation on resize — only when in fit mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const applyFit = () => {
      if (zoomMode !== 'fit_slide' && zoomMode !== 'fit_width') return;
      const fit = calculateFit(el.clientWidth, el.clientHeight, zoomMode);
      onViewportChange(fit.zoom, fit.panX, fit.panY);
    };
    applyFit();
    const ro = new ResizeObserver(applyFit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomMode, onViewportChange]);

  // Space key for pan
  useEffect(() => {
    if (previewMode) return;
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.target.isContentEditable) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e) => { if (e.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [previewMode]);

  const handleWheel = useCallback((e) => {
    if (previewMode) return;
    if (!containerRef.current) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = containerRef.current.getBoundingClientRect();
      const delta = -e.deltaY * 0.002;
      const result = zoomAtPoint(rect, e.clientX, e.clientY, zoom, panX, panY, zoom * (1 + delta));
      onViewportChange(result.zoom, result.panX, result.panY);
      onZoomModeChange('manual');
    } else {
      onViewportChange(zoom, panX - e.deltaX, panY - e.deltaY);
    }
  }, [zoom, panX, panY, onViewportChange, onZoomModeChange, previewMode]);

  // Pan via space+drag or middle mouse (capture phase)
  const handleMouseDownCapture = useCallback((e) => {
    if (previewMode) return;
    if (!spaceDown && e.button !== 1) return;
    e.stopPropagation();
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { sx: e.clientX, sy: e.clientY, ox: panX, oy: panY };
  }, [spaceDown, panX, panY, previewMode]);

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e) => {
      const p = panStartRef.current;
      if (!p) return;
      onViewportChange(zoom, p.ox + (e.clientX - p.sx), p.oy + (e.clientY - p.sy));
    };
    const onUp = () => { setIsPanning(false); panStartRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning, zoom, onViewportChange]);

  const cursor = previewMode ? 'default' : (spaceDown ? (isPanning ? 'grabbing' : 'grab') : 'default');

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      style={{ cursor }}
      onWheel={handleWheel}
      onMouseDownCapture={handleMouseDownCapture}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
        {children}
      </div>
    </div>
  );
}