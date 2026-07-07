import React, { useState, useRef, useEffect } from 'react';
import { useResearch } from '@/context/ResearchContext';
import { ChevronUp, ChevronDown, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CreaprMessageArea() {
  const { creaprMessages, userSay, isTyping, clearMessages } = useResearch();
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [creaprMessages]);

  const handleSend = () => {
    if (!input.trim()) return;
    userSay(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const visibleMessages = expanded ? creaprMessages : creaprMessages.slice(-3);

  return (
    <div className="border-t border-white/[0.06] glass-panel-navy rounded-none relative z-20">
      <div className="flex items-center justify-between px-4 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-heading font-semibold">CREAPr</span>
          {isTyping && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">typing</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {creaprMessages.length > 0 && (
            <button onClick={clearMessages} className="text-muted-foreground hover:text-white p-1" title="Clear messages">
              <X className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-white p-1">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {creaprMessages.length > 0 && (
        <div
          ref={scrollRef}
          className={cn('overflow-y-auto px-4 pb-2', expanded ? 'max-h-48' : 'max-h-20')}
        >
          {visibleMessages.map((msg) => (
            <div key={msg.id} className={cn('mb-1.5', msg.role === 'user' ? 'text-right' : 'text-left')}>
              <span
                className={cn(
                  'inline-block text-xs rounded-lg px-3 py-1.5 max-w-[85%]',
                  msg.role === 'user'
                    ? 'bg-primary/20 text-primary-foreground'
                    : 'bg-white/[0.04] text-foreground/90'
                )}
              >
                {msg.content}
                {msg.isTyping && (
                  <span className="inline-block w-0.5 h-3 bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Respond to CREAPr..."
          className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-30 text-cyan-400 rounded-lg p-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}