import { useCallback, useEffect, useRef, useState } from 'react';

export const HUMAN_VOICES = [
  { id: 'af_heart', name: 'Heart', label: 'Heart · American woman' },
  { id: 'af_bella', name: 'Bella', label: 'Bella · American woman' },
  { id: 'am_michael', name: 'Michael', label: 'Michael · American man' },
  { id: 'am_fenrir', name: 'Fenrir', label: 'Fenrir · American man' },
  { id: 'bf_emma', name: 'Emma', label: 'Emma · British woman' },
];

const DEFAULT_VOICE = 'af_heart';
const ENABLED_KEY = 'creapd.radio.humanVoice.enabled';
const VOICE_KEY = 'creapd.radio.humanVoice.voice';

function storedBoolean(key, fallback = false) {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
}

function storedVoice() {
  if (typeof window === 'undefined') return DEFAULT_VOICE;
  const value = window.localStorage.getItem(VOICE_KEY);
  return HUMAN_VOICES.some(voice => voice.id === value) ? value : DEFAULT_VOICE;
}

function splitForSpeech(value, maxChars = 360) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences.length ? sentences : [normalized]) {
    if (sentence.length <= maxChars) {
      if (!current) current = sentence;
      else if ((current.length + 1 + sentence.length) <= maxChars) current += ` ${sentence}`;
      else {
        flush();
        current = sentence;
      }
      continue;
    }

    flush();
    const words = sentence.split(/\s+/);
    let piece = '';
    for (const word of words) {
      if (!piece) piece = word;
      else if ((piece.length + 1 + word.length) <= maxChars) piece += ` ${word}`;
      else {
        chunks.push(piece);
        piece = word;
      }
    }
    if (piece) current = piece;
  }

  flush();
  return chunks;
}

