import React, { useState } from 'react';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import { Loader2, Mic2, Lightbulb, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export default function TalkTopics() {
  const { config, topics, loading, refresh, source } = useTalkProduction();
  const [expanded, setExpanded] = useState(null);

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
          <Mic2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const toggleApproved = async (topic) => {
    const newStatus = topic.status === 'approved' ? 'ready' : 'approved';
    if (source === 'neon') {
      await creapdApi.post('/talk/production', {
        action: 'set_topic_status',
        topic_id: topic.id,
        status: newStatus,
      });
    } else {
      await base44.entities.TalkTopic.update(topic.id, { status: newStatus });
    }
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Discussion Topics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Topics with summaries, talking points, verification, and counter-perspectives</p>
      </div>

      {topics.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Lightbulb className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No topics generated yet. Refresh your production to generate topics.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map(topic => {
            const isExpanded = expanded === topic.id;
            const summary = topic.generated_summary || '';
            const isLong = summary.length > 150;
            const counterPerspectives = Array.isArray(topic.counter_perspectives) ? topic.counter_perspectives : [];
            const debateQuestions = Array.isArray(topic.debate_questions) ? topic.debate_questions : [];
            return (
              <div key={topic.id} className="glass-panel p-4">
                <div className="!flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium">{topic.topic_name}</h3>
                    {topic.verification_status && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verification: <span className="capitalize">{topic.verification_status}</span>
                        {Number(topic.confidence_score) > 0 ? ` · ${Math.round(Number(topic.confidence_score))}% confidence` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    topic.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    'bg-primary/15 text-primary'
                  }`}>
                    {topic.status}
                  </span>
                </div>
                {summary && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {isExpanded || !isLong ? summary : summary.substring(0, 150) + '...'}
                  </p>
                )}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {topic.talking_points && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Talking Points</p>
                        <p className="text-sm whitespace-pre-line">{topic.talking_points}</p>
                      </div>
                    )}
                    {topic.verification_notes && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Verification Notes</p>
                        <p className="text-sm whitespace-pre-line">{topic.verification_notes}</p>
                      </div>
                    )}
                    {counterPerspectives.length > 0 && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Counter-Perspectives</p>
                        <ul className="space-y-1 text-sm list-disc pl-4">
                          {counterPerspectives.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {debateQuestions.length > 0 && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Debate Questions</p>
                        <ul className="space-y-1 text-sm list-disc pl-4">
                          {debateQuestions.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {topic.sources && (
                      <p className="text-xs text-muted-foreground"><span className="font-semibold">Sources:</span> {topic.sources}</p>
                    )}
                  </div>
                )}
                <div className="!flex items-center justify-between mt-3">
                  {topic.suggested_placement && (
                    <span className="text-xs text-muted-foreground">{topic.suggested_placement}</span>
                  )}
                  <div className="!flex items-center gap-1 ml-auto">
                    {(isLong || topic.talking_points || topic.verification_notes || counterPerspectives.length > 0 || debateQuestions.length > 0) && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : topic.id)}
                        className="text-xs text-primary hover:underline !flex items-center gap-0.5"
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                      </button>
                    )}
                    <button
                      onClick={() => toggleApproved(topic)}
                      className="text-xs px-2 py-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors !flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {topic.status === 'approved' ? 'Unapprove' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
