import React from 'react';
import { Button } from '@/components/ui/button';
import { InspectorShell, Group, Field, ColorField, SelectField, NumField, SliderField, pj, IconBtn } from './shared';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import {
  Trash2, Lock, Unlock, Copy, ChevronLeft, ChevronRight,
} from 'lucide-react';

const TRANSITIONS = ['fade', 'slide_left', 'slide_right', 'zoom', 'dissolve', 'none'];
const SLIDE_TYPES = ['title_slide', 'content_slide', 'image_slide', 'video_slide', 'lower_third', 'full_screen', 'split_screen', 'section_divider', 'closing_slide', 'blank'];
const FONTS = ['Inter', 'Poppins', 'Oswald', 'JetBrains Mono', 'Bebas Neue', 'Public Sans'];

const ALIGN_OPTS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
];

function TextTypeControls({ label, prefix, font, setFont }) {
  return (
    <>
      <div className="flex items-center gap-1 mt-1.5 mb-0.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="ml-auto flex gap-0.5">
          <Button variant={font[`${prefix}Bold`] ? 'default' : 'outline'} size="icon"
            className="w-6 h-6" onClick={() => setFont({ [`${prefix}Bold`]: !font[`${prefix}Bold`] })}>
            <Bold className="w-3 h-3" />
          </Button>
          <Button variant={font[`${prefix}Italic`] ? 'default' : 'outline'} size="icon"
            className="w-6 h-6" onClick={() => setFont({ [`${prefix}Italic`]: !font[`${prefix}Italic`] })}>
            <Italic className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <Field label="Font Family">
        <SelectField value={font[`${prefix}Font`] || 'Poppins'} options={FONTS}
          onChange={(v) => setFont({ [`${prefix}Font`]: v })} />
      </Field>
      <SliderField label="Font Size" value={font[`${prefix}Size`] || (prefix === 'title' ? 48 : 24)}
        min={8} max={120} onChange={(v) => setFont({ [`${prefix}Size`]: v })} />
      <Field label="Text Color">
        <ColorField value={font[`${prefix}Color`] || '#ffffff'}
          onChange={(v) => setFont({ [`${prefix}Color`]: v })} />
      </Field>
      <Field label="Alignment">
        <div className="flex gap-1">
          {ALIGN_OPTS.map(o => (
            <Button key={o.value} variant={(font[`${prefix}Align`] || 'left') === o.value ? 'default' : 'outline'}
              size="sm" className="flex-1 h-7" onClick={() => setFont({ [`${prefix}Align`]: o.value })}>
              <o.icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </Field>
    </>
  );
}

export default function SlideInspector({
  slide, selectedId, onUpdate, onDuplicate, onDelete, onMoveForward, onMoveBackward,
}) {
  if (!slide) return (
    <InspectorShell title="Slide">
      <div className="p-4 text-sm text-muted-foreground">No slide selected</div>
    </InspectorShell>
  );

  const bg = pj(slide.background, {});
  const timing = pj(slide.timing, {});
  const refs = pj(slide.references, []);
  const fonts = pj(slide.slide_metadata, {}).fonts || {};

  const setFonts = (patch) => onUpdate({
    slide_metadata: JSON.stringify({ ...pj(slide.slide_metadata, {}), fonts: { ...fonts, ...patch } }),
  });

  return (
    <InspectorShell
      title="Slide" badge={`#${slide.slide_number ?? 0}`}
      defaultValues={['content']}
      actions={
        <>
          <IconBtn onClick={() => onUpdate({ status: slide.status === 'locked' ? 'editing' : 'locked' })}>
            {slide.status === 'locked' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </IconBtn>
          <IconBtn onClick={() => onDuplicate(slide.slide_number - 1)}><Copy className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn onClick={() => onDelete(slide.slide_number - 1)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></IconBtn>
        </>
      }
    >
      <Group value="content" title="Content" defaultOpen>
        <Field label="Title">
          <input value={slide.title || ''} onChange={(e) => onUpdate({ title: e.target.value })}
            className={`w-full text-xs bg-background border rounded-md px-2 py-1.5 h-8 ${selectedId === '__title__' ? 'border-primary ring-1 ring-primary' : 'border-border'}`} />
        </Field>
        <Field label="Body Text">
          <textarea value={slide.body_text || ''} rows={4}
            onChange={(e) => onUpdate({ body_text: e.target.value })}
            className={`w-full text-xs bg-background border rounded-md px-2 py-1.5 ${selectedId === '__body__' ? 'border-primary ring-1 ring-primary' : 'border-border'}`} />
        </Field>
      </Group>

      <Group value="typography" title="Typography">
        <TextTypeControls label="Title" prefix="title" font={fonts} setFont={setFonts} />
        <div className="border-t border-border/50 my-2" />
        <TextTypeControls label="Body" prefix="body" font={fonts} setFont={setFonts} />
      </Group>

      <Group value="layout" title="Layout">
        <Field label="Slide Type">
          <SelectField value={slide.slide_type || 'content_slide'} options={SLIDE_TYPES}
            onChange={(v) => onUpdate({ slide_type: v })} />
        </Field>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={onMoveBackward}>
            <ChevronLeft className="w-3 h-3" /> Back
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={onMoveForward}>
            Forward <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </Group>

      <Group value="background" title="Background">
        <Field label="Color"><ColorField value={bg.color || '#0a0a0a'} onChange={(v) => onUpdate({ background: JSON.stringify({ ...bg, color: v }) })} /></Field>
        <Field label="Image URL">
          <input value={bg.image_url || ''} placeholder="https://..." onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, image_url: e.target.value }) })}
            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" />
        </Field>
      </Group>

      <Group value="transition" title="Transition">
        <Field label="Type"><SelectField value={slide.transition || 'fade'} options={TRANSITIONS} onChange={(v) => onUpdate({ transition: v })} /></Field>
        <NumField label="Duration (ms)" value={timing.transition_duration || 500} min={100} max={5000} step={100}
          onChange={(v) => onUpdate({ timing: JSON.stringify({ ...timing, transition_duration: v }) })} />
      </Group>

      <Group value="timing" title="Timing">
        <NumField label="Slide Duration (ms)" value={timing.duration_ms || slide.duration_ms || 5000} min={1000} max={60000} step={500}
          onChange={(v) => onUpdate({ timing: JSON.stringify({ ...timing, duration_ms: v }) })} />
      </Group>

      <Group value="notes" title="Speaker Notes">
        <textarea value={slide.speaker_notes || ''} rows={3} placeholder="Add notes..."
          onChange={(e) => onUpdate({ speaker_notes: e.target.value })}
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5" />
      </Group>

      <Group value="refs" title="References">
        {refs.length > 0 && (
          <div className="space-y-1 mb-1">
            {refs.map((ref, i) => (
              <div key={i} className="text-[10px] text-muted-foreground p-1.5 bg-muted/50 rounded">
                {typeof ref === 'string' ? ref : ref.name || ref.citation || JSON.stringify(ref)}
              </div>
            ))}
          </div>
        )}
        <input placeholder="Add reference..." className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onUpdate({ references: JSON.stringify([...refs, e.target.value.trim()]) });
              e.target.value = '';
            }
          }} />
      </Group>

      <Group value="qa" title="QA Status">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-[10px] font-medium ${
            slide.status === 'approved' || slide.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
            slide.status === 'needs_revision' ? 'bg-yellow-500/20 text-yellow-400' :
            slide.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
          }`}>{(slide.status || 'not_reviewed').replace(/_/g, ' ')}</span>
          {slide.qa_score > 0 && <span className="text-[10px] font-mono">{slide.qa_score}/100</span>}
        </div>
      </Group>
    </InspectorShell>
  );
}