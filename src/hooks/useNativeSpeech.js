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

  const speak = useCallback((text, itemId) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    const voice = getSelectedVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = 'en-GB';
    }
    utter.rate = 0.95;
    utter.pitch = 1;

    utter.onend = () => {
      setSpeakingId(null);
      if (onEndRef.current) onEndRef.current(itemId);
    };
    utter.onerror = () => setSpeakingId(null);

    utterRef.current = utter;
    setSpeakingId(itemId);
    window.speechSynthesis.speak(utter);
  }, [getSelectedVoice, onEndRef]);

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