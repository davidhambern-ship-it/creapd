import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibraryChatFeed({ messages, stopTyping, onComplete }) {
  const scrollRef = useRef(null);
  const [typedText, setTypedText] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const charIdxRef = useRef(0);
  const typeTimerRef = useRef(null);
  const completedRef = useRef(false);

  const typingMessage = [...messages].reverse().find(m => m.isTyping) || null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, typedText]);

  useEffect(() => {
    completedRef.current = false;

    if (!typingMessage) {
      setTypedText('');
      setTypingDone(false);
      return;
    }

    const fullText = typingMessage.lines ? typingMessage.lines.join(' ') : (typingMessage.content || '');
    charIdxRef.current = 0;
    setTypedText('');
    setTypingDone(false);

    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    typeTimerRef.current = setInterval(() => {
      charIdxRef.current++;
      if (charIdxRef.current <= fullText.length) {
        setTypedText(fullText.substring(0, charIdxRef.current));
      } else {
        clearInterval(typeTimerRef.current);
        typeTimerRef.current = null;
        setTypingDone(true);
        if (!completedRef.current) {
          completedRef.current = true;
          const wordCount = fullText.split(' ').length;
          const holdTime = Math.max(900, wordCount * 70 + 300);
          setTimeout(() => {
            if (completedRef.current) onComplete?.();
          }, holdTime);
        }
      }
    }, 28);

    return () => {
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    };
    // eslint-disable-next-line
  }, [typingMessage]);

  useEffect(() => {
    if (!stopTyping || !typingMessage) return;
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    const fullText = typingMessage.lines ? typingMessage.lines.join(' ') : (typingMessage.content || '');
    setTypedText(fullText);
    setTypingDone(true);
    if (!completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => onComplete?.(), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line
  }, [stopTyping]);

  return (
    <div
      ref={scrollRef}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden px-4 pt-20 pb-36"
      style={{ zIndex: 5 }}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isCurrentTyping = msg === typingMessage;
            const displayText = isCurrentTyping
              ? typedText
              : (msg.content || (msg.lines ? msg.lines.join(' ') : ''));

            return (
              <motion.div
                key={msg.id || idx}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={isUser
                    ? { background: 'hsl(35 60% 18% / 0.3)', border: '1px solid hsl(35 70% 32% / 0.3)' }
                    : { background: 'hsl(30 15% 10% / 0.55)', border: '1px solid hsl(35 18% 22% / 0.3)', backdropFilter: 'blur(8px)' }
                  }
                >
                  {!isUser && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold" style={{ color: 'hsl(38 50% 55%)' }}>Cr</span>
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(40 25% 50%)' }}>CREAPr</span>
                    </div>
                  )}
                  <p
                    className="text-sm leading-relaxed break-words"
                    style={{ wordBreak: 'break-word', color: 'hsl(35 15% 88%)' }}
                  >
                    {displayText}
                    {isCurrentTyping && !typingDone && <span className="plib-cursor" />}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}