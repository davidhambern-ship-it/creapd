import React, { useMemo } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw, AlertCircle } from 'lucide-react';
import { usePresentationPlayer } from '@/hooks/usePresentationPlayer';
import SceneCanvas from '@/components/presentation/SceneCanvas';

const TRANSITION_CLASSES = {
  fade: 'animate-fade-in',
  slide_left: 'animate-slide-left',
  dissolve: 'animate-dissolve-transition',
};

const SCENE_TYPE_LABELS = {
  title_reveal: 'Title Reveal',
  host_intro: 'Host Introduction',
  emphasis_text: 'Emphasis Text',
  image_scene: 'Image Scene',
  quote_card: 'Quote Card',
  statistic: 'Statistic',
  discussion: 'Discussion',
  transition: 'Transition',
  closing: 'Closing',
};

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PresentationPlayer({ storySlides, aspectRatio }) {
  const player = usePresentationPlayer(storySlides);
  const { currentSlide, slideLocalTime, playing, currentTime, totalDuration, currentSlideIndex, audioError, audioReady } = player;

  const sceneGraph = useMemo(() => {
    if (!currentSlide?.scene_graph) return null;
    try { return JSON.parse(currentSlide.scene_graph); } catch { return null; }
  }, [currentSlide]);

  const scenes = sceneGraph?.scenes || [];
  const activeScene = scenes.find(s => {
    const start = s.scene_start_time || 0;
    const end = s.scene_end_time || 999999;
    return slideLocalTime >= start && slideLocalTime <= end;
  }) || scenes[0];

  const transitionType = sceneGraph?.transition || 'fade';
  const transitionClass = TRANSITION_CLASSES[transitionType] || TRANSITION_CLASSES.fade;
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Presentation Canvas — dynamic aspect ratio */}
      <div
        className="relative w-full bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ aspectRatio: aspectRatio || '16 / 9', containerType: 'size' }}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-berna-navy to-black" />

        {/* Scene rendering with slide transition */}
        <div key={currentSlideIndex} className={`absolute inset-0 ${transitionClass}`}>
          {activeScene && (
            <SceneCanvas scene={activeScene} slideLocalTime={slideLocalTime} />
          )}
        </div>

        {/* Slide indicator */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-mono text-white/80">
            Slide {currentSlideIndex + 1}/{storySlides.length}
          </span>
        </div>

        {/* Scene indicator */}
        {activeScene && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-mono text-white/80">
              {SCENE_TYPE_LABELS[activeScene.scene_type] || activeScene.scene_type}
            </span>
          </div>
        )}

        {/* Time display */}
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-xs font-mono text-white/80">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Audio error overlay */}
        {audioError && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/80 backdrop-blur-sm border border-red-500/50 rounded-xl px-6 py-4 max-w-md text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-white font-medium">{audioError}</p>
            <p className="text-xs text-white/60 mt-1">Approval disabled until audio is available</p>
          </div>
        )}

        {/* Audio loading indicator */}
        {!audioError && !audioReady && playing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-xs font-mono text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Loading audio...
            </span>
          </div>
        )}

        {/* Center play button when paused */}
        {!playing && currentTime < totalDuration && !audioError && (
          <button
            onClick={player.play}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className="w-16 h-16 rounded-full bg-primary/80 group-hover:bg-primary flex items-center justify-center transition-colors shadow-lg">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </button>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2 bg-card rounded-lg px-4 py-2 border border-border">
        <button
          onClick={() => player.jumpToSlide(currentSlideIndex - 1)}
          disabled={currentSlideIndex === 0}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {playing ? (
          <button onClick={player.pause} className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={player.play} className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            <Play className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => player.jumpToSlide(currentSlideIndex + 1)}
          disabled={currentSlideIndex >= storySlides.length - 1}
          className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button onClick={player.stop} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <Square className="w-4 h-4" />
        </button>

        <button onClick={player.restart} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Timeline scrubber */}
        <div className="flex-1 flex items-center gap-2 mx-2">
          <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={totalDuration}
            value={currentTime}
            onChange={(e) => player.seek(Number(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />
          <span className="text-xs font-mono text-muted-foreground">{formatTime(totalDuration)}</span>
        </div>

        {/* Playback speed */}
        <select
          value={player.playbackRate}
          onChange={(e) => player.setPlaybackRate(Number(e.target.value))}
          className="text-xs bg-muted rounded-md px-2 py-1 border border-border"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>

      {/* Slide navigation thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {storySlides.map((slide, idx) => {
          const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
          const isActive = idx === currentSlideIndex;
          return (
            <button
              key={slide.id || idx}
              onClick={() => player.jumpToSlide(idx)}
              className={`flex-shrink-0 w-32 h-18 rounded-lg border-2 transition-colors p-2 text-left ${
                isActive ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted'
              }`}
            >
              <div className="text-xs font-mono text-muted-foreground">Slide {idx + 1}</div>
              <div className="text-xs font-medium text-foreground truncate">
                {meta.headline || `Story ${idx + 1}`}
              </div>
              <div className="text-xs text-muted-foreground">{formatTime(slide.duration_ms || 0)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}