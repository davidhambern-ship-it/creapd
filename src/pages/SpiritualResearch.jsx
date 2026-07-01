import React from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BookOpen, FileText, ExternalLink } from 'lucide-react';
import { SOURCE_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function SpiritualResearch() {
  const { config, research, loading, refresh } = useSpiritualProduction();

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
          <Search className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  if (research.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Search className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No research items yet. Refresh your production to gather research.</p>
          <Button asChild><Link to="/spiritual/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const sourceTypeColors = {
    primary_source: 'bg-berna-emerald/20 text-berna-emerald',
    secondary_source: 'bg-primary/20 text-primary',
    historical_reference: 'bg-accent/20 text-accent',
    language_study: 'bg-blue-500/20 text-blue-400',
    current_event: 'bg-berna-orange/20 text-berna-orange',
    ai_suggestion: 'bg-purple-500/20 text-purple-400'
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold mb-1">Research</h1>
          <p className="text-sm text-muted-foreground">{config.faith_tradition} · {config.branch_denomination} · {research.length} items</p>
        </div>

        <div className="space-y-4">
          {research.map(item => (
            <div key={item.id} className="glass-panel p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.source} · {item.date}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${sourceTypeColors[item.source_type] || 'bg-muted text-muted-foreground'}`}>
                    {SOURCE_TYPE_LABELS[item.source_type] || item.source_type}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${item.relevance === 'high' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {item.relevance} relevance
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground/90 mb-3">{item.summary}</p>
              {item.associated_topic && (
                <p className="text-xs text-muted-foreground mb-2">Topic: {item.associated_topic}</p>
              )}
              {item.citation && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 mt-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{item.citation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}