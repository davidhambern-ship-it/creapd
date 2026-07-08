import React from 'react';
import { InspectorShell, Group, Field, ColorField, SelectField, NumField, SliderField, pj, IconBtn } from './shared';
import FontPicker from './FontPicker';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import {
  Trash2, Lock, Unlock, Copy, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useCustomFonts } from '@/hooks/useCustomFonts';

const TRANSITIONS = ['fade', 'slide_left', 'slide_right', 'zoom', 'dissolve', 'none'];
const SLIDE_TYPES = ['title_slide', 'content_slide', 'image_slide', 'video_slide', 'lower_third', 'full_screen', 'split_screen', 'section_divider', 'closing_slide', 'blank'];

const ALIGN_OPTS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
];

function TextTypeControls({ label, prefix, font, setFont, allFonts, onUpload, uploading }) {
  return (
    <>
      <div className="flex items-center gap-1 mt-1.5 mb-0.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className="ml-auto flex gap-0.5">
          <button className={`cpe-mini-btn w-6 h-6 px-0 ${font[`${prefix}Bold`] ? 'active' : ''}`}
            onClick={() => setFont({ [`${prefix}Bold`]: !font[`${prefix}Bold`] })}>
            <Bold className="w-3 h-3" />
          </button>
          <button className={`cpe-mini-btn w-6 h-6 px-0 ${font[`${prefix}Italic`] ? 'active' : ''}`}
            onClick={() => setFont({ [`${prefix}Italic`]: !font[`${prefix}Italic`] })}>
            <Italic className="w-3 h-3" />
          </button>
        </div>
      </div>
      <Field label="Font Family">
        <FontPicker value={font[`${prefix}Font`] || 'Poppins'} options={allFonts}
          onUpload={onUpload} uploading={uploading}
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
            <button key={o.value} className={`cpe-mini-btn flex-1 ${(font[`${prefix}Align`] || 'left') === o.value ? 'active' : ''}`}
              onClick={() => setFont({ [`${prefix}Align`]: o.value })}>
              <o.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

export default function SlideInspector({
  slide, selectedId, onUpdate, onDuplicate, onDelete, onMoveForward, onMoveBackward,
}) {
  const { allFonts, uploadFont, uploading } = useCustomFonts();

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
            className={`cpe-input ${selectedId === '__title__' ? 'selected' : ''}`} />
        </Field>
        <Field label="Body Text">
          <textarea value={slide.body_text || ''} rows={4}
            onChange={(e) => onUpdate({ body_text: e.target.value })}
            className={`cpe-textarea ${selectedId === '__body__' ? 'selected' : ''}`} />
        </Field>
      </Group>

      <Group value="typography" title="Typography">
        <TextTypeControls label="Title" prefix="title" font={fonts} setFont={setFonts} allFonts={allFonts} onUpload={uploadFont} uploading={uploading} />
        <div className="my-2" style={{ borderTop: '1px solid hsl(220 8% 15% / 0.5)' }} />
        <TextTypeControls label="Body" prefix="body" font={fonts} setFont={setFonts} allFonts={allFonts} onUpload={uploadFont} uploading={uploading} />
      </Group>

      <Group value="layout" title="Layout">
        <Field label="Slide Type">
          <SelectField value={slide.slide_type || 'content_slide'} options={SLIDE_TYPES}
            onChange={(v) => onUpdate({ slide_type: v })} />
        </Field>
        <div className="flex gap-1">
          <button className="cpe-mini-btn flex-1" onClick={onMoveBackward}>
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <button className="cpe-mini-btn flex-1" onClick={onMoveForward}>
            Forward <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </Group>

      <Group value="background" title="Background">
        <Field label="Color"><ColorField value={bg.color || '#0a0a0a'} onChange={(v) => onUpdate({ background: JSON.stringify({ ...bg, color: v }) })} /></Field>
        <Field label="Image URL">
          <input value={bg.image_url || ''} placeholder="https://..." onChange={(e) => onUpdate({ background: JSON.stringify({ ...bg, image_url: e.target.value }) })}
            className="cpe-input" />
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
          className="cpe-textarea" />
      </Group>

      <Group value="refs" title="References">
        {refs.length > 0 && (
          <div className="space-y-1 mb-1">
            {refs.map((ref, i) => (
              <div key={i} className="text-[10px] text-muted-foreground p-1.5 rounded" style={{ background: 'hsl(220 14% 10% / 0.5)' }}>
                {typeof ref === 'string' ? ref : ref.name || ref.citation || JSON.stringify(ref)}
              </div>
            ))}
          </div>
        )}
        <input placeholder="Add reference..." className="cpe-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
              onUpdate({ references: JSON.stringify([...refs, e.target.value.trim()]) });
              e.target.value = '';
            }
          }} />
      </Group>

      <Group value="qa" title="QA Status">
        <div className="flex items-center gap-2">
          <span className={`cpe-qa-badge ${
            slide.status === 'approved' || slide.status === 'passed' ? 'cpe-qa-pass' :
            slide.status === 'needs_revision' ? 'cpe-qa-revise' :
            slide.status === 'failed' ? 'cpe-qa-fail' : 'cpe-qa-neutral'
          }`}>{(slide.status || 'not_reviewed').replace(/_/g, ' ')}</span>
          {slide.qa_score > 0 && <span className="text-[10px] font-mono">{slide.qa_score}/100</span>}
        </div>
      </Group>
    </InspectorShell>
  );
}