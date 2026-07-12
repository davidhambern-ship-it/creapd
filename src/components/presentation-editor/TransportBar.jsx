import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function parseTiming(str) {
  try { return JSON.parse(str || '{}') ?? {}; } catch { return {}; }
}

const SNAP_MS = 100;
const MIN_DURATION = 200;
const HANDLE_PX = 7;

function snap(ms) { return Math.round(ms / SNAP_MS) * SNAP_MS; }

const TRACK_DEFS = [
  { key: 'slide', label: 'Slide', cls: 'cpe-clip-slide', editable: false },
  { key: 'transition', label: 'Trans', cls: 'cpe-clip-transition', editable: false },
  { key: 'audio', label: 'Audio', cls: 'cpe-clip-audio', editable: false, special: 'voiceover' },
  { key: 'video', label: 'Video', cls: 'cpe-clip-video', editable: true, types: ['video'] },
  { key: 'image', label: 'Image', cls: 'cpe-clip-image', editable: true, types: ['image'] },
  { key: 'text', label: 'Text', cls: 'cpe-clip-text', editable: true, types: ['text', 'lower_third', 'caption'] },
  { key: 'animation', label: 'Anim', cls: 'cpe-clip-anim', editable: false, special: 'animations' },
  { key: 'effects', label: 'FX', cls: 'cpe-clip-fx', editable: false, special: 'effects' },
];

