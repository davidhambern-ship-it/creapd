import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

const TRACKS = [
  { key: 'slide', label: 'Slide', cls: 'cpe-track-clip-slide' },
  { key: 'text', label: 'Text', cls: 'cpe-track-clip-text' },
  { key: 'image', label: 'Image', cls: 'cpe-track-clip-image' },
  { key: 'video', label: 'Video', cls: 'cpe-track-clip-video' },
  { key: 'transition', label: 'Trans', cls: 'cpe-track-clip-transition' },
];

export default function TransportBar({
  isPlaying, currentTime, totalTime, scope,
  onPlay, onPause, onStop, onRestart, onPrev, onNext, onScrub, onScopeChange,
  slide, elements,
}) {
  const timing = (() => { try { return JSON.parse(slide?.timing || '{}'); } catch { return {}; } })();
  const duration = timing.duration_ms || slide?.duration_ms || 5000;
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  const tracks = TRACKS.map(t => {
    const items = [];
    if (t.key === 'slide') items.push({ start: 0, end: duration, label: slide?.title || 'Slide' });
    if (t.key === 'transition') items.push({ start: 0, end: timing.transition_duration || 500, label: slide?.transition || 'fade' });
    if (t.key === 'text') (elements || []).filter(el => ['text', 'lower_third', 'caption'].includes(el.type)).forEach(el => {
      const et = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
      items.push({ start: et.start_ms || 0, end: et.end_ms || duration, label: (el.content || el.type).slice(0, 20) });
    });
    if (t.key === 'image') (elements || []).filter(el => el.type === 'image').forEach(el => {
      const et = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
      items.push({ start: et.start_ms || 0, end: et.end_ms || duration, label: 'Image' });
    });
    if (t.key === 'video') (elements || []).filter(el => el.type === 'video').forEach(el => {
      const et = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
      items.push({ start: et.start_ms || 0, end: et.end_ms || duration, label: 'Video' });
    });
    return { ...t, items };
  }).filter(t => t.items.length > 0);

  return (
    <div className="cpe-transport">
      {/* Timeline */}
      <div className="cpe-timeline-section px-3 py-1.5">
        <div className="flex items-center justify-between mb-1">
          <span className="cpe-timeline-label">Timeline</span>
          <span className="cpe-time-display">{tracks.length} tracks</span>
        </div>
        <div className="space-y-0.5 max-h-24 overflow-y-auto">
          {tracks.length === 0 && <p className="cpe-empty-text text-center py-2">No timeline data</p>}
          {tracks.map(track => (
            <div key={track.key} className="cpe-track-row">
              <span className="cpe-track-name">{track.label}</span>
              <div className="cpe-track-lane">
                {track.items.map((item, i) => {
                  const left = (item.start / duration) * 100;
                  const width = ((item.end - item.start) / duration) * 100;
                  return (
                    <div key={i}
                      className={`cpe-track-clip ${track.cls}`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                      title={item.label}>{item.label}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transport Controls */}
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