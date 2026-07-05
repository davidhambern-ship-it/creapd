import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, XCircle, Star, ExternalLink, ChevronDown, ChevronUp, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';

export default function BriefStoryCard({ article, isBernasPick, onApprove, onReject, onSetBernasPick }) {
  const [expanded, setExpanded] = useState(false);
  const isApproved = article.status === 'approved' || article.status === 'bernas_pick';
  const isRejected = article.status === 'rejected';

  return (
    <div className={`mt-3 p-4 rounded-lg border transition-all ${
      isBernasPick ? 'bg-gradient-to-r from-berna-orange/5 to-berna-purple/5 border-berna-orange/20' :
      isApproved ? 'bg-berna-emerald/5 border-berna-emerald/20' :
      isRejected ? 'bg-red-500/5 border-red-500/10 opacity-60' :
      'bg-white/[0.02] border-white/[0.06]'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isBernasPick && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
              <span className="text-[10px] text-berna-orange font-semibold uppercase tracking-wider">Berna's Pick</span>
            </div>
          )}
          <Link to={`/news/storydetail/${article.id}`}>
            <h4 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">{article.title}</h4>
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {article.category && <CategoryBadge category={article.category} />}
            <OpportunityScore score={article.opportunity_score} />
            <span className="text-[10px] text-muted-foreground font-mono">{article.source_name || article.publication}</span>
            {article.geographic_relevance && <span className="text-[10px] text-muted-foreground">{article.geographic_relevance}</span>}
          </div>
        </div>
        {isApproved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-berna-emerald flex-shrink-0">
            <CheckCircle className="w-3 h-3" />Approved
          </span>
        )}
      </div>

      {article.summary && (
        <p className="text-xs text-white/70 mt-3 leading-relaxed">{article.summary}</p>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 text-xs">
          {article.full_text_excerpt && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Why It Matters</p>
              <p className="text-white/60 leading-relaxed">{article.full_text_excerpt}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Freshness</p>
              <p className="text-white font-mono">{article.freshness_score || '-'}/5</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Credibility</p>
              <p className="text-white font-mono">{article.credibility_score || '-'}/5</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Usefulness</p>
              <p className="text-white font-mono">{article.usefulness_score || '-'}/5</p>
            </div>
          </div>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-berna-purple hover:underline">
              <ExternalLink className="w-3 h-3" />Open Source
            </a>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
        {!isApproved && !isRejected && (
          <Button size="sm" variant="ghost" className="text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7" onClick={() => onApprove(article.id)}>
            <CheckCircle className="w-3 h-3 mr-1" />Approve
          </Button>
        )}
        {!isRejected && (
          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs h-7" onClick={() => onReject(article.id)}>
            <XCircle className="w-3 h-3 mr-1" />Reject
          </Button>
        )}
        {!isBernasPick && !isRejected && (
          <Button size="sm" variant="ghost" className="text-berna-orange hover:bg-berna-orange/10 text-xs h-7" onClick={() => onSetBernasPick(article.id)}>
            <Star className="w-3 h-3 mr-1" />Berna's Pick
          </Button>
        )}
        {isApproved && (
          <Link to="/news/productionpackages">
            <Button size="sm" variant="ghost" className="text-berna-purple hover:bg-berna-purple/10 text-xs h-7">
              <Package className="w-3 h-3 mr-1" />To Production
            </Button>
          </Link>
        )}
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-berna-purple hover:underline ml-auto">
          {expanded ? 'Show less' : 'Show details'}
        </button>
        <Link to={`/news/storydetail/${article.id}`} className="text-[10px] text-berna-emerald hover:underline">
          Full story →
        </Link>
      </div>
    </div>
  );
}