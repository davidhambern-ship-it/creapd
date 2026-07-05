import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, Bookmark, Star, Search as SearchIcon,
  ExternalLink, Clock, AlertTriangle, ChevronDown, ChevronUp,
  FileText, Package, StickyNote, Archive, Trash2, Edit3, MapPin, Tag, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import ContentTypeBadge from '@/components/shared/ContentTypeBadge';

const PACKAGE_STATUS_STYLES = {
  not_generated: { label: 'No Package', color: 'text-muted-foreground/50', dot: 'bg-muted-foreground/30' },
  generating: { label: 'Generating', color: 'text-berna-purple', dot: 'bg-berna-purple animate-pulse' },
  generated: { label: 'Generated', color: 'text-blue-400', dot: 'bg-blue-400' },
  edited: { label: 'Edited', color: 'text-berna-orange', dot: 'bg-berna-orange' },
  approved: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' },
};

function getWhyItMatters(article) {
  const score = article.opportunity_score || 0;
  if (score >= 4) return 'High-impact story — strong opportunity for today\'s audience.';
  if (score >= 3) return 'Solid story with good relevance to current themes.';
  if (article.usefulness_score >= 3) return 'Useful context for ongoing coverage.';
  return 'Lower priority — monitor for developments.';
}

export default function StoryCard({
  article,
  pkg,
  hasNotes,
  isSelected,
  onSelect,
  onDeselect,
  onStatusChange,
  onArchive,
  onDelete,
  tab = 'active',
}) {
  const [expanded, setExpanded] = useState(false);
  const pkgStatus = pkg?.status || 'not_generated';
  const pkgStyle = PACKAGE_STATUS_STYLES[pkgStatus] || PACKAGE_STATUS_STYLES.not_generated;

  return (
    <div className={`glass-panel p-4 transition-all hover:border-white/[0.12] ${article.status === 'bernas_pick' ? 'glow-orange border-berna-orange/20' : ''} ${isSelected ? 'border-berna-emerald/40 ring-1 ring-berna-emerald/20' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        {tab === 'active' && (
          <button
            onClick={() => isSelected ? onDeselect(article.id) : onSelect(article.id)}
            className={`mt-1 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected ? 'bg-berna-emerald border-berna-emerald' : 'border-white/20 hover:border-white/40'
            }`}
            title={isSelected ? 'Deselect from manager' : 'Select for manager'}
          >
            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          {/* Top row: status + indicators */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={article.status} />
            {article.duplicate_score > 3 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                Duplicate Risk
              </span>
            )}
            {/* Producer Notes Indicator */}
            {hasNotes && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-400" title="Has producer notes">
                <StickyNote className="w-3 h-3" />
                Notes
              </span>
            )}
            {/* Content Type Badge */}
            <ContentTypeBadge contentType={article.content_type} transcriptionStatus={article.transcription_status} />
            {/* Generated Package Status */}
            <span className={`inline-flex items-center gap-1 text-[10px] ${pkgStyle.color}`} title="Production package status">
              <span className={`w-1.5 h-1.5 rounded-full ${pkgStyle.dot}`} />
              {pkgStyle.label}
            </span>
            {/* Estimated Runtime */}
            {pkg?.estimated_runtime && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {pkg.estimated_runtime}
              </span>
            )}
          </div>

          {/* Headline */}
          <Link to={`/news/story/${article.id}`}>
            <h3 className="text-sm font-semibold text-white leading-snug mb-2 hover:text-berna-purple transition-colors">{article.title}</h3>
          </Link>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {article.category && <CategoryBadge category={article.category} />}
            <OpportunityScore score={article.opportunity_score} />
            {article.source_name && <span className="text-[10px] text-muted-foreground">{article.source_name}</span>}
            {article.author && <span className="text-[10px] text-muted-foreground">· {article.author}</span>}
            {article.published_at && (
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(article.published_at).toLocaleDateString()}
              </span>
            )}
            {article.estimated_reading_time && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {article.estimated_reading_time}
              </span>
            )}
            {article.geographic_relevance && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {article.geographic_relevance}
              </span>
            )}
          </div>

          {/* Tags */}
          {article.tags && (
            <div className="flex flex-wrap gap-1 mb-2">
              {article.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-berna-purple/10 border border-berna-purple/20 text-[9px] text-berna-purple">
                  <Tag className="w-2 h-2" />{tag}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {article.summary && (
            <p className={`text-xs text-white/60 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{article.summary}</p>
          )}

          {/* Why It Matters */}
          <div className="mt-2 flex items-start gap-1.5">
            <span className="text-[10px] text-berna-orange font-semibold uppercase tracking-wider flex-shrink-0">Why It Matters:</span>
            <p className="text-[10px] text-white/50 leading-relaxed">{getWhyItMatters(article)}</p>
          </div>

          {/* Expanded details */}
          {expanded && article.full_text_excerpt && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Excerpt</p>
              <p className="text-xs text-white/60 leading-relaxed">{article.full_text_excerpt}</p>
            </div>
          )}

          {article.rejection_reason && (
            <p className="text-xs text-red-400/80 mt-2 italic">Rejected: {article.rejection_reason}</p>
          )}

          {/* Score column inline for mobile */}
          <div className="flex flex-wrap gap-3 mt-2 lg:hidden">
            <span className="text-[10px] text-muted-foreground">Fresh: <span className="text-white font-mono">{article.freshness_score || '-'}</span></span>
            <span className="text-[10px] text-muted-foreground">Cred: <span className="text-white font-mono">{article.credibility_score || '-'}</span></span>
            <span className="text-[10px] text-muted-foreground">Use: <span className="text-white font-mono">{article.usefulness_score || '-'}</span></span>
            <span className="text-[10px] text-muted-foreground">Dup: <span className="text-white font-mono">{article.duplicate_score || '-'}</span></span>
          </div>
        </div>

        {/* Score column - desktop */}
        <div className="hidden lg:flex flex-col gap-1 text-[10px] min-w-20">
          <div className="flex justify-between"><span className="text-muted-foreground">Fresh</span><span className="text-white font-mono">{article.freshness_score || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cred</span><span className="text-white font-mono">{article.credibility_score || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Use</span><span className="text-white font-mono">{article.usefulness_score || '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dup</span><span className="text-white font-mono">{article.duplicate_score || '-'}</span></div>
        </div>
      </div>

      {/* Actions */}
      {tab === 'active' && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
          <Button size="sm" variant="ghost" className="text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7" onClick={() => onStatusChange(article.id, 'approved')}>
            <CheckCircle className="w-3 h-3 mr-1" />Approve
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs h-7" onClick={() => onStatusChange(article.id, 'rejected', 'Manually rejected')}>
            <XCircle className="w-3 h-3 mr-1" />Reject
          </Button>
          <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-500/10 text-xs h-7" onClick={() => onStatusChange(article.id, 'saved_for_later')}>
            <Bookmark className="w-3 h-3 mr-1" />Save
          </Button>
          <Button size="sm" variant="ghost" className="text-berna-orange hover:bg-berna-orange/10 text-xs h-7" onClick={() => onStatusChange(article.id, 'bernas_pick')}>
            <Star className="w-3 h-3 mr-1" />Berna's Pick
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
            {expanded ? 'Less' : 'Details'}
          </Button>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7">
                <ExternalLink className="w-3 h-3 mr-1" />Source
              </Button>
            </a>
          )}
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-yellow-400 text-xs h-7" onClick={() => onArchive(article.id)}>
            <Archive className="w-3 h-3 mr-1" />Archive
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-400 text-xs h-7" onClick={() => onDelete(article.id)}>
            <Trash2 className="w-3 h-3 mr-1" />Delete
          </Button>
          <Link to={`/news/story/${article.id}`}>
            <Button size="sm" variant="ghost" className="text-berna-purple hover:bg-berna-purple/10 text-xs h-7">
              <FileText className="w-3 h-3 mr-1" />Details
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}