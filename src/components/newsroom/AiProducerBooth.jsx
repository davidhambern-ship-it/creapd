import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Send, Sparkles } from 'lucide-react';

export default function AiProducerBooth({ automationLog }) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const isActive = automationLog?.status === 'success' || automationLog?.status === 'partial';
  const statusText = isActive ? 'Online' : 'Standby';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate('/research');
  };

  return (
    <div className={`relative rounded-xl border overflow-hidden transition-all duration-500 ${isActive ? 'border-cyan-400/30 bg-gradient-to-b from-cyan-950/30 to-black/80' : 'border-white/[0.08] bg-gradient-to-b from-zinc-900/60 to-black/80'}`}>
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl animate-breathe" />
        </div>
      )}

      <div className="relative p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-cyan-400/15' : 'bg-white/[0.04]'}`}>
              <Bot className={`w-5 h-5 ${isActive ? 'text-cyan-400 animate-breathe' : 'text-white/40'}`} />
              {isActive && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-white/80 tracking-wider uppercase">AI Producer</p>
              <p className={`text-[9px] font-mono ${isActive ? 'text-cyan-400' : 'text-white/30'}`}>{statusText}</p>
            </div>
          </div>
          <Link to="/automation" className="text-[10px] font-mono text-white/40 hover:text-white/70">CONFIG →</Link>
        </div>

        {isActive && (
          <div className="mb-3 p-2 rounded-lg bg-cyan-400/[0.06] border border-cyan-400/10">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ai-thinking" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ai-thinking" style={{ animationDelay: '200ms' }} />
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ai-thinking" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-[10px] font-mono text-cyan-400/70">Monitoring feeds · scoring stories</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ask AI producer..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-3 pr-9 py-2 text-[11px] text-white/80 placeholder:text-white/25 focus:outline-none focus:border-cyan-400/30 transition-colors"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-cyan-400/10 hover:bg-cyan-400/20 flex items-center justify-center transition-colors">
            <Send className="w-3 h-3 text-cyan-400" />
          </button>
        </form>

        <div className="flex gap-1.5 mt-2">
          <Link to="/research" className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-[9px] font-mono text-white/50">Research</span>
          </Link>
          <Link to="/brief" className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
            <Sparkles className="w-2.5 h-2.5 text-berna-purple" />
            <span className="text-[9px] font-mono text-white/50">Generate Brief</span>
          </Link>
        </div>
      </div>
    </div>
  );
}