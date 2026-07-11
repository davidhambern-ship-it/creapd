import { useState, useEffect, useRef, useCallback } from 'react';

const CHARS_PER_SECOND = 15; // ~150 wpm natural speech estimate

export function useNativeSpeech() {
  const [voices, setVoices] = useState([]);
  const [speakingId, setSpeakingId] = useState(null);
  const utterRef = useRef(null);

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

  const speak = useCallback((text, itemId) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    const voice = getDefaultVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'en-GB';
    }
    utter.rate = 0.95;
    utter.pitch = 1;

    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);

    utterRef.current = utter;
    setSpeakingId(itemId);
    window.speechSynthesis.speak(utter);
  }, [getDefaultVoice]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
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