import React, { useMemo } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { usePresentationPlayer } from '@/hooks/usePresentationPlayer';

const ANIMATION_CLASSES = {
  fade: 'animate-fade-in',
  slide: 'animate-slide-in',
  scale: 'animate-zoom-in',
  reveal: 'animate-fade-in',
  wipe: 'animate-fade-in',
  expand: 'animate-zoom-in',
  float: 'animate-fade-in',
  collapse: 'animate-fade-in',
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

function PresentationElement({ element, slideLocalTime }) {
  const timelineEvent = element.timeline_events?.[0];
  if (!timelineEvent) return null;

  const startMs = timelineEvent.start_time || 0;
  const endMs = timelineEvent.end_time || 999999;
  const isVisible = slideLocalTime >= startMs && slideLocalTime <= endMs;

  if (!isVisible && !element.visibility) return null;

  const entranceAnim = element.entrance_animation?.type || 'fade';
  const animClass = ANIMATION_CLASSES[entranceAnim] || 'animate-fade-in';

  const style = {
    position: 'absolute',
    left: `${(element.position?.x || 0.5) * 100}%`,
    top: `${(element.position?.y || 0.5) * 100}%`,
    transform: `translate(-50%, -50%) scale(${element.scale || 1})`,
    opacity: isVisible ? (element.opacity || 1) : 0,
    transition: 'opacity 0.3s ease',
  };

  const content = element.content || '';

  if (element.element_type === 'image' && element.asset_reference) {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <img
          src={element.asset_reference}
          alt={content}
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ maxWidth: '60%', maxHeight: '60%' }}
        />
      </div>
    );
  }

  if (element.element_type === 'headline') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-white text-center drop-shadow-lg px-6 py-3">
          {content}
        </h2>
      </div>
    );
  }

  if (element.element_type === 'body_text') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <p className="text-xl md:text-2xl text-white/90 text-center max-w-2xl drop-shadow-md px-4">
          {content}
        </p>
      </div>
    );
  }

  if (element.element_type === 'talking_point_card' || element.element_type === 'discussion_response') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 max-w-md">
          <p className="text-lg text-white/95 font-medium">{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'lower_third') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '5%',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        className={isVisible ? animClass : ''}
      >
        <div className="bg-primary/80 backdrop-blur-sm rounded-r-lg px-5 py-2 border-l-4 border-accent">
          <p className="text-base text-white font-medium">{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'statistic') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-display font-bold text-accent drop-shadow-lg">{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'quote') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <blockquote className="text-2xl md:text-3xl italic text-white/95 text-center max-w-2xl border-l-4 border-primary pl-4">
          "{content}"
        </blockquote>
      </div>
    );
  }

  return (
    <div style={style} className={isVisible ? animClass : ''}>
      <p className="text-lg text-white/80">{content}</p>
    </div>
  );
}

function SceneCanvas({ scene, slideLocalTime }) {
  if (!scene) return null;

  const layers = [...(scene.layers || [])].sort((a, b) => (a.z_order || 0) - (b.z_order || 0));

  return (
    <div className="absolute inset-0">
      {layers.map((layer) => (
        <div key={layer.layer_id} className="absolute inset-0">
          {(layer.elements || []).map((elem) => (
            <PresentationElement
              key={elem.element_id}
              element={elem}
              slideLocalTime={slideLocalTime}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function PresentationPlayer({ storySlides }) {
  const player = usePresentationPlayer(storySlides);
  const { currentSlide, slideLocalTime, playing, currentTime, totalDuration, currentSlideIndex } = player;

  const sceneGraph = useMemo(() => {
    if (!currentSlide?.scene_graph) return null;
    try { return JSON.parse(currentSlide.scene_graph); } catch { return null; }
  }, [currentSlide]);

  const slideTimeline = useMemo(() => {
    if (!currentSlide?.slide_timeline) return null;
    try { return JSON.parse(currentSlide.slide_timeline); } catch { return null; }
  }, [currentSlide]);

  const scenes = sceneGraph?.scenes || [];
  const activeScene = scenes.find(s => {
    const start = s.scene_start_time || 0;
    const end = s.scene_end_time || 999999;
    return slideLocalTime >= start && slideLocalTime <= end;
  }) || scenes[0];

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Presentation Canvas — 16:9 aspect ratio */}
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-berna-navy to-black" />

        {/* Scene rendering */}
        {activeScene && (
          <SceneCanvas scene={activeScene} slideLocalTime={slideLocalTime} />
        )}

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

        {/* Center play button when paused */}
        {!playing && currentTime < totalDuration && (
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