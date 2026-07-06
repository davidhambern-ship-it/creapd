import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TOPIC_STATUS_LABELS } from '@/lib/researchConstants';
import {
  Loader2, Search, Trash2, FileSearch, ExternalLink, Lightbulb, Clock
} from 'lucide-react';

export default function TopicListPanel({
  topics, researching, onResearch, onExtract, onDelete
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="font-heading font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Your Topics
          <span className="ml-auto text-xs text-muted-foreground font-normal">{topics.length}</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {topics.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Lightbulb className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Topics you create with CREAP will appear here as they're researched.
            </p>
          </div>
        ) : (
          topics.map(topic => {
            const isResearching = researching === topic.id;
            const canResearch = topic.status === 'pending' || topic.status === 'rejected';
            const canExtract = topic.status === 'researched' && topic.point_count === 0;
            return (
              <div key={topic.id} className="glass-panel p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium leading-snug line-clamp-2">{topic.title}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    topic.status === 'researching' ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                    topic.status === 'researched' || topic.status === 'in_review' ? 'bg-emerald-500/15 text-emerald-400' :
                    topic.status === 'used' ? 'bg-blue-500/15 text-blue-400' :
                    topic.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {TOPIC_STATUS_LABELS[topic.status] || topic.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  {topic.category && <span className="px-1.5 py-0.5 rounded bg-secondary">{topic.category}</span>}
                  {topic.research_depth && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {topic.research_depth}</span>}
                  {topic.point_count > 0 && <span>{topic.point_count} pts</span>}
                  {topic.sources_count > 0 && <span>{topic.sources_count} src</span>}
                </div>

                <div className="flex items-center gap-1 pt-1">
                  {canResearch && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => onResearch(topic)} disabled={isResearching}>
                      {isResearching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                      Research
                    </Button>
                  )}
                  {canExtract && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => onExtract(topic)} disabled={isResearching}>
                      {isResearching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileSearch className="w-3 h-3 mr-1" />}
                      Extract
                    </Button>
                  )}
                  {topic.dossier_id && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
                      <Link to={`/research/manager?topic_id=${topic.id}`}>
                        <ExternalLink className="w-3 h-3 mr-1" /> View
                      </Link>
                    </Button>
                  )}
                  <button
                    onClick={() => onDelete(topic)}
                    className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}