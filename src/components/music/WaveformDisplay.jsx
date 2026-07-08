import React, { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

/**
 * WaveformDisplay — Wavesurfer.js waveform visualization.
 *
 * Shows the audio waveform for the currently loaded track.
 * Supports click-to-seek via the onSeek callback.
 *
 * @param {string} audioUrl - The validated audio URL to display
 * @param {boolean} isPlaying - Whether audio is currently playing
 * @param {number} progressFraction - Current playback position (0-1) from the player hook
 * @param {Function} onSeek - Callback(fraction) when user clicks the waveform
 */
export default function WaveformDisplay({ audioUrl, isPlaying, progressFraction, onSeek }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const isInteractingRef = useRef(false);

  // Initialize WaveSurfer once
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(0, 255, 255, 0.3)',
      progressColor: '#FF00FF',
      cursorColor: '#00FFFF',
      cursorWidth: 2,
      barWidth: 2,
      barRadius: 1,
      barGap: 2,
      height: 48,
      normalize: true,
      interact: true,
    });

    wavesurferRef.current = ws;

    ws.on('interaction', (newTime) => {
      isInteractingRef.current = true;
      const duration = ws.getDuration();
      if (duration > 0 && onSeek) {
        onSeek(newTime / duration);
      }
      setTimeout(() => { isInteractingRef.current = false; }, 150);
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [onSeek]);

  // Load new audio URL
  useEffect(() => {
    if (!wavesurferRef.current || !audioUrl) return;
    wavesurferRef.current.load(audioUrl);
  }, [audioUrl]);

  // Sync play/pause state
  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isPlaying) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [isPlaying]);

  // Sync progress from Howler (one-way: Howler -> WaveSurfer).
  // Skip while user is dragging/clicking the waveform to avoid fighting the seek.
  useEffect(() => {
    if (!wavesurferRef.current) return;
    if (isInteractingRef.current) return;
    const duration = wavesurferRef.current.getDuration();
    if (duration > 0) {
      wavesurferRef.current.seekTo(progressFraction);
    }
  }, [progressFraction]);

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center h-12 text-xs text-gray-500">
        No waveform — audio not validated
      </div>
    );
  }

  return <div ref={containerRef} className="w-full" />;
}