export function useHumanVoice({ onEnd } = {}) {
  const [enabled, setEnabledState] = useState(() => storedBoolean(ENABLED_KEY, false));
  const [selectedVoice, setSelectedVoiceState] = useState(storedVoice);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState('');
  const [speakingId, setSpeakingId] = useState(null);
  const [error, setError] = useState('');

  const workerRef = useRef(null);
  const audioRef = useRef(null);
  const readyRef = useRef(false);
  const readyWaitersRef = useRef([]);
  const requestsRef = useRef(new Map());
  const requestCounterRef = useRef(0);
  const speechRunRef = useRef(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const getAudio = useCallback(() => {
    if (!audioRef.current && typeof Audio !== 'undefined') {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === 'undefined') throw new Error('This browser cannot run CREAPD Human Voice.');

    const worker = new Worker('/creapd-human-voice-worker.js', { type: 'module' });
    workerRef.current = worker;

    worker.addEventListener('message', event => {
      const message = event.data || {};

      if (message.type === 'loading') {
        setDevice(message.device || '');
        setStatus('loading');
        return;
      }

      if (message.type === 'progress') {
        setDevice(message.device || '');
        if (Number.isFinite(Number(message.progress))) {
          setProgress(Math.round(Number(message.progress)));
        }
        return;
      }

      if (message.type === 'ready') {
        readyRef.current = true;
        setDevice(message.device || '');
        setProgress(100);
        setStatus(current => current === 'speaking' || current === 'generating' ? current : 'ready');
        const waiters = readyWaitersRef.current.splice(0);
        waiters.forEach(waiter => waiter.resolve());
        return;
      }

      if (message.type === 'audio' || message.type === 'error') {
        const request = requestsRef.current.get(message.id);
        if (!request) return;
        requestsRef.current.delete(message.id);
        if (message.type === 'audio') request.resolve(message.blob);
        else request.reject(new Error(message.error || 'Human voice generation failed.'));
        return;
      }

      if (message.type === 'error') {
        const err = new Error(message.error || 'Human voice failed.');
        setError(err.message);
        setStatus('error');
        const waiters = readyWaitersRef.current.splice(0);
        waiters.forEach(waiter => waiter.reject(err));
      }
    });

    worker.addEventListener('error', event => {
      const err = new Error(event?.message || 'Human voice worker failed.');
      setError(err.message);
      setStatus('error');
      readyRef.current = false;
      const waiters = readyWaitersRef.current.splice(0);
      waiters.forEach(waiter => waiter.reject(err));
      for (const request of requestsRef.current.values()) request.reject(err);
      requestsRef.current.clear();
    });

    return worker;
  }, []);

  const prepare = useCallback(async () => {
    if (readyRef.current) return;
    const worker = ensureWorker();
    setError('');
    setStatus('loading');

    await new Promise((resolve, reject) => {
      readyWaitersRef.current.push({ resolve, reject });
      worker.postMessage({ type: 'init' });
    });
  }, [ensureWorker]);

  const generateChunk = useCallback(async (text, voice) => {
    await prepare();
    const worker = ensureWorker();
    const id = `voice-${Date.now()}-${++requestCounterRef.current}`;

    return await new Promise((resolve, reject) => {
      requestsRef.current.set(id, { resolve, reject });
      worker.postMessage({
        type: 'generate',
        id,
        text,
        voice,
        speed: 1,
      });
    });
  }, [ensureWorker, prepare]);

  const playBlob = useCallback((blob, runId) => {
    return new Promise((resolve, reject) => {
      const audio = getAudio();
      if (!audio || speechRunRef.current !== runId) {
        resolve();
        return;
      }

      const url = URL.createObjectURL(blob);
      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
        URL.revokeObjectURL(url);
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error('CREAPD Human Voice audio could not play.'));
      };
      audio.src = url;
      audio.currentTime = 0;
      audio.play().catch(err => {
        cleanup();
        reject(err);
      });
    });
  }, [getAudio]);

  const speak = useCallback(async (text, itemId) => {
    if (!enabled) return false;
    const chunks = splitForSpeech(text);
    if (!chunks.length) return false;

    speechRunRef.current += 1;
    const runId = speechRunRef.current;
    setError('');
    setSpeakingId(itemId || 'human-voice');

    try {
      await prepare();
      if (speechRunRef.current !== runId) return false;

      for (const chunk of chunks) {
        if (speechRunRef.current !== runId) return false;
        setStatus('generating');
        const blob = await generateChunk(chunk, selectedVoice);
        if (speechRunRef.current !== runId) return false;
        setStatus('speaking');
        await playBlob(blob, runId);
      }

      if (speechRunRef.current === runId) {
        setSpeakingId(null);
        setStatus('ready');
        onEndRef.current?.(itemId);
        return true;
      }
    } catch (err) {
      if (speechRunRef.current === runId) {
        setSpeakingId(null);
        setError(err?.message || 'Human voice failed.');
        setStatus('error');
      }
    }

    return false;
  }, [enabled, generateChunk, playBlob, prepare, selectedVoice]);

  const stop = useCallback(() => {
    speechRunRef.current += 1;
    const audio = getAudio();
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    }
    setSpeakingId(null);
    setStatus(readyRef.current ? 'ready' : 'idle');
  }, [getAudio]);

  const pause = useCallback(() => {
    const audio = getAudio();
    if (audio && !audio.paused) {
      try { audio.pause(); } catch {}
    }
  }, [getAudio]);

  const resume = useCallback(() => {
    const audio = getAudio();
    if (audio?.src && audio.paused && speakingId) {
      audio.play().catch(err => {
        setError(err?.message || 'Human voice could not resume.');
        setStatus('error');
      });
    }
  }, [getAudio, speakingId]);

  const setEnabled = useCallback(value => {
    const next = Boolean(value);
    setEnabledState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ENABLED_KEY, String(next));
    }
    if (!next) {
      speechRunRef.current += 1;
      const audio = audioRef.current;
      if (audio) {
        try { audio.pause(); } catch {}
      }
      setSpeakingId(null);
    } else {
      prepare().catch(err => {
        setError(err?.message || 'Human voice failed to load.');
        setStatus('error');
      });
    }
  }, [prepare]);

  const setSelectedVoice = useCallback(value => {
    const next = HUMAN_VOICES.some(voice => voice.id === value) ? value : DEFAULT_VOICE;
    setSelectedVoiceState(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(VOICE_KEY, next);
  }, []);

  const preview = useCallback(async () => {
    if (!enabled) setEnabled(true);
    await speak('You are listening to CREAPD Radio. Human voice is ready.', 'voice-preview');
  }, [enabled, setEnabled, speak]);

  useEffect(() => {
    return () => {
      speechRunRef.current += 1;
      try { audioRef.current?.pause?.(); } catch {}
      audioRef.current = null;
      try { workerRef.current?.terminate?.(); } catch {}
      workerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  return {
    enabled,
    setEnabled,
    selectedVoice,
    setSelectedVoice,
    voices: HUMAN_VOICES,
    status,
    progress,
    device,
    speakingId,
    error,
    isSupported: typeof window !== 'undefined' && typeof Worker !== 'undefined' && typeof Audio !== 'undefined',
    prepare,
    speak,
    preview,
    pause,
    resume,
    stop,
  };
}
