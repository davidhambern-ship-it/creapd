import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TOPIC_STATUS_LABELS } from '@/lib/researchConstants';
import {
  Loader2, Search, Trash2, FileSearch, ExternalLink, BookMarked, Clock
} from 'lucide-react';

const SPINE_GRADIENTS = [
  'linear-gradient(180deg, hsl(190 60% 22% / 0.6), hsl(190 50% 12% / 0.4))',
  'linear-gradient(180deg, hsl(270 50% 22% / 0.5), hsl(270 40% 12% / 0.4))',
  'linear-gradient(180deg, hsl(152 45% 20% / 0.5), hsl(152 40% 10% / 0.4))',
  'linear-gradient(180deg, hsl(35 70% 25% / 0.5), hsl(35 60% 15% / 0.4))',
  'linear-gradient(180deg, hsl(210 55% 22% / 0.5), hsl(210 45% 12% / 0.4))',
];

function statusAccent(status) {
  if (status === 'researching') return 'hsl(35 90% 55%)';
  if (status === 'researched' || status === 'in_review') return 'hsl(152 60% 50%)';
  if (status === 'used') return 'hsl(210 80% 60%)';
  if (status === 'rejected') return 'hsl(0 70% 55%)';
  return 'hsl(190 60% 45%)';
}

export default function TopicListPanel({
  topics, researching, onResearch, onExtract, onDelete
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Shelf Header */}
      <div
        className="px-4 py-3 shrink-0 flex items-center gap-2"
        style={{ borderBottom: '1px solid hsl(190 30% 16% / 0.3)' }}
      >
        <BookMarked className="w-4 h-4" style={{ color: 'hsl(190 80% 55%)' }} />
        <h2 className="text-sm font-heading font-semibold tracking-wide">The Stacks</h2>
        <span
          className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 70% 55%)' }}
        >
          {topics.length} {topics.length === 1 ? 'vol' : 'vols'}
        </span>
      </div>

      {/* Shelves */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 120px, hsl(190 30% 18% / 0.2) 120px, hsl(190 30% 18% / 0.2) 122px, transparent 122px, transparent 124px)',
        }}
      >
        {topics.length === 0 ? (
          <div className="text-center py-10 px-4">
            <BookMarked className="w-8 h-8 mx-auto mb-2" style={{ color: 'hsl(190 40% 30% / 0.5)' }} />
            <p className="text-xs text-muted-foreground">
              The shelves are empty. Speak with CREAPr to begin cataloguing.
            </p>
          </div>
        ) : (
          topics.map((topic, idx) => {
            const isResearching = researching === topic.id;
            const canResearch = topic.status === 'pending' || topic.status === 'rejected';
            const canExtract = topic.status === 'researched' && topic.point_count === 0;
            const accent = statusAccent(topic.status);
            const spine = SPINE_GRADIENTS[idx % SPINE_GRADIENTS.length];
            return (
              <div
                key={topic.id}
                className="relative flex gap-0 rounded-lg overflow-hidden cc-animate-fade-up"
                style={{
                  background: 'hsl(210 40% 7% / 0.5)',
                  border: '1px solid hsl(190 25% 16% / 0.3)',
                }}
              >
                {/* Book spine */}
                <div
                  className="w-2.5 flex-shrink-0 self-stretch"
                  style={{ background: spine, boxShadow: 'inset -1px 0 3px hsl(0 0% 0% / 0.3)' }}
                />
                {/* Content */}
                <div className="flex-1 min-w-0 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-snug line-clamp-2">{topic.title}</h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap ${topic.status === 'researching' ? 'animate-pulse' : ''}`}
                      style={{ background: `${accent} / 0.15)`, color: accent }}
                    >
                      {TOPIC_STATUS_LABELS[topic.status] || topic.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    {topic.category && <span className="px-1.5 py-0.5 rounded bg-secondary">{topic.category}</span>}
                    {topic.research_depth && <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {topic.research_depth}</span>}
                    {topic.point_count > 0 && <span>{topic.point_count} pts</span>}
                    {topic.sources_count > 0 && <span>{topic.sources_count} src</span>}
                  </div>

                  <div className="flex items-center gap-1 pt-0.5">
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}