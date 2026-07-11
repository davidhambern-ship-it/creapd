import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward, SkipBack, Youtube, Loader2, ListVideo, Disc3 } from 'lucide-react';

/**
 * CommanderPlayer — single cycling YouTube iframe player.
 * Uses the YouTube IFrame Player API to auto-advance through a list of videos.
 *
 * Props:
 *  - items: array of { id, youtube_video_id, title, channel_name, thumbnail_url, ... }
 *  - title: optional header title (e.g. "Top 10 Videos" or "Playlist Player")
 *  - mode: "video" (default, shows full video iframe) | "audio" (hides video, audio-only UI)
 */
export default function CommanderPlayer({ items = [], title = 'Player', mode = 'video' }) {
  const isAudioMode = mode === 'audio';
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const apiLoadedRef = useRef(false);

  const validItems = items.filter(i => i.youtube_video_id);
  const currentItem = validItems[currentIndex];

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

  // Initialize player when API is ready and we have items
  useEffect(() => {
    if (!currentItem || !containerRef.current) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      // Destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: currentItem.youtube_video_id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            setIsReady(true);
          },
          onStateChange: (e) => {
            // 0 = ended → auto-advance
            if (e.data === 0) {
              handleNext();
            }
            // 1 = playing
            if (e.data === 1) {
              setIsPlaying(true);
            }
            // 2 = paused
            if (e.data === 2) {
              setIsPlaying(false);
            }
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
  }, [currentIndex, currentItem?.youtube_video_id]);

  // Reset index when items change significantly
  useEffect(() => {
    if (currentIndex >= validItems.length) {
      setCurrentIndex(0);
    }
  }, [validItems.length]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev + 1 >= validItems.length) return 0; // loop back
      return prev + 1;
    });
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev - 1 < 0) return validItems.length - 1; // loop back
      return prev - 1;
    });
  }, [validItems.length]);

  if (validItems.length === 0) {
    return (
      <div className="cp-glass rounded-2xl p-8 text-center" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
        <ListVideo className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(255,0,255,0.3)' }} />
        <p className="text-gray-400 text-sm">No playable tracks yet. Add YouTube tracks to start playing.</p>
      </div>
    );
  }

  // ── AUDIO MODE ──────────────────────────────────────────────
  // Video iframe is hidden (1x1, opacity 0) but still functional for audio.
  // UI shows a spinning vinyl disc + now playing info + controls.
  if (isAudioMode) {
    return (
      <div className="cp-glass rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(255,0,255,0.25)' }}>
        {/* Hidden iframe — keeps YouTube audio playing without video UI */}
        <div
          ref={containerRef}
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} style={{ color: '#FF00FF' }} />
            <span className="text-xs uppercase tracking-wider text-gray-400">{title}</span>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {currentIndex + 1} / {validItems.length}
          </span>
        </div>

        {/* Vinyl disc centerpiece + Now Playing */}
        <div className="flex flex-col md:flex-row items-center gap-6 p-6">
          {/* Spinning disc */}
          <div className="relative flex-shrink-0">
            <motion.div
              animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
              transition={isPlaying ? { duration: 4, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 60%, #050510 100%)',
                border: '2px solid rgba(255,0,255,0.3)',
                boxShadow: isPlaying ? '0 0 24px rgba(255,0,255,0.2), inset 0 0 24px rgba(0,0,0,0.6)' : 'inset 0 0 24px rgba(0,0,0,0.6)',
              }}
            >
              {/* Thumbnail in center */}
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ border: '2px solid rgba(255,0,255,0.4)' }}>
                {currentItem?.thumbnail_url ? (
                  <img src={currentItem.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Disc3 className="w-6 h-6" style={{ color: '#FF00FF' }} />
                )}
              </div>
              {/* Vinyl grooves */}
              <div className="absolute inset-2 rounded-full border border-white/5" />
              <div className="absolute inset-4 rounded-full border border-white/5" />
              <div className="absolute inset-6 rounded-full border border-white/5" />
            </motion.div>
            {/* Tonearm glow when playing */}
            {isPlaying && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
                style={{ background: '#FF00FF', boxShadow: '0 0 8px #FF00FF' }}
              />
            )}
          </div>

          {/* Now Playing + Controls */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {!isReady && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            )}
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Now Playing</p>
            <p className="text-base font-medium text-white line-clamp-2">{currentItem?.title || 'Unknown'}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{currentItem?.channel_name || ''}</p>

            {/* Controls */}
            <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={handlePrev}>
                <SkipBack className="w-4 h-4 text-white" />
              </Button>
              <Button
                size="icon"
                className="h-11 w-11 rounded-full cp-btn-gradient border-0 text-white shrink-0"
                onClick={handlePlayPause}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={handleNext}>
                <SkipForward className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </div>

        {/* Track selector strip */}
        <div className="border-t border-white/10 p-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {validItems.map((item, i) => (
            <button
              key={item.id || i}
              onClick={() => setCurrentIndex(i)}
              className="flex-shrink-0 relative group"
              style={{ width: '80px' }}
            >
              <div
                className="relative rounded-lg overflow-hidden transition-all"
                style={{
                  border: i === currentIndex ? '2px solid #FF00FF' : '2px solid transparent',
                  boxShadow: i === currentIndex ? '0 0 12px rgba(255,0,255,0.3)' : 'none',
                }}
              >
                <img
                  src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`}
                  alt={item.title}
                  className="w-full h-12 object-cover"
                  onError={(e) => { e.target.src = `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`; }}
                />
                <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <p className="text-[9px] text-white truncate text-left">{i + 1}. {item.title}</p>
                </div>
                {i === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF00FF', boxShadow: '0 0 8px #FF00FF' }} />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── VIDEO MODE (default — used by Top 10) ──────────────────
  return (
    <div className="cp-glass rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(255,0,255,0.25)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Youtube className="w-4 h-4" style={{ color: '#FF0000' }} />
          <span className="text-xs uppercase tracking-wider text-gray-400">{title}</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {currentIndex + 1} / {validItems.length}
        </span>
      </div>

      {/* Player + sidebar layout */}
      <div className="flex flex-col md:flex-row">
        {/* Player */}
        <div className="flex-1 bg-black relative" style={{ minHeight: '220px' }}>
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
          <div className="w-full" style={{ aspectRatio: '16/9' }}>
            <div ref={containerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Now Playing + Controls */}
        <div className="md:w-64 p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Now Playing</p>
            <p className="text-sm font-medium text-white line-clamp-2">{currentItem?.title || 'Unknown'}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{currentItem?.channel_name || ''}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mt-4">
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={handlePrev}>
              <SkipBack className="w-4 h-4 text-white" />
            </Button>
            <Button
              size="icon"
              className="h-11 w-11 rounded-full cp-btn-gradient border-0 text-white shrink-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={handleNext}>
              <SkipForward className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Track selector strip */}
      <div className="border-t border-white/10 p-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        {validItems.map((item, i) => (
          <button
            key={item.id || i}
            onClick={() => setCurrentIndex(i)}
            className="flex-shrink-0 relative group"
            style={{ width: '80px' }}
          >
            <div
              className="relative rounded-lg overflow-hidden transition-all"
              style={{
                border: i === currentIndex ? '2px solid #FF00FF' : '2px solid transparent',
                boxShadow: i === currentIndex ? '0 0 12px rgba(255,0,255,0.3)' : 'none',
              }}
            >
              <img
                src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`}
                alt={item.title}
                className="w-full h-12 object-cover"
                onError={(e) => { e.target.src = `https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`; }}
              />
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <p className="text-[9px] text-white truncate text-left">{i + 1}. {item.title}</p>
              </div>
              {i === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF00FF', boxShadow: '0 0 8px #FF00FF' }} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}