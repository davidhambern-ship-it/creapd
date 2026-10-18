import { useState, useEffect, useRef, useCallback } from 'react';

const CHARS_PER_SECOND = 15; // ~150 wpm natural speech estimate

export function useNativeSpeech({ onEnd, selectedVoiceURI } = {}) {
  const [voices, setVoices] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const utterRef = useRef(null);
  const onEndRef = useRef(onEnd);
  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  onEndRef.current = onEnd;
  selectedVoiceURIRef.current = selectedVoiceURI;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const getBritishVoice = useCallback(() => {
    return voices.find(v => v.lang === 'en-GB') ||
           voices.find(v => v.lang.startsWith('en-GB')) ||
           voices.find(v => v.lang === 'en_GB') ||
           null;
  }, [voices]);

  const getDefaultVoice = useCallback(() => {
    return getBritishVoice() ||
           voices.find(v => v.lang.startsWith('en')) ||
           voices[0] ||
           null;
  }, [voices, getBritishVoice]);

  const getSelectedVoice = useCallback(() => {
    const uri = selectedVoiceURIRef.current;
    if (uri && voices.length > 0) {
      return voices.find(v => v.voiceURI === uri) || null;
    }
    return getDefaultVoice();
  }, [voices, getDefaultVoice]);

  const speechRunRef = useRef(0);

  const splitSpeechChunks = useCallback((value, maxChars = 240) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map(part => part.trim())
      .filter(Boolean);

    const chunks = [];
    let current = '';

    const pushCurrent = () => {
      if (current.trim()) chunks.push(current.trim());
      current = '';
    };

    for (const sentence of sentences.length ? sentences : [normalized]) {
      if (sentence.length <= maxChars) {
        if (!current) {
          current = sentence;
        } else if ((current.length + 1 + sentence.length) <= maxChars) {
          current += ` ${sentence}`;
        } else {
          pushCurrent();
          current = sentence;
        }
        continue;
      }

      pushCurrent();
      const words = sentence.split(/\s+/);
      let piece = '';
      for (const word of words) {
        if (!piece) {
          piece = word;
        } else if ((piece.length + 1 + word.length) <= maxChars) {
          piece += ` ${word}`;
        } else {
          chunks.push(piece);
          piece = word;
        }
      }
      if (piece) current = piece;
    }

    pushCurrent();
    return chunks;
  }, []);

  const speak = useCallback((text, itemId) => {
    if (!window.speechSynthesis) return;

    speechRunRef.current += 1;
    const runId = speechRunRef.current;
    window.speechSynthesis.cancel();

    const chunks = splitSpeechChunks(text);
    if (!chunks.length) return;

    const voice = getSelectedVoice();
    setSpeakingId(itemId);

    const speakChunk = (index) => {
      if (speechRunRef.current !== runId) return;

      if (index >= chunks.length) {
        utterRef.current = null;
        setSpeakingId(null);
        if (onEndRef.current) onEndRef.current(itemId);
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunks[index]);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = 'en-GB';
      }
      utter.rate = 0.95;
      utter.pitch = 1;

      utter.onend = () => {
        if (speechRunRef.current !== runId) return;
        speakChunk(index + 1);
      };
      utter.onerror = (event) => {
        if (speechRunRef.current !== runId) return;
        if (event?.error === 'canceled' || event?.error === 'interrupted') return;
        speakChunk(index + 1);
      };

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    };

    speakChunk(0);
  }, [getSelectedVoice, splitSpeechChunks]);

  const stop = useCallback(() => {
    speechRunRef.current += 1;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utterRef.current = null;
    setSpeakingId(null);
  }, []);

  const estimateDuration = useCallback((text) => {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_SECOND);
  }, []);

  return {
    voices,
    isSupported: typeof window !== 'undefined' && !!window.speechSynthesis,
    speakingId,
    speak,
    stop,
    estimateDuration,
    defaultVoice: getDefaultVoice(),
  };
}