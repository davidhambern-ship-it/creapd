import React from 'react';
import { InspectorShell, Group, Field, ColorField, SliderField, NumField, pj, IconBtn } from './shared';
import { Trash2, Lock, Unlock, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

export default function GenericElementInspector({ element, onUpdate, onDelete, onRegenerate, onBringForward, onSendBackward, label }) {
  const style = pj(element.style, {});
  const setStyle = (patch) => onUpdate(element.id, { style: JSON.stringify({ ...style, ...patch }) });

  return (
    <InspectorShell title={label || element.type} badge={element.type.toUpperCase()} defaultValues={['content', 'appearance']}
      actions={
        <>
          <IconBtn onClick={() => onUpdate(element.id, { locked: !element.locked })}>
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </IconBtn>
          <IconBtn onClick={() => onBringForward(element.id)}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={() => onSendBackward(element.id)}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={() => onDelete(element.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></IconBtn>
        </>
      }
    >
      {element.type !== 'shape' && element.type !== 'background' && (
        <Group value="content" title="Content" defaultOpen>
          <input value={element.content || ''} placeholder={`${element.type} content...`}
            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" />
          {onRegenerate && (
            <button onClick={onRegenerate} className="w-full flex items-center justify-center gap-1 text-[10px] text-primary hover:underline">
              <RefreshCw className="w-2.5 h-2.5" /> Regenerate
            </button>
          )}
        </Group>
      )}

      <Group value="appearance" title="Appearance">
        <SliderField label="Opacity" value={element.opacity ?? 100} min={0} max={100} onChange={(v) => onUpdate(element.id, { opacity: v })} />
        <Field label="Color"><ColorField value={style.color || '#ffffff'} onChange={(v) => setStyle({ color: v })} /></Field>
      </Group>

      <Group value="position" title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={element.x || 0} onChange={(v) => onUpdate(element.id, { x: v })} />
          <NumField label="Y" value={element.y || 0} onChange={(v) => onUpdate(element.id, { y: v })} />
          <NumField label="W" value={element.width || 200} onChange={(v) => onUpdate(element.id, { width: v })} />
          <NumField label="H" value={element.height || 100} onChange={(v) => onUpdate(element.id, { height: v })} />
        </div>
        <SliderField label="Rotation°" value={element.rotation || 0} min={-180} max={180} onChange={(v) => onUpdate(element.id, { rotation: v })} />
      </Group>
    </InspectorShell>
  );
}