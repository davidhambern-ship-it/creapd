import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { base44 } from '@/api/base44Client';
import TalkProgramMonitor from '@/components/talk/TalkProgramMonitor';
import { Button } from '@/components/ui/button';
import { SEGMENT_TYPE_LABELS, formatRuntime } from '@/lib/musicConstants';
import {
  ArrowLeft,
  Disc3,
  Gauge,
  Headphones,
  ListMusic,
  Loader2,
  Mic2,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ScrollText,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  WandSparkles,
} from 'lucide-react';

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function segmentLabel(segment) {
  if (!segment) return '—';
  return SEGMENT_TYPE_LABELS[segment.segment_type]
    || String(segment.segment_type || 'Segment').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function trackKey(track) {
  return track?.id || `${track?.song_title || ''}::${track?.artist || ''}`;
}

function parseSourcePayload(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {}
  }
  return {};
}

function hasVerifiedLyricMetadata(track) {
  const duration = Number(track?.length_seconds || 0);
  const payload = parseSourcePayload(track?.source_payload);
  const youtubeTitle = String(payload.youtube_title || '');
  const lyricSource =
    payload.youtube_source_type === 'lyric_video' ||
    /\blyric(?:s)?\b/i.test(youtubeTitle);

  return Boolean(track?.youtube_video_id) && duration >= 75 && lyricSource;
}

function useDualYouTubeDecks({ deckATrack, deckBTrack, activeDeck, onActiveEnded }) {
  const wrapperARef = useRef(null);
  const wrapperBRef = useRef(null);
  const playerARef = useRef(null);
  const playerBRef = useRef(null);
  const activeDeckRef = useRef(activeDeck);
  const endedRef = useRef(onActiveEnded);
  const [ready, setReady] = useState({ A: false, B: false });
  const [playing, setPlaying] = useState({ A: false, B: false });
  const [timing, setTiming] = useState({
    A: { current: 0, duration: 0 },
    B: { current: 0, duration: 0 },
  });

  activeDeckRef.current = activeDeck;
  endedRef.current = onActiveEnded;

  useEffect(() => {
    let cancelled = false;
    let timer;

    const ensureApi = () => {
      if (window.YT?.Player) return Promise.resolve();
      if (!document.querySelector('script[data-creapd-youtube-api]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.dataset.creapdYoutubeApi = 'true';
        document.body.appendChild(tag);
      }

      return new Promise(resolve => {
        const poll = () => {
          if (window.YT?.Player) {
            resolve();
            return;
          }
          timer = window.setTimeout(poll, 120);
        };
        poll();
      });
    };

    const createPlayer = (deck, wrapper, ref) => {
      if (!wrapper || ref.current || cancelled) return;
      const host = document.createElement('div');
      wrapper.innerHTML = '';
      wrapper.appendChild(host);
      ref.current = new window.YT.Player(host, {
        width: '1',
        height: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(value => ({ ...value, [deck]: true }));
          },
          onStateChange: event => {
            if (cancelled) return;
            const isPlaying = event.data === 1;
            if (event.data === 1 || event.data === 2 || event.data === 0) {
              setPlaying(value => ({ ...value, [deck]: isPlaying }));
            }
            if (event.data === 0 && activeDeckRef.current === deck) {
              endedRef.current?.(deck);
            }
          },
        },
      });
    };

    ensureApi().then(() => {
      if (cancelled) return;
      createPlayer('A', wrapperARef.current, playerARef);
      createPlayer('B', wrapperBRef.current, playerBRef);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      try { playerARef.current?.destroy?.(); } catch {}
      try { playerBRef.current?.destroy?.(); } catch {}
      playerARef.current = null;
      playerBRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready.A || !deckATrack?.youtube_video_id || !playerARef.current) return;
    try {
      playerARef.current.cueVideoById(deckATrack.youtube_video_id);
      playerARef.current.setVolume(activeDeck === 'A' ? 100 : 0);
    } catch {}
  }, [deckATrack?.youtube_video_id, ready.A]);

  useEffect(() => {
    if (!ready.B || !deckBTrack?.youtube_video_id || !playerBRef.current) return;
    try {
      playerBRef.current.cueVideoById(deckBTrack.youtube_video_id);
      playerBRef.current.setVolume(activeDeck === 'B' ? 100 : 0);
    } catch {}
  }, [deckBTrack?.youtube_video_id, ready.B]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = {};
      for (const [deck, ref] of [['A', playerARef], ['B', playerBRef]]) {
        const player = ref.current;
        let current = 0;
        let duration = 0;
        try {
          current = Number(player?.getCurrentTime?.() || 0);
          duration = Number(player?.getDuration?.() || 0);
        } catch {}
        next[deck] = { current, duration };
      }
      setTiming(next);
    }, 450);
    return () => window.clearInterval(timer);
  }, []);

  const playerFor = useCallback(deck => deck === 'A' ? playerARef.current : playerBRef.current, []);

  const setVolume = useCallback((deck, volume) => {
    try { playerFor(deck)?.setVolume?.(Math.max(0, Math.min(100, volume))); } catch {}
  }, [playerFor]);

  const play = useCallback(deck => {
    try { playerFor(deck)?.playVideo?.(); } catch {}
  }, [playerFor]);

  const pause = useCallback(deck => {
    try { playerFor(deck)?.pauseVideo?.(); } catch {}
  }, [playerFor]);

  const restart = useCallback(deck => {
    try {
      const player = playerFor(deck);
      player?.seekTo?.(0, true);
      player?.playVideo?.();
    } catch {}
  }, [playerFor]);

  const seek = useCallback((deck, seconds) => {
    try { playerFor(deck)?.seekTo?.(Number(seconds || 0), true); } catch {}
  }, [playerFor]);

  return {
    wrapperARef,
    wrapperBRef,
    ready,
    playing,
    timing,
    setVolume,
    play,
    pause,
    restart,
    seek,
  };
}

