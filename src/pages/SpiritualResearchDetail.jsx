import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, ArrowLeft, ExternalLink, GraduationCap, BookPlus, PenTool,
  Bookmark, StickyNote, FileText, MessageCircle, Lightbulb, Clapperboard,
  Save, X, AlertCircle, Quote, Tag, Clock, User, Sparkles
} from 'lucide-react';
import { SOURCE_TYPE_LABELS } from '@/lib/spiritualConstants';
import { safeJsonParse } from '@/lib/studyConstants';
import ReactMarkdown from 'react-markdown';

export default function SpiritualResearchDetail() {
  const { researchItemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    if (!researchItemId) return;
    base44.entities.SpiritualResearchItem.get(researchItemId)
      .then(data => {
        setItem(data);
        setNoteText(data.notes || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [researchItemId]);

  const updateItem = async (updates) => {
    const updated = await base44.entities.SpiritualResearchItem.update(item.id, updates);
    setItem({ ...item, ...updates });
    return updated;
  };

  const handleStartStudy = () => {
    navigate(`/spiritual/study?researchItem=${item.id}&autoRun=true`);
  };

  const handleAddToCurrentStudy = async () => {
    try {
      setSaving(true);
      const sessions = await base44.entities.ResearchSession.list('-created_date', 1);
      if (!sessions || sessions.length === 0) {
        navigate(`/spiritual/study?researchItem=${item.id}&autoRun=true`);
        return;
      }
      const session = sessions[0];
      const existingNotes = session.notebook_content || '';
      const sourceEntry = `\n\n---\n**Research Item Added:** ${item.title}\nSource: ${item.source || 'N/A'}\nCitation: ${item.citation || 'N/A'}\nSummary: ${(item.summary || '').substring(0, 500)}\nURL: ${item.source_url || 'N/A'}\n`;
      await base44.entities.ResearchSession.update(session.id, {
        notebook_content: existingNotes + sourceEntry
      });
      await updateItem({ added_to_study: true });
      navigate(`/spiritual/study/${session.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToMessage = async () => {
    await updateItem({ added_to_message: true });
    navigate('/spiritual/message');
  };

  const handleSaveToLibrary = async () => {
    await updateItem({ is_saved: true, status: 'saved' });
  };

  const handleSaveNote = async () => {
    await updateItem({ notes: noteText });
    setShowNoteEditor(false);
  };

  const handleGenerate = async (type) => {
    setGenerating(type);
    setGeneratedContent(null);
    try {
      const context = `Title: ${item.title}\nSource: ${item.source || 'N/A'}\nSummary: ${item.summary || ''}\nExcerpt: ${item.excerpt || ''}\nKey Points: ${(safeJsonParse(item.key_points, [])).join('; ')}\nCitation: ${item.citation || ''}`;
      let prompt = '';
      if (type === 'summary') {
        prompt = `Generate a comprehensive summary of this research source for a spiritual production producer:\n\n${context}\n\nProvide a well-structured summary with key takeaways and relevance to spiritual teaching.`;
      } else if (type === 'questions') {
        prompt = `Generate 5 thoughtful discussion questions based on this research source for a spiritual production:\n\n${context}\n\nReturn the questions as a numbered list.`;
      } else if (type === 'idea') {
        prompt = `Generate a production idea based on this research source. Include: production type, title, description, target audience, tone, and key talking points.\n\n${context}\n\nReturn as a structured description.`;
      }
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setGeneratedContent({ type, content: result });
    } catch (err) {
      setGeneratedContent({ type, content: 'Error generating content: ' + err.message });
    } finally {
      setGenerating(null);
    }
  };

  const handleCreateProduction = () => {
    navigate(`/spiritual/configure?researchItem=${item.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">Research Item Not Found</h2>
          <Button asChild variant="outline"><Link to="/spiritual/research">Back to Research</Link></Button>
        </div>
      </div>
    );
  }

  const keyPoints = safeJsonParse(item.key_points, []);
  const relatedTopics = safeJsonParse(item.related_topics, []);
  const relatedQuestions = safeJsonParse(item.related_study_questions, []);
  const tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const sourceTypeColors = {
    primary_source: 'bg-berna-emerald/20 text-berna-emerald',
    secondary_source: 'bg-primary/20 text-primary',
    historical_reference: 'bg-accent/20 text-accent',
    language_study: 'bg-blue-500/20 text-blue-400',
    current_event: 'bg-berna-orange/20 text-berna-orange',
    ai_suggestion: 'bg-purple-500/20 text-purple-400'
  };

  const ACTIONS = [
    { label: 'Open Original Source', icon: ExternalLink, onClick: () => item.source_url && window.open(item.source_url, '_blank'), disabled: !item.source_url },
    { label: 'Start Study From This Source', icon: GraduationCap, onClick: handleStartStudy, primary: true },
    { label: 'Add to Current Study', icon: BookPlus, onClick: handleAddToCurrentStudy },
    { label: 'Add to Message Builder', icon: PenTool, onClick: handleAddToMessage },
    { label: 'Save to Research Library', icon: Bookmark, onClick: handleSaveToLibrary, disabled: item.is_saved },
    { label: 'Add Note', icon: StickyNote, onClick: () => setShowNoteEditor(!showNoteEditor) },
    { label: 'Generate Summary', icon: FileText, onClick: () => handleGenerate('summary') },
    { label: 'Generate Discussion Questions', icon: MessageCircle, onClick: () => handleGenerate('questions') },
    { label: 'Generate Production Idea', icon: Lightbulb, onClick: () => handleGenerate('idea') },
    { label: 'Create Production From This Source', icon: Clapperboard, onClick: handleCreateProduction },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/spiritual/research" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Research
        </Link>

        {/* Header */}
        <div className="glass-panel p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-heading font-bold mb-2">{item.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${sourceTypeColors[item.source_type] || 'bg-muted text-muted-foreground'}`}>
                  {SOURCE_TYPE_LABELS[item.source_type] || item.source_type}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${item.relevance === 'high' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                  {item.relevance} relevance
                </span>
                {item.is_saved && <span className="text-xs px-2 py-1 rounded-full bg-berna-emerald/20 text-berna-emerald">Saved</span>}
                {item.added_to_study && <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">In Study</span>}
                {item.added_to_message && <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">In Message</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {item.source && (
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Source:</span> {item.source}</div>
            )}
            {item.author && (
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Author:</span> {item.author}</div>
            )}
            {(item.publication_date || item.date) && (
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Published:</span> {item.publication_date || item.date}</div>
            )}
            {item.category && (
              <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Category:</span> {item.category}</div>
            )}
            {item.associated_topic && (
              <div className="flex items-center gap-2"><BookPlus className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Topic:</span> {item.associated_topic}</div>
            )}
          </div>
        </div>

        {/* Full Article Text */}
        {item.full_text && item.full_text_available ? (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <FileText className="w-4 h-4" /> Full Article Text
            </h2>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{item.full_text}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-6 mb-6 border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-500 mb-1">Full article text is not available from this source.</p>
                <p className="text-xs text-muted-foreground">
                  {item.full_text_unavailable_reason || 'Producer has generated a summary and citation from the available information.'}
                </p>
                {item.source_url && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(item.source_url, '_blank')}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Open Original Source
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {item.summary && (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <FileText className="w-4 h-4" /> Summary
            </h2>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{item.summary}</p>
          </div>
        )}

        {/* Excerpt */}
        {item.excerpt && (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Quote className="w-4 h-4" /> Excerpt
            </h2>
            <blockquote className="text-sm italic text-foreground/80 border-l-2 border-primary pl-4">
              {item.excerpt}
            </blockquote>
          </div>
        )}

        {/* Key Points */}
        {keyPoints.length > 0 && (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Lightbulb className="w-4 h-4" /> Key Points
            </h2>
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-primary shrink-0">•</span> {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Citation */}
        {item.citation && (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <FileText className="w-4 h-4" /> Citation
            </h2>
            <p className="text-sm text-muted-foreground">{item.citation}</p>
            {item.source_url && (
              <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                <ExternalLink className="w-3 h-3" /> {item.source_url}
              </a>
            )}
          </div>
        )}

        {/* Tags & Related */}
        {(tags.length > 0 || relatedTopics.length > 0 || relatedQuestions.length > 0) && (
          <div className="glass-panel p-6 mb-6">
            {tags.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {relatedTopics.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Topics</h3>
                <ul className="space-y-1">
                  {relatedTopics.map((topic, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <Tag className="w-3 h-3 text-muted-foreground shrink-0 mt-1" /> {topic}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {relatedQuestions.length > 0 && (
              <div>
                <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Study Questions</h3>
                <ul className="space-y-1">
                  {relatedQuestions.map((q, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <GraduationCap className="w-3 h-3 text-muted-foreground shrink-0 mt-1" /> {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {showNoteEditor ? (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <StickyNote className="w-4 h-4" /> Notes
            </h2>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes about this research item..."
              className="min-h-[120px] mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNote}><Save className="w-3 h-3 mr-1" /> Save Note</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNoteEditor(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
            </div>
          </div>
        ) : item.notes ? (
          <div className="glass-panel p-6 mb-6">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <StickyNote className="w-4 h-4" /> Notes
            </h2>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.notes}</p>
          </div>
        ) : null}

        {/* Generated Content */}
        {generatedContent && (
          <div className="glass-panel p-6 mb-6 border-primary/30">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-primary" /> Generated {generatedContent.type === 'questions' ? 'Discussion Questions' : generatedContent.type === 'idea' ? 'Production Idea' : 'Summary'}
            </h2>
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{generatedContent.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="glass-panel p-6">
          <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-4">Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.primary ? 'default' : 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled || saving || generating !== null}
                  className="justify-start"
                >
                  {generating === action.label.toLowerCase().replace(/\s/g, '') ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 mr-2" />
                  )}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}