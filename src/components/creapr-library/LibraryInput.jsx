import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Loader2 } from 'lucide-react';

/**
 * Library Input Bar — voice + text input for the producer.
 * Treated identically whether spoken or typed.
 */
export default function LibraryInput({ onSend, disabled, listening, onToggleListen, thinking, placeholder }) {
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

  const canSend = !disabled && !thinking && (text.trim() || interim);

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-0 left-0 right-0 p-4 md:p-6"
        style={{ zIndex: 25 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: disabled ? 0.3 : 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {speechSupported && (
            <button
              onClick={() => onToggleListen(!listening)}
              disabled={disabled}
              className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${
                listening ? 'bg-red-500/80 text-white animate-pulse' : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
              style={{ border: '1px solid hsl(40 30% 20% / 0.3)' }}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={interim || text}
              onChange={e => { setText(e.target.value); setInterim(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && canSend) handleSend(); }}
              disabled={disabled}
              placeholder={listening ? 'Listening...' : thinking ? 'CREAPr is thinking...' : placeholder || 'Speak or type...'}
              className="w-full h-12 px-5 pr-12 rounded-full text-sm outline-none transition-all disabled:opacity-50"
              style={{
                background: 'hsl(220 30% 6% / 0.6)',
                border: '1px solid hsl(40 30% 20% / 0.3)',
                color: 'hsl(40 30% 88%)',
                backdropFilter: 'blur(8px)',
              }}
            />
            {canSend && (
              <button
                onClick={() => handleSend()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all hover:bg-white/10"
                style={{ color: 'hsl(152 60% 50%)' }}
              >
                <Send className="w-5 h-5" />
              </button>
            )}
            {thinking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(40 30% 50%)' }} />
              </div>
            )}
          </div>
        </div>
        {listening && (
          <p className="text-center text-xs mt-2 animate-pulse" style={{ color: 'hsl(0 60% 55%)' }}>
            Listening... speak now
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}