function DeckCard({
  deck,
  track,
  isActive,
  isPlaying,
  ready,
  timing,
  onPlayPause,
  onRestart,
  onSeek,
}) {
  const duration = timing?.duration || Number(track?.length_seconds || 0);
  const current = Math.min(timing?.current || 0, duration || Number.MAX_SAFE_INTEGER);
  const progressMax = Math.max(1, duration || 1);

  return (
    <div className={`rounded-xl border p-3 transition-all ${isActive ? 'border-fuchsia-400/45 bg-fuchsia-500/[0.09] shadow-[0_0_26px_rgba(217,70,239,.10)]' : 'border-cyan-400/20 bg-cyan-500/[0.04]'}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg grid place-items-center border ${isActive ? 'border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200' : 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200'}`}>
            <Disc3 className={`w-4 h-4 ${isPlaying ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-white/45">Deck {deck}</p>
            <p className={`text-[10px] font-bold tracking-wider ${isActive ? 'text-fuchsia-300' : 'text-cyan-300'}`}>
              {isActive ? '● ON AIR' : 'NEXT'}
            </p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border ${ready ? 'border-emerald-400/20 text-emerald-300 bg-emerald-500/[0.06]' : 'border-white/10 text-white/35'}`}>
          {ready ? 'READY' : 'LOADING'}
        </span>
      </div>

      <div className="min-h-[60px]">
        <h3 className="font-heading font-semibold text-sm md:text-base leading-tight line-clamp-2">{track?.song_title || 'No track loaded'}</h3>
        <p className="text-xs text-white/45 mt-1 truncate">{track?.artist || 'Choose a track from the playlist'}</p>
      </div>

      <input
        type="range"
        min="0"
        max={progressMax}
        step="0.25"
        value={Math.min(current, progressMax)}
        onChange={event => onSeek(Number(event.target.value))}
        disabled={!track?.youtube_video_id}
        className="w-full accent-fuchsia-400 mt-3"
      />

      <div className="flex items-center justify-between text-[10px] text-white/40 font-mono mt-1">
        <span>{formatClock(current)}</span>
        <span>-{formatClock(Math.max(0, duration - current))}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          type="button"
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          disabled={!track?.youtube_video_id || !ready}
          onClick={onPlayPause}
          className="h-8"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!track?.youtube_video_id || !ready}
          onClick={onRestart}
          className="h-8"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Cue
        </Button>
      </div>
    </div>
  );
}

