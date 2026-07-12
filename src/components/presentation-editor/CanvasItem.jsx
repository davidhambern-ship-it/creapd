import React, { useState, useRef } from 'react';
import { Trash2, Lock, Unlock } from 'lucide-react';

const HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
const TEXT_TYPES = ['text', 'lower_third', 'caption'];
const ASPECT_TYPES = ['image', 'video'];

const ANIM_CLASS_MAP = {
  fade_in: 'animate-fade-in',
  fade: 'animate-fade-in',
  slide_in: 'animate-slide-in',
  slide_left: 'animate-slide-in',
  slide: 'animate-slide-in',
  zoom_in: 'animate-zoom-in',
  zoom: 'animate-zoom-in',
  dissolve_in: 'animate-dissolve-in',
  dissolve: 'animate-dissolve-in',
};

function parseStyle(el) {
  try { return JSON.parse(el.style || '{}'); } catch { return {}; }
}

function getAnimStyle(el) {
  try {
    const anim = JSON.parse(el.animation || '{}');
    if (!anim.type) return null;
    const cls = ANIM_CLASS_MAP[anim.type] || ANIM_CLASS_MAP[anim.type.toLowerCase()];
    if (!cls) return null;
    const delay = anim.delay_ms ? `${anim.delay_ms}ms` : '0ms';
    return { cls, delay };
  } catch { return null; }
}

