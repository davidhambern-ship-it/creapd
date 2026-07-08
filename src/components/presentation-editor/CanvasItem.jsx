import React, { useState } from 'react';
import { Trash2, Lock, Unlock } from 'lucide-react';

const HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
const TEXT_TYPES = ['text', 'lower_third', 'caption'];

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

export default function CanvasItem({ element, isSelected, zoom, previewMode, onSelect, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const drag = React.useRef(null);

  if (!element.visible && !isSelected) return null;

  const style = parseStyle(element);
  const anim = getAnimStyle(element);

  const startDrag = (e, action, handle) => {
    if (element.locked || editing || previewMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(element.id);
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
        onUpdate(element.id, { x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) }, opts);
      } else {
        let { ox: nx, oy: ny, ow: nw, oh: nh } = d;
        if (d.handle.includes('e')) nw = Math.max(30, d.ow + dx);
        if (d.handle.includes('s')) nh = Math.max(20, d.oh + dy);
        if (d.handle.includes('w')) { nw = Math.max(30, d.ow - dx); nx = d.ox + dx; }
        if (d.handle.includes('n')) { nh = Math.max(20, d.oh - dy); ny = d.oy + dy; }
        onUpdate(element.id, { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) }, opts);
      }
    };
    const up = () => {
      drag.current = null;
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
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : 0,
    borderColor: style.borderColor || 'transparent',
    borderStyle: style.borderWidth ? 'solid' : 'none',
    padding: style.padding ? `${style.padding}px` : '4px',
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
      style={anim ? { ...elStyle, animationDelay: anim.delay } : elStyle}
      onMouseDown={(e) => startDrag(e, 'drag')}
      onDoubleClick={() => {
        if (TEXT_TYPES.includes(element.type) && !element.locked && !previewMode) setEditing(true);
      }}
      className={`${isSelected && !previewMode ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/40'} ${anim?.cls || ''}`}
    >
      {editing ? (
        <textarea
          autoFocus
          defaultValue={element.content || ''}
          onBlur={(e) => { onUpdate(element.id, { content: e.target.value }); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { onUpdate(element.id, { content: e.target.value }); setEditing(false); }
          }}
          className="w-full h-full bg-transparent text-inherit resize-none outline-none border border-primary/50 rounded p-1"
          style={{ fontSize: 'inherit', fontFamily: 'inherit', color: 'inherit' }}
        />
      ) : renderContent()}

      {isSelected && !element.locked && !previewMode && (
        <>
          {HANDLES.map(h => (
            <div key={h}
              onMouseDown={(e) => startDrag(e, 'resize', h)}
              className="absolute w-2.5 h-2.5 bg-primary border border-white rounded-sm"
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
            className="absolute -top-7 left-0 p-0.5 bg-primary text-primary-foreground rounded text-[10px]"
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