function useDjFx() {
  const contextRef = useRef(null);
  const [firing, setFiring] = useState('');

  const getContext = () => {
    if (!contextRef.current) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      contextRef.current = new AudioCtor();
    }
    if (contextRef.current.state === 'suspended') contextRef.current.resume().catch(() => {});
    return contextRef.current;
  };

  const tone = (ctx, { type = 'sawtooth', from = 220, to = from, seconds = 0.5, gain = 0.12, delay = 0 }) => {
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(25, from), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, to), start + seconds);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.03);
  };

  const noise = (ctx, seconds = 0.5, gain = 0.08, highpass = 700) => {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    source.buffer = buffer;
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start();
  };

  const fire = useCallback(name => {
    const ctx = getContext();
    if (!ctx) return;
    setFiring(name);
    window.setTimeout(() => setFiring(''), 320);

    if (name === 'AIRHORN') {
      tone(ctx, { from: 392, to: 392, seconds: 0.45, gain: 0.11 });
      tone(ctx, { from: 523, to: 523, seconds: 0.45, gain: 0.08 });
      tone(ctx, { from: 659, to: 659, seconds: 0.45, gain: 0.06 });
    } else if (name === 'SWEEP') {
      tone(ctx, { type: 'sine', from: 120, to: 1800, seconds: 0.9, gain: 0.12 });
    } else if (name === 'SCRATCH') {
      noise(ctx, 0.32, 0.11, 900);
      tone(ctx, { type: 'square', from: 900, to: 180, seconds: 0.22, gain: 0.045 });
    } else if (name === 'APPLAUSE') {
      noise(ctx, 1.1, 0.08, 1100);
    } else if (name === 'DROP') {
      tone(ctx, { type: 'sine', from: 180, to: 42, seconds: 0.8, gain: 0.16 });
    } else if (name === 'RISER') {
      tone(ctx, { type: 'sawtooth', from: 90, to: 1300, seconds: 1.2, gain: 0.07 });
    } else if (name === 'STINGER') {
      [261, 329, 392].forEach((freq, index) => tone(ctx, { type: 'triangle', from: freq, to: freq * 1.04, seconds: 0.42, gain: 0.055, delay: index * 0.025 }));
    } else if (name === 'HIT') {
      tone(ctx, { type: 'sine', from: 120, to: 42, seconds: 0.24, gain: 0.22 });
    }
  }, []);

  return { fire, firing };
}

