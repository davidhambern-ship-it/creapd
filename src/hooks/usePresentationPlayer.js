import { useState, useEffect, useRef, useCallback } from 'react';

export function usePresentationPlayer(storySlides) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioError, setAudioError] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const playingRef = useRef(false);
  const slideIndexRef = useRef(0);
  const slideStartsRef = useRef([]);
  const slideDurationsRef = useRef([]);

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
    const onError = () => {
      setAudioError('Failed to load voiceover audio for this slide');
      setAudioReady(false);
    };
    const onCanPlay = () => {
      setAudioReady(true);
      setAudioError(null);
    };
    const onPlaying = () => setAudioStarted(true);
    const onPause = () => setAudioStarted(false);
    const onEnded = () => {
      // Advance to next slide when audio ends — use refs for current values
      const idx = slideIndexRef.current;
      const total = (slideDurationsRef.current || []).length;
      if (idx < total - 1) {
        const newIdx = idx + 1;
        setCurrentSlideIndex(newIdx);
        // Reset to new slide's start so slideLocalTime is 0 (animations sync to new audio)
        setCurrentTime(slideStartsRef.current[newIdx] || 0);
      } else {
        setPlaying(false);
        playingRef.current = false;
      }
    };
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Keep refs in sync for the RAF loop (avoids re-creating RAF on every slide change)
  useEffect(() => {
    playingRef.current = playing;
    slideIndexRef.current = currentSlideIndex;
    slideStartsRef.current = slideStarts;
    slideDurationsRef.current = slideDurations;
  }, [playing, currentSlideIndex, slideStarts, slideDurations]);

  // Load audio when slide changes
  useEffect(() => {
    if (!audioRef.current || !currentSlide) return;
    const url = getSlideAudioUrl(currentSlide);
    const audio = audioRef.current;
    setAudioReady(false);
    setAudioStarted(false);
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

  // When slide changes during playback, auto-play the new slide's audio.
  // slideLocalTime tracks audio.currentTime directly, so element animations sync to speech.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playing) return;
    if (audio.src) {
      audio.currentTime = 0;
      audio.play().catch(() => setAudioError('Failed to play voiceover audio'));
    }
  }, [currentSlideIndex]);

  // RAF loop — single continuous loop, reads from refs (no re-creation on slide change)
  useEffect(() => {
    if (!playing) return;

    const tick = () => {
      const audio = audioRef.current;
      const idx = slideIndexRef.current;
      const starts = slideStartsRef.current;
      const durations = slideDurationsRef.current;
      const slideStart = starts[idx] || 0;
      const slideDur = durations[idx] || 0;

      if (audio && audio.src && !audio.error) {
        const localMs = (audio.currentTime || 0) * 1000;
        setCurrentTime(slideStart + localMs);
      } else if (audio && !audio.src) {
        // No audio — use timer fallback; mark audioStarted so elements render
        setAudioStarted(true);
        setCurrentTime(prev => {
          const localTime = prev - slideStart;
          if (localTime >= slideDur) {
            if (idx < slides.length - 1) {
              setCurrentSlideIndex(prev => prev + 1);
              return (starts[idx + 1] || 0);
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
  }, [playing, slides.length, totalDuration]);

  // play() calls audio.play() directly — must be in the user gesture, not a useEffect
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.src && !audio.error) {
      audio.play().then(() => {
        setPlaying(true);
      }).catch(() => {
        setAudioError('Failed to play voiceover audio — browser blocked autoplay');
      });
    } else {
      // No audio — use timer fallback
      setPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPlaying(false);
  }, []);

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
    setCurrentTime((slideStarts[index] || 0));
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
  }, [slides, slideStarts]);

  const restart = useCallback(() => {
    setCurrentSlideIndex(0);
    setCurrentTime(0);
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio.currentTime = 0;
      audio.play().catch(() => setAudioError('Failed to play voiceover audio'));
    }
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
    audioError,
    audioReady,
    audioStarted
  };
}