export default function TransportBar({
  isPlaying, currentTime, totalTime, scope,
  onPlay, onPause, onStop, onRestart, onPrev, onNext, onScrub, onScopeChange,
  slide, elements,
  onUpdateElement, onSelectElement, selectedId,
}) {
  const slideTiming = parseTiming(slide?.timing);
  const duration = slideTiming.duration_ms || slide?.duration_ms || 5000;
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  const laneRef = useRef(null);
  const dragRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null);

  // Voiceover audio from slide_timeline
  const slideTimeline = parseTiming(slide?.slide_timeline);
  const voiceAudioUrl = slideTimeline.voice_audio_url || slideTimeline.audio_url || null;
  const voiceDuration = slideTimeline.duration_ms || slide?.duration_ms || duration;
  // Sentence timeline from voice package (passed via slideTiming)
  const sentenceTimeline = parseTiming(slideTiming.sentence_timeline);

  // Build tracks with clip data
  const tracks = TRACK_DEFS.map(t => {
    const items = [];
    if (t.key === 'slide') {
      items.push({ start: 0, end: duration, label: slide?.title?.slice(0, 24) || 'Slide', editable: false });
    }
    if (t.key === 'transition') {
      const td = slideTiming.transition_duration || 500;
      items.push({ start: 0, end: td, label: slide?.transition || 'fade', editable: false });
    }
    if (t.special === 'voiceover') {
      // Voiceover master audio clip
      if (voiceAudioUrl) {
        items.push({ start: 0, end: voiceDuration, label: 'Voiceover', editable: false });
      }
      // Audio elements (sound effects, music)
      (elements || []).filter(el => el.type === 'audio' && el.content).forEach(el => {
        const et = parseTiming(el.timing);
        const start = et.start_ms ?? 0;
        const end = et.end_ms || duration;
        items.push({ start, end, label: (el.content || 'Audio').slice(0, 20), editable: true, element: el });
      });
      // Sentence markers from voice package for text-audio sync reference
      if (Array.isArray(sentenceTimeline) && sentenceTimeline.length > 0) {
        sentenceTimeline.slice(0, 30).forEach((s, i) => {
          items.push({
            start: s.start_time || 0,
            end: s.end_time || (s.start_time || 0) + 500,
            label: `S${i + 1}`,
            editable: false,
          });
        });
      }
    }
    if (t.special === 'animations') {
      // Show element entrance animations with delay/duration
      (elements || []).forEach(el => {
        const anim = parseTiming(el.animation);
        if (anim.type && anim.type !== 'none') {
          const delay = anim.delay_ms || 0;
          const dur = anim.duration_ms || 500;
          items.push({
            start: delay, end: delay + dur,
            label: anim.type, editable: false,
          });
        }
        // Also show element timing-based animations
        const et = parseTiming(el.timing);
        if (et.start_ms != null && et.start_ms > 0) {
          items.push({
            start: et.start_ms, end: (et.end_ms || et.start_ms + 500),
            label: `${el.type}`, editable: false,
          });
        }
      });
    }
    if (t.special === 'effects') {
      // Show elements with special visual effects (lower_thirds, shapes, captions)
      (elements || []).forEach(el => {
        const style = parseTiming(el.style);
        if (style.backgroundColor && style.backgroundColor !== 'transparent') {
          const et = parseTiming(el.timing);
          const start = et.start_ms ?? 0;
          const end = et.end_ms || duration;
          items.push({ start, end, label: el.type, editable: false });
        }
        if (el.type === 'lower_third' || el.type === 'caption' || el.type === 'shape') {
          const et = parseTiming(el.timing);
          const start = et.start_ms ?? 0;
          const end = et.end_ms || duration;
          items.push({ start, end, label: el.type, editable: false });
        }
      });
    }
    if (t.editable) {
      (elements || []).filter(el => t.types.includes(el.type)).forEach(el => {
        const et = parseTiming(el.timing);
        const start = et.start_ms ?? 0;
        const end = et.end_ms || duration;
        items.push({
          start, end,
          label: (el.content || el.type).slice(0, 20),
          editable: true,
          element: el,
        });
      });
    }
    return { ...t, items };
  }).filter(t => t.items.length > 0);

  // ── Playhead scrub (click ruler) ──
  const handleRulerClick = useCallback((e) => {
    if (!laneRef.current) return;
    const rect = laneRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onScrub(ratio * totalTime);
  }, [onScrub, totalTime]);

  // ── Clip drag start ──
  const startClipDrag = useCallback((e, element, clip, mode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!laneRef.current) return;
    const rect = laneRef.current.getBoundingClientRect();
    // Push undo once at drag start (non-silent call snapshots pre-drag state)
    onUpdateElement?.(element.id, {}, {});
    dragRef.current = {
      mode, elId: element.id,
      origStart: clip.start, origEnd: clip.end,
      startX: e.clientX, laneW: rect.width, duration,
    };
    setActiveDrag({ id: element.id, mode });
    onSelectElement?.(element.id);
  }, [onUpdateElement, onSelectElement, duration]);

  // ── Global mouse listeners during drag ──
  useEffect(() => {
    if (!dragRef.current) return;

    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dxPx = e.clientX - d.startX;
      const dxMs = (dxPx / d.laneW) * d.duration;
      let newStart = d.origStart;
      let newEnd = d.origEnd;

      if (d.mode === 'move') {
        const clipDur = d.origEnd - d.origStart;
        newStart = snap(Math.max(0, d.origStart + dxMs));
        newEnd = newStart + clipDur;
        if (newEnd > d.duration) { newEnd = d.duration; newStart = newEnd - clipDur; }
      } else if (d.mode === 'resize-l') {
        newStart = snap(Math.max(0, Math.min(d.origEnd - MIN_DURATION, d.origStart + dxMs)));
        newEnd = d.origEnd;
      } else if (d.mode === 'resize-r') {
        newEnd = snap(Math.min(d.duration, Math.max(d.origStart + MIN_DURATION, d.origEnd + dxMs)));
        newStart = d.origStart;
      }

      onUpdateElement?.(d.elId, {
        timing: JSON.stringify({ start_ms: newStart, end_ms: newEnd }),
      }, { silent: true });
    };

    const onUp = () => {
      dragRef.current = null;
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onUpdateElement]);

  // Ruler tick marks
  const tickCount = Math.min(Math.ceil(duration / 1000), 12);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * (duration / tickCount));

  return (
    <div className="cpe-transport">
      {/* ── Timeline ── */}
      <div className="cpe-timeline-section px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="cpe-timeline-label">Timeline</span>
          <span className="cpe-time-display">{tracks.length} tracks · {fmt(duration)}</span>
        </div>

        {/* Ruler */}
        <div className="cpe-ruler-row">
          <span className="cpe-track-name" />
          <div className="cpe-ruler" ref={laneRef} onMouseDown={handleRulerClick}>
            {ticks.map((t, i) => (
              <div key={i} className="cpe-ruler-tick" style={{ left: `${(t / duration) * 100}%` }}>
                <span className="cpe-ruler-label">{fmt(t)}</span>
              </div>
            ))}
            {/* Playhead */}
            <div className="cpe-playhead" style={{ left: `${progress}%` }}>
              <div className="cpe-playhead-handle" />
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div className="space-y-0.5 mt-0.5 max-h-28 overflow-y-auto">
          {tracks.length === 0 && <p className="cpe-empty-text text-center py-2">No timeline data</p>}
          {tracks.map(track => (
            <div key={track.key} className="cpe-track-row">
              <span className="cpe-track-name">{track.label}</span>
              <div className="cpe-track-lane">
                {track.items.map((item, i) => {
                  const left = (item.start / duration) * 100;
                  const width = Math.max(((item.end - item.start) / duration) * 100, 1.5);
                  const isSelected = item.element && selectedId === item.element.id;
                  const isDragging = activeDrag?.id === item.element?.id;

                  return (
                    <div
                      key={i}
                      className={`cpe-track-clip ${track.cls} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${item.editable ? 'editable' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      onMouseDown={item.editable ? (e) => startClipDrag(e, item.element, item, 'move') : undefined}
                      title={item.label}
                    >
                      {item.editable && (
                        <>
                          <div className="cpe-clip-handle cpe-clip-handle-l"
                            onMouseDown={(e) => startClipDrag(e, item.element, item, 'resize-l')} />
                          <div className="cpe-clip-handle cpe-clip-handle-r"
                            onMouseDown={(e) => startClipDrag(e, item.element, item, 'resize-r')} />
                        </>
                      )}
                      <span className="cpe-clip-label">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transport Controls ── */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-0.5">
          <button className="cpe-icon-btn" onClick={onPrev} title="Previous"><SkipBack className="w-4 h-4" /></button>
          {isPlaying ? (
            <button className="cpe-play-btn" onClick={onPause} title="Pause"><Pause className="w-5 h-5" /></button>
          ) : (
            <button className="cpe-play-btn" onClick={onPlay} title="Play"><Play className="w-5 h-5" /></button>
          )}
          <button className="cpe-icon-btn" onClick={onStop} title="Stop"><Square className="w-4 h-4" /></button>
          <button className="cpe-icon-btn" onClick={onRestart} title="Restart"><RotateCcw className="w-4 h-4" /></button>
          <button className="cpe-icon-btn" onClick={onNext} title="Next"><SkipForward className="w-4 h-4" /></button>
        </div>

        <span className="cpe-time-display w-10 text-right">{fmt(currentTime)}</span>
        <div className="cpe-scrub-bar flex-1">
          <div className="cpe-scrub-track" />
          <div className="cpe-scrub-fill" style={{ width: `${progress}%` }} />
          <input type="range" min={0} max={totalTime || 1} value={currentTime}
            onChange={(e) => onScrub(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          <div className="cpe-scrub-handle" style={{ left: `calc(${progress}% - 6px)` }} />
        </div>
        <span className="cpe-time-display w-10">{fmt(totalTime)}</span>

        <select value={scope} onChange={(e) => onScopeChange(e.target.value)} className="cpe-scope-select">
          <option value="slide">This Slide</option>
          <option value="full">Full Presentation</option>
        </select>
      </div>
    </div>
  );
}