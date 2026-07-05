import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ExternalLink, CheckCircle, XCircle, Edit3, RefreshCw, FileText,
  AlertTriangle, ChevronDown, ChevronUp, Save, X, Loader2, Sparkles, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ContentTypeBadge from '@/components/shared/ContentTypeBadge';
import ArticleHistoryLog from '@/components/review/ArticleHistoryLog';

const SEGMENTS = ['Lead Story', 'Quick Hit', 'Feature', 'Breaking', 'Talking Points', 'Fact Check', 'B-Roll Package'];

const flagConfig = {
  unverified_claim: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Unverified Claim' },
  sensitive_topic: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Sensitive Topic' },
  potential_bias: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Potential Bias' },
  breaking_unconfirmed: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Breaking / Unconfirmed' },
  opinion_content: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Opinion Content' },
  low_credibility_source: { color: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Low Credibility Source' },
};

const transcriptLabel = (status) => {
  switch (status) {
    case 'transcribed': return { label: 'Transcribed', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' };
    case 'metadata_only': return { label: 'Metadata Only', color: 'text-berna-orange', bg: 'bg-berna-orange/10' };
    case 'processing': return { label: 'Processing...', color: 'text-berna-purple', bg: 'bg-berna-purple/10' };
    case 'failed': return { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' };
    case 'pending': return { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-white/5' };
    default: return { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-white/5' };
  }
};

const segmentColor = (seg) => {
  const colors = {
    'Lead Story': 'bg-berna-purple/10 text-berna-purple border-berna-purple/20',
    'Breaking': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Feature': 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
    'Quick Hit': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Talking Points': 'bg-berna-orange/10 text-berna-orange border-berna-orange/20',
    'Fact Check': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'B-Roll Package': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };
  return colors[seg] || 'bg-white/5 text-muted-foreground border-white/10';
};

function addHistoryEntry(historyStr, event, details) {
  let history = [];
  try { history = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
  history.push({ event, timestamp: new Date().toISOString(), details });
  return JSON.stringify(history);
}

export default function IntelligenceCard({ article, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editFields, setEditFields] = useState({
    suggested_angle: article.suggested_angle || '',
    suggested_segment: article.suggested_segment || 'Quick Hit',
    summary: article.summary || '',
  });

  const safetyFlags = useMemo(() => {
    try { return JSON.parse(article.safety_flags || '[]'); } catch (e) { return []; }
  }, [article.safety_flags]);

  const tsInfo = transcriptLabel(article.transcription_status);
  const isLowScore = (article.overall_story_score != null && article.overall_story_score <= 3) ||
                     (article.source_quality_score != null && article.source_quality_score <= 3);
  const isApproved = article.status === 'approved' || article.status === 'bernas_pick';

  const handleApprove = async () => {
    const history = addHistoryEntry(article.processing_history, 'approved', 'Approved by producer');
    await base44.entities.Article.update(article.id, { status: 'approved', processing_history: history });
    onRefresh();
  };

  const handleReject = async () => {
    if (!rejecting) { setRejecting(true); return; }
    const history = addHistoryEntry(article.processing_history, 'rejected', rejectReason || 'Rejected by producer');
    await base44.entities.Article.update(article.id, {
      status: 'rejected',
      rejection_reason: rejectReason,
      archived_date: new Date().toISOString(),
      processing_history: history,
    });
    setRejecting(false); setRejectReason('');
    // Auto-load a new story to replace the rejected one
    try {
      await base44.functions.invoke('fetchStories', {});
    } catch (e) {
      console.error('Auto-fetch replacement story failed:', e);
    }
    onRefresh();
  };

  const handleSaveEdit = async () => {
    const history = addHistoryEntry(article.processing_history, 'edited', 'Producer edited intelligence fields');
    await base44.entities.Article.update(article.id, { ...editFields, processing_history: history });
    setEditing(false);
    onRefresh();
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try { await base44.functions.invoke('reviewArticle', { article_id: article.id }); onRefresh(); }
    finally { setReprocessing(false); }
  };

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const briefings = await base44.entities.Briefing.filter({ date: today }, '-created_date', 1);
      if (briefings.length > 0) {
        const b = briefings[0];
        const ids = b.article_ids ? JSON.parse(b.article_ids) : [];
        if (!ids.includes(article.id)) { ids.push(article.id); await base44.entities.Briefing.update(b.id, { article_ids: JSON.stringify(ids) }); }
      } else {
        await base44.entities.Briefing.create({ date: today, title: `Briefing ${today}`, briefing_type: 'daily', article_ids: JSON.stringify([article.id]), status: 'generating' });
      }
      const history = addHistoryEntry(article.processing_history, 'promoted', 'Promoted to daily briefing');
      await base44.entities.Article.update(article.id, { status: 'approved', processing_history: history });
      onRefresh();
    } finally { setPromoting(false); }
  };

  return (
    <div className={`glass-panel p-4 ${article.status === 'needs_review' ? 'border-l-2 border-yellow-400/50' : ''} ${isApproved ? 'border-l-2 border-berna-emerald/50' : ''}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {article.content_type && article.content_type !== 'unknown' && <ContentTypeBadge type={article.content_type} />}
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${tsInfo.bg} ${tsInfo.color}`}>
              {tsInfo.label}
            </span>
            {article.suggested_segment && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${segmentColor(article.suggested_segment)}`}>
                {article.suggested_segment}
              </span>
            )}
            {article.status === 'needs_review' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <AlertTriangle className="w-2.5 h-2.5" />Needs Review
              </span>
            )}
            {safetyFlags.map(f => (
              <span key={f} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border ${(flagConfig[f] || flagConfig.low_credibility_source).color}`}>
                <Shield className="w-2.5 h-2.5" />{(flagConfig[f] || { label: f }).label}
              </span>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug">{article.title}</h3>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {article.source_name && <span className="text-[10px] text-muted-foreground">{article.source_name}</span>}
            {article.url && (
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-berna-purple hover:underline">
                <ExternalLink className="w-2.5 h-2.5" />Source
              </a>
            )}
          </div>
        </div>
        {/* Scores */}
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="text-center px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] min-w-[52px]">
            <p className="text-[8px] text-muted-foreground uppercase">Story</p>
            <p className={`text-sm font-bold font-mono ${isLowScore ? 'text-red-400' : 'text-white'}`}>{article.overall_story_score ?? '-'}</p>
          </div>
          <div className="text-center px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] min-w-[52px]">
            <p className="text-[8px] text-muted-foreground uppercase">Source</p>
            <p className={`text-sm font-bold font-mono ${(article.source_quality_score ?? 10) <= 3 ? 'text-red-400' : 'text-white'}`}>{article.source_quality_score ?? '-'}</p>
          </div>
        </div>
      </div>

      {/* Metadata-only warning */}
      {article.transcription_status === 'metadata_only' && (
        <div className="mt-2 p-2 rounded-lg bg-berna-orange/5 border border-berna-orange/20 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 text-berna-orange flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-berna-orange/90">
            <strong>Metadata Only:</strong> The AI could not extract a transcript from this video. The summary below was generated from the title and description only — the full video was not reviewed. Verify independently before air.
          </p>
        </div>
      )}

      {/* AI Summary */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3 h-3 text-berna-purple" />
          <span className="text-[10px] font-semibold text-white uppercase tracking-wider">AI Summary</span>
        </div>
        {editing ? (
          <Textarea value={editFields.summary} onChange={e => setEditFields(f => ({ ...f, summary: e.target.value }))}
            className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-24" />
        ) : (
          <p className="text-xs text-white/70 leading-relaxed">{article.summary || 'No summary generated yet.'}</p>
        )}
      </div>

      {/* Suggested Angle */}
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div>
          <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Suggested Angle</span>
          {editing ? (
            <Textarea value={editFields.suggested_angle} onChange={e => setEditFields(f => ({ ...f, suggested_angle: e.target.value }))}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-16 mt-1" />
          ) : (
            <p className="text-xs text-white/70 leading-relaxed mt-0.5">{article.suggested_angle || 'Not yet reviewed.'}</p>
          )}
        </div>
        {editing && (
          <div>
            <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Segment</span>
            <Select value={editFields.suggested_segment} onValueChange={v => setEditFields(f => ({ ...f, suggested_segment: v }))}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Reject reason input */}
      {rejecting && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <Textarea placeholder="Rejection reason (optional)..." value={rejectReason}
            onChange={e => setRejectReason(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-16" />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {editing ? (
          <>
            <Button size="sm" onClick={handleSaveEdit} className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7">
              <Save className="w-3 h-3" />Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="border-white/10 text-white text-xs h-7">
              <X className="w-3 h-3" />Cancel
            </Button>
          </>
        ) : rejecting ? (
          <>
            <Button size="sm" onClick={handleReject} className="bg-red-500 hover:bg-red-500/90 text-white text-xs h-7">
              <XCircle className="w-3 h-3" />Confirm Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setRejecting(false); setRejectReason(''); }} className="border-white/10 text-white text-xs h-7">
              <X className="w-3 h-3" />Cancel
            </Button>
          </>
        ) : (
          <>
            {!isApproved && (
              <Button size="sm" onClick={handleApprove} className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7">
                <CheckCircle className="w-3 h-3" />Approve
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleReject}
              className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs h-7">
              <XCircle className="w-3 h-3" />Reject
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}
              className="border-white/10 text-white hover:bg-white/[0.04] text-xs h-7">
              <Edit3 className="w-3 h-3" />Edit
            </Button>
            <Button size="sm" variant="outline" onClick={handleReprocess} disabled={reprocessing}
              className="border-berna-purple/20 text-berna-purple hover:bg-berna-purple/10 text-xs h-7">
              {reprocessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Reprocess
            </Button>
            <Button size="sm" variant="outline" onClick={handlePromote} disabled={promoting || !isApproved}
              className="border-berna-orange/20 text-berna-orange hover:bg-berna-orange/10 text-xs h-7">
              {promoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}To Briefing
            </Button>
          </>
        )}
        {/* History toggle */}
        <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-white text-xs h-7 ml-auto">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          History
        </Button>
      </div>

      {/* History log */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <ArticleHistoryLog historyStr={article.processing_history} />
        </div>
      )}
    </div>
  );
}