import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Eye, CheckCircle2, SkipForward, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * TourEngagementPanel — shows producer engagement analytics for a tour script:
 * total views, completion rate, and a per-scene retention funnel highlighting
 * where producers drop off or skip.
 */
export default function TourEngagementPanel({ scriptId, routePath, scenes }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await base44.entities.TourEngagement.filter({ tour_script_id: scriptId });
      setRecords(list);
    } catch (err) {
      console.error('Failed to load engagement:', err);
    }
    setIsLoading(false);
  }, [scriptId]);

  useEffect(() => {
    if (!scriptId) return;
    load();
  }, [scriptId, load]);

  const total = records.length;
  const completed = records.filter(r => r.action === 'completed').length;
  const skipped = records.filter(r => r.action === 'skipped').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const maxReached = total; // for bar scaling

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-berna-purple" />
          <h3 className="text-sm font-heading font-semibold text-white">Producer Engagement</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          No engagement data yet. Tours will be tracked as producers play them.
        </p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground">Views</span>
              </div>
              <p className="text-lg font-heading font-bold text-white">{total}</p>
            </div>
            <div className="rounded-lg bg-berna-emerald/[0.06] border border-berna-emerald/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3 h-3 text-berna-emerald" />
                <span className="text-[10px] font-heading uppercase tracking-wider text-berna-emerald/80">Completed</span>
              </div>
              <p className="text-lg font-heading font-bold text-white">{completed}</p>
              <p className="text-[10px] text-muted-foreground">{completionRate}% rate</p>
            </div>
            <div className="rounded-lg bg-berna-orange/[0.06] border border-berna-orange/20 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <SkipForward className="w-3 h-3 text-berna-orange" />
                <span className="text-[10px] font-heading uppercase tracking-wider text-berna-orange/80">Skipped</span>
              </div>
              <p className="text-lg font-heading font-bold text-white">{skipped}</p>
              <p className="text-[10px] text-muted-foreground">{total > 0 ? 100 - completionRate : 0}% rate</p>
            </div>
          </div>

          {/* Per-scene retention funnel */}
          <div>
            <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
              Scene Retention & Drop-off
            </p>
            <div className="space-y-1.5">
              {scenes.map((scene, i) => {
                const reached = records.filter(r => (r.last_scene_index ?? 0) >= i).length;
                const skippedHere = records.filter(r => r.action === 'skipped' && (r.last_scene_index ?? 0) === i).length;
                const reachedPct = total > 0 ? (reached / total) * 100 : 0;
                const isLast = i === scenes.length - 1;
                const sceneLabel = scene.scene_id || scene.id || `Scene ${i + 1}`;
                const preview = (scene.text || '').substring(0, 45);

                return (
                  <div key={i} className="flex items-center gap-2 group">
                    <div className="w-6 text-[10px] font-mono text-muted-foreground/60 text-right shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[11px] text-white/80 font-mono truncate">{sceneLabel}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {skippedHere > 0 && (
                            <span className="text-[9px] text-berna-orange flex items-center gap-0.5">
                              <SkipForward className="w-2.5 h-2.5" />
                              {skippedHere} skipped
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground">{reached}/{total}</span>
                        </div>
                      </div>
                      <div className="h-4 rounded bg-white/[0.04] overflow-hidden relative">
                        <div
                          className={`h-full rounded transition-all ${
                            isLast ? 'bg-berna-emerald/50' : 'bg-berna-purple/40'
                          }`}
                          style={{ width: `${reachedPct}%` }}
                        />
                        {skippedHere > 0 && (
                          <div
                            className="absolute top-0 right-0 h-full bg-berna-orange/40"
                            style={{ width: `${(skippedHere / total) * 100}%` }}
                          />
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground/50 truncate mt-0.5">{preview}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}