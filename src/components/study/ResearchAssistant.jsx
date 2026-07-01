import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';

export default function ResearchAssistant({ session }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const context = buildContext(session);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a research assistant helping a producer explore their research session.\n\nRESEARCH CONTEXT:\n${context}\n\nPRODUCER QUESTION: ${userMsg}\n\nAnswer based on the research findings. If the question goes beyond the research, say so and suggest what additional research might help. Always cite sources when referencing specific findings.`,
        model: 'gemini_3_flash'
      });
      setMessages(prev => [...prev, { role: 'assistant', content: typeof res === 'string' ? res : JSON.stringify(res) }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (session.status !== 'ready') {
    return (
      <div className="glass-panel p-4 text-center">
        <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">AI Research Assistant will be available once research is complete.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel flex flex-col h-[500px]">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Bot className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-semibold text-sm">AI Research Assistant</h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ask me to explain findings, compare sources, summarize research, or suggest related studies.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50'}`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm prose-invert max-w-none">{msg.content}</ReactMarkdown>
              ) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your research..."
          className="flex-1 h-9 px-3 rounded-lg bg-secondary/30 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function buildContext(session) {
  const parts = [`Question: ${session.research_question}`, `Study Type: ${session.study_type}`];
  if (session.research_summary) parts.push(`Summary: ${session.research_summary.substring(0, 1000)}`);
  if (session.primary_source_analysis) parts.push(`Primary Sources: ${session.primary_source_analysis.substring(0, 500)}`);
  if (session.historical_development) parts.push(`Historical: ${session.historical_development.substring(0, 500)}`);
  return parts.join('\n\n');
}