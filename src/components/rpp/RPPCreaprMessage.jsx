import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Send, BookOpen } from 'lucide-react';

export default function RPPCreaprMessage({ messages = [], voiceEnabled, onToggleVoice, onSendMessage, onSpeak }) {
  const [input, setInput] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const lastMessage = messages[messages.length - 1];
  const isTyping = lastMessage?.role === 'assistant' && lastMessage.id !== lastMessageIdRef.current && displayedText.length < (lastMessage.text?.length || 0);

  // Typing animation for the latest assistant message
  useEffect(() => {
    if (!lastMessage || lastMessage.role !== 'assistant') {
      setDisplayedText(lastMessage?.text || '');
      return;
    }

    if (lastMessageIdRef.current === lastMessage.id) return;
    lastMessageIdRef.current = lastMessage.id;

    setDisplayedText('');
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

    let idx = 0;
    typingIntervalRef.current = setInterval(() => {
      idx++;
      if (idx <= lastMessage.text.length) {
        setDisplayedText(lastMessage.text.substring(0, idx));
      } else {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        if (voiceEnabled && onSpeak) onSpeak(lastMessage.text);
      }
    }, 25);

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, [lastMessage, voiceEnabled, onSpeak]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, displayedText]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendMessage?.(input);
    setInput('');
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <aside className="rpp-creapr-panel">
      {/* Header */}
      <div className="rpp-creapr-header">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
            <span className="text-xs font-bold font-mono text-amber-400">Cr</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-heading font-semibold">CREAPr</h2>
          <p className="text-[11px] text-emerald-400/70 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Library Assistant · Online
          </p>
        </div>
        <button
          onClick={onToggleVoice}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            voiceEnabled
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
          }`}
          title={voiceEnabled ? 'Voice on' : 'Voice off'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Messages */}
      <div className="rpp-creapr-messages">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-amber-400/60" />
            </div>
            <p className="text-sm text-muted-foreground">CREAPr is ready to assist.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Ask about your research, departments, or production.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;
          const isUser = msg.role === 'user';
          const text = isLast && !isUser ? displayedText : msg.text;

          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${isUser ? 'creapr-bubble-user' : 'creapr-bubble-assistant'}`}>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {text}
                  {isLast && !isUser && isTyping && (
                    <span className="inline-block w-0.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="rpp-creapr-input-area">
        <div className="flex items-center gap-2 lib-glass-card p-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CREAPr..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none px-2"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-1.5 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}