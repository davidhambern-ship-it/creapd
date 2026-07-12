import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, StickyNote, X } from 'lucide-react';

function fmt(ms) {
  const s = Math.floor((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function PresentRehearsalBar({
  isPlaying, currentTime, totalTime,
  onPlay, onPause, onPrev, onNext,
  slide, slides, activeIndex,
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const start = Date.now() - (currentTime || 0);
    const interval = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime]);

  return (
    <>
      {showNotes && slide && (
        <div className="cpe-rehearsal-notes">
          <div className="cpe-rehearsal-notes-header">
            <span className="text-xs font-semibold">Speaker Notes</span>
            <button onClick={() => setShowNotes(false)}><X className="w-3 h-3" /></button>
          </div>
          <div className="cpe-rehearsal-notes-body">
            {slide.speaker_notes || slide.body_text || 'No notes available.'}
          </div>
        </div>
      )}

      <div className="cpe-rehearsal-bar flex items-center gap-3 px-4 py-2">
        <div className="flex items-center gap-1">
          <button className="cpe-icon-btn" onClick={onPrev} disabled={activeIndex <= 0} title="Previous slide">
            <SkipBack className="w-4 h-4" />
          </button>
          {isPlaying ? (
            <button className="cpe-play-btn" onClick={onPause} title="Pause"><Pause className="w-5 h-5" /></button>
          ) : (
            <button className="cpe-play-btn" onClick={onPlay} title="Play"><Play className="w-5 h-5" /></button>
          )}
          <button className="cpe-icon-btn" onClick={onNext} disabled={activeIndex >= slides.length - 1} title="Next slide">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="cpe-ws-rehearsal-info">
          <span className="text-xs font-medium text-foreground">
            Slide {activeIndex + 1} / {slides.length}
          </span>
          {slide?.title && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{slide.title}</span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="cpe-time-display">{fmt(isPlaying ? elapsed : currentTime)}</span>
          {totalTime > 0 && <span className="cpe-time-display text-muted-foreground">/ {fmt(totalTime)}</span>}
        </div>

        <button
          className={`cpe-tool-btn ${showNotes ? 'active' : ''}`}
          onClick={() => setShowNotes(v => !v)}
          title="Toggle speaker notes"
        >
          <StickyNote className="w-4 h-4" /> Notes
        </button>
      </div>
    </>
  );
}