export default function RadioLive() {
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('config_id') || undefined;
  const { config, playlist, rundown, loading, error, refresh } = useMusicProduction(configId);
  const [metadataRepairing, setMetadataRepairing] = useState(false);
  const metadataRepairStartedRef = useRef(null);

  const sortedPlaylist = useMemo(
    () => [...(playlist || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [playlist],
  );
  const sortedRundown = useMemo(
    () => [...(rundown || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [rundown],
  );

  useEffect(() => {
    if (!config?.id || !sortedPlaylist.length) return;
    if (metadataRepairStartedRef.current === config.id) return;

    const needsRepair = sortedPlaylist.some(track => !hasVerifiedLyricMetadata(track));
    if (!needsRepair) return;

    metadataRepairStartedRef.current = config.id;
    setMetadataRepairing(true);

    base44.functions.invoke('refreshMusicYoutubeMetadata', {
      configuration_id: config.id,
    })
      .then(() => refresh())
      .catch(error => {
        console.error('Radio YouTube metadata repair failed:', error);
        metadataRepairStartedRef.current = null;
      })
      .finally(() => setMetadataRepairing(false));
  }, [config?.id, sortedPlaylist, refresh]);

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [teleprompterSize, setTeleprompterSize] = useState(24);
  const [showRunning, setShowRunning] = useState(false);
  const [showSeconds, setShowSeconds] = useState(0);
  const [deckAId, setDeckAId] = useState(null);
  const [deckBId, setDeckBId] = useState(null);
  const [activeDeck, setActiveDeck] = useState('A');
  const [crossfader, setCrossfader] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [autoDuck, setAutoDuck] = useState(false);
  const initializedForRef = useRef(null);
  const activeDeckRef = useRef(activeDeck);
  const playlistRef = useRef(sortedPlaylist);
  const deckAIdRef = useRef(deckAId);
  const deckBIdRef = useRef(deckBId);
  const transitionRef = useRef(false);

  activeDeckRef.current = activeDeck;
  playlistRef.current = sortedPlaylist;
  deckAIdRef.current = deckAId;
  deckBIdRef.current = deckBId;

  useEffect(() => {
    if (!showRunning) return undefined;
    const timer = window.setInterval(() => setShowSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [showRunning]);

  useEffect(() => {
    const key = config?.id || configId || 'latest';
    if (!sortedPlaylist.length || initializedForRef.current === key) return;
    initializedForRef.current = key;
    setDeckAId(trackKey(sortedPlaylist[0]));
    setDeckBId(trackKey(sortedPlaylist[1] || null) || null);
    setActiveDeck('A');
    setCrossfader(0);
  }, [config?.id, configId, sortedPlaylist]);

  const deckATrack = useMemo(() => sortedPlaylist.find(track => trackKey(track) === deckAId) || null, [deckAId, sortedPlaylist]);
  const deckBTrack = useMemo(() => sortedPlaylist.find(track => trackKey(track) === deckBId) || null, [deckBId, sortedPlaylist]);

  const currentSegment = sortedRundown[segmentIndex] || null;
  const nextSegment = sortedRundown[segmentIndex + 1] || null;

  const teleprompterText = useMemo(() => {
    if (!currentSegment) return 'No rundown segment is selected.';
    if (currentSegment.script_content) return currentSegment.script_content;
    if (currentSegment.notes) return currentSegment.notes;
    if (currentSegment.segment_type === 'song') {
      return `MUSIC PLAYBACK\n\n${currentSegment.title || 'Track'}\n\nNo host copy is scheduled during this song.`;
    }
    return currentSegment.title || 'No teleprompter copy was generated for this segment.';
  }, [currentSegment]);

  const promoteAndQueue = useCallback(nextActiveDeck => {
    const list = playlistRef.current;
    const nowId = nextActiveDeck === 'A' ? deckAIdRef.current : deckBIdRef.current;
    const currentIndex = list.findIndex(track => trackKey(track) === nowId);
    const following = currentIndex >= 0 ? list[currentIndex + 1] || null : null;
    const freeDeck = nextActiveDeck === 'A' ? 'B' : 'A';
    if (freeDeck === 'A') setDeckAId(following ? trackKey(following) : null);
    else setDeckBId(following ? trackKey(following) : null);
  }, []);

  const transitionDeckRef = useRef(async () => {});

  const decks = useDualYouTubeDecks({
    deckATrack,
    deckBTrack,
    activeDeck,
    onActiveEnded: () => transitionDeckRef.current?.(0),
  });

  const applyCrossfader = useCallback(value => {
    const safe = Math.max(0, Math.min(100, Number(value || 0)));
    setCrossfader(safe);
    decks.setVolume('A', 100 - safe);
    decks.setVolume('B', safe);
  }, [decks.setVolume]);

  const transitionToOther = useCallback(async (seconds = 0) => {
    if (transitionRef.current) return;
    const fromDeck = activeDeckRef.current;
    const toDeck = fromDeck === 'A' ? 'B' : 'A';
    const targetTrack = toDeck === 'A'
      ? playlistRef.current.find(track => trackKey(track) === deckAIdRef.current)
      : playlistRef.current.find(track => trackKey(track) === deckBIdRef.current);
    if (!targetTrack?.youtube_video_id) return;

    transitionRef.current = true;
    setTransitioning(true);
    decks.play(toDeck);

    const startValue = fromDeck === 'A' ? 0 : 100;
    const endValue = fromDeck === 'A' ? 100 : 0;

    if (seconds <= 0) {
      applyCrossfader(endValue);
      decks.pause(fromDeck);
    } else {
      const started = performance.now();
      await new Promise(resolve => {
        const tick = () => {
          const progress = Math.min(1, (performance.now() - started) / (seconds * 1000));
          applyCrossfader(startValue + (endValue - startValue) * progress);
          if (progress >= 1) resolve();
          else window.requestAnimationFrame(tick);
        };
        tick();
      });
      decks.pause(fromDeck);
    }

    setActiveDeck(toDeck);
    activeDeckRef.current = toDeck;
    promoteAndQueue(toDeck);
    transitionRef.current = false;
    setTransitioning(false);
  }, [applyCrossfader, decks.pause, decks.play, promoteAndQueue]);

  transitionDeckRef.current = transitionToOther;

  const loadNext = useCallback(track => {
    const inactiveDeck = activeDeckRef.current === 'A' ? 'B' : 'A';
    if (inactiveDeck === 'A') setDeckAId(trackKey(track));
    else setDeckBId(trackKey(track));
  }, []);

  const toggleDeck = deck => {
    if (decks.playing[deck]) decks.pause(deck);
    else decks.play(deck);
  };

  const { fire, firing } = useDjFx();
  const djPads = ['AIRHORN', 'SWEEP', 'SCRATCH', 'APPLAUSE', 'DROP', 'RISER', 'STINGER', 'HIT'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090d] grid place-items-center text-white">
        <div className="text-center"><Loader2 className="w-9 h-9 animate-spin text-fuchsia-400 mx-auto mb-3" /><p className="text-sm text-white/50">Opening Radio Studio…</p></div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-[#07090d] grid place-items-center text-white p-6">
        <div className="max-w-lg text-center">
          <Radio className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">Radio Studio could not open this production</h1>
          <p className="text-sm text-white/50 mb-5">{error?.message || 'No Radio production was found.'}</p>
          <Button asChild><Link to="/music/dashboard">Back to Radio Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const activeTrack = activeDeck === 'A' ? deckATrack : deckBTrack;
  const nextTrack = activeDeck === 'A' ? deckBTrack : deckATrack;

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <header className="sticky top-0 z-40 h-[66px] border-b border-white/10 bg-black/90 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="text-white/70">
            <Link to="/music/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Radio</Link>
          </Button>
          <div className="h-7 w-px bg-white/10" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-fuchsia-300">
              <Radio className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">CREAPD Radio Studio</span>
            </div>
            <h1 className="font-heading font-bold truncate text-lg">{config.production_name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline-flex text-[10px] px-2.5 py-1 rounded-full border ${showRunning ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/5 text-white/45'}`}>
            {showRunning ? '● ON AIR' : 'READY'}
          </span>
          <span className="font-mono text-lg min-w-[64px] text-right">{formatClock(showSeconds)}</span>
          <Button size="sm" onClick={() => setShowRunning(value => !value)} className="bg-fuchsia-600 hover:bg-fuchsia-500">
            {showRunning ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
            {showRunning ? 'Pause Show' : 'Start Show'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSegmentIndex(index => Math.min(sortedRundown.length - 1, index + 1))}
            disabled={!nextSegment}
            className="hidden md:inline-flex"
          >
            <SkipForward className="w-4 h-4 mr-1.5" /> Next Segment
          </Button>
        </div>
      </header>

      <main className="p-3 md:p-4 space-y-4 max-w-[1900px] mx-auto">
        <section className="min-h-[72px] rounded-xl border border-white/10 bg-gradient-to-r from-fuchsia-500/[0.08] via-white/[0.025] to-cyan-500/[0.07] px-4 py-3 flex items-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full min-w-0">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-fuchsia-300 font-semibold">Current Segment · {segmentIndex + 1}/{sortedRundown.length || 0}</p>
              <div className="flex items-center gap-2 mt-1 min-w-0">
                <span className="text-[10px] rounded bg-fuchsia-500/15 text-fuchsia-200 px-2 py-0.5 shrink-0">{segmentLabel(currentSegment)}</span>
                <h2 className="font-heading font-semibold truncate">{currentSegment?.title || 'No segment selected'}</h2>
              </div>
            </div>
            <SkipForward className="w-4 h-4 text-white/20" />
            <div className="min-w-0 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-cyan-300 font-semibold">Up Next</p>
              <div className="flex items-center justify-end gap-2 mt-1 min-w-0">
                <h3 className="font-heading font-semibold truncate">{nextSegment?.title || 'End of show'}</h3>
                {nextSegment && <span className="text-[10px] rounded bg-cyan-500/10 text-cyan-200 px-2 py-0.5 shrink-0">{segmentLabel(nextSegment)}</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.18fr)_minmax(520px,.82fr)] gap-4 items-start">
          <section className="space-y-4 min-w-0">
            <div className="relative rounded-2xl border border-white/10 bg-black overflow-hidden aspect-video min-h-[320px] xl:min-h-[400px] max-h-[560px]">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/50 px-2.5 py-1.5 text-[11px] text-white/60">
                <MonitorPlay className="w-4 h-4" /> PROGRAM MONITOR
              </div>
              <div className="absolute inset-0 grid place-items-center text-center px-6">
                <div>
                  <MonitorPlay className="w-12 h-12 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/60">Connect OBS and open the local Program Feed</p>
                  <p className="text-xs text-white/35 mt-1">OBS remains the broadcast engine. Radio decks do not control OBS.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.07] to-white/[0.02] overflow-hidden flex flex-col min-h-[360px]">
              <div className="h-12 shrink-0 border-b border-white/10 px-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-fuchsia-300">
                    <ScrollText className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Teleprompter</span>
                  </div>
                  <p className="text-[10px] text-white/40 truncate max-w-[420px]">{currentSegment?.title || 'Current host copy'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setTeleprompterSize(value => Math.max(16, value - 2))} className="h-7 px-2 rounded border border-white/10 bg-white/5 text-xs">A−</button>
                  <button type="button" onClick={() => setTeleprompterSize(value => Math.min(40, value + 2))} className="h-7 px-2 rounded border border-white/10 bg-white/5 text-xs">A+</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[520px] px-5 py-5">
                <div className="whitespace-pre-line font-medium leading-[1.55]" style={{ fontSize: `${teleprompterSize}px` }}>{teleprompterText}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 flex flex-col gap-3 min-w-0">
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Headphones className="w-4 h-4 text-fuchsia-300" /><h2 className="font-heading font-semibold text-sm">Dual Decks</h2></div>
                <div className="text-[10px] text-white/35 truncate max-w-[250px]">NOW: {activeTrack?.song_title || '—'} · NEXT: {nextTrack?.song_title || '—'}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DeckCard
                  deck="A"
                  track={deckATrack}
                  isActive={activeDeck === 'A'}
                  isPlaying={decks.playing.A}
                  ready={decks.ready.A}
                  timing={decks.timing.A}
                  onPlayPause={() => toggleDeck('A')}
                  onRestart={() => decks.restart('A')}
                  onSeek={seconds => decks.seek('A', seconds)}
                />
                <DeckCard
                  deck="B"
                  track={deckBTrack}
                  isActive={activeDeck === 'B'}
                  isPlaying={decks.playing.B}
                  ready={decks.ready.B}
                  timing={decks.timing.B}
                  onPlayPause={() => toggleDeck('B')}
                  onRestart={() => decks.restart('B')}
                  onSeek={seconds => decks.seek('B', seconds)}
                />
              </div>

              <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  <span>Deck A</span><span>Crossfader</span><span>Deck B</span>
                </div>
                <input type="range" min="0" max="100" value={crossfader} onChange={event => applyCrossfader(event.target.value)} className="w-full accent-fuchsia-400" />
                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {[0, 3, 5, 8].map(seconds => (
                    <button
                      key={seconds}
                      type="button"
                      disabled={transitioning || !nextTrack?.youtube_video_id}
                      onClick={() => transitionToOther(seconds)}
                      className="h-7 rounded-md border border-white/10 bg-white/[0.035] text-[10px] font-semibold hover:bg-white/[0.08] disabled:opacity-35"
                    >
                      {seconds === 0 ? 'CUT' : `${seconds}s MIX`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-black/25 p-2.5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><ListMusic className="w-4 h-4 text-cyan-300" /><h3 className="text-xs font-semibold">Playlist / Queue</h3></div>
                  <span className="text-[10px] text-white/35">{sortedPlaylist.length} tracks</span>
                </div>
                <div className="overflow-y-auto space-y-1 pr-1 max-h-[360px]">
                  {sortedPlaylist.map((track, index) => {
                    const id = trackKey(track);
                    const onA = id === deckAId;
                    const onB = id === deckBId;
                    const isOnAir = (activeDeck === 'A' && onA) || (activeDeck === 'B' && onB);
                    const isNext = !isOnAir && (onA || onB);
                    return (
                      <div key={id} className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 border ${isOnAir ? 'border-fuchsia-400/25 bg-fuchsia-500/[0.08]' : isNext ? 'border-cyan-400/20 bg-cyan-500/[0.05]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}>
                        <span className="text-[10px] text-white/35 text-center">{String(index + 1).padStart(2, '0')}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{track.song_title}</p>
                          <p className="text-[10px] text-white/35 truncate">{track.artist} · {formatRuntime(track.length_seconds)}</p>
                        </div>
                        {isOnAir ? (
                          <span className="text-[9px] font-bold text-fuchsia-300 px-2">ON AIR</span>
                        ) : isNext ? (
                          <span className="text-[9px] font-bold text-cyan-300 px-2">NEXT</span>
                        ) : (
                          <button type="button" onClick={() => loadNext(track)} className="h-6 px-2 rounded border border-white/10 bg-white/[0.035] text-[9px] hover:bg-white/[0.08]">LOAD NEXT</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.035] to-fuchsia-500/[0.04] p-2.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2"><WandSparkles className="w-4 h-4 text-amber-300" /><h3 className="text-xs font-semibold">DJ Booth</h3></div>
                  <button type="button" onClick={() => setAutoDuck(value => !value)} className={`h-6 px-2 rounded border text-[9px] font-semibold ${autoDuck ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-white/45'}`}>
                    <Mic2 className="w-3 h-3 inline mr-1" /> AUTO DUCK {autoDuck ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {djPads.map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => fire(name)}
                      className={`h-10 rounded-lg border text-[9px] font-bold tracking-wide transition-all ${firing === name ? 'border-amber-300 bg-amber-300 text-black scale-[.97]' : 'border-white/10 bg-black/35 text-white/70 hover:border-amber-300/30 hover:text-amber-200'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-fuchsia-300" /><h3 className="text-xs font-semibold">Run of Show</h3></div>
            <span className="text-[10px] text-white/35">{sortedRundown.length} segments</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortedRundown.map((segment, index) => {
              const selected = index === segmentIndex;
              return (
                <button
                  key={segment.id || index}
                  type="button"
                  onClick={() => setSegmentIndex(index)}
                  className={`shrink-0 w-[230px] min-h-[82px] rounded-lg border px-3 py-2.5 text-left transition-colors ${selected ? 'border-fuchsia-400/35 bg-fuchsia-500/[0.09]' : 'border-white/[0.06] bg-black/25 hover:bg-white/[0.04]'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-white/35">#{index + 1} · {segmentLabel(segment)}</span>
                    <span className="text-[9px] font-mono text-white/35">{formatClock(segment.duration_seconds)}</span>
                  </div>
                  <p className="text-xs font-medium mt-1.5 line-clamp-2 leading-tight">{segment.title || 'Untitled Segment'}</p>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <div ref={decks.wrapperARef} className="absolute w-px h-px opacity-0 pointer-events-none -left-[9999px]" />
      <div ref={decks.wrapperBRef} className="absolute w-px h-px opacity-0 pointer-events-none -left-[9999px]" />
      <TalkProgramMonitor />
    </div>
  );
}
