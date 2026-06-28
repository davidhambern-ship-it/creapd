import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search as SearchIcon, ExternalLink, Send, FileText,
  AlertTriangle, MessageSquare, Clock, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ResearchDesk() {
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [echoPrompt, setEchoPrompt] = useState('');
  const [echoResponse, setEchoResponse] = useState('');
  const [echoLoading, setEchoLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Article.filter({}, '-opportunity_score', 50)
      .then(arts => { setArticles(arts); if (arts.length > 0) setSelected(arts[0]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) {
      base44.entities.ProducerNote.filter({ article_id: selected.id }, '-created_date', 20)
        .then(setNotes)
        .catch(() => setNotes([]));
    }
  }, [selected?.id]);

  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    const note = await base44.entities.ProducerNote.create({ article_id: selected.id, note: newNote, note_type: 'general' });
    setNotes(prev => [note, ...prev]);
    setNewNote('');
  };

  const askEcho = async () => {
    if (!echoPrompt.trim() || !selected) return;
    setEchoLoading(true);
    setEchoResponse('');
    const prompt = `You are Echo, a newsroom AI assistant for TexasNomad Network. Analyze this story:\n\nTitle: ${selected.title}\nSummary: ${selected.summary || 'N/A'}\nSource: ${selected.source_name || 'N/A'}\nCategory: ${selected.category || 'N/A'}\n\nUser request: ${echoPrompt}\n\nProvide concise, actionable insights for a radio producer.`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setEchoResponse(response);
    // Save as echo note
    await base44.entities.ProducerNote.create({ article_id: selected.id, note: response, note_type: 'echo_note' });
    setNotes(prev => [{ note: response, note_type: 'echo_note', created_date: new Date().toISOString() }, ...prev]);
    setEchoLoading(false);
  };

  const filteredArticles = articles.filter(a =>
    !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left: Story list */}
      <div className="lg:w-72 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col max-h-64 lg:max-h-full">
        <div className="p-3 border-b border-white/[0.06]">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search stories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredArticles.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className={`w-full text-left p-3 border-b border-white/[0.04] transition-colors ${
                selected?.id === a.id ? 'bg-white/[0.06] border-l-2 border-l-berna-purple' : 'hover:bg-white/[0.03]'
              }`}
            >
              <p className="text-xs text-white font-medium leading-snug line-clamp-2">{a.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <OpportunityScore score={a.opportunity_score} />
                <StatusBadge status={a.status} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Story details */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {selected ? (
          <div className="max-w-2xl space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={selected.status} />
                {selected.category && <CategoryBadge category={selected.category} />}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{selected.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {selected.source_name && <span>{selected.source_name}</span>}
                {selected.published_at && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(selected.published_at).toLocaleDateString()}
                  </span>
                )}
                {selected.author && <span>by {selected.author}</span>}
              </div>
            </div>

            <OpportunityScore score={selected.opportunity_score} size="md" />

            {selected.summary && (
              <div className="glass-panel p-4">
                <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-2">Summary</h3>
                <p className="text-sm text-white/80 leading-relaxed">{selected.summary}</p>
              </div>
            )}

            {selected.full_text_excerpt && (
              <div className="glass-panel p-4">
                <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-2">Key Facts</h3>
                <p className="text-sm text-white/70 leading-relaxed">{selected.full_text_excerpt}</p>
              </div>
            )}

            {/* Scores */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Opportunity', value: selected.opportunity_score, color: 'text-berna-orange' },
                { label: 'Freshness', value: selected.freshness_score, color: 'text-berna-emerald' },
                { label: 'Credibility', value: selected.credibility_score, color: 'text-blue-400' },
                { label: 'Usefulness', value: selected.usefulness_score, color: 'text-berna-purple' },
                { label: 'Duplicate', value: selected.duplicate_score, color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="glass-panel p-3 text-center">
                  <p className="text-lg font-bold font-mono text-white">{s.value || '-'}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {selected.state && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">State</p>
                  <p className="text-sm text-white">{selected.state}</p>
                </div>
              )}
              {selected.industry && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Industry</p>
                  <p className="text-sm text-white">{selected.industry}</p>
                </div>
              )}
              {selected.companies && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Companies</p>
                  <p className="text-sm text-white">{selected.companies}</p>
                </div>
              )}
              {selected.people && (
                <div className="glass-panel p-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">People</p>
                  <p className="text-sm text-white">{selected.people}</p>
                </div>
              )}
            </div>

            {selected.url && (
              <a href={selected.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="border-white/10 text-berna-purple text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open Original Article
                </Button>
              </a>
            )}

            {/* Producer Notes */}
            <div className="glass-panel p-4">
              <h3 className="text-xs font-semibold text-berna-purple uppercase tracking-wider mb-3">Producer Notes</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addNote()}
                  className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"
                />
                <Button size="sm" onClick={addNote} className="bg-berna-purple/20 text-berna-purple hover:bg-berna-purple/30 h-8">
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map((n, i) => (
                  <div key={i} className={`p-2 rounded text-xs ${n.note_type === 'echo_note' ? 'bg-berna-purple/10 border border-berna-purple/20' : 'bg-white/[0.02] border border-white/[0.04]'}`}>
                    {n.note_type === 'echo_note' && <span className="text-[10px] text-berna-purple font-semibold">Echo · </span>}
                    <span className="text-white/70">{n.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a story to research
          </div>
        )}
      </div>

      {/* Right: Echo Panel */}
      <div className="hidden xl:flex flex-col w-80 border-l border-white/[0.06]">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-berna-emerald pulse-glow" />
            <h3 className="text-sm font-semibold text-white">Echo</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">AI Research Assistant</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {echoResponse && (
            <div className="p-3 rounded-lg bg-berna-purple/5 border border-berna-purple/10">
              <p className="text-[10px] text-berna-purple font-semibold mb-1">Echo Analysis</p>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{echoResponse}</p>
            </div>
          )}
          <div className="space-y-2">
            {['Summarize this story', 'Generate talking points', 'Find opposing viewpoints', 'Fact-check key claims', 'Suggest B-roll ideas'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => { setEchoPrompt(suggestion); }}
                className="w-full text-left p-2 rounded text-xs text-muted-foreground hover:text-white hover:bg-white/[0.04] border border-white/[0.04] transition-colors"
              >
                <ChevronRight className="w-3 h-3 inline mr-1" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask Echo..."
              value={echoPrompt}
              onChange={e => setEchoPrompt(e.target.value)}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-16 resize-none"
            />
          </div>
          <Button
            size="sm"
            onClick={askEcho}
            disabled={echoLoading || !echoPrompt.trim() || !selected}
            className="w-full mt-2 bg-berna-purple/20 text-berna-purple hover:bg-berna-purple/30 text-xs"
          >
            {echoLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Ask Echo
          </Button>
        </div>
      </div>
    </div>
  );
}