import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Button } from '@/components/ui/button';
import FormatSwitcher from '@/components/layout/FormatSwitcher';
import RadioObsDirectorControl from '@/components/music/RadioObsDirectorControl';
import { SEGMENT_TYPE_LABELS, formatRuntime } from '@/lib/musicConstants';
import {
  ArrowLeft,
  Disc3,
  Headphones,
  ListMusic,
  Loader2,
  LockKeyhole,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ScrollText,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
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

function trackPayload(track) {
  const value = track?.source_payload;
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {}
  }
  return {};
}

function trackAudioUrl(track) {
  return String(trackPayload(track)?.audio_url || '').trim();
}

function trackPlayable(track) {
  return Boolean(track?.youtube_video_id || trackAudioUrl(track));
}

function useDualRadioDecks({ deckATrack, deckBTrack, activeDeck, onActiveEnded }) {
  const wrapperARef = useRef(null);
  const wrapperBRef = useRef(null);
  const playerARef = useRef(null);
  const playerBRef = useRef(null);
  const audioARef = useRef(null);
  const audioBRef = useRef(null);
  const activeDeckRef = useRef(activeDeck);
  const endedRef = useRef(onActiveEnded);
  const tracksRef = useRef({ A: deckATrack, B: deckBTrack });
  const pendingPlayRef = useRef({ A: false, B: false });
  const pendingUnlockRef = useRef({ A: false, B: false });
  const [ytReady, setYtReady] = useState({ A: false, B: false });
  const [audioReady, setAudioReady] = useState({ A: false, B: false });
  const [playing, setPlaying] = useState({ A: false, B: false });
  const [youtubeError, setYoutubeError] = useState({ A: null, B: null });
  const [playbackDiagnostic, setPlaybackDiagnostic] = useState({ A: '', B: '' });
  const [timing, setTiming] = useState({
    A: { current: 0, duration: 0 },
    B: { current: 0, duration: 0 },
  });

  activeDeckRef.current = activeDeck;
  endedRef.current = onActiveEnded;
  tracksRef.current = { A: deckATrack, B: deckBTrack };

  useEffect(() => {
    const makeAudio = deck => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.addEventListener('canplay', () => setAudioReady(value => ({ ...value, [deck]: true })));
      audio.addEventListener('loadedmetadata', () => setAudioReady(value => ({ ...value, [deck]: true })));
      audio.addEventListener('play', () => setPlaying(value => ({ ...value, [deck]: true })));
      audio.addEventListener('pause', () => setPlaying(value => ({ ...value, [deck]: false })));
      audio.addEventListener('ended', () => {
        setPlaying(value => ({ ...value, [deck]: false }));
        if (activeDeckRef.current === deck) endedRef.current?.(deck);
      });
      return audio;
    };

    audioARef.current = makeAudio('A');
    audioBRef.current = makeAudio('B');

    return () => {
      for (const ref of [audioARef, audioBRef]) {
        try {
          ref.current?.pause?.();
          if (ref.current) {
            ref.current.removeAttribute('src');
            ref.current.load?.();
          }
        } catch {}
        ref.current = null;
      }
    };
  }, []);

  const captureYoutubeState = useCallback((deck, label = '') => {
    const player = deck === 'A' ? playerARef.current : playerBRef.current;
    const track = tracksRef.current[deck];
    if (!player || trackAudioUrl(track)) return;

    let state = 'NA';
    let volume = 'NA';
    let muted = 'NA';
    let videoId = '';
    let current = 0;
    try { state = player.getPlayerState?.(); } catch {}
    try { volume = player.getVolume?.(); } catch {}
    try { muted = player.isMuted?.() ? 'yes' : 'no'; } catch {}
    try { videoId = player.getVideoData?.()?.video_id || ''; } catch {}
    try { current = Number(player.getCurrentTime?.() || 0).toFixed(1); } catch {}

    setPlaybackDiagnostic(value => ({
      ...value,
      [deck]: `${label ? `${label} · ` : ''}state ${state} · vol ${volume} · muted ${muted} · t ${current}s · video ${videoId || 'none'}`,
    }));
  }, []);

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
        width: '200',
        height: '200',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: event => {
            if (cancelled) return;
            setYtReady(value => ({ ...value, [deck]: true }));

            const track = tracksRef.current[deck];
            const videoId = track?.youtube_video_id;
            if (videoId && !trackAudioUrl(track)) {
              try {
                event.target.cueVideoById(videoId);
                event.target.setVolume(activeDeckRef.current === deck ? 100 : 0);
                if (pendingUnlockRef.current[deck]) {
                  pendingUnlockRef.current[deck] = false;
                  try {
                    event.target.mute();
                    event.target.loadVideoById(videoId);
                    event.target.playVideo();
                    window.setTimeout(() => {
                      try {
                        event.target.pauseVideo();
                        event.target.seekTo(0, true);
                        event.target.unMute();
                        event.target.setVolume(activeDeckRef.current === deck ? 100 : 0);
                        captureYoutubeState(deck, 'UNLOCKED');
                      } catch {}
                    }, 180);
                  } catch {}
                } else if (pendingPlayRef.current[deck]) {
                  pendingPlayRef.current[deck] = false;
                  try {
                    event.target.unMute();
                    event.target.setVolume(activeDeckRef.current === deck ? 100 : 0);
                    event.target.loadVideoById(videoId);
                    event.target.playVideo();
                    window.setTimeout(() => captureYoutubeState(deck, 'PLAY'), 700);
                  } catch {}
                }
              } catch {}
            }
          },
          onStateChange: event => {
            if (cancelled || trackAudioUrl(tracksRef.current[deck])) return;
            const isPlaying = event.data === 1;
            if (event.data === 1 || event.data === 2 || event.data === 0) {
              setPlaying(value => ({ ...value, [deck]: isPlaying }));
            }
            if (event.data === 1) {
              setYoutubeError(value => ({ ...value, [deck]: null }));
            }
            if (event.data === 0 && activeDeckRef.current === deck) {
              endedRef.current?.(deck);
            }
          },
          onError: event => {
            if (cancelled) return;
            pendingPlayRef.current[deck] = false;
            setPlaying(value => ({ ...value, [deck]: false }));
            setYoutubeError(value => ({ ...value, [deck]: Number(event?.data || 0) || 'unknown' }));
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
  }, [captureYoutubeState]);

  const loadDeck = useCallback((deck, track, isActive) => {
    const audioRef = deck === 'A' ? audioARef : audioBRef;
    const playerRef = deck === 'A' ? playerARef : playerBRef;
    const audioUrl = trackAudioUrl(track);

    setPlaying(value => ({ ...value, [deck]: false }));
    setYoutubeError(value => ({ ...value, [deck]: null }));

    if (audioUrl) {
      setAudioReady(value => ({ ...value, [deck]: false }));
      try { playerRef.current?.pauseVideo?.(); } catch {}
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.src !== audioUrl) {
        audio.src = audioUrl;
        audio.load();
      }
      audio.volume = isActive ? 1 : 0;
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      try { audio.pause(); } catch {}
      if (audio.src) {
        try {
          audio.removeAttribute('src');
          audio.load();
        } catch {}
      }
    }
    setAudioReady(value => ({ ...value, [deck]: false }));

    const videoId = track?.youtube_video_id;
    if (!videoId || !playerRef.current) return;
    try {
      playerRef.current.cueVideoById(videoId);
      playerRef.current.setVolume(isActive ? 100 : 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadDeck('A', deckATrack, activeDeck === 'A');
  }, [deckATrack?.id, deckATrack?.youtube_video_id, trackAudioUrl(deckATrack), activeDeck, ytReady.A, loadDeck]);

  useEffect(() => {
    loadDeck('B', deckBTrack, activeDeck === 'B');
  }, [deckBTrack?.id, deckBTrack?.youtube_video_id, trackAudioUrl(deckBTrack), activeDeck, ytReady.B, loadDeck]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = {};
      for (const deck of ['A', 'B']) {
        const track = tracksRef.current[deck];
        const audioUrl = trackAudioUrl(track);
        let current = 0;
        let duration = 0;

        if (audioUrl) {
          const audio = deck === 'A' ? audioARef.current : audioBRef.current;
          current = Number(audio?.currentTime || 0);
          duration = Number(audio?.duration || track?.length_seconds || 0);
        } else {
          const player = deck === 'A' ? playerARef.current : playerBRef.current;
          try {
            current = Number(player?.getCurrentTime?.() || 0);
            duration = Number(player?.getDuration?.() || track?.length_seconds || 0);
          } catch {}
        }

        next[deck] = {
          current: Number.isFinite(current) ? current : 0,
          duration: Number.isFinite(duration) ? duration : Number(track?.length_seconds || 0),
        };
      }
      setTiming(next);
    }, 450);
    return () => window.clearInterval(timer);
  }, []);

  const sourceFor = useCallback(deck => {
    const track = tracksRef.current[deck];
    const audioUrl = trackAudioUrl(track);
    return {
      track,
      audioUrl,
      audio: deck === 'A' ? audioARef.current : audioBRef.current,
      player: deck === 'A' ? playerARef.current : playerBRef.current,
    };
  }, []);

  const setVolume = useCallback((deck, volume) => {
    const safe = Math.max(0, Math.min(100, Number(volume || 0)));
    const source = sourceFor(deck);
    if (source.audioUrl && source.audio) {
      source.audio.volume = safe / 100;
    } else {
      try { source.player?.setVolume?.(safe); } catch {}
    }
  }, [sourceFor]);

  const play = useCallback(deck => {
    const source = sourceFor(deck);
    if (source.audioUrl && source.audio) {
      if (activeDeckRef.current === deck) source.audio.volume = 1;
      source.audio.play().catch(error => {
        setPlaybackDiagnostic(value => ({ ...value, [deck]: `AUDIO ERROR · ${error?.name || error?.message || 'play failed'}` }));
      });
      return;
    }

    const readyForYoutube = deck === 'A' ? ytReady.A : ytReady.B;
    if (!source.player || !readyForYoutube) {
      pendingPlayRef.current[deck] = true;
      setPlaybackDiagnostic(value => ({ ...value, [deck]: 'PLAY QUEUED · waiting for YouTube player' }));
      return;
    }

    pendingPlayRef.current[deck] = false;
    const videoId = source.track?.youtube_video_id;
    try {
      source.player.unMute?.();
      if (activeDeckRef.current === deck) source.player.setVolume?.(100);

      const loadedId = source.player.getVideoData?.()?.video_id || '';
      if (videoId && loadedId !== videoId) {
        source.player.loadVideoById?.(videoId);
      } else {
        source.player.playVideo?.();
      }

      window.setTimeout(() => captureYoutubeState(deck, 'PLAY'), 700);
    } catch (error) {
      setPlaybackDiagnostic(value => ({ ...value, [deck]: `YT PLAY ERROR · ${error?.message || 'unknown'}` }));
    }
  }, [sourceFor, ytReady.A, ytReady.B, captureYoutubeState]);

  const unlock = useCallback(() => {
    for (const deck of ['A', 'B']) {
      const source = sourceFor(deck);
      if (source.audioUrl && source.audio) {
        try {
          source.audio.muted = true;
          const promise = source.audio.play();
          Promise.resolve(promise).catch(() => {}).finally(() => {
            try {
              source.audio.pause();
              source.audio.currentTime = 0;
              source.audio.muted = false;
              source.audio.volume = activeDeckRef.current === deck ? 1 : 0;
            } catch {}
          });
        } catch {}
        continue;
      }

      const readyForYoutube = deck === 'A' ? ytReady.A : ytReady.B;
      const videoId = source.track?.youtube_video_id;
      if (!videoId) continue;

      if (!source.player || !readyForYoutube) {
        pendingUnlockRef.current[deck] = true;
        continue;
      }

      try {
        source.player.mute?.();
        source.player.loadVideoById?.(videoId);
        source.player.playVideo?.();
        window.setTimeout(() => {
          try {
            source.player.pauseVideo?.();
            source.player.seekTo?.(0, true);
            source.player.unMute?.();
            source.player.setVolume?.(activeDeckRef.current === deck ? 100 : 0);
            captureYoutubeState(deck, 'UNLOCKED');
          } catch {}
        }, 180);
      } catch {}
    }
  }, [sourceFor, ytReady.A, ytReady.B, captureYoutubeState]);

  const pause = useCallback(deck => {
    pendingPlayRef.current[deck] = false;
    const source = sourceFor(deck);
    if (source.audioUrl && source.audio) {
      try { source.audio.pause(); } catch {}
    } else {
      try { source.player?.pauseVideo?.(); } catch {}
    }
  }, [sourceFor]);

  const restart = useCallback(deck => {
    const source = sourceFor(deck);
    if (source.audioUrl && source.audio) {
      try {
        source.audio.currentTime = 0;
        source.audio.play().catch(() => {});
      } catch {}
    } else {
      try {
        source.player?.seekTo?.(0, true);
        source.player?.playVideo?.();
      } catch {}
    }
  }, [sourceFor]);

  const seek = useCallback((deck, seconds) => {
    const source = sourceFor(deck);
    if (source.audioUrl && source.audio) {
      try { source.audio.currentTime = Number(seconds || 0); } catch {}
    } else {
      try { source.player?.seekTo?.(Number(seconds || 0), true); } catch {}
    }
  }, [sourceFor]);

  const ready = {
    A: trackAudioUrl(deckATrack)
      ? audioReady.A
      : Boolean(deckATrack?.youtube_video_id && ytReady.A),
    B: trackAudioUrl(deckBTrack)
      ? audioReady.B
      : Boolean(deckBTrack?.youtube_video_id && ytReady.B),
  };

  return {
    wrapperARef,
    wrapperBRef,
    ready,
    playing,
    timing,
    youtubeError,
    playbackDiagnostic,
    setVolume,
    play,
    pause,
    unlock,
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
  youtubeError,
  playbackDiagnostic,
  onPlayPause,
  onRestart,
  onSeek,
}) {
  const duration = timing?.duration || Number(track?.length_seconds || 0);
  const current = Math.min(timing?.current || 0, duration || Number.MAX_SAFE_INTEGER);
  const progressMax = Math.max(1, duration || 1);
  const playable = trackPlayable(track);
  const sourceLabel = trackAudioUrl(track) ? 'ARTIST AUDIO' : track?.youtube_video_id ? 'YOUTUBE' : 'NO MEDIA';

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
        <span className={`text-[10px] px-2 py-1 rounded-full border ${
          youtubeError
            ? 'border-red-400/25 text-red-300 bg-red-500/[0.07]'
            : ready
              ? 'border-emerald-400/20 text-emerald-300 bg-emerald-500/[0.06]'
              : 'border-white/10 text-white/35'
        }`}>
          {youtubeError ? `YT ERROR ${youtubeError}` : ready ? 'READY' : playable ? 'LOADING' : 'NO MEDIA'}
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
        disabled={!playable}
        className="w-full accent-fuchsia-400 mt-3"
      />

      <div className="flex items-center justify-between text-[10px] text-white/40 font-mono mt-1">
        <span>{formatClock(current)}</span>
        <span>{sourceLabel} · -{formatClock(Math.max(0, duration - current))}</span>
      </div>
      {playbackDiagnostic && (
        <p className="mt-1 text-[9px] font-mono leading-snug text-amber-200/70 break-all">{playbackDiagnostic}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          type="button"
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          disabled={!playable || !ready}
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
          disabled={!playable || !ready}
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
  const {
    config,
    playlist,
    rundown,
    loading,
    error,
    productionRepairing,
  } = useMusicProduction(configId);

  const hasRundown = rundown.length > 0;
  const hasSpokenSegments = rundown.some(segment => String(segment?.segment_type || '').toLowerCase() !== 'song');
  const studioApproved = config?.status === 'approved' && playlist.length > 0 && hasRundown && hasSpokenSegments;

  const rejectedTrackIds = useMemo(
    () => new Set(
      (playlist || [])
        .filter(track => String(track?.status || '').toLowerCase() === 'rejected')
        .map(track => track.id)
    ),
    [playlist],
  );
  const rejectedTrackTitles = useMemo(
    () => new Set(
      (playlist || [])
        .filter(track => String(track?.status || '').toLowerCase() === 'rejected')
        .map(track => String(track?.song_title || '').toLowerCase())
    ),
    [playlist],
  );

  const sortedPlaylist = useMemo(
    () => studioApproved
      ? [...(playlist || [])]
          .filter(track => String(track?.status || '').toLowerCase() !== 'rejected')
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      : [],
    [playlist, studioApproved],
  );
  const sortedRundown = useMemo(
    () => studioApproved
      ? [...(rundown || [])]
          .filter(segment => {
            if (String(segment?.status || '').toLowerCase() === 'rejected') return false;
            if (segment?.segment_type !== 'song') return true;
            if (segment?.associated_song_id && rejectedTrackIds.has(segment.associated_song_id)) return false;
            const title = String(segment?.associated_song_title || segment?.title || '').toLowerCase();
            return !rejectedTrackTitles.has(title);
          })
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      : [],
    [rundown, rejectedTrackIds, rejectedTrackTitles, studioApproved],
  );

  const [segmentIndex, setSegmentIndex] = useState(0);
  const [teleprompterSize, setTeleprompterSize] = useState(24);
  const [showRunning, setShowRunning] = useState(false);
  const [showSeconds, setShowSeconds] = useState(0);
  const [segmentSeconds, setSegmentSeconds] = useState(0);
  const [deckAId, setDeckAId] = useState(null);
  const [deckBId, setDeckBId] = useState(null);
  const [activeDeck, setActiveDeck] = useState('A');
  const [crossfader, setCrossfader] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const initializedForRef = useRef(null);
  const activeDeckRef = useRef(activeDeck);
  const playlistRef = useRef(sortedPlaylist);
  const deckAIdRef = useRef(deckAId);
  const deckBIdRef = useRef(deckBId);
  const transitionRef = useRef(false);
  const activeEndedRef = useRef(() => {});
  const rundownRef = useRef(sortedRundown);
  const segmentIndexRef = useRef(segmentIndex);

  activeDeckRef.current = activeDeck;
  playlistRef.current = sortedPlaylist;
  rundownRef.current = sortedRundown;
  segmentIndexRef.current = segmentIndex;
  deckAIdRef.current = deckAId;
  deckBIdRef.current = deckBId;

  useEffect(() => {
    if (!showRunning) return undefined;
    const timer = window.setInterval(() => {
      setShowSeconds(value => value + 1);
      setSegmentSeconds(value => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showRunning]);

  useEffect(() => {
    setSegmentSeconds(0);
  }, [segmentIndex]);

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

  const decks = useDualRadioDecks({
    deckATrack,
    deckBTrack,
    activeDeck,
    onActiveEnded: () => activeEndedRef.current?.(),
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
    if (!trackPlayable(targetTrack)) return;

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

  const trackForSegment = useCallback(segment => {
    if (!segment || segment.segment_type !== 'song') return null;
    const id = segment.associated_song_id;
    if (id) {
      const exact = playlistRef.current.find(track => track.id === id);
      if (exact) return exact;
    }
    const title = String(segment.associated_song_title || segment.title || '').trim().toLowerCase();
    if (!title) return null;
    return playlistRef.current.find(track => String(track.song_title || '').trim().toLowerCase() === title) || null;
  }, []);

  const selectSegment = useCallback(index => {
    const safe = Math.max(0, Math.min(rundownRef.current.length - 1, Number(index || 0)));
    const segment = rundownRef.current[safe];
    if (!segment) return;

    setSegmentIndex(safe);
    const track = trackForSegment(segment);
    if (track) {
      const activeId = activeDeckRef.current === 'A' ? deckAIdRef.current : deckBIdRef.current;
      if (trackKey(track) !== activeId) loadNext(track);
    }
  }, [loadNext, trackForSegment]);

  const advanceSegment = useCallback(() => {
    if (segmentIndexRef.current >= rundownRef.current.length - 1) return;
    selectSegment(segmentIndexRef.current + 1);
  }, [selectSegment]);

  const startSongSegment = useCallback(segment => {
    const track = trackForSegment(segment);
    if (!track || !trackPlayable(track)) return;

    const id = trackKey(track);
    const currentActiveDeck = activeDeckRef.current;
    const activeId = currentActiveDeck === 'A' ? deckAIdRef.current : deckBIdRef.current;
    const otherDeck = currentActiveDeck === 'A' ? 'B' : 'A';
    const otherId = otherDeck === 'A' ? deckAIdRef.current : deckBIdRef.current;

    if (id === activeId) {
      decks.play(currentActiveDeck);
      return;
    }

    if (id === otherId) {
      transitionDeckRef.current?.(0);
      return;
    }

    if (otherDeck === 'A') {
      deckAIdRef.current = id;
      setDeckAId(id);
    } else {
      deckBIdRef.current = id;
      setDeckBId(id);
    }

    window.setTimeout(() => {
      transitionDeckRef.current?.(0);
    }, 120);
  }, [decks.play, trackForSegment]);

  const handleShowToggle = useCallback(() => {
    if (showRunning) {
      setShowRunning(false);
      decks.pause(activeDeckRef.current);
      return;
    }

    decks.unlock();
    setShowRunning(true);
    const segment = rundownRef.current[segmentIndexRef.current];
    if (segment?.segment_type === 'song') {
      startSongSegment(segment);
    }
  }, [showRunning, decks.pause, decks.unlock, startSongSegment]);

  useEffect(() => {
    if (!showRunning || !currentSegment) return;

    if (currentSegment.segment_type === 'song') {
      startSongSegment(currentSegment);
      return;
    }

    // Spoken segments are live-host/teleprompter segments. Keep music off while
    // the host is on mic, then advance when the planned segment runtime expires.
    decks.pause(activeDeckRef.current);
  }, [showRunning, segmentIndex, currentSegment?.id, currentSegment?.segment_type, startSongSegment, decks.pause]);

  useEffect(() => {
    if (!showRunning || !currentSegment || currentSegment.segment_type === 'song') return;
    const planned = Math.max(0, Number(currentSegment.duration_seconds || 0));
    if (!planned || segmentSeconds < planned) return;
    advanceSegment();
  }, [showRunning, segmentSeconds, currentSegment?.id, currentSegment?.segment_type, currentSegment?.duration_seconds, advanceSegment]);

  activeEndedRef.current = () => {
    const index = segmentIndexRef.current;
    const current = rundownRef.current[index];
    const next = rundownRef.current[index + 1] || null;
    if (!current || current.segment_type !== 'song') return;

    if (!next) {
      setShowRunning(false);
      return;
    }

    setSegmentIndex(index + 1);
    if (next.segment_type === 'song') {
      const nextTrack = trackForSegment(next);
      if (nextTrack) loadNext(nextTrack);
      if (showRunning) window.setTimeout(() => transitionDeckRef.current?.(0), 100);
    }
  };

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

  if (!studioApproved) {
    const missingAssembly = playlist.length > 0 && (!hasRundown || !hasSpokenSegments);

    return (
      <div className="min-h-screen bg-[#07090d] grid place-items-center text-white p-6">
        <div className="max-w-lg text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          {productionRepairing || missingAssembly
            ? <Loader2 className="w-12 h-12 text-cyan-300/80 mx-auto mb-4 animate-spin" />
            : <LockKeyhole className="w-12 h-12 text-fuchsia-300/70 mx-auto mb-4" />}
          <h1 className="text-xl font-heading font-bold mb-2">
            {productionRepairing || missingAssembly ? 'CREAPD is finishing this Radio show' : 'Radio Studio is locked'}
          </h1>
          <p className="text-sm text-white/50 mb-2">
            {productionRepairing || missingAssembly
              ? 'The playlist exists, but the rundown and on-air segments were never fully assembled. CREAPD is generating the missing production material now.'
              : 'This show is still in review. The complete playlist, rundown, and scripts must be approved before Studio opens.'}
          </p>
          <p className="text-xs text-white/30 mb-5">
            {productionRepairing || missingAssembly
              ? 'When it finishes, review the newly generated spoken segments on the Radio Dashboard. You will not need to rebuild the playlist.'
              : 'Approve every track and spoken segment on the Radio Dashboard to unlock it.'}
          </p>
          <Button asChild><Link to="/music/dashboard">Back to Review Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const activeTrack = activeDeck === 'A' ? deckATrack : deckBTrack;
  const nextTrack = activeDeck === 'A' ? deckBTrack : deckATrack;
  const showPaused = !showRunning && showSeconds > 0;
  const plannedSegmentSeconds = Math.max(0, Number(currentSegment?.duration_seconds || 0));
  const segmentRemaining = plannedSegmentSeconds > 0
    ? Math.max(0, plannedSegmentSeconds - segmentSeconds)
    : 0;

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
          <FormatSwitcher format="radio" compact />
          <RadioObsDirectorControl
            config={config}
            currentSegment={currentSegment}
            activeTrack={activeTrack}
          />
          <span className={`hidden sm:inline-flex text-[10px] px-2.5 py-1 rounded-full border ${
            showRunning
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : showPaused
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-white/10 bg-white/5 text-white/45'
          }`}>
            {showRunning ? '● ON AIR' : showPaused ? 'PAUSED' : 'READY'}
          </span>
          <span className="font-mono text-lg min-w-[64px] text-right">{formatClock(showSeconds)}</span>
          <Button size="sm" onClick={handleShowToggle} className="bg-fuchsia-600 hover:bg-fuchsia-500">
            {showRunning ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
            {showRunning ? 'Pause Show' : showPaused ? 'Resume Show' : 'Start Show'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={advanceSegment}
            disabled={!nextSegment}
            className="hidden md:inline-flex"
          >
            <SkipForward className="w-4 h-4 mr-1.5" /> Next Segment
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hidden lg:inline-flex h-8 w-8 p-0 text-white/45 hover:text-white"
            onClick={() => {
              setShowRunning(false);
              decks.pause(activeDeckRef.current);
              setShowSeconds(0);
              setSegmentIndex(0);
              setSegmentSeconds(0);
            }}
            title="Reset show clock and return to the first segment"
          >
            <RotateCcw className="w-3.5 h-3.5" />
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
                {showRunning && currentSegment && (
                  <span className={`shrink-0 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border ${
                    currentSegment.segment_type === 'song'
                      ? 'border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-300'
                      : 'border-amber-400/25 bg-amber-500/[0.08] text-amber-200'
                  }`}>
                    {currentSegment.segment_type === 'song' ? 'MUSIC ON AIR' : 'HOST LIVE · TELEPROMPTER'}
                  </span>
                )}
                {currentSegment && (
                  <span className="shrink-0 font-mono text-[10px] text-white/35">
                    {plannedSegmentSeconds > 0
                      ? `${formatClock(segmentSeconds)} / ${formatClock(plannedSegmentSeconds)} · -${formatClock(segmentRemaining)}`
                      : formatClock(segmentSeconds)}
                  </span>
                )}
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
              <div id="talk-program-monitor-obs-control" className="absolute top-3 right-3 z-30" />
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
                  youtubeError={decks.youtubeError.A}
                  playbackDiagnostic={decks.playbackDiagnostic.A}
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
                  youtubeError={decks.youtubeError.B}
                  playbackDiagnostic={decks.playbackDiagnostic.B}
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
                      disabled={transitioning || !trackPlayable(nextTrack)}
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
                  <span className="h-6 px-2 inline-flex items-center rounded border border-white/10 bg-white/[0.03] text-[9px] font-semibold text-white/40">
                    LIVE FX
                  </span>
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
                  onClick={() => selectSegment(index)}
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

      <div ref={decks.wrapperARef} style={{ position: 'fixed', width: 200, height: 200, left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }} />
      <div ref={decks.wrapperBRef} style={{ position: 'fixed', width: 200, height: 200, left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }} />
    </div>
  );
}
