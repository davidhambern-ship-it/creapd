import { useState, useEffect, useRef, useCallback } from 'react';

export function usePresentationPlayer(storySlides) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  const slides = storySlides || [];
  const totalDuration = slides.reduce((acc, s) => acc + (s.duration_ms || 0), 0);

  // Determine which slide is active based on currentTime
  const activeSlideIndex = useCallback(() => {
    let accumulated = 0;
    for (let i = 0; i < slides.length; i++) {
      const slideEnd = accumulated + (slides[i].duration_ms || 0);
      if (currentTime < slideEnd || i === slides.length - 1) {
        return i;
      }
      accumulated = slideEnd;
    }
    return 0;
  }, [slides, currentTime]);

  const currentSlide = slides[currentSlideIndex];

  // Get the slide-local time (time within the current slide)
  const slideLocalTime = useCallback(() => {
    let accumulated = 0;
    for (let i = 0; i < currentSlideIndex; i++) {
      accumulated += slides[i]?.duration_ms || 0;
    }
    return currentTime - accumulated;
  }, [slides, currentSlideIndex, currentTime]);

  // Animation frame loop for smooth time updates
  useEffect(() => {
    if (!playing) return;

    let lastTime = performance.now();
    const tick = (now) => {
      const delta = (now - lastTime) * playbackRate;
      lastTime = now;
      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, playbackRate, totalDuration]);

  // Update current slide index when time changes
  useEffect(() => {
    const idx = activeSlideIndex();
    if (idx !== currentSlideIndex) {
      setCurrentSlideIndex(idx);
    }
  }, [currentTime, activeSlideIndex, currentSlideIndex]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const stop = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
    setCurrentSlideIndex(0);
  }, []);

  const seek = useCallback((time) => {
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
  }, [totalDuration]);

  const jumpToSlide = useCallback((index) => {
    if (index < 0 || index >= slides.length) return;
    let accumulated = 0;
    for (let i = 0; i < index; i++) {
      accumulated += slides[i]?.duration_ms || 0;
    }
    setCurrentTime(accumulated + 1);
    setCurrentSlideIndex(index);
  }, [slides]);

  const restart = useCallback(() => {
    setCurrentTime(0);
    setCurrentSlideIndex(0);
    setPlaying(true);
  }, []);

  return {
    playing,
    currentTime,
    currentSlideIndex,
    currentSlide,
    slideLocalTime,
    totalDuration,
    playbackRate,
    setPlaybackRate,
    play,
    pause,
    stop,
    seek,
    jumpToSlide,
    restart,
    audioRef,
  };
}