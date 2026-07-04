import { useState, useEffect, useRef, useCallback } from 'react';

export function usePresentationPlayer(storySlides) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);
  const rafRef = useRef(null);

  const slides = storySlides || [];

  // Compute slide durations and start offsets
  const slideDurations = slides.map(s => s.duration_ms || 0);
  const totalDuration = slideDurations.reduce((a, b) => a + b, 0);

  const slideStarts = [];
  {
    let acc = 0;
    for (const d of slideDurations) { slideStarts.push(acc); acc += d; }
  }

  const currentSlide = slides[currentSlideIndex];
  const slideLocalTime = Math.max(0, currentTime - (slideStarts[currentSlideIndex] || 0));

  // Get audio URL from a slide's slide_timeline
  const getSlideAudioUrl = useCallback((slide) => {
    if (!slide?.slide_timeline) return null;
    try { return JSON.parse(slide.slide_timeline).voice_audio_url || null; } catch { return null; }
  }, []);

  // Initialize audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;
    const onError = () => setAudioError('Failed to load voiceover audio for this slide');
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('error', onError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Load audio when slide changes
  useEffect(() => {
    if (!audioRef.current || !currentSlide) return;
    const url = getSlideAudioUrl(currentSlide);
    const audio = audioRef.current;
    if (url) {
      audio.src = url;
      audio.load();
      setAudioError(null);
    } else {
      audio.removeAttribute('src');
      setAudioError('No voiceover audio attached to this slide');
    }
  }, [currentSlideIndex, currentSlide, getSlideAudioUrl]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Auto-play audio when slide changes (if playing)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && audio.src) {
      audio.play().catch(() => setAudioError('Failed to play voiceover audio'));
    } else if (!playing) {
      audio.pause();
    }
  }, [currentSlideIndex, playing]);

  // RAF loop — advance visual timeline from audio.currentTime
  useEffect(() => {
    if (!playing) return;

    const tick = () => {
      const audio = audioRef.current;
      const slideStart = slideStarts[currentSlideIndex] || 0;
      const slideDur = slideDurations[currentSlideIndex] || 0;

      if (audio && audio.src && !audio.error) {
        // Audio is master timeline
        const localMs = (audio.currentTime || 0) * 1000;
        setCurrentTime(slideStart + localMs);

        if (audio.ended) {
          if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(prev => prev + 1);
          } else {
            setPlaying(false);
          }
        }
      } else if (audio && !audio.src) {
        // No audio — timer fallback
        setCurrentTime(prev => {
          const localTime = prev - slideStart;
          if (localTime >= slideDur) {
            if (currentSlideIndex < slides.length - 1) {
              setCurrentSlideIndex(prev => prev + 1);
              return slideStarts[currentSlideIndex + 1] || 0;
            }
            setPlaying(false);
            return totalDuration;
          }
          return prev + 16;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, currentSlideIndex, slideStarts, slideDurations, slides.length, totalDuration]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setPlaying(false);
    setCurrentTime(0);
    setCurrentSlideIndex(0);
  }, []);

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration));

    // Find which slide this time falls into
    let idx = 0;
    for (let i = 0; i < slideStarts.length; i++) {
      const end = i < slideStarts.length - 1 ? slideStarts[i + 1] : totalDuration;
      if (clamped < end) { idx = i; break; }
      idx = i;
    }
    const localMs = clamped - (slideStarts[idx] || 0);
    const audio = audioRef.current;

    if (idx !== currentSlideIndex) {
      setCurrentSlideIndex(idx);
      // Set audio currentTime after the new src loads
      if (audio) {
        const setAudioTime = () => {
          audio.currentTime = localMs / 1000;
          audio.removeEventListener('loadedmetadata', setAudioTime);
        };
        if (audio.readyState >= 1) {
          audio.currentTime = localMs / 1000;
        } else {
          audio.addEventListener('loadedmetadata', setAudioTime);
        }
      }
    } else if (audio) {
      audio.currentTime = localMs / 1000;
    }
    setCurrentTime(clamped);
  }, [totalDuration, slideStarts, currentSlideIndex]);

  const jumpToSlide = useCallback((index) => {
    if (index < 0 || index >= slides.length) return;
    setCurrentSlideIndex(index);
    setCurrentTime((slideStarts[index] || 0) + 1);
  }, [slides, slideStarts]);

  const restart = useCallback(() => {
    setCurrentSlideIndex(0);
    setCurrentTime(0);
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
    audioError
  };
}