import React, { useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { formatLicenseLabel } from '@/lib/musicPlaybackEngine';
import { formatRuntime } from '@/lib/musicConstants';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import WaveformDisplay from './WaveformDisplay';
import EqualizerBars from './EqualizerBars';

/**
 * MusicPlayer — The main playback component for the Music PP.
 *
 * Only plays audio that has passed KAAE licensing validation.
 * Uses Howler.js (via useMusicPlayer hook) for cross-browser audio
 * and Wavesurfer.js for waveform display.
 *
 * @param {Array} tracks - Filtered PlaylistItem array (non-removed)
 * @param {Function} getAssetRecord - async fn(assetId) => AssetRegistry record
 */
export default function MusicPlayer({ tracks, getAssetRecord, startIndex }) {
  const {
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
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    playTrack,
  } = useMusicPlayer(tracks, getAssetRecord);

  // When startIndex changes (user clicks a track's play button), start playing that track
  useEffect(() => {
    if (startIndex !== null && startIndex >= 0 && startIndex < tracks.length) {
      playTrack(startIndex);
    }
  }, [startIndex, playTrack, tracks.length]);

  const playableUrl = validationStatus?.valid ? validationStatus.playableUrl : null;
  const isKaaeValidated = validationStatus?.valid === true;

  const handleSeek = useCallback((fraction) => {
    seek(fraction);
  }, [seek]);

  const elapsedSeconds = useMemo(() => {
    return (progress || 0) * (duration || 0);
  }, [progress, duration]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="cp-glass p-5"
      style={{ borderColor: 'rgba(0,255,255,0.2)' }}
    >
      {/* Now Playing Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <EqualizerBars isPlaying={isPlaying} analyserData={analyserData} />
          <span className="text-xs uppercase tracking-wider text-gray-400">Now Playing</span>
        </div>
        {/* KAAE License Badge */}
        {currentTrack && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: isKaaeValidated ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,0,0.1)',
              border: `1px solid ${isKaaeValidated ? 'rgba(0,255,136,0.3)' : 'rgba(255,107,0,0.3)'}`,
              color: isKaaeValidated ? '#00FF88' : '#FF6B00',
            }}
          >
            {isKaaeValidated ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            {isKaaeValidated ? 'KAAE Validated' : 'Not Validated'}
            {validationStatus?.license && isKaaeValidated && (
              <span className="opacity-70">· {formatLicenseLabel(validationStatus.license)}</span>
            )}
          </div>
        )}
      </div>

      {/* Track Info */}
      {currentTrack ? (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white truncate">{currentTrack.song_title}</h3>
          <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
          {validationStatus?.attribution && (
            <p className="text-xs text-gray-500 mt-1 truncate">ℹ {validationStatus.attribution}</p>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-500">No track selected</h3>
          <p className="text-sm text-gray-600">Select a track to begin playback</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)', color: '#FF6B00' }}>
          {error}
        </div>
      )}

      {/* Waveform */}
      <div className="mb-3">
        <WaveformDisplay
          audioUrl={playableUrl}
          isPlaying={isPlaying}
          progressFraction={progress}
          onSeek={handleSeek}
        />
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-400 font-mono w-10 text-right">{formatRuntime(elapsedSeconds)}</span>
        <Slider
          value={[Math.round((progress || 0) * 100)]}
          max={100}
          step={1}
          onValueChange={(val) => seek(val[0] / 100)}
          className="flex-1"
        />
        <span className="text-xs text-gray-400 font-mono w-10">{formatRuntime(duration)}</span>
      </div>

      {/* Controls + Volume */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={previous} disabled={currentTrackIndex === null || currentTrackIndex === 0}>
            <SkipBack className="w-4 h-4 text-white" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-12 w-12 rounded-full"
            onClick={togglePlayPause}
            disabled={isLoading || (currentTrackIndex === null && tracks.length === 0)}
            style={{
              background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
              boxShadow: '0 0 16px rgba(255,0,255,0.35)',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={next}
            disabled={currentTrackIndex === null || currentTrackIndex >= tracks.length - 1}>
            <SkipForward className="w-4 h-4 text-white" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-32">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setVolume(volume > 0 ? 0 : 0.8)}>
            {volume > 0 ? <Volume2 className="w-4 h-4 text-gray-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </Button>
          <Slider
            value={[Math.round(volume * 100)]}
            max={100}
            step={1}
            onValueChange={(val) => setVolume(val[0] / 100)}
            className="flex-1"
          />
        </div>
      </div>
    </motion.div>
  );
}