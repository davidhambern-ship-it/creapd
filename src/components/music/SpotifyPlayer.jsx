import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SkipForward, SkipBack, Music, ListMusic } from 'lucide-react';

/**
 * SpotifyPlayer — cycling Spotify embed player for audio tracks.
 * Uses Spotify's embed iframe to play full tracks (Premium) or 30s previews (Free).
 *
 * Props:
 *  - items: array of { id, spotify_track_id, song_title, artist, album_art_url, ... }
 *  - title: optional header title
 */
export default function SpotifyPlayer({ items = [], title = 'Player' }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const validItems = items.filter(i => i.spotify_track_id);
  const currentItem = validItems[currentIndex];

  useEffect(() => {
    if (currentIndex >= validItems.length) {
      setCurrentIndex(0);
    }
  }, [validItems.length, currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1 >= validItems.length ? 0 : prev + 1));
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 < 0 ? validItems.length - 1 : prev - 1));
  }, [validItems.length]);

  if (validItems.length === 0) {
    return (
      <div className="cp-glass rounded-2xl p-8 text-center" style={{ borderColor: 'rgba(29,185,84,0.15)' }}>
        <ListMusic className="w-10 h-10 mx-auto mb-2" style={{ color: 'rgba(29,185,84,0.3)' }} />
        <p className="text-gray-400 text-sm">No playable tracks yet. Generate a playlist to start listening.</p>
      </div>
    );
  }

  const embedUrl = currentItem
    ? `https://open.spotify.com/embed/track/${currentItem.spotify_track_id}?utm_source=generator`
    : '';

  return (
    <div className="cp-glass rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(29,185,84,0.25)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" style={{ color: '#1DB954' }}>
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.23.354-.66.482-1.014.254-2.778-1.701-6.27-2.084-10.392-1.146-.405.092-.81-.16-.902-.566-.092-.405.16-.81.566-.902 4.518-1.031 8.384-.588 11.475 1.302.354.23.482.66.254 1.014zm1.476-3.275c-.289.466-.892.612-1.358.323-3.182-1.958-8.039-2.526-11.797-1.384-.524.158-1.083-.137-1.243-.66-.158-.524.137-1.083.66-1.243 4.308-1.309 9.654-.676 13.299 1.546.466.289.612.892.323 1.358zm.127-3.394C15.281 8.547 8.73 8.298 5.204 9.427c-.626.2-1.293-.146-1.493-.772-.2-.626.146-1.293.772-1.493 4.078-1.302 11.378-1.004 15.804 1.428.589.349.784 1.108.435 1.697-.349.589-1.108.784-1.697.435z"/>
          </svg>
          <span className="text-xs uppercase tracking-wider text-gray-400">{title}</span>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {currentIndex + 1} / {validItems.length}
        </span>
      </div>

      {/* Player + sidebar */}
      <div className="flex flex-col md:flex-row">
        {/* Spotify Embed */}
        <div className="flex-1 bg-black relative">
          <iframe
            key={currentItem?.spotify_track_id}
            src={embedUrl}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: '0' }}
            title="Spotify Player"
          />
        </div>

        {/* Now Playing + Controls */}
        <div className="md:w-64 p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Now Playing</p>
            <p className="text-sm font-medium text-white line-clamp-2">{currentItem?.song_title || 'Unknown'}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{currentItem?.artist || ''}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 mt-4">
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-white/10" onClick={handlePrev}>
              <SkipBack className="w-4 h-4 text-white" />
            </Button>
            <a
              href={`https://open.spotify.com/track/${currentItem?.spotify_track_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#1DB954', boxShadow: '0 0 16px rgba(29,185,84,0.3)' }}
              title="Open in Spotify"
            >
              <Music className="w-5 h-5 text-white" />
            </a>
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
                border: i === currentIndex ? '2px solid #1DB954' : '2px solid transparent',
                boxShadow: i === currentIndex ? '0 0 12px rgba(29,185,84,0.3)' : 'none',
              }}
            >
              <img
                src={item.album_art_url || item.thumbnail_url || `https://placehold.co/80x60/1a1a1a/1DB954?text=${i + 1}`}
                alt={item.song_title}
                className="w-full h-12 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <p className="text-[9px] text-white truncate text-left">{i + 1}. {item.song_title}</p>
              </div>
              {i === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1DB954', boxShadow: '0 0 8px #1DB954' }} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}