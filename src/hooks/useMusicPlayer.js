import { useState, useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';
import { validatePlaylistItemForPlayback } from '@/lib/musicPlaybackEngine';

/**
 * useMusicPlayer — Howler.js-based audio playback hook.
 *
 * Only plays tracks that pass KAAE licensing validation.
 * Provides Web Audio API analyser data for visualization.
 *
 * @param {Array} tracks - Array of PlaylistItem records (already filtered to non-removed)
 * @param {Function} getAssetRecord - Optional: async fn(assetId) => AssetRegistry record
 */
export function useMusicPlayer(tracks = [], getAssetRecord = null) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [analyserData, setAnalyserData] = useState(null);

  const howlRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const rafRef = useRef(null);
  const volumeRef = useRef(0.8);
  const tracksRef = useRef(tracks);

  // Keep tracksRef in sync
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Keep volumeRef in sync
  useEffect(() => {
    volumeRef.current = volume;
    if (howlRef.current) {
      howlRef.current.volume(volume);
    }
  }, [volume]);

  // Cleanup on unmount
  const destroyHowl = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      destroyHowl();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [destroyHowl]);

  // Web Audio API analyser setup for frequency data
  const setupAnalyser = useCallback((howl) => {
    try {
      // Howler exposes its Web Audio nodes via howl._sounds[0]._node
      const sound = howl._sounds && howl._sounds[0];
      if (!sound || !sound._node) return;

      if (!audioContextRef.current) {
        audioContextRef.current = Howler.ctx || new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      sound._node.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch (err) {
      // Non-critical: analyser is for visualization only
      console.warn('Analyser setup skipped:', err.message);
    }
  }, []);

  // RAF loop for progress + analyser data
  const startRafLoop = useCallback((howl) => {
    const tick = () => {
      if (!howlRef.current || howlRef.current !== howl) return;

      const seek = howl.seek() || 0;
      const dur = howl.duration() || 0;
      setProgress(dur > 0 ? seek / dur : 0);
      setDuration(dur);

      // Analyser frequency data for visualization
      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        setAnalyserData(Array.from(dataArray));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Load and play a track at a given index
  const playTrack = useCallback(async (index) => {
    const currentTracks = tracksRef.current;
    if (index < 0 || index >= currentTracks.length) return;

    const track = currentTracks[index];
    if (!track) return;

    // Destroy any existing howl
    destroyHowl();
    setError(null);
    setValidationStatus(null);
    setIsLoading(true);
    setCurrentTrackIndex(index);

    // Validate via KAAE
    let assetRecord = null;
    if (getAssetRecord && track.audio_asset_id) {
      try {
        assetRecord = await getAssetRecord(track.audio_asset_id);
      } catch (err) {
        // Non-fatal: fall back to cached validation
      }
    }

    const validation = validatePlaylistItemForPlayback(track, assetRecord);
    setValidationStatus(validation);

    if (!validation.valid) {
      setError(`Playback blocked: ${validation.reason}`);
      setIsLoading(false);
      return;
    }

    // Create Howl with the validated URL
    const howl = new Howl({
      src: [validation.playableUrl],
      html5: true,
      volume: volumeRef.current,
      format: ['mp3', 'ogg', 'wav', 'flac', 'aac', 'm4a'],
    });

    howlRef.current = howl;

    howl.once('load', () => {
      setIsLoading(false);
      setDuration(howl.duration() || 0);
      setupAnalyser(howl);
      howl.play();
      setIsPlaying(true);
      startRafLoop(howl);
    });

    howl.once('loaderror', (_id, errMsg) => {
      setIsLoading(false);
      setError(`Failed to load audio: ${errMsg || 'unknown error'}`);
    });

    howl.once('playerror', (_id, errMsg) => {
      setIsLoading(false);
      setError(`Failed to play audio: ${errMsg || 'unknown error'}`);
    });

    howl.once('end', () => {
      // Auto-advance to next track
      const nextIndex = index + 1;
      if (nextIndex < tracksRef.current.length) {
        playTrack(nextIndex);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    });
  }, [destroyHowl, getAssetRecord, setupAnalyser, startRafLoop]);

  // Controls
  const play = useCallback(() => {
    if (howlRef.current && !isPlaying) {
      howlRef.current.play();
      setIsPlaying(true);
      startRafLoop(howlRef.current);
    } else if (currentTrackIndex === null) {
      playTrack(0);
    }
  }, [isPlaying, currentTrackIndex, playTrack, startRafLoop]);

  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
      setIsPlaying(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    const nextIndex = currentTrackIndex === null ? 0 : currentTrackIndex + 1;
    if (nextIndex < tracksRef.current.length) {
      playTrack(nextIndex);
    }
  }, [currentTrackIndex, playTrack]);

  const previous = useCallback(() => {
    const prevIndex = currentTrackIndex === null ? 0 : currentTrackIndex - 1;
    if (prevIndex >= 0) {
      playTrack(prevIndex);
    }
  }, [currentTrackIndex, playTrack]);

  const seek = useCallback((fraction) => {
    if (howlRef.current) {
      const dur = howlRef.current.duration();
      howlRef.current.seek(dur * fraction);
      setProgress(fraction);
    }
  }, []);

  const currentTrack = currentTrackIndex !== null ? tracks[currentTrackIndex] : null;

  return {
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isLoading,
    progress,
    duration,
    volume,
    error,
    validationStatus,
    analyserData,
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    playTrack,
  };
}