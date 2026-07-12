/**
 * WMS-002 Animate Mode — Animation Preset Catalog
 * Canonical animation types, easing options, and motion path definitions.
 */

export const ENTRANCE_ANIMATIONS = [
  { type: 'fade_in', label: 'Fade', category: 'entrance' },
  { type: 'slide_in', label: 'Slide', category: 'entrance' },
  { type: 'scale_in', label: 'Scale', category: 'entrance' },
  { type: 'zoom_in', label: 'Zoom', category: 'entrance' },
  { type: 'fly_in', label: 'Fly In', category: 'entrance' },
  { type: 'bounce_in', label: 'Bounce', category: 'entrance' },
  { type: 'flip_in', label: 'Flip', category: 'entrance' },
  { type: 'typewriter', label: 'Typewriter', category: 'entrance' },
  { type: 'blur_in', label: 'Blur In', category: 'entrance' },
  { type: 'rotate_in', label: 'Rotate In', category: 'entrance' },
];

export const EXIT_ANIMATIONS = [
  { type: 'fade_out', label: 'Fade', category: 'exit' },
  { type: 'shrink_out', label: 'Shrink', category: 'exit' },
  { type: 'slide_away', label: 'Slide Away', category: 'exit' },
  { type: 'zoom_out', label: 'Zoom Out', category: 'exit' },
  { type: 'explode', label: 'Explode', category: 'exit' },
  { type: 'flip_out', label: 'Flip Out', category: 'exit' },
  { type: 'blur_out', label: 'Blur Out', category: 'exit' },
  { type: 'rotate_out', label: 'Rotate Out', category: 'exit' },
];

export const EMPHASIS_ANIMATIONS = [
  { type: 'pulse', label: 'Pulse', category: 'emphasis' },
  { type: 'glow', label: 'Glow', category: 'emphasis' },
  { type: 'shake', label: 'Shake', category: 'emphasis' },
  { type: 'spin', label: 'Spin', category: 'emphasis' },
  { type: 'bounce', label: 'Bounce', category: 'emphasis' },
  { type: 'wobble', label: 'Wobble', category: 'emphasis' },
  { type: 'flash', label: 'Flash', category: 'emphasis' },
  { type: 'heartbeat', label: 'Heartbeat', category: 'emphasis' },
  { type: 'float', label: 'Float', category: 'emphasis' },
  { type: 'highlight', label: 'Highlight', category: 'emphasis' },
];

export const ALL_ANIMATIONS = [...ENTRANCE_ANIMATIONS, ...EXIT_ANIMATIONS, ...EMPHASIS_ANIMATIONS];

export const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease_in', label: 'Ease In' },
  { value: 'ease_out', label: 'Ease Out' },
  { value: 'ease_in_out', label: 'Ease In Out' },
  { value: 'hold', label: 'Hold' },
  { value: 'bezier', label: 'Bezier' },
];

export const MOTION_PATH_TYPES = [
  { value: 'line', label: 'Line' },
  { value: 'curve', label: 'Curve' },
  { value: 'circle', label: 'Circle' },
  { value: 'bezier', label: 'Bezier' },
  { value: 'custom', label: 'Custom Drawn' },
];

export const SYNC_OPTIONS = [
  { value: 'after_previous', label: 'After Previous' },
  { value: 'with_previous', label: 'With Previous' },
  { value: 'on_click', label: 'On Click' },
  { value: 'at_time', label: 'At Time' },
  { value: 'follow_marker', label: 'Follow Marker' },
];

export const PLAYBACK_SPEEDS = [
  { value: 0.25, label: '25%' },
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
  { value: 1.5, label: '150%' },
  { value: 2, label: '200%' },
];

export const MARKER_TYPES = [
  { type: 'chapter', label: 'Chapter', color: 'hsl(25 95% 55%)' },
  { type: 'cue', label: 'Cue', color: 'hsl(270 80% 60%)' },
  { type: 'reminder', label: 'Reminder', color: 'hsl(45 95% 55%)' },
  { type: 'trigger', label: 'Animation Trigger', color: 'hsl(152 60% 45%)' },
  { type: 'review', label: 'Review Note', color: 'hsl(0 72% 51%)' },
];

export const KEYFRAME_PROPERTIES = [
  { value: 'position', label: 'Position' },
  { value: 'rotation', label: 'Rotation' },
  { value: 'scale', label: 'Scale' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'blur', label: 'Blur' },
  { value: 'color', label: 'Color' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'crop', label: 'Crop' },
  { value: 'mask', label: 'Mask' },
  { value: 'volume', label: 'Volume' },
];

export const TRACK_FILTERS = [
  { value: 'all', label: 'All Tracks' },
  { value: 'slide', label: 'Slide' },
  { value: 'text', label: 'Text' },
  { value: 'visual', label: 'Visual' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
];

/**
 * Parse an element's animation JSON into a normalized array of animation clips.
 */
export function parseAnimations(animStr) {
  if (!animStr) return [];
  let anim;
  try { anim = JSON.parse(animStr); } catch { return []; }
  if (Array.isArray(anim)) {
    return anim.filter(a => a.type && a.type !== 'none').map(a => {
      let category = a.category;
      if (!category) {
        if (a.type.includes('exit') || a.type.includes('out')) category = 'exit';
        else if (a.type.includes('pulse') || a.type.includes('bounce') || a.type.includes('shake')) category = 'emphasis';
        else category = 'entrance';
      }
      return { type: a.type, category, start: a.start_ms ?? a.delay_ms ?? 0, duration: a.duration_ms || 500, easing: a.easing || 'ease_in_out' };
    });
  }
  if (anim.entrance || anim.emphasis || anim.exit) {
    const result = [];
    if (anim.entrance) result.push({ type: anim.entrance.type || 'fade_in', category: 'entrance', start: anim.entrance.start_ms ?? anim.entrance.delay_ms ?? 0, duration: anim.entrance.duration_ms || 500, easing: anim.entrance.easing || 'ease_in_out' });
    if (anim.emphasis) result.push({ type: anim.emphasis.type || 'pulse', category: 'emphasis', start: anim.emphasis.start_ms ?? anim.emphasis.delay_ms ?? 0, duration: anim.emphasis.duration_ms || 500, easing: anim.emphasis.easing || 'ease_in_out' });
    if (anim.exit) result.push({ type: anim.exit.type || 'fade_out', category: 'exit', start: anim.exit.start_ms ?? anim.exit.delay_ms ?? 0, duration: anim.exit.duration_ms || 500, easing: anim.exit.easing || 'ease_in_out' });
    return result;
  }
  if (anim.type && anim.type !== 'none') {
    const start = anim.delay_ms || 0;
    const dur = anim.duration_ms || 500;
    let category = 'entrance';
    if (anim.type.includes('out') || anim.type.includes('exit')) category = 'exit';
    else if (anim.type.includes('pulse') || anim.type.includes('bounce') || anim.type.includes('shake')) category = 'emphasis';
    return [{ type: anim.type, category, start, duration: dur, easing: anim.easing || 'ease_in_out' }];
  }
  return [];
}

/**
 * Apply an animation preset to an element, preserving other-category animations.
 */
export function applyAnimationPreset(element, preset, timing) {
  const existing = parseAnimations(element.animation);
  const filtered = existing.filter(a => a.category !== preset.category);
  filtered.push({
    type: preset.type,
    category: preset.category,
    start: timing?.start ?? 0,
    duration: timing?.duration ?? 500,
    easing: timing?.easing || 'ease_in_out',
  });
  return JSON.stringify(filtered);
}