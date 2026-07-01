import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, ChevronLeft, Columns2, Search, CheckCircle2, AlertCircle,
  BookOpen, GraduationCap, Sparkles, PenTool, Lightbulb, ArrowRight,
  FileText, Clock, Languages
} from 'lucide-react';
import { COMPARISON_TYPES, COMPARISON_MATRIX_ROWS } from '@/lib/spiritualConstants';

export default function LibraryCompare() {
  const { comparisonId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [queryInput, setQueryInput] = useState(searchParams.get('query') || '');
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState('matrix');

  const loadComparison = useCallback(async () => {
    if (!comparisonId) { setLoading(false); return; }
    setLoading(true);
    try {
      const c = await base44.entities.LibraryComparison.get(comparisonId);
      setComparison(c);
      try { setNoteText(JSON.parse(c.notebook_content || '')[0] || ''); } catch {}
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [comparisonId]);

  useEffect(() => { loadComparison(); }, [loadComparison]);

  // Auto-generate comparison if query param is provided and no comparisonId
  useEffect(() => {
    const query = searchParams.get('query');
    if (query && !comparisonId && !generating && !comparison) {
      handleGenerate(query);
    }
  }, [searchParams]);

  const handleGenerate = async (query) => {
    if (!query?.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await base44.functions.invoke('librarySearch', { query, mode: 'comparison' });
      const newComparison = res.data?.comparison || res.comparison;
      if (newComparison) {
        navigate(`/spiritual/library/compare/${newComparison.id}`, { replace: true });
        setComparison(newComparison);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate comparison');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !comparison) return;
    try {
      const updated = await base44.entities.LibraryComparison.update(comparison.id, {
        notebook_content: noteText
      });
      setComparison(updated);
    } catch (err) { console.error(err); }
  };

  const startRelatedStudy = (topic) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(topic)}&autoRun=true&source=library-compare`);
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Columns2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">
            {generating ? 'Building Comparison' : 'Loading Comparison'}
          </h2>
          {generating && (
            <>
              <p className="text-muted-foreground mb-6">Producer is researching sources, building the comparison matrix, identifying similarities and differences, and generating the AI summary. This takes about 30-60 seconds.</p>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </>
          )}
          {loading && <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />}
        </div>
      </div>
    );
  }

  // Entry state — no comparison yet
  if (!comparison) {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-secondary/50">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-heading font-bold">Comparative Studies Engine</h1>
              <p className="text-sm text-muted-foreground">Compare texts, concepts, traditions, languages, and historical developments</p>
            </div>
          </div>

          {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">{error}</div>}

          <div className="glass-panel p-6 border-primary/20">
            <h3 className="font-heading font-semibold mb-2">Start a Comparison</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use natural language. Producer will automatically determine the comparison type and build a structured comparison workspace.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate(queryInput)}
                placeholder="e.g. Compare Agape and Chesed, or Compare Genesis and the Quran on creation..."
                className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button onClick={() => handleGenerate(queryInput)} disabled={!queryInput.trim()}>
                <Search className="w-4 h-4 mr-1" /> Compare
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Compare Matthew and Luke', 'Compare Agape and Chesed', 'Compare Genesis and the Quran on creation', 'Compare the Kingdom of God and Nirvana', 'Compare the Dead Sea Scrolls and the Masoretic Text'].map(s => (
                <button
                  key={s}
                  onClick={() => { setQueryInput(s); handleGenerate(s); }}
                  className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 mt-4">
            <h4 className="font-heading font-semibold text-sm mb-3">Comparison Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMPARISON_TYPES.map(t => (
                <div key={t.key} className="p-2 rounded-lg bg-secondary/30 text-xs">{t.label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parse comparison data
  const items = (() => { try { return JSON.parse(comparison.items_compared || '[]'); } catch { return []; } })();
  const matrix = (() => { try { return JSON.parse(comparison.comparison_matrix || '[]'); } catch { return []; } })();
  const similarities = (() => { try { return JSON.parse(comparison.similarities || '[]'); } catch { return []; } })();
  const differences = (() => { try { return JSON.parse(comparison.differences || '[]'); } catch { return []; } })();
  const timelineEvents = (() => { try { return JSON.parse(comparison.timeline_events || '[]'); } catch { return []; } })();
  const perspectives = (() => { try { return JSON.parse(comparison.multiple_perspectives || '[]'); } catch { return []; } })();
  const aiQuestions = (() => { try { return JSON.parse(comparison.ai_questions || '[]'); } catch { return []; } })();
  const sources = (() => { try { return JSON.parse(comparison.sources_used || '[]'); } catch { return []; } })();

  const tabs = [
    { key: 'matrix', label: 'Comparison Matrix', icon: Columns2 },
    { key: 'similarities', label: 'Similarities', icon: CheckCircle2 },
    { key: 'differences', label: 'Differences', icon: AlertCircle },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'perspectives', label: 'Perspectives', icon: FileText },
    { key: 'summary', label: 'AI Summary', icon: Sparkles },
    { key: 'notebook', label: 'Notebook', icon: PenTool }
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/spiritual/library')} className="p-1.5 rounded-lg hover:bg-secondary/50">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/spiritual/library" className="hover:text-foreground">Library</Link>
              <span>/</span>
              <span>Comparison</span>
            </div>
            <h1 className="text-2xl font-heading font-bold">{comparison.title}</h1>
            <p className="text-sm text-muted-foreground">{COMPARISON_TYPES.find(t => t.key === comparison.comparison_type)?.label || 'Custom Comparison'} · {comparison.status}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/spiritual/library/compare')}>
            <Columns2 className="w-4 h-4 mr-1" /> New Comparison
          </Button>
        </div>

        {/* Items Being Compared */}
        {items.length > 0 && (
          <div className="glass-panel p-4 mb-4">
            <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items Being Compared</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/30">
                  <p className="font-medium text-sm">{item.name}</p>
                  {item.tradition && <p className="text-xs text-muted-foreground">{item.tradition}</p>}
                  {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'matrix' && (
          <div className="glass-panel p-5 overflow-x-auto">
            {matrix.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No comparison matrix data available.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-muted-foreground font-medium">Dimension</th>
                    {items.map((item, i) => (
                      <th key={i} className="text-left p-2 font-medium">{item.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-2 text-muted-foreground font-medium">{row.row}</td>
                      {(row.values || []).map((v, j) => (
                        <td key={j} className="p-2">{v.content}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'similarities' && (
          <div className="space-y-2">
            {similarities.length === 0 ? (
              <div className="glass-panel p-8 text-center"><p className="text-sm text-muted-foreground">No similarities data available.</p></div>
            ) : similarities.map((s, i) => (
              <div key={i} className="glass-panel p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-berna-emerald shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{s.point}</p>
                    {s.citation && <p className="text-xs text-muted-foreground mt-1">📖 {s.citation}</p>}
                    {s.source && <p className="text-xs text-primary mt-0.5">{s.source}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'differences' && (
          <div className="space-y-2">
            {differences.length === 0 ? (
              <div className="glass-panel p-8 text-center"><p className="text-sm text-muted-foreground">No differences data available.</p></div>
            ) : differences.map((d, i) => (
              <div key={i} className="glass-panel p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{d.point}</p>
                    {d.citation && <p className="text-xs text-muted-foreground mt-1">📖 {d.citation}</p>}
                    {d.source && <p className="text-xs text-primary mt-0.5">{d.source}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="glass-panel p-5">
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No timeline data available.</p>
            ) : (
              <div className="space-y-3">
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{e.date}</p>
                      <p className="text-sm text-muted-foreground">{e.event}</p>
                      {e.related_item && <p className="text-xs text-primary">{e.related_item}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'perspectives' && (
          <div className="space-y-2">
            {perspectives.length === 0 ? (
              <div className="glass-panel p-8 text-center"><p className="text-sm text-muted-foreground">No multiple perspectives data available.</p></div>
            ) : perspectives.map((p, i) => (
              <div key={i} className="glass-panel p-4">
                <p className="font-heading font-semibold text-sm mb-1">{p.perspective}</p>
                <p className="text-sm text-muted-foreground">{p.summary}</p>
                {p.sources && p.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.sources.map((s, j) => <span key={j} className="px-2 py-0.5 rounded text-xs bg-secondary/40">{s}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="glass-panel p-5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-semibold">AI Comparative Summary</h3>
            </div>
            <p className="text-sm mb-4">{comparison.ai_summary}</p>
            <div className="p-3 rounded-lg bg-accent/10 text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <span>This summary distinguishes between sourced facts and AI-generated synthesis. The producer remains responsible for interpretation.</span>
            </div>

            {aiQuestions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-heading font-semibold mb-2 flex items-center gap-1">
                  <Lightbulb className="w-4 h-4 text-accent" /> Questions for Further Study
                </h4>
                <div className="space-y-1.5">
                  {aiQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => startRelatedStudy(q)}
                      className="flex items-center justify-between w-full p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-left group"
                    >
                      <span className="text-sm">{q}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notebook' && (
          <div className="glass-panel p-5">
            <h3 className="font-heading font-semibold mb-3">Comparison Notebook</h3>
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Write notes, questions, draft ideas, production ideas..."
              rows={8}
              className="mb-3"
            />
            <Button onClick={handleSaveNote} disabled={!noteText.trim()}>
              <PenTool className="w-3.5 h-3.5 mr-1" /> Save Notebook
            </Button>
          </div>
        )}

        {/* Sources Used */}
        {sources.length > 0 && (
          <div className="glass-panel p-4 mt-4">
            <h4 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Sources Used ({sources.length})
            </h4>
            <div className="space-y-1">
              {sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md bg-secondary/30">
                  <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-medium">{s.name}</span>
                  {s.type && <span className="text-muted-foreground">({s.type})</span>}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-auto">
                      View Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production Actions */}
        <div className="glass-panel p-4 mt-4">
          <h4 className="font-heading font-semibold text-sm mb-3">Create from This Comparison</h4>
          <div className="flex flex-wrap gap-2">
            {['Sermon', 'Bible Study', 'Devotional', 'Podcast', 'Discussion Guide', 'Educational Presentation'].map(type => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => navigate(`/spiritual/configure?production_type=${encodeURIComponent(type)}&source_comparison=${comparison.id}`)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> {type}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}