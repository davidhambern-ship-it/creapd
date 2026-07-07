import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PlaybackControls({
  isPlaying, currentTime, totalTime, scope,
  onPlay, onPause, onStop, onRestart, onPrev, onNext, onScrub, onScopeChange,
}) {
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card border-t border-border">
      {/* Transport */}
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onPrev} title="Previous Slide">
          <SkipBack className="w-4 h-4" />
        </Button>
        {isPlaying ? (
          <Button variant="ghost" size="icon" className="w-9 h-9" onClick={onPause} title="Pause">
            <Pause className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="w-9 h-9" onClick={onPlay} title="Play">
            <Play className="w-5 h-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onStop} title="Stop">
          <Square className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onRestart} title="Restart">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onNext} title="Next Slide">
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrub bar */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
        <div className="flex-1 relative h-6 flex items-center">
          <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full" />
          <div className="absolute h-1.5 bg-primary rounded-full" style={{ width: `${progress}%` }} />
          <input
            type="range"
            min={0}
            max={totalTime || 1}
            value={currentTime}
            onChange={(e) => onScrub(parseInt(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
          <div className="absolute w-3 h-3 bg-primary border-2 border-white rounded-full shadow"
            style={{ left: `calc(${progress}% - 6px)` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-10">{formatTime(totalTime)}</span>
      </div>

      {/* Scope selector */}
      <select
        value={scope}
        onChange={(e) => onScopeChange(e.target.value)}
        className="text-xs bg-background border border-border rounded px-2 py-1"
      >
        <option value="slide">This Slide</option>
        <option value="full">Full Presentation</option>
      </select>
    </div>
  );
}