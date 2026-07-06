import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatConfidence, TOPIC_STATUS_LABELS } from '@/lib/researchConstants';
import {
  Loader2, FlaskConical, Lightbulb, Plus, Search, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, FileSearch, Clock, ExternalLink
} from 'lucide-react';
import ResearchProgressModal from '@/components/research/ResearchProgressModal';
import TopicConversation from '@/components/research/TopicConversation';

export default function ResearchTopics() {
  const { config, topics, loading, refresh } = useResearchProduction();
  const [showAdd, setShowAdd] = useState(false);
  const [researching, setResearching] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [progressTopic, setProgressTopic] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <FlaskConical className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleResearch = async (topic) => {
    setResearching(topic.id);
    setProgressTopic(topic);
    try {
      await base44.functions.invoke('deepResearchV2', { topic_id: topic.id, research_depth: topic.research_depth });
      await new Promise(r => setTimeout(r, 2000));
      setProgressTopic(null);
      await base44.functions.invoke('extractResearchPoints', { topic_id: topic.id });
      refresh();
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setResearching(null);
      setProgressTopic(null);
    }
  };

  const handleExtract = async (topic) => {
    setResearching(topic.id);
    try {
      await base44.functions.invoke('extractResearchPoints', { topic_id: topic.id });
      refresh();
    } catch (err) {
      console.error('Extraction failed:', err);
    } finally {
      setResearching(null);
    }
  };

  const handleDelete = async (topic) => {
    await base44.entities.ResearchTopic.delete(topic.id);
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="!flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            Research Topics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Add topics, run deep research, and extract Point Cards</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" />
          Chat with CREAP
        </Button>
      </div>

      {showAdd && (
        <TopicConversation
          config={config}
          onClose={() => { setShowAdd(false); refresh(); }}
        />
      )}

      {topics.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Lightbulb className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">No research topics yet. Add your first topic to begin.</p>
          <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Chat with CREAP</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map(topic => {
            const isExpanded = expanded === topic.id;
            const isResearching = researching === topic.id;
            const canResearch = topic.status === 'pending' || topic.status === 'rejected';
            const canExtract = topic.status === 'researched' && topic.point_count === 0;
            return (
              <div key={topic.id} className="glass-panel p-4">
                <div className="!flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{topic.title}</h3>
                    <div className="!flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      {topic.category && <span className="px-1.5 py-0.5 rounded bg-secondary">{topic.category}</span>}
                      <span className="!flex items-center gap-0.5"><Clock className="w-3 h-3" /> {topic.research_depth}</span>
                      {topic.confidence_score > 0 && <span>Confidence: {formatConfidence(topic.confidence_score)}</span>}
                      {topic.point_count > 0 && <span>{topic.point_count} points</span>}
                      {topic.sources_count > 0 && <span>{topic.sources_count} sources</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    topic.status === 'researching' ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                    topic.status === 'researched' || topic.status === 'in_review' ? 'bg-emerald-500/15 text-emerald-400' :
                    topic.status === 'used' ? 'bg-blue-500/15 text-blue-400' :
                    topic.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {TOPIC_STATUS_LABELS[topic.status] || topic.status}
                  </span>
                </div>

                {topic.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {isExpanded || topic.description.length <= 150 ? topic.description : topic.description.substring(0, 150) + '...'}
                  </p>
                )}

                {isExpanded && topic.executive_summary && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Executive Summary</p>
                    <p className="text-sm whitespace-pre-line">{topic.executive_summary}</p>
                  </div>
                )}

                <div className="!flex items-center justify-between mt-3">
                  <div className="!flex items-center gap-1">
                    {topic.description && topic.description.length > 150 && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : topic.id)}
                        className="text-xs text-primary hover:underline !flex items-center gap-0.5"
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                      </button>
                    )}
                  </div>
                  <div className="!flex items-center gap-2">
                    {canResearch && (
                      <Button
                        size="sm"
                        onClick={() => handleResearch(topic)}
                        disabled={isResearching}
                      >
                        {isResearching ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching...</> : <><Search className="w-3 h-3 mr-1" /> Run Research</>}
                      </Button>
                    )}
                    {canExtract && (
                      <Button size="sm" variant="outline" onClick={() => handleExtract(topic)} disabled={isResearching}>
                        {isResearching ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Extracting...</> : <><FileSearch className="w-3 h-3 mr-1" /> Extract Points</>}
                      </Button>
                    )}
                    {topic.dossier_id && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/research/manager?topic_id=${topic.id}`}>View Points <ExternalLink className="w-3 h-3 ml-1" /></Link>
                      </Button>
                    )}
                    <button
                      onClick={() => handleDelete(topic)}
                      className="text-xs p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isResearching && !progressTopic && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 !flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-sm text-primary">Extracting Point Cards from dossier...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ResearchProgressModal
        open={!!progressTopic}
        topicId={progressTopic?.id}
        topicTitle={progressTopic?.title}
        onClose={() => setProgressTopic(null)}
      />
    </div>
  );
}