export default function CanvasItem({
  element, isSelected, zoom, previewMode, isPlaying, currentTime,
  onSelect, onToggleSelect, onUpdate, onDelete, onDragGuides, snapEnabled,
}) {
  const [editing, setEditing] = useState(false);
  const drag = useRef(null);
  const elRef = useRef(null);

  if (!element.visible && !isSelected) return null;

  const style = parseStyle(element);

  // ── Timeline sync ──
  const timing = (() => { try { return JSON.parse(element.timing || '{}'); } catch { return {}; } })();
  const animConfig = (() => { try { return JSON.parse(element.animation || '{}'); } catch { return {}; } })();
  const startMs = timing.start_ms ?? 0;
  const endMs = timing.end_ms || 0;
  const hasTiming = !!element.timing;
  const animDelayMs = animConfig.delay_ms ?? startMs;

  const playbackActive = (isPlaying || currentTime > 0) && !previewMode;
  const beforeEnter = hasTiming && currentTime < animDelayMs;
  const afterExit = hasTiming && endMs > 0 && currentTime > endMs;
  if (playbackActive && hasTiming && (beforeEnter || afterExit) && !isSelected) return null;

  const anim = isPlaying ? getAnimStyle(element) : null;
  const animDelayStr = (isPlaying && hasTiming) ? '0ms' : (anim?.delay || '0ms');

  const handleMouseDown = (e) => {
    if (element.locked || editing || previewMode) return;
    if (e.shiftKey) {
      onToggleSelect?.(element.id);
    } else if (!isSelected) {
      onSelect?.([element.id]);
    }
    startDrag(e, 'drag');
  };

  const startDrag = (e, action, handle) => {
    if (element.locked || editing || previewMode) return;
    e.stopPropagation();
    e.preventDefault();
    drag.current = {
      action, handle,
      sx: e.clientX, sy: e.clientY,
      ox: element.x, oy: element.y, ow: element.width, oh: element.height,
      firstMove: true,
    };
    const move = (ev) => {
      const d = drag.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / zoom;
      const dy = (ev.clientY - d.sy) / zoom;
      const opts = { silent: !d.firstMove };
      d.firstMove = false;

      if (d.action === 'drag') {
        let newX = Math.round(d.ox + dx);
        let newY = Math.round(d.oy + dy);
        if (onDragGuides && !ev.altKey) {
          const { snapX, snapY } = onDragGuides({ x: newX, y: newY, width: d.ow, height: d.oh }, element.id);
          newX += snapX;
          newY += snapY;
        }
        onUpdate(element.id, { x: newX, y: newY }, opts);
      } else if (d.action === 'rotate') {
        if (elRef.current) {
          const rect = elRef.current.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
          if (ev.shiftKey) angle = Math.round(angle / 15) * 15;
          if (angle > 180) angle -= 360;
          if (angle < -180) angle += 360;
          onUpdate(element.id, { rotation: Math.round(angle) }, opts);
        }
      } else {
        let { ox: nx, oy: ny, ow: nw, oh: nh } = d;
        if (d.handle.includes('e')) nw = Math.max(30, d.ow + dx);
        if (d.handle.includes('s')) nh = Math.max(20, d.oh + dy);
        if (d.handle.includes('w')) { nw = Math.max(30, d.ow - dx); nx = d.ox + (d.ow - nw); }
        if (d.handle.includes('n')) { nh = Math.max(20, d.oh - dy); ny = d.oy + (d.oh - nh); }

        // Aspect ratio: images/videos preserve by default, Shift toggles
        const defaultPreserve = ASPECT_TYPES.includes(element.type);
        const preserveAspect = defaultPreserve !== ev.shiftKey;
        if (preserveAspect && ASPECT_TYPES.includes(element.type) && d.handle.length === 2) {
          const aspect = d.ow / d.oh;
          const absDx = Math.abs(nw - d.ow);
          const absDy = Math.abs(nh - d.oh);
          if (absDx / aspect > absDy) {
            const newH = nw / aspect;
            if (d.handle.includes('n')) ny = d.oy + (d.oh - newH);
            nh = newH;
          } else {
            const newW = nh * aspect;
            if (d.handle.includes('w')) nx = d.ox + (d.ow - newW);
            nw = newW;
          }
        }

        onUpdate(element.id, { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) }, opts);
      }
    };
    const up = () => {
      drag.current = null;
      onDragGuides?.(null, null);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const elStyle = {
    position: 'absolute',
    left: element.x, top: element.y,
    width: element.width, height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    opacity: (element.opacity ?? 100) / 100,
    zIndex: element.z_index || 0,
    cursor: previewMode ? 'default' : (element.locked ? 'default' : 'move'),
    fontSize: `${style.fontSize || 16}px`,
    fontFamily: style.fontFamily || 'inherit',
    color: style.color || '#fff',
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align || 'left',
    backgroundColor: element.type === 'shape' ? (style.backgroundColor || '#3b82f6') : (style.backgroundColor || 'transparent'),
    borderRadius: style.borderRadius || (element.type === 'shape' ? '4px' : 0),
    border: style.border || (style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || 'transparent'}` : 'none'),
    padding: style.padding != null ? (typeof style.padding === 'number' ? `${style.padding}px` : style.padding) : '4px',
    textShadow: style.textShadow || 'none',
    boxShadow: style.boxShadow || 'none',
    backdropFilter: style.backdropFilter || 'none',
    WebkitBackdropFilter: style.backdropFilter || 'none',
    filter: style.filter || 'none',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    userSelect: editing ? 'text' : 'none',
    pointerEvents: element.locked || previewMode ? 'none' : 'auto',
  };

  const renderContent = () => {
    if (editing) return null;
    switch (element.type) {
      case 'image':
        return element.content
          ? <img src={element.content} alt="" className="w-full h-full object-cover" draggable={false} />
          : <Placeholder label="No image" />;
      case 'video':
        return element.content
          ? <video src={element.content} className="w-full h-full object-cover" controls />
          : <Placeholder label="No video" />;
      case 'audio':
        return (
          <div className="flex items-center justify-center w-full h-full bg-black/30 text-white/60 text-xs gap-2">
            <span className="text-lg">♪</span>
            <span className="truncate">{element.content ? 'Audio Clip' : 'No audio'}</span>
          </div>
        );
      case 'shape':
        return null;
      default:
        return <div className="whitespace-pre-wrap break-words">{element.content || 'Double-click to edit'}</div>;
    }
  };

  return (
    <div
      ref={elRef}
      style={anim ? { ...elStyle, animationDelay: animDelayStr, animationFillMode: 'backwards' } : elStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        if (TEXT_TYPES.includes(element.type) && !element.locked && !previewMode) {
          e.stopPropagation();
          setEditing(true);
        }
      }}
      className={`${isSelected && !previewMode ? 'ring-2 ring-emerald-400' : 'hover:ring-1 hover:ring-emerald-400/40'} ${anim?.cls || ''}`}
    >
      {editing ? (
        <textarea
          autoFocus
          defaultValue={element.content || ''}
          onBlur={(e) => { onUpdate(element.id, { content: e.target.value }); setEditing(false); }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') { onUpdate(element.id, { content: e.target.value }); setEditing(false); }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full h-full bg-transparent text-inherit resize-none outline-none border border-primary/50 rounded p-1"
          style={{ fontSize: 'inherit', fontFamily: 'inherit', color: 'inherit' }}
        />
      ) : renderContent()}

      {isSelected && !element.locked && !previewMode && (
        <>
          {/* Rotation handle */}
          <div
            onMouseDown={(e) => startDrag(e, 'rotate')}
            className="absolute"
            style={{
              top: -28, left: '50%', transform: 'translateX(-50%)',
              width: 14, height: 14, borderRadius: '50%',
              background: 'hsl(152 60% 50%)', border: '2px solid white',
              cursor: 'grab', zIndex: 100,
            }}
          >
            <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 1, height: 14, background: 'hsl(152 60% 50%)' }} />
          </div>

          {/* Center point */}
          <div className="absolute" style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 4, height: 4, borderRadius: '50%',
            background: 'hsl(152 60% 50%)', opacity: 0.6,
            pointerEvents: 'none',
          }} />

          {/* Resize handles */}
          {HANDLES.map(h => (
            <div key={h}
              onMouseDown={(e) => startDrag(e, 'resize', h)}
              className="absolute w-2.5 h-2.5 bg-emerald-400 border border-white rounded-sm"
              style={{
                ...(h.includes('n') ? { top: '-5px' } : {}),
                ...(h.includes('s') ? { bottom: '-5px' } : {}),
                ...(h.includes('w') ? { left: '-5px' } : {}),
                ...(h.includes('e') ? { right: '-5px' } : {}),
                cursor: h === 'nw' || h === 'se' ? 'nwse-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : h === 'n' || h === 's' ? 'ns-resize' : 'ew-resize',
              }}
            />
          ))}

          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(element.id, { locked: !element.locked }); }}
            className="absolute -top-7 left-0 p-0.5 bg-emerald-500 text-white rounded text-[10px]"
          >
            {element.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}
            className="absolute -top-7 right-0 p-0.5 bg-destructive text-destructive-foreground rounded text-[10px]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

function Placeholder({ label }) {
  return <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">{label}</div>;
}