import React from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function MusicResearch() {
  const { config, research, loading, refresh } = useMusicProduction();

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Search className="w-6 h-6 text-primary" /> Research</h1>
          <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
        </div>
      </div>

      {research.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {research.map(item => (
            <div key={item.id} className="glass-panel p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.relevance === 'high' ? 'bg-emerald-500/15 text-emerald-400' : item.relevance === 'medium' ? 'bg-orange-500/15 text-orange-400' : 'bg-muted text-muted-foreground'}`}>
                  {item.relevance}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{item.summary}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{item.source}</span>
                <span>•</span>
                <span>{item.category}</span>
                <span>•</span>
                <span>{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No research has been generated yet. Refresh today's music research.</p>
          <Button onClick={() => { base44.functions.invoke('buildMusicProduction', { configuration_id: config?.id }).then(refresh); }}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh Research
          </Button>
        </div>
      )}
    </div>
  );
}