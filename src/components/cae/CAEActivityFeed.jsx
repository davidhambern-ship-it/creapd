import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ACTIVITY_EVENT_LABELS } from '@/lib/caeConstants';

export default function CAEActivityFeed({ events, compact }) {
  const [filter, setFilter] = useState('all');

  if (!events || events.length === 0) {
    return (
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-2">Live Activity Feed</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const filtered = filter === 'all' ? events : events.filter(e => {
    const label = ACTIVITY_EVENT_LABELS[e.event_type];
    return label && (label.color === filter);
  });

  const filters = ['all', 'berna-emerald', 'chart-4', 'primary', 'accent', 'destructive'];

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Live Activity Feed</h3>
        {!compact && (
          <div className="flex gap-1">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${filter === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary/50'}`}
              >
                {f === 'all' ? 'All' : f.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={`space-y-2 ${compact ? 'max-h-96' : 'max-h-[600px]'} overflow-y-auto`}>
        {filtered.map(event => {
          const label = ACTIVITY_EVENT_LABELS[event.event_type] || { label: event.event_type, color: 'muted-foreground', icon: 'Activity' };
          const color = label.color;
          return (
            <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
              <div className={`w-2 h-2 rounded-full bg-${color} mt-2 shrink-0`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium text-${color}`}>{label.label}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(event.created_date).toLocaleTimeString()}</span>
                </div>
                {event.resource_title && <p className="text-sm font-medium truncate mt-0.5">{event.resource_title}</p>}
                {event.details && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.details}</p>}
                {event.source_provider && <p className="text-xs text-muted-foreground/70 mt-0.5">via {event.source_provider}</p>}
              </div>
              {event.action_url && (
                <a href={event.action_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">View</a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}