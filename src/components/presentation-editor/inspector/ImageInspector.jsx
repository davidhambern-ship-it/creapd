import React from 'react';
import { InspectorShell, Group, Field, ColorField, SliderField, NumField, pj, IconBtn } from './shared';
import SvgGenerator from './SvgGenerator';
import IconifyIconPicker from './IconifyIconPicker';
import SvgApiGallery from './SvgApiGallery';
import {
  Trash2, Lock, Unlock, ArrowUp, ArrowDown, ImagePlus,
} from 'lucide-react';

export default function ImageInspector({ element, slide, presentation, onUpdate, onDelete, onRegenerate, onBringForward, onSendBackward }) {
  const style = pj(element.style, {});
  const setStyle = (patch) => onUpdate(element.id, { style: JSON.stringify({ ...style, ...patch }) });

  const theme = pj(presentation?.theme, {});
  const bg = pj(slide?.background, {});
  const fonts = pj(slide?.slide_metadata, {}).fonts || {};
  const colorScheme = {
    background: bg.color || theme.bg || '#0a0a0a',
    primary: theme.primary || '#7c3aed',
    accent: theme.text || fonts.titleColor || '#ffffff',
    titleColor: fonts.titleColor || theme.text,
    bodyColor: fonts.bodyColor || theme.text,
  };

  return (
    <InspectorShell title="Image" badge="IMG" defaultValues={['source']}
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
      <Group value="source" title="Image Source" defaultOpen>
        {element.content && <img src={element.content} alt="" className="w-full rounded-lg border border-white/[0.06] mb-2" />}
        <input value={element.content || ''} placeholder="Image URL..." onChange={(e) => onUpdate(element.id, { content: e.target.value })}
          className="cpe-input" />
        <button className="cpe-mini-btn w-full" onClick={onRegenerate}>
          <ImagePlus className="w-3 h-3" /> Replace Using AI
        </button>
      </Group>

      <Group value="ai-svg" title="AI Vector Art (SVG)">
        <SvgGenerator colorScheme={colorScheme} onInsert={(url) => onUpdate(element.id, { content: url })} />
      </Group>

      <Group value="iconify" title="Icon Library (200K+)">
        <IconifyIconPicker colorScheme={colorScheme} onInsert={(url) => onUpdate(element.id, { content: url })} />
      </Group>

      <Group value="svgapi" title="Stock Vector Gallery">
        <SvgApiGallery onInsert={(url) => onUpdate(element.id, { content: url })} />
      </Group>

      <Group value="adjust" title="Adjustments">
        <SliderField label="Opacity" value={element.opacity ?? 100} min={0} max={100} onChange={(v) => onUpdate(element.id, { opacity: v })} />
        <SliderField label="Brightness" value={style.brightness ?? 100} min={0} max={200} onChange={(v) => setStyle({ brightness: v })} />
        <SliderField label="Contrast" value={style.contrast ?? 100} min={0} max={200} onChange={(v) => setStyle({ contrast: v })} />
        <SliderField label="Saturation" value={style.saturation ?? 100} min={0} max={200} onChange={(v) => setStyle({ saturation: v })} />
        <SliderField label="Blur" value={style.blur ?? 0} min={0} max={20} onChange={(v) => setStyle({ blur: v })} />
      </Group>

      <Group value="style" title="Border & Style">
        <Field label="Border Color"><ColorField value={style.borderColor || '#ffffff'} onChange={(v) => setStyle({ borderColor: v })} /></Field>
        <SliderField label="Border Width" value={style.borderWidth || 0} min={0} max={20} onChange={(v) => setStyle({ borderWidth: v })} />
        <SliderField label="Corner Radius" value={style.borderRadius || 0} min={0} max={100} onChange={(v) => setStyle({ borderRadius: v })} />
      </Group>

      <Group value="position" title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={element.x || 0} onChange={(v) => onUpdate(element.id, { x: v })} />
          <NumField label="Y" value={element.y || 0} onChange={(v) => onUpdate(element.id, { y: v })} />
          <NumField label="W" value={element.width || 400} onChange={(v) => onUpdate(element.id, { width: v })} />
          <NumField label="H" value={element.height || 300} onChange={(v) => onUpdate(element.id, { height: v })} />
        </div>
        <SliderField label="Rotation°" value={element.rotation || 0} min={-180} max={180} onChange={(v) => onUpdate(element.id, { rotation: v })} />
      </Group>

      <Group value="alt" title="Alt Text">
        <input value={style.altText || ''} placeholder="Describe image..." onChange={(e) => setStyle({ altText: e.target.value })}
          className="cpe-input" />
      </Group>
    </InspectorShell>
  );
}