import React, { useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaveformDisplay from './WaveformDisplay';
import { formatRuntime } from '@/lib/musicConstants';

/**
 * TransportControls — Clean playback bar for the Music Player.
 *
 * Layout: [skip prev] [play/pause] [skip next]  ─  waveform scrubber  ─  elapsed / duration
 * The Wavesurfer waveform IS the scrubber — click or drag to seek.
 */
export default function TransportControls({
  isPlaying,
  isLoading,
  progress,
  duration,
  audioUrl,
  onSeek,
  onTogglePlay,
  onPrevious,
  onNext,
  canSkipBack,
  canSkipForward,
  disabled,
}) {
  const elapsedSeconds = useMemo(
    () => (progress || 0) * (duration || 0),
    [progress, duration]
  );

  return (
    <div className="space-y-3">
      {/* Waveform scrubber */}
      <div className="px-1">
        <WaveformDisplay
          audioUrl={audioUrl}
          isPlaying={isPlaying}
          progressFraction={progress}
          onSeek={onSeek}
        />
      </div>

      {/* Time + transport row */}
      <div className="flex items-center gap-4">
        {/* Elapsed time */}
        <span className="text-xs text-gray-400 font-mono w-10 text-right tabular-nums">
          {formatRuntime(elapsedSeconds)}
        </span>

        {/* Transport buttons */}
        <div className="flex items-center gap-2 mx-auto">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full hover:bg-white/10 disabled:opacity-30"
            onClick={onPrevious}
            disabled={disabled || !canSkipBack}
          >
            <SkipBack className="w-4 h-4 text-white" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full disabled:opacity-50"
            onClick={onTogglePlay}
            disabled={disabled || isLoading}
            style={{
              background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
              boxShadow: '0 0 16px rgba(255,0,255,0.35)',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full hover:bg-white/10 disabled:opacity-30"
            onClick={onNext}
            disabled={disabled || !canSkipForward}
          >
            <SkipForward className="w-4 h-4 text-white" />
          </Button>
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-400 font-mono w-10 tabular-nums">
          {formatRuntime(duration)}
        </span>
      </div>
    </div>
  );
}