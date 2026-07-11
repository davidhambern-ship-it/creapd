import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Disc3, Loader2, FileText, ChevronDown } from 'lucide-react';

/**
 * RundownSongPlayer — compact single-track YouTube audio player.
 * Matches CommanderPlayer audio mode: hidden iframe, spinning vinyl disc.
 *
 * Props:
 *  - videoId: YouTube video ID
 *  - title: song title
 *  - channelName: YouTube channel name
 *  - thumbnailUrl: optional thumbnail override
 */
export default function RundownSongPlayer({ videoId, title, channelName, thumbnailUrl, script, color = '#FF00FF' }) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const apiLoadedRef = useRef(false);

  // Load YouTube IFrame API once
  useEffect(() => {
    if (apiLoadedRef.current) return;
    if (window.YT && window.YT.Player) {
      apiLoadedRef.current = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    apiLoadedRef.current = true;
  }, []);

  // Initialize player
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      setIsReady(false);
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: '1',
        height: '1',
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (e) => {
            if (e.data === 1) setIsPlaying(true);
            if (e.data === 2) setIsPlaying(false);
          },
        },
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const thumb = thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);

  const [scriptExpanded, setScriptExpanded] = useState(false);
  const hasScript = script && script.trim().length > 0;
  const wordCount = hasScript ? script.trim().split(/\s+/).filter(Boolean).length : 0;
  const estSeconds = hasScript ? Math.ceil(script.length / 15) : 0;
  const estTime = `${Math.floor(estSeconds / 60)}:${String(estSeconds % 60).padStart(2, '0')}`;

  return (
    <div
      className="cp-glass rounded-2xl overflow-hidden mt-2"
      style={{ borderColor: 'rgba(255,0,255,0.25)' }}
    >
      {/* Hidden iframe — keeps YouTube audio playing without video UI */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
      />

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
          {!isReady && (
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
          disabled={!isReady}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
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

      {/* Inline script — host intro/outro for this song */}
      {hasScript && (
        <div className="px-4 pb-3">
          <button
            onClick={() => setScriptExpanded(!scriptExpanded)}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" style={{ color }} />
            <span style={{ color }}>Script</span>
            <span className="text-gray-600">·</span>
            <span>{wordCount} words</span>
            <span className="text-gray-600">·</span>
            <span>~{estTime}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${scriptExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {scriptExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="mt-2 p-3 rounded-lg text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: `${color}08`,
                    border: `1px solid ${color}20`,
                  }}
                >
                  {script}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}