import React from 'react';
import { useCookingProduction } from '@/hooks/useCookingProduction';
import { Loader2, ChefHat, Search, AlertCircle } from 'lucide-react';

export default function CookingResearch() {
  const { config, research, loading } = useCookingProduction();

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2"><Search className="w-5 h-5 text-primary" /> Research</h1>
        <p className="text-sm text-muted-foreground mt-1">Background research on cuisines, techniques, and food trends</p>
      </div>

      {research.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No research items yet. Refresh your production to generate research.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {research.map(item => (
            <div key={item.id} className="glass-panel p-4 space-y-2">
              <div className="!flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm">{item.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${item.relevance === 'high' ? 'bg-emerald-500/15 text-emerald-400' : item.relevance === 'medium' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{item.relevance}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.source} · {item.date}</p>
              <p className="text-sm text-muted-foreground">{item.summary}</p>
              {item.category && <span className="inline-block text-xs px-2 py-0.5 rounded bg-secondary">{item.category}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}