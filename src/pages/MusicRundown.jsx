import React from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, ClipboardList } from 'lucide-react';
import { formatRuntime, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';

const SEGMENT_COLORS = {
  intro: 'bg-emerald-500/15 text-emerald-400',
  song: 'bg-primary/15 text-primary',
  talk_break: 'bg-blue-500/15 text-blue-400',
  topic_segment: 'bg-orange-500/15 text-orange-400',
  sponsor_break: 'bg-yellow-500/15 text-yellow-400',
  station_id: 'bg-purple-500/15 text-purple-400',
  outro: 'bg-emerald-500/15 text-emerald-400'
};

export default function MusicRundown() {
  const { config, rundown, loading } = useMusicProduction();

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const totalSeconds = rundown.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" /> Show Rundown</h1>
        <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
      </div>

      {rundown.length > 0 ? (
        <>
          <div className="glass-panel p-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Items:</span> <span className="font-medium">{rundown.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Total Runtime:</span> <span className="font-medium">{formatRuntime(totalSeconds)}</span>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            {rundown.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 ${i > 0 ? 'border-t border-border/50' : ''} hover:bg-white/5`}>
                <div className="text-xs text-muted-foreground font-mono w-14 shrink-0">
                  {item.start_time || '--:--'}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${SEGMENT_COLORS[item.segment_type] || 'bg-muted text-muted-foreground'}`}>
                  {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.notes && <p className="text-xs text-muted-foreground truncate">{item.notes}</p>}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatRuntime(item.duration_seconds)}
                </div>
                <div className="text-xs text-muted-foreground font-mono shrink-0 hidden md:block">
                  {item.end_time || '--:--'}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-panel p-12 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No show rundown has been generated yet.</p>
        </div>
      )}
    </div>
  );
}