import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InspectorShell, Group, Field, ColorField, SelectField, SliderField, ToggleGroup, pj, IconBtn } from './shared';
import FontPicker from './FontPicker';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Copy, Scissors, Clipboard, Trash2, Lock, Unlock, ArrowUp, ArrowDown, Wand2,
} from 'lucide-react';

const FONTS = [
  'Inter', 'Poppins', 'Oswald', 'Bebas Neue', 'Public Sans', 'JetBrains Mono',
  'Roboto', 'Montserrat', 'Lato', 'Open Sans', 'Noto Sans', 'DM Sans',
  'Playfair Display', 'Merriweather', 'Raleway',
  'Anton', 'Archivo Black', 'Righteous', 'Russo One',
  'Teko', 'Saira', 'Archivo',
  'CreapdCustom', 'Robotica', 'CreapConvFont', 'HollywoodDrive',
];
const AI_ACTIONS = [
  { label: 'Rewrite', action: 'rewrite' },
  { label: 'Summarize', action: 'summarize' },
  { label: 'Expand', action: 'expand' },
  { label: 'Shorten', action: 'shorten' },
  { label: 'Grammar', action: 'grammar' },
  { label: 'Readability', action: 'readability' },
];

export default function TextInspector({ element, onUpdate, onDelete, onRegenerate, onDuplicate, onCopy, onCut, onPaste, onBringForward, onSendBackward }) {
  const style = pj(element.style, {});
  const [aiAction, setAiAction] = useState(null);

  const setStyle = (patch) => onUpdate(element.id, { style: JSON.stringify({ ...style, ...patch }) });
  const ALIGN_OPTS = [
    { value: 'left', icon: AlignLeft }, { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight }, { value: 'justify', icon: AlignJustify },
  ];

  return (
    <InspectorShell title="Text" badge={element.type} defaultValues={['content', 'typography']}
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
      <Group value="content" title="Content" defaultOpen>
        <textarea value={element.content || ''} rows={3}
          onChange={(e) => onUpdate(element.id, { content: e.target.value })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5" />
      </Group>

      <Group value="clipboard" title="Clipboard">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={() => onCut(element.id)}><Scissors className="w-3 h-3" /> Cut</Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={() => onCopy(element.id)}><Copy className="w-3 h-3" /> Copy</Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={onPaste}><Clipboard className="w-3 h-3" /> Paste</Button>
        </div>
      </Group>

      <Group value="typography" title="Typography">
        <Field label="Font Family"><FontPicker value={style.fontFamily || 'Inter'} options={FONTS} onChange={(v) => setStyle({ fontFamily: v })} /></Field>
        <SliderField label="Font Size" value={style.fontSize || 16} min={8} max={120} onChange={(v) => setStyle({ fontSize: v })} />
        <div className="flex gap-1">
          <Button variant={style.bold ? 'default' : 'outline'} size="sm" className="flex-1 h-7" onClick={() => setStyle({ bold: !style.bold })}><Bold className="w-3.5 h-3.5" /></Button>
          <Button variant={style.italic ? 'default' : 'outline'} size="sm" className="flex-1 h-7" onClick={() => setStyle({ italic: !style.italic })}><Italic className="w-3.5 h-3.5" /></Button>
          <Button variant={style.underline ? 'default' : 'outline'} size="sm" className="flex-1 h-7" onClick={() => setStyle({ underline: !style.underline })}><Underline className="w-3.5 h-3.5" /></Button>
        </div>
      </Group>

      <Group value="color" title="Text Color">
        <Field label="Font Color"><ColorField value={style.color || '#ffffff'} onChange={(v) => setStyle({ color: v })} /></Field>
        <Field label="Highlight"><ColorField value={style.highlightColor || '#000000'} onChange={(v) => setStyle({ highlightColor: v })} /></Field>
      </Group>

      <Group value="align" title="Alignment">
        <Field label="Horizontal"><ToggleGroup value={style.align || 'left'} options={ALIGN_OPTS} onChange={(v) => setStyle({ align: v })} /></Field>
      </Group>

      <Group value="effects" title="Text Effects">
        <SliderField label="Letter Spacing" value={style.letterSpacing || 0} min={-5} max={20} onChange={(v) => setStyle({ letterSpacing: v })} />
        <SliderField label="Line Height" value={style.lineHeight || 1.5} min={0.8} max={3} step={0.1} onChange={(v) => setStyle({ lineHeight: v })} />
      </Group>

      <Group value="position" title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X"><input type="number" value={element.x || 0} onChange={(e) => onUpdate(element.id, { x: parseInt(e.target.value) || 0 })} className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" /></Field>
          <Field label="Y"><input type="number" value={element.y || 0} onChange={(e) => onUpdate(element.id, { y: parseInt(e.target.value) || 0 })} className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" /></Field>
          <Field label="W"><input type="number" value={element.width || 200} onChange={(e) => onUpdate(element.id, { width: parseInt(e.target.value) || 200 })} className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" /></Field>
          <Field label="H"><input type="number" value={element.height || 60} onChange={(e) => onUpdate(element.id, { height: parseInt(e.target.value) || 60 })} className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" /></Field>
        </div>
        <SliderField label="Rotation°" value={element.rotation || 0} min={-180} max={180} onChange={(v) => onUpdate(element.id, { rotation: v })} />
      </Group>

      <Group value="appearance" title="Appearance">
        <SliderField label="Opacity" value={element.opacity ?? 100} min={0} max={100} onChange={(v) => onUpdate(element.id, { opacity: v })} />
      </Group>

      <Group value="ai" title="AI Actions">
        <div className="grid grid-cols-2 gap-1">
          {AI_ACTIONS.map(a => (
            <Button key={a.action} variant="outline" size="sm" className="h-7 text-[10px]" disabled={aiAction === a.action}
              onClick={() => { setAiAction(a.action); onRegenerate(); }}>
              <Wand2 className="w-2.5 h-2.5" /> {a.label}
            </Button>
          ))}
        </div>
      </Group>
    </InspectorShell>
  );
}