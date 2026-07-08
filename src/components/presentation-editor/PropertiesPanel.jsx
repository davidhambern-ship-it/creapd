import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Lock, Unlock, Copy, ArrowUp, ArrowDown } from 'lucide-react';

const TRANSITIONS = ['fade', 'slide_left', 'slide_right', 'zoom', 'dissolve', 'none'];
const SLIDE_TYPES = ['title_slide', 'content_slide', 'image_slide', 'video_slide', 'lower_third', 'full_screen', 'split_screen', 'section_divider', 'closing_slide', 'blank'];
const FONTS = ['Inter', 'Poppins', 'Oswald', 'JetBrains Mono', 'Bebas Neue'];
const ANIMATIONS = ['none', 'fade_in', 'fade_out', 'slide_in', 'slide_out', 'zoom_in', 'zoom_out', 'reveal'];

function pj(str, fallback) { try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; } }

export default function PropertiesPanel({
  slide, selectedElement, selectedId,
  onUpdateSlide, onUpdateElement, onDeleteElement, onRegenerateElement,
  onDuplicateElement, onBringForward, onSendBackward,
}) {
  if (selectedElement) {
    return <ElementProperties element={selectedElement} onUpdate={onUpdateElement} onDelete={onDeleteElement}
      onRegenerate={onRegenerateElement} onDuplicate={onDuplicateElement}
      onBringForward={onBringForward} onSendBackward={onSendBackward} />;
  }
  return <SlideProperties slide={slide} selectedId={selectedId} onUpdate={onUpdateSlide} />;
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ColorField({ value, onChange }) {
  return (
    <div className="flex gap-2">
      <Input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="w-12 h-9 p-1" />
      <Input value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="flex-1" />
    </div>
  );
}

function SlideProperties({ slide, selectedId, onUpdate }) {
  if (!slide) return <div className="p-4 text-sm text-muted-foreground">No slide selected</div>;
  const bg = pj(slide.background, {});
  const timing = pj(slide.timing, {});
  const refs = pj(slide.references, []);
  const anims = pj(slide.animations, {});

  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold">Slide Properties</h3>
        <span className="text-xs text-muted-foreground">#{slide.slide_number ?? 0}</span>
      </div>

      <Section title="Content">
        <Field label="Title">
          <Input value={slide.title || ''} onChange={(e) => onUpdate({ title: e.target.value })}
            className={selectedId === '__title__' ? 'ring-2 ring-primary' : ''} />
        </Field>
        <Field label="Body Text">
          <Textarea value={slide.body_text || ''} onChange={(e) => onUpdate({ body_text: e.target.value })} rows={4}
            className={selectedId === '__body__' ? 'ring-2 ring-primary' : ''} />
        </Field>
      </Section>

      <Section title="Layout">
        <Field label="Slide Type">
          <Select value={slide.slide_type || 'content_slide'} onChange={(v) => onUpdate({ slide_type: v })} options={SLIDE_TYPES} />
        </Field>
      </Section>

      <Section title="Background">
        <Field label="Color"><ColorField value={bg.color || '#0a0a0a'} onChange={(v) => onUpdate({ background: JSON.stringify({ ...bg, color: v }) })} /></Field>
        <Field label="Image URL">
          <Input value={bg.image_url || ''} placeholder="https://..."
            onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, image_url: e.target.value }) })} />
        </Field>
      </Section>

      <Section title="Transition">
        <Field label="Type"><Select value={slide.transition || 'fade'} onChange={(v) => onUpdate({ transition: v })} options={TRANSITIONS} /></Field>
        <Field label="Duration (ms)">
          <Input type="number" value={timing.transition_duration || 500}
            onChange={(e) => onUpdate({ timing: JSON.stringify({ ...timing, transition_duration: parseInt(e.target.value) || 500 }) })} />
        </Field>
      </Section>

      <Section title="Timing">
        <Field label="Slide Duration (ms)">
          <Input type="number" value={timing.duration_ms || slide.duration_ms || 5000}
            onChange={(e) => onUpdate({ timing: JSON.stringify({ ...timing, duration_ms: parseInt(e.target.value) || 5000 }) })} />
        </Field>
      </Section>

      <Section title="Animation">
        <Field label="Entrance"><Select value={anims.entrance || 'fade_in'} onChange={(v) => onUpdate({ animations: JSON.stringify({ ...anims, entrance: v }) })} options={ANIMATIONS} /></Field>
      </Section>

      <Section title="Speaker Notes">
        <Textarea value={slide.speaker_notes || ''} onChange={(e) => onUpdate({ speaker_notes: e.target.value })} rows={4} placeholder="Add notes..." />
      </Section>

      <Section title="References">
        {refs.length > 0 && (
          <div className="space-y-1">
            {refs.map((ref, i) => (
              <div key={i} className="text-xs text-muted-foreground p-1.5 bg-muted/50 rounded">
                {typeof ref === 'string' ? ref : ref.name || ref.citation || JSON.stringify(ref)}
              </div>
            ))}
          </div>
        )}
        <Input placeholder="Add reference..." onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            onUpdate({ references: JSON.stringify([...refs, e.target.value.trim()]) });
            e.target.value = '';
          }
        }} />
      </Section>

      <Section title="QA Status">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            slide.status === 'approved' || slide.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
            slide.status === 'needs_revision' ? 'bg-yellow-500/20 text-yellow-400' :
            slide.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
          }`}>{(slide.status || 'not_reviewed').replace(/_/g, ' ')}</span>
          {slide.qa_score > 0 && <span className="text-xs font-mono">{slide.qa_score}/100</span>}
        </div>
      </Section>
    </div>
  );
}

function ElementProperties({ element, onUpdate, onDelete, onRegenerate, onDuplicate, onBringForward, onSendBackward }) {
  const style = pj(element.style, {});
  const anim = pj(element.animation, {});
  const timing = pj(element.timing, {});
  const isText = ['text', 'lower_third', 'caption'].includes(element.type);

  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold capitalize">{element.type}</h3>
        <div className="flex gap-0.5">
          <Btn onClick={() => onUpdate(element.id, { locked: !element.locked })}>
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Btn>
          <Btn onClick={() => onDuplicate(element.id)}><Copy className="w-3.5 h-3.5" /></Btn>
          <Btn onClick={onSendBackward ? () => onSendBackward(element.id) : undefined}><ArrowDown className="w-3.5 h-3.5" /></Btn>
          <Btn onClick={onBringForward ? () => onBringForward(element.id) : undefined}><ArrowUp className="w-3.5 h-3.5" /></Btn>
          <Btn onClick={() => onDelete(element.id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Btn>
        </div>
      </div>

      {isText && (
        <Section title="Text">
          <Textarea value={element.content || ''} onChange={(e) => onUpdate(element.id, { content: e.target.value })} rows={3} />
          <Button variant="outline" size="sm" className="w-full" onClick={onRegenerate}>
            <RefreshCw className="w-3 h-3" /> Regenerate
          </Button>
        </Section>
      )}

      {element.type === 'image' && (
        <Section title="Image">
          <Input value={element.content || ''} placeholder="Image URL" onChange={(e) => onUpdate(element.id, { content: e.target.value })} />
          {element.content && <img src={element.content} alt="" className="w-full rounded border border-border mt-1" />}
        </Section>
      )}

      <Section title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X"><Input type="number" value={element.x} onChange={(e) => onUpdate(element.id, { x: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Y"><Input type="number" value={element.y} onChange={(e) => onUpdate(element.id, { y: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="W"><Input type="number" value={element.width} onChange={(e) => onUpdate(element.id, { width: parseInt(e.target.value) || 100 })} /></Field>
          <Field label="H"><Input type="number" value={element.height} onChange={(e) => onUpdate(element.id, { height: parseInt(e.target.value) || 100 })} /></Field>
        </div>
        <Field label="Rotation (°)">
          <Input type="number" value={element.rotation || 0} onChange={(e) => onUpdate(element.id, { rotation: parseInt(e.target.value) || 0 })} />
        </Field>
      </Section>

      <Section title="Appearance">
        <Field label="Opacity (%)">
          <Input type="number" min="0" max="100" value={element.opacity ?? 100} onChange={(e) => onUpdate(element.id, { opacity: parseInt(e.target.value) || 100 })} />
        </Field>
        <Field label="Layer Order">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onUpdate(element.id, { visible: !element.visible })}>
            {element.visible ? 'Visible' : 'Hidden'}
          </Button>
        </Field>
      </Section>

      {isText && (
        <Section title="Text Style">
          <Field label="Font Size"><Input type="number" value={style.fontSize || 16} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, fontSize: parseInt(e.target.value) || 16 }) })} /></Field>
          <Field label="Font"><Select value={style.fontFamily || 'Inter'} onChange={(v) => onUpdate(element.id, { style: JSON.stringify({ ...style, fontFamily: v }) })} options={FONTS} /></Field>
          <Field label="Color"><ColorField value={style.color || '#ffffff'} onChange={(v) => onUpdate(element.id, { style: JSON.stringify({ ...style, color: v }) })} /></Field>
          <div className="flex gap-2">
            <Button variant={style.bold ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(element.id, { style: JSON.stringify({ ...style, bold: !style.bold }) })}>Bold</Button>
            <Button variant={style.italic ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => onUpdate(element.id, { style: JSON.stringify({ ...style, italic: !style.italic }) })}>Italic</Button>
          </div>
          <Field label="Align">
            <div className="flex gap-1">
              {['left', 'center', 'right'].map(a => (
                <Button key={a} variant={(style.align || 'left') === a ? 'default' : 'outline'} size="sm" className="flex-1 text-xs"
                  onClick={() => onUpdate(element.id, { style: JSON.stringify({ ...style, align: a }) })}>{a}</Button>
              ))}
            </div>
          </Field>
        </Section>
      )}

      {element.type === 'shape' && (
        <Section title="Shape">
          <Field label="Fill Color"><ColorField value={style.backgroundColor || '#3b82f6'} onChange={(v) => onUpdate(element.id, { style: JSON.stringify({ ...style, backgroundColor: v }) })} /></Field>
          <Field label="Border Radius"><Input type="number" value={style.borderRadius || 0} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, borderRadius: parseInt(e.target.value) || 0 }) })} /></Field>
        </Section>
      )}

      <Section title="Animation">
        <Field label="Entrance"><Select value={anim.entrance || 'none'} onChange={(v) => onUpdate(element.id, { animation: JSON.stringify({ ...anim, entrance: v }) })} options={ANIMATIONS} /></Field>
        <Field label="Duration (ms)"><Input type="number" value={anim.duration || 500} onChange={(e) => onUpdate(element.id, { animation: JSON.stringify({ ...anim, duration: parseInt(e.target.value) || 500 }) })} /></Field>
        <Field label="Delay (ms)"><Input type="number" value={anim.delay || 0} onChange={(e) => onUpdate(element.id, { animation: JSON.stringify({ ...anim, delay: parseInt(e.target.value) || 0 }) })} /></Field>
      </Section>

      <Section title="Timing">
        <Field label="Start (ms)"><Input type="number" value={timing.start_ms || 0} onChange={(e) => onUpdate(element.id, { timing: JSON.stringify({ ...timing, start_ms: parseInt(e.target.value) || 0 }) })} /></Field>
        <Field label="End (ms)"><Input type="number" value={timing.end_ms || 0} onChange={(e) => onUpdate(element.id, { timing: JSON.stringify({ ...timing, end_ms: parseInt(e.target.value) || 0 }) })} /></Field>
      </Section>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
      {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
    </select>
  );
}

function Btn({ children, className = '', ...props }) {
  return <Button variant="ghost" size="icon" className={`w-7 h-7 ${className}`} {...props}>{children}</Button>;
}