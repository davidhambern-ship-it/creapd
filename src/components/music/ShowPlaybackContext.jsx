import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';

const ShowPlaybackContext = createContext(null);
export const useShowPlayback = () => useContext(ShowPlaybackContext);

/**
 * ShowPlaybackProvider — persistent playback engine for music shows.
 *
 * Lifts the YouTube IFrame player, speech synthesis, and autoplay state machine
 * out of the page component so audio continues when navigating between music pages.
 *
 * MusicRundown registers its show data (rundown, playlist, topics, assets) via
 * registerShowData(). The provider handles all playback logic autonomously.
 */
export function ShowPlaybackProvider({ children }) {
  // ── Show data (registered by MusicRundown) ──
  const showDataRef = useRef({ rundown: [], playlist: [], topics: [], assets: [], config: null });
  const [showDataVersion, setShowDataVersion] = useState(0);

  const registerShowData = useCallback((data) => {
    showDataRef.current = data;
    setShowDataVersion(v => v + 1);
  }, []);

  // ── Playback state ──
  const [autoplayIndex, setAutoplayIndex] = useState(null);
  const [songPhase, setSongPhase] = useState(null); // 'intro' | 'song' | 'outro' | null
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(null);
  const [isYtPlaying, setIsYtPlaying] = useState(false);
  const [isYtReady, setIsYtReady] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);

  // ── Refs for latest values (used in callbacks) ──
  const autoplayIndexRef = useRef(autoplayIndex);
  autoplayIndexRef.current = autoplayIndex;
  const songPhaseRef = useRef(songPhase);
  songPhaseRef.current = songPhase;
  const isYtReadyRef = useRef(isYtReady);
  isYtReadyRef.current = isYtReady;

  // ── YT player ──
  const ytPlayerRef = useRef(null);
  const ytWrapperRef = useRef(null);

  // ── Lookup helpers ──
  const getData = () => showDataRef.current;

  const findSongTrack = useCallback((item) => {
    const { playlist = [] } = getData();
    if (item.associated_song_id) {
      const byId = playlist.find(p => p.id === item.associated_song_id);
      if (byId) return byId;
    }
    const titleKey = (item.title || '').toLowerCase().trim();
    return playlist.find(p => (p.song_title || '').toLowerCase().trim() === titleKey) || null;
  }, [showDataVersion]);

  const getSongIntroScript = useCallback((item) => {
    const { assets = [] } = getData();
    const track = findSongTrack(item);
    const titleKey = (track?.song_title || item.title || '').toLowerCase().trim();
    const intro = assets.find(a => a.asset_type === 'song_intro' && (a.associated_song_title || '').toLowerCase().trim() === titleKey);
    return intro?.content || '';
  }, [findSongTrack, showDataVersion]);

  const getSongOutroScript = useCallback((item) => {
    const { assets = [] } = getData();
    const track = findSongTrack(item);
    const titleKey = (track?.song_title || item.title || '').toLowerCase().trim();
    const outro = assets.find(a => a.asset_type === 'song_outro' && (a.associated_song_title || '').toLowerCase().trim() === titleKey);
    return outro?.content || '';
  }, [findSongTrack, showDataVersion]);

  const getScriptForItem = useCallback((item) => {
    const { topics = [] } = getData();
    const topicMap = {};
    topics.forEach(t => { topicMap[t.topic_name] = t; });
    return item.script_content ||
           (item.associated_topic && topicMap[item.associated_topic]?.talking_points) ||
           item.notes ||
           item.title || '';
  }, [showDataVersion]);

  const songScriptsByTitle = React.useMemo(() => {
    const { assets = [] } = getData();
    const m = {};
    assets.forEach(a => {
      if (a.asset_type !== 'song_intro' && a.asset_type !== 'song_outro') return;
      const key = (a.associated_song_title || '').toLowerCase().trim();
      if (!key) return;
      if (!m[key]) m[key] = {};
      if (a.asset_type === 'song_intro') m[key].intro = a.content;
      if (a.asset_type === 'song_outro') m[key].outro = a.content;
    });
    return m;
  }, [showDataVersion]);

  // ── Autoplay engine ──
  const advanceAutoplay = useCallback(() => {
    setSongPhase(null);
    setAutoplayIndex(prev => {
      if (prev === null) return null;
      const { rundown = [] } = getData();
      const next = prev + 1;
      return next < rundown.length ? next : null;
    });
  }, [showDataVersion]);

  const handleSongEndedRef = useRef(() => {});
  const handleSpeechEnd = useCallback((itemId) => {
    const idx = autoplayIndexRef.current;
    const { rundown = [] } = getData();
    if (idx === null || !rundown[idx]) return;
    const item = rundown[idx];
    if (item.id === itemId && item.segment_type === 'song') {
      if (songPhaseRef.current === 'intro') {
        setSongPhase('song');
        return;
      }
      if (songPhaseRef.current === 'outro') {
        advanceAutoplay();
        return;
      }
    }
    advanceAutoplay();
  }, [advanceAutoplay, showDataVersion]);

  const { speak, stop, speakingId, isSupported, voices } = useNativeSpeech({
    onEnd: handleSpeechEnd,
    selectedVoiceURI,
  });

  const handleSongEnded = useCallback(() => {
    const idx = autoplayIndexRef.current;
    const { rundown = [] } = getData();
    if (idx === null || !rundown[idx]) return;
    const item = rundown[idx];
    const outro = getSongOutroScript(item);
    if (outro) {
      setSongPhase('outro');
      speak(outro, item.id);
    } else {
      advanceAutoplay();
    }
  }, [speak, advanceAutoplay, getSongOutroScript, showDataVersion]);
  handleSongEndedRef.current = handleSongEnded;

  // ── YT API + Player initialization ──
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }
      if (ytPlayerRef.current || !ytWrapperRef.current) return;

      // Create the player container imperatively so React never tries to
      // manage or remove the node that YouTube replaces with an <iframe>.
      const playerDiv = document.createElement('div');
      ytWrapperRef.current.appendChild(playerDiv);

      ytPlayerRef.current = new window.YT.Player(playerDiv, {
        width: '1',
        height: '1',
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setIsYtReady(true),
          onStateChange: (e) => {
            if (e.data === 1) setIsYtPlaying(true);
            if (e.data === 2) setIsYtPlaying(false);
            if (e.data === 0) {
              setIsYtPlaying(false);
              handleSongEndedRef.current();
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
        ytPlayerRef.current = null;
      }
      if (ytWrapperRef.current) {
        ytWrapperRef.current.innerHTML = '';
      }
    };
  }, []);

  // ── Autoplay state machine ──
  useEffect(() => {
    if (autoplayIndex === null) return;
    const { rundown = [] } = getData();
    if (!rundown[autoplayIndex]) return;
    const item = rundown[autoplayIndex];

    if (item.segment_type === 'song') {
      if (songPhase === null) {
        const intro = getSongIntroScript(item);
        if (intro) {
          setSongPhase('intro');
          if (speakingId !== item.id) speak(intro, item.id);
        } else {
          setSongPhase('song');
        }
      } else if (songPhase === 'song') {
        const track = findSongTrack(item);
        if (track?.youtube_video_id) {
          setActiveVideoId(track.youtube_video_id);
          if (ytPlayerRef.current && isYtReadyRef.current) {
            try { ytPlayerRef.current.loadVideoById(track.youtube_video_id); } catch {}
          }
        }
      }
    } else {
      if (songPhase === null) {
        const script = getScriptForItem(item);
        if (script && speakingId !== item.id) speak(script, item.id);
      }
    }
  }, [autoplayIndex, songPhase, isYtReady, speakingId, speak, showDataVersion]);

  // ── Public actions ──
  const startAutoplay = useCallback((index) => {
    stop();
    setSongPhase(null);
    setAutoplayIndex(index);
  }, [stop]);

  const stopAutoplay = useCallback(() => {
    setSongPhase(null);
    setAutoplayIndex(null);
    setActiveVideoId(null);
    stop();
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.stopVideo(); } catch {}
    }
    setIsYtPlaying(false);
  }, [stop]);

  const handleNativePreview = useCallback((item, index) => {
    const script = getScriptForItem(item);
    if (speakingId === item.id) {
      stopAutoplay();
      return;
    }
    if (item.segment_type === 'intro' || autoplayIndexRef.current !== null) {
      startAutoplay(index);
      return;
    }
    speak(script, item.id);
  }, [speakingId, stopAutoplay, startAutoplay, speak, getScriptForItem]);

  const playSong = useCallback((videoId, itemIndex) => {
    if (autoplayIndexRef.current !== null) {
      setAutoplayIndex(itemIndex);
      setSongPhase('song');
    } else {
      setActiveVideoId(videoId);
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try { ytPlayerRef.current.loadVideoById(videoId); } catch {}
      }
    }
  }, []);

  const toggleYtPlayPause = useCallback(() => {
    if (!ytPlayerRef.current) return;
    if (isYtPlaying) {
      try { ytPlayerRef.current.pauseVideo(); } catch {}
    } else {
      try { ytPlayerRef.current.playVideo(); } catch {}
    }
  }, [isYtPlaying]);

  const value = {
    // Data
    config: showDataRef.current.config,
    rundown: showDataRef.current.rundown || [],
    playlist: showDataRef.current.playlist || [],
    topics: showDataRef.current.topics || [],
    assets: showDataRef.current.assets || [],
    registerShowData,

    // Playback state
    autoplayIndex,
    songPhase,
    speakingId,
    isYtPlaying,
    isYtReady,
    activeVideoId,

    // Voice
    selectedVoiceURI,
    setSelectedVoiceURI,
    voices,
    isSupported,

    // Actions
    startAutoplay,
    stopAutoplay,
    handleNativePreview,
    playSong,
    toggleYtPlayPause,

    // Lookup helpers
    findSongTrack,
    getScriptForItem,
    getSongIntroScript,
    getSongOutroScript,
    songScriptsByTitle,
  };

  return (
    <ShowPlaybackContext.Provider value={value}>
      {children}
      {/* Hidden persistent YouTube player — stays mounted across page navigation.
          The wrapper div is managed by React; the inner player container is
          created imperatively so YouTube's iframe replacement doesn't conflict
          with React's DOM reconciliation. */}
      <div
        ref={ytWrapperRef}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0 }}
      />
    </ShowPlaybackContext.Provider>
  );
}