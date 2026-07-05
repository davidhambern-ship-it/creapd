import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, ExternalLink, Clock, MapPin, Tag, StickyNote,
  Package, FileText, CheckCircle, AlertTriangle, Plus, Trash2,
  Bookmark, Layers, ChevronRight, BookOpen, ShieldCheck, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryBadge from '@/components/shared/CategoryBadge';
import CreapdLoading from '@/components/shared/CreapdLoading';
import StatusBadge from '@/components/shared/StatusBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';
import ProductionStatusIndicator from '@/components/shared/ProductionStatusIndicator';
import NativeArticleReader from '@/components/shared/NativeArticleReader';
import { logActivity } from '@/lib/activityUtils';

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'talking_point', label: 'Talking Point' },
  { value: 'fact_check', label: 'Fact Check' },
  { value: 'broll_idea', label: 'B-Roll Idea' },
  { value: 'echo_note', label: 'Echo Note' },
];

export default function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [notes, setNotes] = useState([]);
  const [pkg, setPkg] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const art = await base44.entities.Article.get(id);
      setArticle(art);
      const [allNotes, allPkgs, relatedArts] = await Promise.all([
        base44.entities.ProducerNote.filter({ article_id: id }, '-created_date', 50),
        base44.entities.ProductionPackage.filter({ article_id: id }, '-created_date', 5),
        art.category ? base44.entities.Article.filter({ category: art.category }, '-opportunity_score', 5) : Promise.resolve([]),
      ]);
      setNotes(allNotes);
      setPkg(allPkgs[0] || null);
      setRelated(relatedArts.filter(a => a.id !== id).slice(0, 4));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const created = await base44.entities.ProducerNote.create({
        article_id: id,
        note: newNote.trim(),
        note_type: noteType,
      });
      setNotes(prev => [created, ...prev]);
      setNewNote('');
      logActivity('update', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: `Added ${noteType} note` });
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    await base44.entities.ProducerNote.delete(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const toggleSave = async () => {
    const newSaved = !article.is_saved;
    await base44.entities.Article.update(id, { is_saved: newSaved, status: newSaved ? 'saved_for_later' : 'pending' });
    setArticle(prev => ({ ...prev, is_saved: newSaved, status: newSaved ? 'saved_for_later' : 'pending' }));
    logActivity('update', { entity_type: 'Article', entity_id: id, entity_name: article.title, details: newSaved ? 'Story saved to library' : 'Story removed from library' });
  };

  const approveStory = async () => {
    await base44.entities.Article.update(id, { status: 'approved' });
    setArticle(prev => ({ ...prev, status: 'approved' }));
    logActivity('approve', { entity_type: 'Article', entity_id: id, entity_name: article.title, details: 'Story approved for manager' });
  };

  const rejectStory = async () => {
    await base44.entities.Article.update(id, {
      status: 'rejected',
      rejection_reason: 'Manually rejected',
      archived_date: new Date().toISOString(),
    });
    logActivity('reject', { entity_type: 'Article', entity_id: id, entity_name: article.title, details: 'Story rejected from detail view' });
    try {
      await base44.functions.invoke('fetchStories', {});
    } catch (e) {
      console.error('Auto-fetch replacement story failed:', e);
    }
    navigate('/queue');
  };

  const tags = article?.tags ? article.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (loading) {
    return <CreapdLoading fullHeight profile="news" />;
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <FileText className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-white">Story Not Found</h2>
        <Link to="/queue"><Button variant="outline" size="sm">Back to Story Queue</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      {/* Back link */}
      <Link to="/queue" className="inline-flex items-center gap-1.5 text-xs text-berna-orange hover:text-berna-orange/80 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Story Queue
      </Link>

      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge status={article.status} />
          {article.category && <CategoryBadge category={article.category} />}
          <OpportunityScore score={article.opportunity_score} />
          {article.is_saved && (
            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400">
              <Bookmark className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <h1 className="text-lg lg:text-xl font-bold text-white leading-snug">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          {article.source_name && <span>{article.source_name}</span>}
          {article.author && <span>· {article.author}</span>}
          {article.published_at && (
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {new Date(article.published_at).toLocaleDateString()}
            </span>
          )}
          {article.estimated_reading_time && (
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {article.estimated_reading_time}
            </span>
          )}
          {article.geographic_relevance && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {article.geographic_relevance}
            </span>
          )}
        </div>

      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-berna-purple" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-berna-purple/10 border border-berna-purple/20 text-[10px] text-berna-purple">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Complete Summary */}
      {article.summary && (
        <div className="glass-panel p-5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-sm text-white/80 leading-relaxed">{article.summary}</p>
        </div>
      )}

      {/* Native Full Article Reader */}
      <NativeArticleReader
        article={article}
        sourceLabel={article.source_name || article.publication}
        autoFetch
      />

      {/* Why It Matters */}
      {(article.why_it_matters || article.full_text_excerpt) && (
        <div className="glass-panel p-5 border-l-2 border-berna-orange/40">
          <h3 className="text-xs font-semibold text-berna-orange uppercase tracking-wider mb-2">Why It Matters</h3>
          <p className="text-sm text-white/70 leading-relaxed">{article.why_it_matters || article.full_text_excerpt}</p>
        </div>
      )}

      {/* Key Facts */}
      {article.key_facts && (
        <div className="glass-panel p-5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Key Facts</h3>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{article.key_facts}</p>
        </div>
      )}

      {/* Timeline */}
      {article.timeline && (
        <div className="glass-panel p-5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Timeline</h3>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{article.timeline}</p>
        </div>
      )}

      {/* Scores */}
      <div className="glass-panel p-5">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Story Scores</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Freshness', value: article.freshness_score },
            { label: 'Credibility', value: article.credibility_score },
            { label: 'Opportunity', value: article.opportunity_score },
            { label: 'Usefulness', value: article.usefulness_score },
            { label: 'Duplicate Risk', value: article.duplicate_score },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
              <p className="text-lg font-bold text-white font-mono mt-1">{s.value || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Sources */}
      {article.additional_sources && (
        <div className="glass-panel p-5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">Additional Sources</h3>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{article.additional_sources}</p>
        </div>
      )}

      {/* Fact Check Information */}
      {(article.status === 'needs_research' || pkg?.fact_check_notes) && (
        <div className="glass-panel p-5 border-l-2 border-yellow-400/40">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
            <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Fact Check Information</h3>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">{pkg?.fact_check_notes || 'No fact check notes yet. This story may need additional research.'}</p>
        </div>
      )}

      {/* Available Production Assets */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-berna-purple" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Available Production Assets</h3>
          </div>
          {pkg && <ProductionStatusIndicator status={pkg.status} size="sm" />}
        </div>
        {pkg ? (
          <div className="space-y-2">
            {[
              { label: 'Teleprompter Script', value: pkg.teleprompter_script },
              { label: 'Story Summary', value: pkg.story_summary },
              { label: 'Talking Points', value: pkg.talking_points },
              { label: 'Lower Third Text', value: pkg.lower_third_text },
              { label: 'Headline Suggestions', value: pkg.headline_suggestions },
              { label: 'Image Prompt', value: pkg.image_prompt },
              { label: 'Visual Suggestions', value: pkg.visual_suggestions },
              { label: 'B-Roll Suggestions', value: pkg.broll_suggestions },
              { label: 'Social Caption', value: pkg.social_caption },
            ].filter(a => a.value).map(a => (
              <div key={a.label} className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-berna-emerald flex-shrink-0" />
                <span className="text-white/80">{a.label}</span>
              </div>
            ))}
            <Link to="/workspace" className="inline-flex items-center gap-1 text-xs text-berna-purple hover:underline mt-2">
              View in Story Manager <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No production package generated yet. Select this story and send to Manager to generate assets.</p>
        )}
      </div>

      {/* Related Stories */}
      {related.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Related Stories</h3>
          <div className="space-y-2">
            {related.map(r => (
              <Link key={r.id} to={`/story/${r.id}`} className="block p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-colors">
                <p className="text-xs text-white font-medium leading-snug">{r.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {r.category && <CategoryBadge category={r.category} />}
                  <span className="text-[10px] text-muted-foreground">{r.source_name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Producer Notes */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="w-3.5 h-3.5 text-blue-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Producer Notes</h3>
          <span className="text-[10px] text-muted-foreground">({notes.length})</span>
        </div>

        {/* Add note */}
        <div className="space-y-2 mb-4">
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger className="w-full bg-white/[0.03] border-white/[0.08] text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {NOTE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note — research reminder, interview idea, question, correction..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-20"
            />
            <Button size="sm" onClick={addNote} disabled={savingNote || !newNote.trim()} className="bg-berna-purple hover:bg-berna-purple/90 text-white h-8">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Notes list */}
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
          ) : notes.map(n => (
            <div key={n.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-blue-400/10 text-blue-400 mb-1.5">
                    {NOTE_TYPES.find(t => t.value === n.note_type)?.label || 'General'}
                  </span>
                  <p className="text-xs text-white/80 leading-relaxed">{n.note}</p>
                </div>
                <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={toggleSave} className="border-white/10 text-white text-xs">
          <Bookmark className={`w-3 h-3 mr-1 ${article.is_saved ? 'fill-blue-400 text-blue-400' : ''}`} />
          {article.is_saved ? 'Remove from Library' : 'Save to Library'}
        </Button>
        {article.status !== 'approved' && article.status !== 'rejected' && (
          <Button
            size="sm"
            variant="outline"
            className="border-berna-emerald/30 text-berna-emerald hover:bg-berna-emerald/10 text-xs"
            onClick={approveStory}
          >
            <CheckCircle className="w-3 h-3 mr-1" />Approve
          </Button>
        )}
        {article.status !== 'rejected' && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs"
            onClick={rejectStory}
          >
            <XCircle className="w-3 h-3 mr-1" />Reject
          </Button>
        )}

      </div>
    </div>
  );
}