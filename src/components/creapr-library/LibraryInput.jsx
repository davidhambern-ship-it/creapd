import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Loader2 } from 'lucide-react';

export default function LibraryInput({ onSend, onStartTyping, disabled, listening, onToggleListen, thinking, placeholder }) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  useEffect(() => {
    if (listening) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (e) => {
        let interimText = '';
        let finalText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        if (interimText) setInterim(interimText);
        if (finalText) { setInterim(''); handleSend(finalText); }
      };
      recognition.onend = () => { onToggleListen(false); setInterim(''); };
      recognition.onerror = () => { onToggleListen(false); setInterim(''); };
      recognition.start();
      recognitionRef.current = recognition;
    } else {
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    }
    // eslint-disable-next-line
  }, [listening]);

  const handleSend = (val) => {
    const trimmed = (val || text || interim).trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    setInterim('');
  };

  const handleChange = (e) => {
    setText(e.target.value);
    setInterim('');
    onStartTyping?.();
  };

  const canSend = !disabled && !thinking && (text.trim() || interim);

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-12 left-0 right-0 p-4 md:p-6"
        style={{ zIndex: 25 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: disabled ? 0.4 : 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {speechSupported && (
            <button
              onClick={() => onToggleListen(!listening)}
              disabled={disabled}
              className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${
                listening ? 'animate-pulse' : 'hover:bg-white/5'
              }`}
              style={{
                background: listening ? 'hsl(0 50% 40% / 0.3)' : 'hsl(30 10% 8% / 0.5)',
                border: `1px solid ${listening ? 'hsl(0 50% 45% / 0.4)' : 'hsl(35 18% 24% / 0.3)'}`,
                color: listening ? 'hsl(0 60% 60%)' : 'hsl(38 45% 52%)',
              }}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 relative plib-input-panel">
            <input
              ref={inputRef}
              type="text"
              value={interim || text}
              onChange={handleChange}
              onKeyDown={e => { if (e.key === 'Enter' && canSend) handleSend(); }}
              disabled={disabled}
              placeholder={listening ? 'Listening...' : thinking ? 'CREAPr is thinking...' : placeholder || 'Type or speak...'}
              className="w-full h-11 px-5 pr-12 rounded-lg text-sm outline-none transition-all disabled:opacity-50 bg-transparent"
              style={{
                color: 'hsl(35 18% 88%)',
                fontFamily: '"Inter", sans-serif',
              }}
            />
            {canSend && (
              <button
                onClick={() => handleSend()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all hover:bg-white/5"
                style={{ color: 'hsl(152 42% 48%)' }}
              >
                <Send className="w-5 h-5" />
              </button>
            )}
            {thinking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(38 50% 52%)' }} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}