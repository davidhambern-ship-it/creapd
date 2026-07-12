import React, { useState, useCallback, useRef } from 'react';
import { screenToSlide } from '@/lib/canvasUtils';

export default function MarqueeSelection({ elements, onSelect, zoom, slideStageRef, previewMode }) {
  const [rect, setRect] = useState(null);
  const dragRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    if (previewMode) return;
    if (e.button !== 0) return;
    if (!slideStageRef?.current) return;

    const stageRect = slideStageRef.current.getBoundingClientRect();
    const start = screenToSlide(e.clientX, e.clientY, stageRect, zoom);
    dragRef.current = { startX: start.x, startY: start.y, stageRect };
    setRect({ x: start.x, y: start.y, width: 0, height: 0 });
    onSelect([]);

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const pos = screenToSlide(ev.clientX, ev.clientY, d.stageRect, zoom);
      setRect({
        x: Math.min(d.startX, pos.x),
        y: Math.min(d.startY, pos.y),
        width: Math.abs(pos.x - d.startX),
        height: Math.abs(pos.y - d.startY),
      });
    };

    const onUp = (ev) => {
      const d = dragRef.current;
      dragRef.current = null;
      setRect(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (d) {
        const pos = screenToSlide(ev.clientX, ev.clientY, d.stageRect, zoom);
        const mx = Math.min(d.startX, pos.x);
        const my = Math.min(d.startY, pos.y);
        const mw = Math.abs(pos.x - d.startX);
        const mh = Math.abs(pos.y - d.startY);
        if (mw < 3 && mh < 3) return;
        const hit = (elements || []).filter(el => {
          const ex = el.x || 0, ey = el.y || 0;
          const ew = el.width || 0, eh = el.height || 0;
          return mx < ex + ew && mx + mw > ex && my < ey + eh && my + mh > ey;
        }).map(el => el.id);
        onSelect(hit);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [elements, onSelect, zoom, slideStageRef, previewMode]);

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 0 }}
      onMouseDown={handleMouseDown}
    >
      {rect && rect.width > 1 && rect.height > 1 && (
        <div style={{
          position: 'absolute',
          left: rect.x, top: rect.y,
          width: rect.width, height: rect.height,
          background: 'hsl(152 60% 50% / 0.08)',
          border: '1px solid hsl(152 60% 50% / 0.6)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}