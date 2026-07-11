import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Disc3, Volume2 } from 'lucide-react';
import { useShowPlayback } from '@/components/music/ShowPlaybackContext';
import { SEGMENT_TYPE_LABELS, formatRuntime } from '@/lib/musicConstants';

const SEGMENT_COLORS = {
  intro: '#00FF88',
  song: '#FF00FF',
  talk_break: '#00FFFF',
  topic_segment: '#FF6B00',
  sponsor_break: '#FFD700',
  station_id: '#8B00FF',
  outro: '#00FF88',
};

/**
 * MiniShowBar — persistent now-playing bar shown across all music pages.
 * Appears when autoplay is active, shows current segment + controls.
 */
export default function MiniShowBar() {
  const ctx = useShowPlayback();
  const { autoplayIndex, rundown, isYtPlaying, speakingId, songPhase } = ctx;

  const show = autoplayIndex !== null && rundown[autoplayIndex];
  if (!show) return null;

  const color = SEGMENT_COLORS[show.segment_type] || '#888888';
  const isSong = show.segment_type === 'song';
  const isSpeaking = speakingId === show.id;
  const isSongPlaying = isSong && songPhase === 'song' && isYtPlaying;

  const handlePlayPause = () => {
    if (isSong && songPhase === 'song') {
      ctx.toggleYtPlayPause();
    }
  };

  const handleStop = () => {
    ctx.stopAutoplay();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40"
      >
        <div
          className="cp-glass mx-2 mb-2 lg:mx-4 lg:mb-2 flex items-center gap-3 px-3 py-2.5"
          style={{ borderColor: `${color}40`, boxShadow: `0 0 16px ${color}20` }}
        >
          {/* Spinning disc / speaking indicator */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={(isSongPlaying || isSpeaking) ? { rotate: 360 } : { rotate: 0 }}
              transition={(isSongPlaying || isSpeaking) ? { duration: 4, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 60%, #050510 100%)',
                border: `1.5px solid ${color}40`,
              }}
            >
              <Disc3 className="w-4 h-4" style={{ color }} />
            </motion.div>
            {(isSongPlaying || isSpeaking) && (
              <div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
            )}
          </div>

          {/* Segment info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${color}15`, color }}
              >
                {songPhase === 'intro' ? 'Intro' : songPhase === 'outro' ? 'Outro' : SEGMENT_TYPE_LABELS[show.segment_type] || show.segment_type}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">
                {autoplayIndex + 1} / {rundown.length}
              </span>
            </div>
            <p className="text-xs font-medium text-white truncate">{show.title}</p>
          </div>

          {/* Phase indicator for songs */}
          {isSong && songPhase && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
              {songPhase === 'intro' && <Volume2 className="w-3 h-3" style={{ color }} />}
              {songPhase === 'song' && <Disc3 className="w-3 h-3" style={{ color }} />}
              {songPhase === 'outro' && <Volume2 className="w-3 h-3" style={{ color }} />}
              <span style={{ color }}>{songPhase}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSong && songPhase === 'song' && (
              <button
                onClick={handlePlayPause}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}
              >
                {isYtPlaying ? (
                  <Pause className="w-3.5 h-3.5" style={{ color }} />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" style={{ color }} />
                )}
              </button>
            )}
            <button
              onClick={handleStop}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)' }}
            >
              <Square className="w-3 h-3 text-red-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}