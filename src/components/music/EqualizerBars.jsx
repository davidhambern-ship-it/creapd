import React from 'react';

/**
 * EqualizerBars — Animated frequency bar visualization.
 *
 * Uses Web Audio API analyser data from the player hook when available,
 * falls back to CSS animation when no data is present.
 *
 * @param {boolean} isPlaying - Whether audio is currently playing
 * @param {Array|null} analyserData - Uint8Array frequency data from Web Audio API
 */
export default function EqualizerBars({ isPlaying, analyserData }) {
  const barCount = 5;

  // If we have real analyser data, use it
  const useRealData = isPlaying && analyserData && analyserData.length > 0;

  return (
    <div className="flex items-end gap-0.5 h-4" aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => {
        let height = '30%';
        if (useRealData) {
          const dataIndex = Math.floor((i / barCount) * analyserData.length);
          const value = analyserData[dataIndex] || 0;
          height = `${Math.max(15, (value / 255) * 100)}%`;
        }
        return (
          <div
            key={i}
            className="w-0.5 rounded-t transition-all duration-75"
            style={{
              height: useRealData ? height : isPlaying ? '100%' : '30%',
              background: i % 2 === 0 ? '#FF00FF' : '#00FFFF',
              boxShadow: `0 0 4px ${i % 2 === 0 ? '#FF00FF' : '#00FFFF'}`,
              opacity: isPlaying ? 1 : 0.4,
              animation: !useRealData && isPlaying ? `cp-eq-bar 0.8s ease-in-out infinite ${i * 0.1}s` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}