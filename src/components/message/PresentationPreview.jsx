import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X, Volume2, VolumeX } from 'lucide-react';
import { formatDuration } from '@/lib/spiritualConstants';
import PresentationSlide from './PresentationSlide';

export default function PresentationPreview({ sections, config, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const currentSection = sections[currentIdx];
  const isLast = currentIdx === sections.length - 1;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goToNext = useCallback(() => {
    if (currentIdx < sections.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIdx, sections.length]);

  // Play/pause audio when slide changes or playing state changes
  useEffect(() => {
    clearTimer();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (currentSection?.voice_url && !muted) {
        audio.src = currentSection.voice_url;
        audio.muted = muted;
        audio.play().catch(() => {
          // If audio fails, use estimated duration
          const duration = currentSection.voice_duration_seconds || currentSection.estimated_duration_seconds || 10;
          timerRef.current = setTimeout(goToNext, duration * 1000);
        });
      } else {
        // No voice — use estimated duration
        const duration = currentSection.voice_duration_seconds || currentSection.estimated_duration_seconds || 10;
        timerRef.current = setTimeout(goToNext, duration * 1000);
      }
    } else {
      audio.pause();
    }

    return clearTimer;
  }, [isPlaying, currentIdx, currentSection, muted, goToNext]);

  const handleAudioEnded = () => {
    goToNext();
  };

  const handlePrev = () => {
    clearTimer();
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1);
  };

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleSkip = () => {
    clearTimer();
    setIsPlaying(false);
    if (currentIdx < sections.length - 1) setCurrentIdx(prev => prev + 1);
  };

  const totalDuration = sections.reduce((sum, s) => sum + (s.voice_duration_seconds || s.estimated_duration_seconds || 0), 0);
  const elapsedDuration = sections.slice(0, currentIdx).reduce((sum, s) => sum + (s.voice_duration_seconds || s.estimated_duration_seconds || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Slide area */}
      <div className="flex-1 relative flex items-center justify-center">
        <div className="relative w-full h-full max-w-[1920px] mx-auto">
          <PresentationSlide key={currentIdx} section={currentSection} isActive={true} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation arrows */}
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleSkip}
          disabled={isLast}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Control bar */}
      <div className="bg-black/95 border-t border-white/10 px-6 py-4">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-white/60 font-mono w-8">{currentIdx + 1}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((currentIdx + 1) / sections.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/60 font-mono w-8">{sections.length}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="p-2.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="text-sm text-white/70">
              <span className="font-medium text-white">{currentSection?.slide_title || currentSection?.title}</span>
              <span className="ml-2 text-xs text-white/50">
                {formatDuration(elapsedDuration)} / {formatDuration(totalDuration)}
              </span>
            </div>
          </div>
          <div className="text-xs text-white/40">
            {config?.production_name}
          </div>
        </div>
      </div>
    </div>
  );
}