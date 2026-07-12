import React, { useState, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, LogIn, LogOut, Sparkles,
  Clock, Gauge, Spline, Eye, Wand2, Route, Diamond,
  Plus, Trash2, Copy,
} from 'lucide-react';
import {
  ENTRANCE_ANIMATIONS, EXIT_ANIMATIONS, EMPHASIS_ANIMATIONS,
  EASING_OPTIONS, MOTION_PATH_TYPES, SYNC_OPTIONS,
  KEYFRAME_PROPERTIES, parseAnimations, applyAnimationPreset,
} from '@/lib/animationPresets';

function parseJSON(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cpe-anim-section">
      <button className="cpe-anim-section-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Icon className="w-3.5 h-3.5" />
        <span>{title}</span>
      </button>
      {open && <div className="cpe-anim-section-body">{children}</div>}
    </div>
  );
}

function PresetGrid({ presets, currentType, onSelect }) {
  return (
    <div className="cpe-anim-preset-grid">
      {presets.map(p => (
        <button
          key={p.type}
          className={`cpe-anim-preset-btn ${currentType === p.type ? 'active' : ''}`}
          onClick={() => onSelect(p)}
          title={p.label}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function AnimationInspector({
  element,
  slideDuration,
  onUpdate,
  onDuplicate,
  onDelete,
}) {
  const animations = parseAnimations(element?.animation || '');
  const style = parseJSON(element?.style, {});
  const timing = parseJSON(element?.timing, {});

  const entrance = animations.find(a => a.category === 'entrance');
  const emphasis = animations.find(a => a.category === 'emphasis');
  const exit = animations.find(a => a.category === 'exit');

  const applyPreset = useCallback((preset) => {
    if (!element) return;
    const existing = parseAnimations(element.animation);
    const start = existing.find(a => a.category === preset.category)?.start ?? 0;
    const dur = existing.find(a => a.category === preset.category)?.duration ?? 500;
    const newAnim = applyAnimationPreset(element, preset, { start, duration: dur });
    onUpdate(element.id, { animation: newAnim });
  }, [element, onUpdate]);

  const updateAnimTiming = useCallback((category, field, value) => {
    if (!element) return;
    const existing = parseAnimations(element.animation);
    const updated = existing.map(a =>
      a.category === category ? { ...a, [field]: value } : a
    );
    onUpdate(element.id, { animation: JSON.stringify(updated) });
  }, [element, onUpdate]);

  const updateAnimEasing = useCallback((category, easing) => {
    updateAnimTiming(category, 'easing', easing);
  }, [updateAnimTiming]);

  const updateStyle = useCallback((field, value) => {
    if (!element) return;
    const newStyle = { ...style, [field]: value };
    onUpdate(element.id, { style: JSON.stringify(newStyle) });
  }, [element, style, onUpdate]);

  const updateTiming = useCallback((field, value) => {
    if (!element) return;
    const newTiming = { ...timing, [field]: value };
    onUpdate(element.id, { timing: JSON.stringify(newTiming) });
  }, [element, timing, onUpdate]);

  if (!element) {
    return (
      <div className="cpe-anim-inspector-empty">
        <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs text-center text-muted-foreground">
          Select an element to edit its animations
        </p>
      </div>
    );
  }

  return (
    <div className="cpe-anim-inspector">
      {/* Element header */}
      <div className="cpe-anim-element-header">
        <span className="cpe-anim-element-type">{element.type}</span>
        <div className="flex items-center gap-1">
          <button className="cpe-anim-header-btn" onClick={() => onDuplicate?.(element.id)} title="Duplicate">
            <Copy className="w-3 h-3" />
          </button>
          <button className="cpe-anim-header-btn danger" onClick={() => onDelete?.(element.id)} title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Animation Presets */}
      <Section title="Animation Presets" icon={Wand2}>
        <div className="cpe-anim-preset-section">
          <div className="cpe-anim-preset-label">
            <LogIn className="w-3 h-3" /> Entrance
          </div>
          <PresetGrid
            presets={ENTRANCE_ANIMATIONS}
            currentType={entrance?.type}
            onSelect={applyPreset}
          />
        </div>
        <div className="cpe-anim-preset-section">
          <div className="cpe-anim-preset-label">
            <Sparkles className="w-3 h-3" /> Emphasis
          </div>
          <PresetGrid
            presets={EMPHASIS_ANIMATIONS}
            currentType={emphasis?.type}
            onSelect={applyPreset}
          />
        </div>
        <div className="cpe-anim-preset-section">
          <div className="cpe-anim-preset-label">
            <LogOut className="w-3 h-3" /> Exit
          </div>
          <PresetGrid
            presets={EXIT_ANIMATIONS}
            currentType={exit?.type}
            onSelect={applyPreset}
          />
        </div>
      </Section>

      {/* Timing */}
      <Section title="Timing" icon={Clock}>
        {animations.length === 0 && (
          <p className="cpe-anim-hint">Apply an animation preset to configure timing.</p>
        )}
        {animations.map((anim, i) => (
          <div key={i} className="cpe-anim-timing-row">
            <span className="cpe-anim-timing-label">
              {anim.category === 'entrance' ? 'In' : anim.category === 'exit' ? 'Out' : 'Emph'}: {anim.type}
            </span>
            <div className="cpe-anim-field-row">
              <label className="cpe-anim-field-label">Start (ms)</label>
              <input
                type="number"
                className="cpe-anim-input"
                value={anim.start}
                onChange={(e) => updateAnimTiming(anim.category, 'start', parseInt(e.target.value) || 0)}
                min={0}
                max={slideDuration}
              />
            </div>
            <div className="cpe-anim-field-row">
              <label className="cpe-anim-field-label">Duration (ms)</label>
              <input
                type="number"
                className="cpe-anim-input"
                value={anim.duration}
                onChange={(e) => updateAnimTiming(anim.category, 'duration', parseInt(e.target.value) || 500)}
                min={100}
              />
            </div>
          </div>
        ))}
        {/* Element timing */}
        <div className="cpe-anim-timing-row">
          <span className="cpe-anim-timing-label">Element Duration</span>
          <div className="cpe-anim-field-row">
            <label className="cpe-anim-field-label">Start (ms)</label>
            <input
              type="number"
              className="cpe-anim-input"
              value={timing.start_ms ?? 0}
              onChange={(e) => updateTiming('start_ms', parseInt(e.target.value) || 0)}
              min={0}
              max={slideDuration}
            />
          </div>
          <div className="cpe-anim-field-row">
            <label className="cpe-anim-field-label">End (ms)</label>
            <input
              type="number"
              className="cpe-anim-input"
              value={timing.end_ms ?? slideDuration}
              onChange={(e) => updateTiming('end_ms', parseInt(e.target.value) || slideDuration)}
              min={0}
            />
          </div>
        </div>
      </Section>

      {/* Easing */}
      <Section title="Easing" icon={Gauge}>
        {animations.map((anim, i) => (
          <div key={i} className="cpe-anim-easing-row">
            <span className="cpe-anim-timing-label">{anim.type}</span>
            <select
              className="cpe-anim-select"
              value={anim.easing || 'ease_in_out'}
              onChange={(e) => updateAnimEasing(anim.category, e.target.value)}
            >
              {EASING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
        {animations.length === 0 && (
          <p className="cpe-anim-hint">No animations to ease.</p>
        )}
      </Section>

      {/* Transform */}
      <Section title="Transform" icon={Spline} defaultOpen={false}>
        <div className="cpe-anim-field-row">
          <label className="cpe-anim-field-label">Rotation (deg)</label>
          <input
            type="number"
            className="cpe-anim-input"
            value={style.rotation || 0}
            onChange={(e) => updateStyle('rotation', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="cpe-anim-field-row">
          <label className="cpe-anim-field-label">Scale</label>
          <input
            type="number"
            className="cpe-anim-input"
            value={style.scale || 1}
            step={0.1}
            onChange={(e) => updateStyle('scale', parseFloat(e.target.value) || 1)}
          />
        </div>
      </Section>

      {/* Opacity */}
      <Section title="Opacity" icon={Eye} defaultOpen={false}>
        <div className="cpe-anim-field-row">
          <label className="cpe-anim-field-label">Opacity</label>
          <input
            type="range"
            className="cpe-anim-slider"
            min={0}
            max={1}
            step={0.05}
            value={style.opacity ?? 1}
            onChange={(e) => updateStyle('opacity', parseFloat(e.target.value))}
          />
          <span className="cpe-anim-slider-value">{Math.round((style.opacity ?? 1) * 100)}%</span>
        </div>
      </Section>

      {/* Motion Path */}
      <Section title="Motion Path" icon={Route} defaultOpen={false}>
        <div className="cpe-anim-field-row">
          <label className="cpe-anim-field-label">Path Type</label>
          <select
            className="cpe-anim-select"
            value={style.motion_path || 'none'}
            onChange={(e) => updateStyle('motion_path', e.target.value)}
          >
            <option value="none">None</option>
            {MOTION_PATH_TYPES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        {style.motion_path && style.motion_path !== 'none' && (
          <div className="cpe-anim-hint">
            Motion path handles appear on the canvas when this element is selected.
          </div>
        )}
      </Section>

      {/* Keyframes */}
      <Section title="Keyframes" icon={Diamond} defaultOpen={false}>
        <div className="cpe-anim-keyframe-add">
          <select className="cpe-anim-select" defaultValue="">
            <option value="">Add keyframe for...</option>
            {KEYFRAME_PROPERTIES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button className="cpe-anim-add-btn" title="Add Keyframe">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <p className="cpe-anim-hint">
          Keyframes can be added, moved, and deleted directly on the timeline tracks.
        </p>
      </Section>

      {/* Sync Options */}
      <Section title="Synchronization" icon={Clock} defaultOpen={false}>
        <div className="cpe-anim-field-row">
          <label className="cpe-anim-field-label">Start Mode</label>
          <select
            className="cpe-anim-select"
            value={style.sync_mode || 'after_previous'}
            onChange={(e) => updateStyle('sync_mode', e.target.value)}
          >
            {SYNC_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </Section>
    </div>
  );
}