import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Youtube, Loader2 } from 'lucide-react';

/**
 * RundownSongPlayer — compact single-track YouTube iframe player.
 * Styled to match CommanderPlayer (cyberpunk glass + neon).
 *
 * Props:
 *  - videoId: YouTube video ID
 *  - title: song title
 *  - channelName: YouTube channel name
 *  - thumbnailUrl: optional thumbnail override
 */
export default function RundownSongPlayer({ videoId, title, channelName, thumbnailUrl }) {
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
        width: '100%',
        height: '100%',
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

  return (
    <div
      className="rounded-xl overflow-hidden mt-2"
      style={{
        background: 'rgba(255,0,255,0.04)',
        border: '1px solid rgba(255,0,255,0.25)',
        boxShadow: '0 0 12px rgba(255,0,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Youtube className="w-3.5 h-3.5" style={{ color: '#FF0000' }} />
          <span className="text-[10px] uppercase tracking-wider text-gray-400">Now Playing</span>
        </div>
        {channelName && (
          <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{channelName}</span>
        )}
      </div>

      <div className="flex items-stretch gap-0">
        {/* YouTube iframe */}
        <div className="relative bg-black flex-shrink-0" style={{ width: '160px', minWidth: '160px' }}>
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {thumb ? (
                <img src={thumb} alt="" className="w-full h-full object-cover opacity-40" />
              ) : null}
              <Loader2 className="absolute w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          <div style={{ aspectRatio: '16/9' }}>
            <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Title + controls */}
        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-2 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{title || 'Unknown Track'}</p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{channelName || ''}</p>
          </div>

          <button
            onClick={togglePlayPause}
            disabled={!isReady}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
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
      </div>
    </div>
  );
}