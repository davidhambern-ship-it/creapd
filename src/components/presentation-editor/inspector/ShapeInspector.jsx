import React from 'react';
import { InspectorShell, Group, Field, ColorField, SelectField, SliderField, NumField, pj, IconBtn } from './shared';
import { Trash2, Lock, Unlock, ArrowUp, ArrowDown } from 'lucide-react';

const SHAPES = ['rectangle', 'circle', 'triangle', 'star', 'hexagon'];
const DASH_STYLES = ['solid', 'dashed', 'dotted'];

export default function ShapeInspector({ element, onUpdate, onDelete, onBringForward, onSendBackward }) {
  const style = pj(element.style, {});
  const setStyle = (patch) => onUpdate(element.id, { style: JSON.stringify({ ...style, ...patch }) });

  return (
    <InspectorShell title="Shape" badge={style.shape || 'rect'} defaultValues={['fill']}
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
      <Group value="fill" title="Fill" defaultOpen>
        <Field label="Fill Color"><ColorField value={style.backgroundColor || '#3b82f6'} onChange={(v) => setStyle({ backgroundColor: v })} /></Field>
        <Field label="Shape Type"><SelectField value={style.shape || 'rectangle'} options={SHAPES} onChange={(v) => setStyle({ shape: v })} /></Field>
      </Group>

      <Group value="stroke" title="Stroke">
        <Field label="Stroke Color"><ColorField value={style.borderColor || '#ffffff'} onChange={(v) => setStyle({ borderColor: v })} /></Field>
        <SliderField label="Stroke Width" value={style.borderWidth || 0} min={0} max={20} onChange={(v) => setStyle({ borderWidth: v })} />
        <Field label="Dash Style"><SelectField value={style.dashStyle || 'solid'} options={DASH_STYLES} onChange={(v) => setStyle({ dashStyle: v })} /></Field>
      </Group>

      <Group value="appearance" title="Appearance">
        <SliderField label="Corner Radius" value={style.borderRadius || 0} min={0} max={100} onChange={(v) => setStyle({ borderRadius: v })} />
        <SliderField label="Opacity" value={element.opacity ?? 100} min={0} max={100} onChange={(v) => onUpdate(element.id, { opacity: v })} />
      </Group>

      <Group value="position" title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={element.x || 0} onChange={(v) => onUpdate(element.id, { x: v })} />
          <NumField label="Y" value={element.y || 0} onChange={(v) => onUpdate(element.id, { y: v })} />
          <NumField label="W" value={element.width || 200} onChange={(v) => onUpdate(element.id, { width: v })} />
          <NumField label="H" value={element.height || 150} onChange={(v) => onUpdate(element.id, { height: v })} />
        </div>
        <SliderField label="Rotation°" value={element.rotation || 0} min={-180} max={180} onChange={(v) => onUpdate(element.id, { rotation: v })} />
      </Group>
    </InspectorShell>
  );
}