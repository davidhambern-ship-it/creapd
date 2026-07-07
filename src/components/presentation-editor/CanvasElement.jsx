import React, { useRef, useState } from 'react';
import { Trash2, Lock, Unlock } from 'lucide-react';

const HANDLES = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];

export default function CanvasElement({
  element, isSelected, zoom, onSelect, onUpdate, onDelete, previewMode
}) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const dragState = useRef(null);

  if (!element.visible && !isSelected) return null;

  const handleMouseDown = (e, action, handle) => {
    if (element.locked || editing || previewMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(element.id);
    dragState.current = {
      action, handle,
      startX: e.clientX, startY: e.clientY,
      origX: element.x, origY: element.y,
      origW: element.width, origH: element.height,
    };

    const move = (ev) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = (ev.clientX - ds.startX) / zoom;
      const dy = (ev.clientY - ds.startY) / zoom;

      if (ds.action === 'drag') {
        onUpdate(element.id, { x: Math.round(ds.origX + dx), y: Math.round(ds.origY + dy) });
      } else if (ds.action === 'resize') {
        let { origX: nx, origY: ny, origW: nw, origH: nh } = ds;
        if (ds.handle.includes('e')) nw = Math.max(30, ds.origW + dx);
        if (ds.handle.includes('s')) nh = Math.max(20, ds.origH + dy);
        if (ds.handle.includes('w')) { nw = Math.max(30, ds.origW - dx); nx = ds.origX + dx; }
        if (ds.handle.includes('n')) { nh = Math.max(20, ds.origH - dy); ny = ds.origY + dy; }
        onUpdate(element.id, { x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
      }
    };

    const up = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const style = (() => { try { return JSON.parse(element.style || '{}'); } catch { return {}; } })();

  const elStyle = {
    position: 'absolute',
    left: element.x, top: element.y,
    width: element.width, height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    opacity: (element.opacity ?? 100) / 100,
    zIndex: element.z_index || 0,
    cursor: previewMode ? 'default' : (element.locked ? 'default' : 'move'),
    fontSize: `${(style.fontSize || 16)}px`,
    fontFamily: style.fontFamily || 'inherit',
    color: style.color || '#ffffff',
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align || 'left',
    backgroundColor: style.backgroundColor || (element.type === 'shape' ? (style.backgroundColor || '#3b82f6') : 'transparent'),
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
      case 'text':
      case 'lower_third':
      case 'caption':
        return <div className="whitespace-pre-wrap break-words">{element.content || 'Double-click to edit'}</div>;
      case 'image':
        return element.content
          ? <img src={element.content} alt="" className="w-full h-full object-cover" draggable={false} />
          : <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">No image</div>;
      case 'shape':
        return null;
      case 'video':
        return element.content
          ? <video src={element.content} className="w-full h-full object-cover" />
          : <div className="flex items-center justify-center w-full h-full text-muted-foreground text-xs">No video</div>;
      case 'icon':
        return <div className="flex items-center justify-center w-full h-full text-2xl">⬡</div>;
      default:
        return <div className="text-xs text-muted-foreground">{element.type}</div>;
    }
  };

  return (
    <div
      ref={ref}
      style={elStyle}
      onMouseDown={(e) => handleMouseDown(e, 'drag')}
      onDoubleClick={() => { if (['text', 'lower_third', 'caption'].includes(element.type) && !element.locked && !previewMode) setEditing(true); }}
      className={isSelected && !previewMode ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-primary/40'}
    >
      {editing ? (
        <textarea
          autoFocus
          defaultValue={element.content || ''}
          onBlur={(e) => { onUpdate(element.id, { content: e.target.value }); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { onUpdate(element.id, { content: e.target.value }); setEditing(false); } }}
          className="w-full h-full bg-transparent text-inherit resize-none outline-none border border-primary/50 rounded p-1"
          style={{ fontSize: 'inherit', fontFamily: 'inherit', color: 'inherit' }}
        />
      ) : renderContent()}

      {isSelected && !element.locked && !previewMode && (
        <>
          {HANDLES.map(h => (
            <div key={h}
              onMouseDown={(e) => handleMouseDown(e, 'resize', h)}
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