import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Disc3, Loader2, FileText, ChevronDown } from 'lucide-react';
import { useShowPlayback } from '@/components/music/ShowPlaybackContext';

/**
 * RundownSongPlayer — compact single-track YouTube audio player UI.
 * Delegates actual playback to the persistent ShowPlaybackContext engine.
 * Shows spinning vinyl disc, play/pause, and inline host scripts.
 *
 * Props:
 *  - videoId: YouTube video ID
 *  - title: song title
 *  - channelName: YouTube channel name
 *  - thumbnailUrl: optional thumbnail override
 *  - itemIndex: rundown index (used to identify the active song)
 */
export default function RundownSongPlayer({ videoId, title, channelName, thumbnailUrl, introScript, outroScript, script, color = '#FF00FF', itemIndex }) {
  const ctx = useShowPlayback();
  const [introExpanded, setIntroExpanded] = useState(false);
  const [outroExpanded, setOutroExpanded] = useState(false);

  // Determine if this card is the one currently playing in the persistent engine
  const isActive = ctx.activeVideoId === videoId;
  const isPlaying = isActive && ctx.isYtPlaying;
  const isReady = isActive ? ctx.isYtReady : false;

  const togglePlayPause = () => {
    if (isActive && ctx.isYtPlaying) {
      ctx.toggleYtPlayPause();
    } else {
      ctx.playSong(videoId, itemIndex);
    }
  };

  const thumb = thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);

  const intro = introScript || script || '';
  const outro = outroScript || '';
  const hasIntro = intro.trim().length > 0;
  const hasOutro = outro.trim().length > 0;

  const calcWordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
  const calcEstTime = (text) => {
    const secs = Math.ceil(text.length / 15);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  return (
    <div
      className="cp-glass rounded-2xl overflow-hidden mt-2"
      style={{ borderColor: 'rgba(255,0,255,0.25)' }}
    >
      <div className="flex items-center gap-4 p-4">
        {/* Spinning vinyl disc */}
        <div className="relative flex-shrink-0">
          <motion.div
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={isPlaying ? { duration: 4, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 60%, #050510 100%)',
              border: '2px solid rgba(255,0,255,0.3)',
              boxShadow: isPlaying ? '0 0 16px rgba(255,0,255,0.2), inset 0 0 16px rgba(0,0,0,0.6)' : 'inset 0 0 16px rgba(0,0,0,0.6)',
            }}
          >
            {/* Thumbnail in center */}
            <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center" style={{ border: '1.5px solid rgba(255,0,255,0.4)' }}>
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover" />
              ) : (
                <Disc3 className="w-4 h-4" style={{ color: '#FF00FF' }} />
              )}
            </div>
            {/* Vinyl grooves */}
            <div className="absolute inset-1.5 rounded-full border border-white/5" />
            <div className="absolute inset-3 rounded-full border border-white/5" />
          </motion.div>
          {/* Pulse indicator when playing */}
          {isPlaying && (
            <div
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#FF00FF', boxShadow: '0 0 6px #FF00FF' }}
            />
          )}
        </div>

        {/* Now Playing + Controls */}
        <div className="flex-1 min-w-0">
          {!isReady && isActive && (
            <div className="flex items-center gap-1.5 mb-1">
              <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
              <span className="text-[10px] text-gray-500">Loading...</span>
            </div>
          )}
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">Now Playing</p>
          <p className="text-sm font-medium text-white truncate">{title || 'Unknown Track'}</p>
          <p className="text-[10px] text-gray-400 truncate">{channelName || ''}</p>
        </div>

        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
            boxShadow: '0 0 12px rgba(255,0,255,0.3)',
          }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>
      </div>

      {/* Inline scripts — host intro/outro for this song */}
      {(hasIntro || hasOutro) && (
        <div className="px-4 pb-3 space-y-2">
          {hasIntro && (
            <div>
              <button
                onClick={() => setIntroExpanded(!introExpanded)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" style={{ color }} />
                <span style={{ color }}>Intro Script</span>
                <span className="text-gray-600">·</span>
                <span>{calcWordCount(intro)} words</span>
                <span className="text-gray-600">·</span>
                <span>~{calcEstTime(intro)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${introExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {introExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-lg text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      {intro}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {hasOutro && (
            <div>
              <button
                onClick={() => setOutroExpanded(!outroExpanded)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" style={{ color }} />
                <span style={{ color }}>Outro Script</span>
                <span className="text-gray-600">·</span>
                <span>{calcWordCount(outro)} words</span>
                <span className="text-gray-600">·</span>
                <span>~{calcEstTime(outro)}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${outroExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {outroExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 rounded-lg text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      {outro}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}