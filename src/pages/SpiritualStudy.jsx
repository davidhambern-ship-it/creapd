import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, BookOpen, FileText, Plus, ChevronDown, ChevronRight, ListChecks, Clock } from 'lucide-react';

export default function SpiritualStudy() {
  const { config, topics, research, loading, refresh } = useSpiritualProduction();
  const [expandedTopic, setExpandedTopic] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No study topics generated yet. Refresh your production to prepare study materials.</p>
          <Button asChild><Link to="/spiritual/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const toggleTopic = (id) => setExpandedTopic(expandedTopic === id ? null : id);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold mb-1">Study Workspace</h1>
          <p className="text-sm text-muted-foreground">{config.faith_tradition} · {config.branch_denomination} · {topics.length} topics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Study Topics</h3>
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => toggleTopic(topic.id)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  expandedTopic === topic.id ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-secondary/30'
                }`}
              >
                {topic.topic_name}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            {topics.map(topic => (
              <div key={topic.id} className={expandedTopic && expandedTopic !== topic.id ? 'hidden' : 'block'}>
                <div className="glass-panel p-6 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-heading font-bold mb-1">{topic.topic_name}</h2>
                      <span className={`text-xs px-2 py-1 rounded-full ${topic.status === 'approved' ? 'bg-emerald/20 text-berna-emerald' : 'bg-primary/20 text-primary'}`}>
                        {topic.status}
                      </span>
                    </div>
                  </div>

                  {topic.generated_summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Summary</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.generated_summary}</p>
                    </div>
                  )}

                  {topic.key_passages && (
                    <div className="mb-4 p-4 rounded-lg bg-secondary/30">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Key Passages</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.key_passages}</p>
                    </div>
                  )}

                  {topic.talking_points && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Talking Points</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.talking_points}</p>
                    </div>
                  )}

                  {topic.historical_context && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Historical Context</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.historical_context}</p>
                    </div>
                  )}

                  {topic.discussion_questions && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">Discussion Questions</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.discussion_questions}</p>
                    </div>
                  )}

                  {topic.multiple_perspectives && (
                    <div className="mb-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <h4 className="text-sm font-semibold mb-2">Multiple Perspectives</h4>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{topic.multiple_perspectives}</p>
                    </div>
                  )}

                  {topic.sources && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/20">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">{topic.sources}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}