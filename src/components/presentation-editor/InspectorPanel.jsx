import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, Lock, Unlock } from 'lucide-react';

const TRANSITIONS = ['fade', 'slide_left', 'slide_right', 'zoom', 'dissolve', 'none'];
const SLIDE_TYPES = ['title_slide', 'content_slide', 'image_slide', 'video_slide', 'lower_third', 'full_screen', 'split_screen', 'section_divider', 'closing_slide', 'blank'];
const FONTS = ['Inter', 'Poppins', 'Oswald', 'JetBrains Mono', 'Bebas Neue'];
const ANIMATIONS = ['none', 'fade_in', 'fade_out', 'slide_in', 'slide_out', 'zoom_in', 'zoom_out', 'reveal', 'emphasis'];

export default function InspectorPanel({
  slide, selectedElement, selectedType,
  onUpdateSlide, onUpdateElement, onDeleteElement, onRegenerateElement,
}) {
  if (selectedElement) {
    return <ElementInspector element={selectedElement} onUpdate={onUpdateElement} onDelete={onDeleteElement} onRegenerate={onRegenerateElement} />;
  }
  return <SlideInspector slide={slide} selectedType={selectedType} onUpdate={onUpdateSlide} />;
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
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SlideInspector({ slide, selectedType, onUpdate }) {
  if (!slide) return <div className="p-4 text-sm text-muted-foreground">No slide selected</div>;

  const bg = (() => { try { return JSON.parse(slide.background || '{}'); } catch { return {}; } })();
  const timing = (() => { try { return JSON.parse(slide.timing || '{}'); } catch { return {}; } })();
  const references = (() => { try { return JSON.parse(slide.references || '[]'); } catch { return []; } })();
  const animations = (() => { try { return JSON.parse(slide.animations || '{}'); } catch { return {}; } })();

  const isTitleSelected = selectedType === '__title__';
  const isBodySelected = selectedType === '__body__';

  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold">Slide Properties</h3>
        <span className="text-xs text-muted-foreground">#{slide.slide_number ?? 0}</span>
      </div>

      <Section title="Content">
        <Field label="Title">
          <Input value={slide.title || ''} onChange={(e) => onUpdate({ title: e.target.value })}
            className={isTitleSelected ? 'ring-2 ring-primary' : ''} />
        </Field>
        <Field label="Body Text">
          <Textarea value={slide.body_text || ''} onChange={(e) => onUpdate({ body_text: e.target.value })} rows={4}
            className={isBodySelected ? 'ring-2 ring-primary' : ''} />
        </Field>
      </Section>

      <Section title="Layout">
        <Field label="Slide Type">
          <select value={slide.slide_type || 'content_slide'} onChange={(e) => onUpdate({ slide_type: e.target.value })}
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
            {SLIDE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Background">
        <Field label="Color">
          <div className="flex gap-2">
            <Input type="color" value={bg.color || '#0a0a0a'} onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, color: e.target.value }) })} className="w-12 h-9 p-1" />
            <Input value={bg.color || '#0a0a0a'} onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, color: e.target.value }) })} className="flex-1" />
          </div>
        </Field>
        <Field label="Image URL">
          <Input value={bg.image_url || ''} placeholder="https://..."
            onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, image_url: e.target.value, color: undefined }) })} />
        </Field>
      </Section>

      <Section title="Transition">
        <Field label="Type">
          <select value={slide.transition || 'fade'} onChange={(e) => onUpdate({ transition: e.target.value })}
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
            {TRANSITIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
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

      <Section title="Animations">
        <Field label="Entrance">
          <select value={animations.entrance || 'fade_in'} onChange={(e) => onUpdate({ animations: JSON.stringify({ ...animations, entrance: e.target.value }) })}
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
            {ANIMATIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Speaker Notes">
        <Textarea value={slide.speaker_notes || ''} onChange={(e) => onUpdate({ speaker_notes: e.target.value })} rows={4} placeholder="Add speaker notes..." />
      </Section>

      <Section title="References">
        {references.length > 0 && (
          <div className="space-y-1">
            {references.map((ref, i) => (
              <div key={i} className="text-xs text-muted-foreground p-1.5 bg-muted/50 rounded">
                {typeof ref === 'string' ? ref : ref.name || ref.citation || JSON.stringify(ref)}
              </div>
            ))}
          </div>
        )}
        <Input placeholder="Add reference..." onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            onUpdate({ references: JSON.stringify([...references, e.target.value.trim()]) });
            e.target.value = '';
          }
        }} />
      </Section>

      <Section title="QA Status">
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            slide.status === 'approved' || slide.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
            slide.status === 'needs_revision' ? 'bg-yellow-500/20 text-yellow-400' :
            slide.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-muted text-muted-foreground'
          }`}>
            {(slide.status || 'not_reviewed').replace(/_/g, ' ')}
          </div>
          {slide.qa_score > 0 && <span className="text-xs font-mono">{slide.qa_score}/100</span>}
        </div>
      </Section>
    </div>
  );
}

function ElementInspector({ element, onUpdate, onDelete, onRegenerate }) {
  const style = (() => { try { return JSON.parse(element.style || '{}'); } catch { return {}; } })();
  const animation = (() => { try { return JSON.parse(element.animation || '{}'); } catch { return {}; } })();
  const timing = (() => { try { return JSON.parse(element.timing || '{}'); } catch { return {}; } })();
  const isTextType = ['text', 'lower_third', 'caption'].includes(element.type);

  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold capitalize">{element.type} Element</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onUpdate(element.id, { locked: !element.locked })}>
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => onDelete(element.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isTextType && (
        <Section title="Text Content">
          <Textarea value={element.content || ''} onChange={(e) => onUpdate(element.id, { content: e.target.value })} rows={3} />
          <Button variant="outline" size="sm" className="w-full" onClick={onRegenerate}>
            <RefreshCw className="w-3 h-3" /> Regenerate Text
          </Button>
        </Section>
      )}

      {element.type === 'image' && (
        <Section title="Image">
          <Input value={element.content || ''} placeholder="Image URL" onChange={(e) => onUpdate(element.id, { content: e.target.value })} />
          {element.content && <img src={element.content} alt="" className="w-full rounded border border-border mt-1" />}
          <Button variant="outline" size="sm" className="w-full" onClick={onRegenerate}>
            <RefreshCw className="w-3 h-3" /> Regenerate Image
          </Button>
        </Section>
      )}

      <Section title="Position & Size">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X"><Input type="number" value={element.x} onChange={(e) => onUpdate(element.id, { x: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Y"><Input type="number" value={element.y} onChange={(e) => onUpdate(element.id, { y: parseInt(e.target.value) || 0 })} /></Field>
          <Field label="Width"><Input type="number" value={element.width} onChange={(e) => onUpdate(element.id, { width: parseInt(e.target.value) || 100 })} /></Field>
          <Field label="Height"><Input type="number" value={element.height} onChange={(e) => onUpdate(element.id, { height: parseInt(e.target.value) || 100 })} /></Field>
        </div>
        <Field label="Rotation (°)">
          <Input type="number" value={element.rotation || 0} onChange={(e) => onUpdate(element.id, { rotation: parseInt(e.target.value) || 0 })} />
        </Field>
      </Section>

      <Section title="Appearance">
        <Field label="Opacity (%)">
          <Input type="number" min="0" max="100" value={element.opacity ?? 100} onChange={(e) => onUpdate(element.id, { opacity: parseInt(e.target.value) || 100 })} />
        </Field>
        <Field label="Z-Index">
          <Input type="number" value={element.z_index || 0} onChange={(e) => onUpdate(element.id, { z_index: parseInt(e.target.value) || 0 })} />
        </Field>
        <Field label="Visible">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onUpdate(element.id, { visible: !element.visible })}>
            {element.visible ? 'Visible' : 'Hidden'}
          </Button>
        </Field>
      </Section>

      {isTextType && (
        <Section title="Text Style">
          <Field label="Font Size">
            <Input type="number" value={style.fontSize || 16} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, fontSize: parseInt(e.target.value) || 16 }) })} />
          </Field>
          <Field label="Font Family">
            <select value={style.fontFamily || 'Inter'} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, fontFamily: e.target.value }) })}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Color">
            <div className="flex gap-2">
              <Input type="color" value={style.color || '#ffffff'} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, color: e.target.value }) })} className="w-12 h-9 p-1" />
              <Input value={style.color || '#ffffff'} onChange={(e) => onUpdate(element.id, { style: JSON.stringify({ ...style, color: e.target.value }) })} className="flex-1" />
            </div>
          </Field>
          <div className="flex gap-2">
            <Button variant={style.bold ? 'default' : 'outline'} size="sm" className="flex-1"
              onClick={() => onUpdate(element.id, { style: JSON.stringify({ ...style, bold: !style.bold }) })}>Bold</Button>
            <Button variant={style.italic ? 'default' : 'outline'} size="sm" className="flex-1"
              onClick={() => onUpdate(element.id, { style: JSON.stringify({ ...style, italic: !style.italic }) })}>Italic</Button>
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

      <Section title="Animation">
        <Field label="Entrance">
          <select value={animation.entrance || 'none'} onChange={(e) => onUpdate(element.id, { animation: JSON.stringify({ ...animation, entrance: e.target.value }) })}
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5">
            {ANIMATIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
        <Field label="Duration (ms)">
          <Input type="number" value={animation.duration || 500} onChange={(e) => onUpdate(element.id, { animation: JSON.stringify({ ...animation, duration: parseInt(e.target.value) || 500 }) })} />
        </Field>
        <Field label="Delay (ms)">
          <Input type="number" value={animation.delay || 0} onChange={(e) => onUpdate(element.id, { animation: JSON.stringify({ ...animation, delay: parseInt(e.target.value) || 0 }) })} />
        </Field>
      </Section>

      <Section title="Timing">
        <Field label="Start (ms)">
          <Input type="number" value={timing.start_ms || 0} onChange={(e) => onUpdate(element.id, { timing: JSON.stringify({ ...timing, start_ms: parseInt(e.target.value) || 0 }) })} />
        </Field>
        <Field label="End (ms)">
          <Input type="number" value={timing.end_ms || 0} onChange={(e) => onUpdate(element.id, { timing: JSON.stringify({ ...timing, end_ms: parseInt(e.target.value) || 0 }) })} />
        </Field>
      </Section>
    </div>
  );
}