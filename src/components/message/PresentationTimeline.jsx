import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Clapperboard, Clock, Type, Image as ImageIcon, BookOpen, Sparkles,
  Save, X, ChevronRight, Wand2, ArrowRight
} from 'lucide-react';
import { formatDuration } from '@/lib/spiritualConstants';

function safeParse(str) {
  if (!str) return [];
  try {
    const result = typeof str === 'string' ? JSON.parse(str) : str;
    if (typeof result === 'string') return JSON.parse(result);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

const BEAT_COLORS = {
  title_reveal: 'bg-primary/20 text-primary border-primary/30',
  host_intro: 'bg-chart-4/20 text-chart-4 border-chart-4/30',
  emphasis_text: 'bg-accent/20 text-accent border-accent/30',
  scripture_passage: 'bg-berna-emerald/20 text-berna-emerald border-berna-emerald/30',
  image_scene: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  question_prompt: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  quote_card: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
  closing_momentum: 'bg-primary/20 text-primary border-primary/30',
  transition: 'bg-muted/30 text-muted-foreground border-muted/40',
};

const ELEMENT_COLORS = {
  text: 'bg-primary/60',
  scripture: 'bg-berna-emerald/60',
  image: 'bg-accent/60',
};

const ANIMATION_OPTIONS = ['fade', 'zoom', 'slide_left', 'slide_right', 'pop', 'dissolve', 'word_by_word', 'typewriter', 'lower_third', 'none'];
const EXIT_OPTIONS = ['fade_out', 'slide_out_left', 'slide_out_right', 'dissolve_out', 'none'];
const POSITION_OPTIONS = ['center', 'top', 'bottom', 'left', 'right', 'full_screen', 'lower_third'];

function fmt(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ElementEditPanel({ scene, elementType, elementIndex, onSaved, onClose }) {
  const elements = safeParse(scene[`${elementType}_elements`]);
  const element = elements[elementIndex];
  const [draft, setDraft] = useState({ ...element });
  const [saving, setSaving] = useState(false);

  if (!element) return null;

  const textField = elementType === 'scripture' ? 'text' : elementType === 'image' ? 'prompt' : 'text';
  const label = elementType === 'scripture' ? 'Passage Text' : elementType === 'image' ? 'Image Prompt' : 'Text Content';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = [...elements];
      updated[elementIndex] = draft;
      await base44.entities.PresentationScene.update(scene.id, {
        [`${elementType}_elements`]: JSON.stringify(updated),
        status: 'edited'
      });
      await onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-4 shadow-2xl">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-heading font-semibold text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent" /> Edit {elementType} element
            <span className="text-xs text-muted-foreground">· {scene.slide_title}</span>
          </h4>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Text/Prompt field */}
          <div className="md:col-span-2">
            <Label className="text-xs mb-1">{label}</Label>
            {elementType === 'scripture' ? (
              <div className="space-y-2">
                <Input
                  value={draft.reference || ''}
                  onChange={e => setDraft({ ...draft, reference: e.target.value })}
                  placeholder="e.g., John 3:16"
                  className="text-sm"
                />
                <Textarea
                  value={draft.text || ''}
                  onChange={e => setDraft({ ...draft, text: e.target.value })}
                  rows={2}
                  placeholder="Actual passage text..."
                  className="text-sm"
                />
              </div>
            ) : (
              <Textarea
                value={draft[textField] || ''}
                onChange={e => setDraft({ ...draft, [textField]: e.target.value })}
                rows={2}
                className="text-sm"
              />
            )}
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1">Start (sec)</Label>
              <Input
                type="number"
                step="0.5"
                value={draft.start_time ?? 0}
                onChange={e => setDraft({ ...draft, start_time: parseFloat(e.target.value) })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs mb-1">End (sec)</Label>
              <Input
                type="number"
                step="0.5"
                value={draft.end_time ?? 5}
                onChange={e => setDraft({ ...draft, end_time: parseFloat(e.target.value) })}
                className="text-sm"
              />
            </div>
          </div>

          {/* Animation */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1">Animation In</Label>
              <select
                value={draft.animation_in || 'fade'}
                onChange={e => setDraft({ ...draft, animation_in: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {ANIMATION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs mb-1">Animation Out</Label>
              <select
                value={draft.animation_out || 'fade_out'}
                onChange={e => setDraft({ ...draft, animation_out: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {EXIT_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Position */}
          <div>
            <Label className="text-xs mb-1">Position</Label>
            <select
              value={draft.position || 'center'}
              onChange={e => setDraft({ ...draft, position: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {POSITION_OPTIONS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-xs mb-1">Priority (1-10)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={draft.priority ?? 5}
              onChange={e => setDraft({ ...draft, priority: parseInt(e.target.value) })}
              className="text-sm"
            />
          </div>

          {/* Purpose */}
          <div className="md:col-span-2">
            <Label className="text-xs mb-1">Purpose</Label>
            <Input
              value={draft.purpose || ''}
              onChange={e => setDraft({ ...draft, purpose: e.target.value })}
              placeholder="Why this element is here..."
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function TimelineSceneRow({ scene, section, index, totalDuration, onSelectElement }) {
  const [expanded, setExpanded] = useState(false);
  const textElements = safeParse(scene.text_elements);
  const imageElements = safeParse(scene.image_elements);
  const scriptureElements = safeParse(scene.scripture_elements);
  const sceneDuration = scene.duration_seconds || (scene.voice_end_time - scene.voice_start_time) || 1;
  const leftPct = totalDuration > 0 ? (scene.voice_start_time / totalDuration) * 100 : 0;
  const widthPct = totalDuration > 0 ? (scene.duration_seconds / totalDuration) * 100 : 100;

  const beatColor = BEAT_COLORS[scene.beat_type] || BEAT_COLORS.emphasis_text;

  const allElements = [
    ...textElements.map((e, i) => ({ ...e, _type: 'text', _idx: i })),
    ...scriptureElements.map((e, i) => ({ ...e, _type: 'scripture', _idx: i })),
    ...imageElements.map((e, i) => ({ ...e, _type: 'image', _idx: i })),
  ];

  return (
    <div className={`rounded-lg border transition-all ${expanded ? 'border-primary/40 bg-secondary/30' : 'border-border/50 bg-secondary/10'}`}>
      {/* Scene header */}
      <div className="flex items-center gap-3 px-3 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs font-mono text-muted-foreground w-6">{index + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${beatColor}`}>
          {scene.beat_type?.replace(/_/g, ' ')}
        </span>
        <span className="text-sm font-medium flex-1 truncate">{scene.slide_title}</span>
        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
          <Clock className="w-3 h-3" /> {fmt(scene.voice_start_time)}–{fmt(scene.voice_end_time)}
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {/* Timeline bar */}
      <div className="px-3 pb-2">
        <div className="relative h-6 rounded bg-secondary/40 overflow-hidden">
          {/* Element blocks */}
          {allElements.map((el, i) => {
            const elStart = ((el.start_time || 0) / sceneDuration) * 100;
            const elWidth = Math.max(2, ((el.end_time - el.start_time) / sceneDuration) * 100);
            const color = ELEMENT_COLORS[el._type] || ELEMENT_COLORS.text;
            const icon = el._type === 'text' ? <Type className="w-2.5 h-2.5" /> : el._type === 'scripture' ? <BookOpen className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />;

            return (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); onSelectElement(scene, el._type, el._idx); }}
                className={`absolute top-0.5 bottom-0.5 rounded ${color} hover:ring-2 hover:ring-white/40 cursor-pointer flex items-center justify-center text-white transition-all`}
                style={{ left: `${elStart}%`, width: `${elWidth}%` }}
                title={el.text || el.prompt || el.reference}
              >
                {icon}
              </div>
            );
          })}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {/* Visual theme & transition */}
            <div className="flex flex-wrap gap-2 text-xs">
              {scene.visual_theme && (
                <span className="px-2 py-1 rounded bg-secondary/40 text-muted-foreground">
                  🎨 {scene.visual_theme}
                </span>
              )}
              {scene.transition_plan && (
                <span className="px-2 py-1 rounded bg-secondary/40 text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> {scene.transition_plan}
                </span>
              )}
            </div>

            {/* AI Reasoning */}
            {scene.ai_reasoning && (
              <div className="p-2 rounded bg-accent/5 border border-accent/10">
                <p className="text-xs font-semibold text-accent mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Reasoning
                </p>
                <p className="text-xs text-muted-foreground">{scene.ai_reasoning}</p>
              </div>
            )}

            {/* Background prompt */}
            {scene.background_prompt && (
              <div className="p-2 rounded bg-secondary/30">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Background Prompt</p>
                <p className="text-xs text-foreground/70">{scene.background_prompt}</p>
              </div>
            )}

            {/* Elements list */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visual Elements ({allElements.length})</p>
              {allElements.map((el, i) => (
                <div
                  key={i}
                  onClick={() => onSelectElement(scene, el._type, el._idx)}
                  className="flex items-center gap-2 p-2 rounded bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  {el._type === 'text' && <Type className="w-3 h-3 text-primary shrink-0" />}
                  {el._type === 'scripture' && <BookOpen className="w-3 h-3 text-berna-emerald shrink-0" />}
                  {el._type === 'image' && <ImageIcon className="w-3 h-3 text-accent shrink-0" />}
                  <span className="text-xs truncate flex-1">
                    {el.text || el.reference || el.prompt || '—'}
                    {el._type === 'scripture' && el.text && <span className="text-muted-foreground">: "{el.text.substring(0, 50)}..."</span>}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {el.start_time?.toFixed(1)}s–{el.end_time?.toFixed(1)}s
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/40 shrink-0">
                    {el.animation_in?.replace(/_/g, ' ') || 'fade'}
                  </span>
                </div>
              ))}
              {allElements.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No visual elements in this scene.</p>
              )}
            </div>

            {/* Speaker/Production notes */}
            {(scene.speaker_notes || scene.production_notes) && (
              <div className="grid grid-cols-2 gap-2">
                {scene.speaker_notes && (
                  <div className="p-2 rounded bg-secondary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Speaker Notes</p>
                    <p className="text-xs text-foreground/70">{scene.speaker_notes}</p>
                  </div>
                )}
                {scene.production_notes && (
                  <div className="p-2 rounded bg-secondary/20">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Production Notes</p>
                    <p className="text-xs text-foreground/70">{scene.production_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PresentationTimeline({ scenes, sections, onRefresh }) {
  const [selectedElement, setSelectedElement] = useState(null); // { scene, type, index }

  const totalDuration = scenes.length > 0 ? scenes[scenes.length - 1].voice_end_time : 0;
  const sectionMap = React.useMemo(() => {
    const map = {};
    (sections || []).forEach(s => { map[s.id] = s; });
    return map;
  }, [sections]);

  // Ruler markers
  const rulerMarks = [];
  const interval = totalDuration > 120 ? 30 : totalDuration > 60 ? 15 : 10;
  for (let t = 0; t <= totalDuration; t += interval) {
    rulerMarks.push(t);
  }

  const handleSaveElement = async () => {
    await onRefresh();
  };

  return (
    <div className="glass-panel p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-accent" /> Presentation Timeline
          </h3>
          <p className="text-xs text-muted-foreground">
            {scenes.length} scenes · {fmt(totalDuration)} total · click any element to edit
          </p>
        </div>
      </div>

      {/* Time ruler */}
      <div className="relative h-6 mb-3 border-b border-border/30">
        {rulerMarks.map(t => (
          <div key={t} className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${totalDuration > 0 ? (t / totalDuration) * 100 : 0}%` }}>
            <div className="w-px h-2 bg-border/50" />
            <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{fmt(t)}</span>
          </div>
        ))}
      </div>

      {/* Scene rows */}
      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {scenes.map((scene, idx) => (
          <TimelineSceneRow
            key={scene.id || idx}
            scene={scene}
            section={sectionMap[scene.section_id]}
            index={idx}
            totalDuration={totalDuration}
            onSelectElement={(sc, type, elIdx) => setSelectedElement({ scene: sc, elementType: type, elementIndex: elIdx })}
          />
        ))}
      </div>

      {/* Edit panel */}
      {selectedElement && (
        <ElementEditPanel
          scene={selectedElement.scene}
          elementType={selectedElement.elementType}
          elementIndex={selectedElement.elementIndex}
          onSaved={handleSaveElement}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </div>
  );
}