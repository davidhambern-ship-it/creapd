import React from 'react';

const TRACK_CONFIGS = [
  { key: 'slide', label: 'Slide', color: 'bg-primary' },
  { key: 'text', label: 'Text', color: 'bg-blue-500' },
  { key: 'image', label: 'Image', color: 'bg-emerald-500' },
  { key: 'video', label: 'Video', color: 'bg-orange-500' },
  { key: 'voice', label: 'Voiceover', color: 'bg-purple-500' },
  { key: 'audio', label: 'Audio', color: 'bg-pink-500' },
  { key: 'caption', label: 'Captions', color: 'bg-yellow-500' },
  { key: 'transition', label: 'Transition', color: 'bg-red-500' },
];

export default function SlideTimeline({ slide, elements, currentTime, onScrub }) {
  const timing = (() => { try { return JSON.parse(slide?.timing || '{}'); } catch { return {}; } })();
  const duration = timing.duration_ms || slide?.duration_ms || 5000;

  const tracks = TRACK_CONFIGS.map(config => {
    const items = [];
    if (config.key === 'slide') {
      items.push({ start: 0, end: duration, label: slide?.title || 'Slide' });
    }
    if (config.key === 'transition') {
      const transitionDur = timing.transition_duration || 500;
      items.push({ start: 0, end: transitionDur, label: slide?.transition || 'fade' });
    }
    if (config.key === 'text') {
      (elements || []).filter(el => ['text', 'lower_third', 'caption'].includes(el.type)).forEach(el => {
        const elTiming = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
        items.push({
          start: elTiming.start_ms || 0,
          end: elTiming.end_ms || duration,
          label: (el.content || el.type).slice(0, 20),
        });
      });
    }
    if (config.key === 'image') {
      (elements || []).filter(el => el.type === 'image').forEach(el => {
        const elTiming = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
        items.push({ start: elTiming.start_ms || 0, end: elTiming.end_ms || duration, label: 'Image' });
      });
    }
    if (config.key === 'video') {
      (elements || []).filter(el => el.type === 'video').forEach(el => {
        const elTiming = (() => { try { return JSON.parse(el.timing || '{}'); } catch { return {}; } })();
        items.push({ start: elTiming.start_ms || 0, end: elTiming.end_ms || duration, label: 'Video' });
      });
    }
    return { ...config, items };
  }).filter(t => t.items.length > 0);

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-card border-t border-border">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">Timeline</span>
        <span className="text-xs text-muted-foreground">{tracks.length} tracks</span>
      </div>
      <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
        {tracks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No timeline data</p>
        )}
        {tracks.map(track => (
          <div key={track.key} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0 truncate">{track.label}</span>
            <div className="flex-1 relative h-5 bg-muted/30 rounded">
              {track.items.map((item, i) => {
                const left = (item.start / duration) * 100;
                const width = ((item.end - item.start) / duration) * 100;
                return (
                  <div key={i}
                    className={`absolute top-0.5 bottom-0.5 ${track.color} rounded text-[8px] text-white px-1 flex items-center overflow-hidden whitespace-nowrap`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                    title={item.label}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Playhead */}
        <div className="relative h-0">
          <div className="absolute top-[-92px] bottom-0 w-0.5 bg-primary pointer-events-none"
            style={{ left: `calc(64px + (100% - 64px) * ${playheadPercent / 100})` }} />
        </div>
      </div>
    </div>
  );
}