import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Send, MessageSquare, ChevronDown, BookOpen } from 'lucide-react';

export default function RPPCreaprMessage({ messages = [], voiceEnabled, onToggleVoice, onSendMessage, onSpeak, onCollapse }) {
  const [input, setInput] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const messagesEndRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  const lastMessage = messages[messages.length - 1];
  const isTyping = lastMessage?.role === 'assistant' && lastMessage.id !== lastMessageIdRef.current && displayedText.length < (lastMessage.text?.length || 0);

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
    <aside className="rpp-creapr-dock">
      {/* Header — clickable to collapse */}
      <div className="rpp-creapr-dock-header" onClick={onCollapse}>
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 50% 15% / 0.4)', border: '1px solid hsl(190 40% 25% / 0.4)' }}>
            <span className="text-xs font-bold font-mono" style={{ color: 'hsl(190 80% 55%)' }}>Cr</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2" style={{ borderColor: 'hsl(210 40% 6%)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading font-semibold">CREAPr</p>
          <p className="text-[10px] flex items-center gap-1" style={{ color: 'hsl(152 50% 55%)' }}>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Online · Library Assistant
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVoice(); }}
          className={`p-1.5 rounded-md transition-colors shrink-0 ${voiceEnabled ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
          title={voiceEnabled ? 'Voice on' : 'Voice off'}
        >
          {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>

      {/* Messages */}
      <div className="rpp-creapr-dock-messages">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
              <BookOpen className="w-5 h-5" style={{ color: 'hsl(190 60% 50% / 0.5)' }} />
            </div>
            <p className="text-sm text-muted-foreground">CREAPr is ready to assist.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Ask about your research or production.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLast = idx === messages.length - 1;
          const isUser = msg.role === 'user';
          const text = isLast && !isUser ? displayedText : msg.text;
          return (
            <div key={msg.id} className="space-y-0.5">
              {!isUser && (
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(190 60% 50% / 0.5)' }}>CREAPr</span>
              )}
              <p className={`text-sm leading-relaxed ${isUser ? 'text-foreground/70 italic' : 'text-foreground/90'}`}>
                {text}
                {isLast && !isUser && isTyping && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse align-middle" style={{ background: 'hsl(190 80% 55%)' }} />
                )}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="rpp-creapr-dock-input">
        <div className="flex items-center gap-2 cc-glass-card p-1.5">
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
            className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 80% 55%)' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}