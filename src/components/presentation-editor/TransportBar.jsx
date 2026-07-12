import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import TimelineTrackList from './TimelineTrackList';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function parseTiming(str) {
  try { return JSON.parse(str || '{}') ?? {}; } catch { return {}; }
}

const SNAP_MS = 100;
const MIN_DURATION = 200;
const LANE_MIN_WIDTH = 600;

function snap(ms, sentencePoints) {
  let snapped = Math.round(ms / SNAP_MS) * SNAP_MS;
  if (sentencePoints && sentencePoints.length > 0) {
    for (const sp of sentencePoints) {
      if (Math.abs(snapped - sp) < 150) { snapped = sp; break; }
    }
  }
  return snapped;
}

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
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const [activeDrag, setActiveDrag] = useState(null);
  const [laneWidth, setLaneWidth] = useState(LANE_MIN_WIDTH);

  // Voiceover + sentence data
  const slideTimeline = parseTiming(slide?.slide_timeline);
  const voiceDuration = slideTimeline.duration_ms || slide?.duration_ms || duration;
  const rawSentences = slideTimeline.sentence_timeline;
  const sentenceTimeline = Array.isArray(rawSentences)
    ? rawSentences
    : (typeof rawSentences === 'string' ? parseTiming(rawSentences) : []);
  const sentencePoints = Array.isArray(sentenceTimeline)
    ? sentenceTimeline.map(s => s.start_time || 0)
    : [];

  // Measure available width for the lane area
  useEffect(() => {
    if (!scrollRef.current) return;
    const measure = () => {
      const containerW = scrollRef.current.clientWidth;
      const usable = containerW - 200; // header width
      setLaneWidth(Math.max(LANE_MIN_WIDTH, usable));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Playhead scrub (click + drag ruler) ──
  const handleRulerDown = useCallback((e) => {
    if (!laneRef.current) return;
    e.preventDefault();
    const rect = laneRef.current.getBoundingClientRect();
    const scrub = (clientX) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onScrub(ratio * totalTime);
    };
    scrub(e.clientX);
    const onMove = (ev) => scrub(ev.clientX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onScrub, totalTime]);

  // ── Clip drag start ──
  const startClipDrag = useCallback((e, element, clip, mode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!laneRef.current) return;
    const rect = laneRef.current.getBoundingClientRect();
    onUpdateElement?.(element.id, {}, {});
    dragRef.current = {
      mode, elId: element.id,
      origStart: clip.start, origEnd: clip.end,
      startX: e.clientX, laneW: rect.width, duration,
      clipType: clip.clipType || 'timing',
      origAnim: parseTiming(element.animation),
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
        newStart = snap(Math.max(0, d.origStart + dxMs), sentencePoints);
        newEnd = newStart + clipDur;
        if (newEnd > d.duration) { newEnd = d.duration; newStart = newEnd - clipDur; }
      } else if (d.mode === 'resize-l') {
        newStart = snap(Math.max(0, Math.min(d.origEnd - MIN_DURATION, d.origStart + dxMs)), sentencePoints);
        newEnd = d.origEnd;
      } else if (d.mode === 'resize-r') {
        newEnd = snap(Math.min(d.duration, Math.max(d.origStart + MIN_DURATION, d.origEnd + dxMs)), sentencePoints);
        newStart = d.origStart;
      }

      if (d.clipType === 'animation') {
        const delay = newStart;
        const animDur = newEnd - newStart;
        const anim = d.origAnim;
        onUpdateElement?.(d.elId, {
          animation: JSON.stringify({
            ...anim,
            type: anim.type || 'fade_in',
            delay_ms: delay,
            duration_ms: animDur,
          }),
        }, { silent: true });
      } else {
        onUpdateElement?.(d.elId, {
          timing: JSON.stringify({ start_ms: newStart, end_ms: newEnd }),
        }, { silent: true });
      }
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
  }, [onUpdateElement, sentencePoints]);

  return (
    <div className="cpe-transport">
      {/* ── Stacked Track Timeline ── */}
      <div className="cpe-timeline-section px-3 py-1.5">
        <TimelineTrackList
          elements={elements}
          slide={slide}
          duration={duration}
          selectedId={selectedId}
          onSelectElement={onSelectElement}
          onUpdateElement={onUpdateElement}
          startClipDrag={startClipDrag}
          activeDrag={activeDrag}
          sentencePoints={sentencePoints}
          laneWidth={laneWidth}
          laneRef={laneRef}
          onRulerDown={handleRulerDown}
          currentTime={currentTime}
          scrollRef={scrollRef}
        />
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