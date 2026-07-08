import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

const TRACKS = [
  { key: 'slide', label: 'Slide', color: 'bg-primary' },
  { key: 'text', label: 'Text', color: 'bg-blue-500' },
  { key: 'image', label: 'Image', color: 'bg-emerald-500' },
  { key: 'video', label: 'Video', color: 'bg-orange-500' },
  { key: 'transition', label: 'Transition', color: 'bg-red-500' },
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
    <div className="bg-card border-t border-border">
      {/* Timeline */}
      <div className="px-3 py-1.5 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">Timeline</span>
          <span className="text-[10px] text-muted-foreground">{tracks.length} tracks</span>
        </div>
        <div className="space-y-0.5 max-h-24 overflow-y-auto">
          {tracks.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No timeline data</p>}
          {tracks.map(track => (
            <div key={track.key} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-14 flex-shrink-0 truncate">{track.label}</span>
              <div className="flex-1 relative h-4 bg-muted/30 rounded">
                {track.items.map((item, i) => {
                  const left = (item.start / duration) * 100;
                  const width = ((item.end - item.start) / duration) * 100;
                  return (
                    <div key={i}
                      className={`absolute top-0.5 bottom-0.5 ${track.color} rounded text-[7px] text-white px-1 flex items-center overflow-hidden whitespace-nowrap`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                      title={item.label}>{item.label}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onPrev} title="Previous"><SkipBack className="w-4 h-4" /></Button>
          {isPlaying ? (
            <Button variant="ghost" size="icon" className="w-9 h-9" onClick={onPause} title="Pause"><Pause className="w-5 h-5" /></Button>
          ) : (
            <Button variant="ghost" size="icon" className="w-9 h-9" onClick={onPlay} title="Play"><Play className="w-5 h-5" /></Button>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onStop} title="Stop"><Square className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onRestart} title="Restart"><RotateCcw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onNext} title="Next"><SkipForward className="w-4 h-4" /></Button>
        </div>

        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{fmt(currentTime)}</span>
        <div className="flex-1 relative h-5 flex items-center">
          <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full" />
          <div className="absolute h-1.5 bg-primary rounded-full" style={{ width: `${progress}%` }} />
          <input type="range" min={0} max={totalTime || 1} value={currentTime}
            onChange={(e) => onScrub(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" />
          <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-full shadow"
            style={{ left: `calc(${progress}% - 6px)` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-10">{fmt(totalTime)}</span>

        <select value={scope} onChange={(e) => onScopeChange(e.target.value)}
          className="text-xs bg-background border border-border rounded px-2 py-1">
          <option value="slide">This Slide</option>
          <option value="full">Full Presentation</option>
        </select>
      </div>
    </div>
  );
}