import React, { useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, ShieldCheck, ShieldAlert } from 'lucide-react';
import { formatLicenseLabel } from '@/lib/musicPlaybackEngine';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useMusicPlayer } from '@/hooks/useMusicPlayer';
import EqualizerBars from './EqualizerBars';
import TransportControls from './TransportControls';

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

  const noTracks = !tracks || tracks.length === 0;

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

      {/* Transport controls — waveform is the scrubber */}
      <TransportControls
        isPlaying={isPlaying}
        isLoading={isLoading}
        progress={progress}
        duration={duration}
        audioUrl={playableUrl}
        onSeek={handleSeek}
        onTogglePlay={togglePlayPause}
        onPrevious={previous}
        onNext={next}
        canSkipBack={currentTrackIndex !== null && currentTrackIndex > 0}
        canSkipForward={currentTrackIndex !== null && currentTrackIndex < tracks.length - 1}
        disabled={noTracks}
      />

      {/* Volume */}
      <div className="flex items-center gap-2 w-32 mt-3 ml-auto">
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
    </motion.div>
  );
}