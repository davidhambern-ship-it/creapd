import React from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, Mic, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function MusicTopics() {
  const { config, topics, loading } = useMusicProduction();

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Mic className="w-6 h-6 text-primary" /> Music Topics</h1>
        <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
      </div>

      {topics.length > 0 ? (
        <div className="space-y-4">
          {topics.map(topic => (
            <div key={topic.id} className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-lg">{topic.topic_name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${topic.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                  {topic.status}
                </span>
              </div>
              {topic.generated_summary && (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{topic.generated_summary}</p>
              )}
              {topic.talking_points && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Talking Points</p>
                  <div className="text-sm whitespace-pre-wrap">{topic.talking_points}</div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {topic.suggested_placement && <span>📍 {topic.suggested_placement}</span>}
                {topic.sources && <span>📚 {topic.sources}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <Mic className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No music topics were selected. Edit your configuration to add topics.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/music/configure">Edit Configuration</Link>
          </Button>
        </div>
      )}
    </div>
  );
}