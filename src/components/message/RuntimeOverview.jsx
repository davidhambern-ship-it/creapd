import React from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDuration, estimateSpeakingTime, SECTION_TYPE_LABELS } from '@/lib/spiritualConstants';

function parseRuntimeToSeconds(runtimeStr) {
  if (!runtimeStr) return 1800;
  const match = runtimeStr.match(/(\d+)\s*Minute/i);
  if (match) return parseInt(match[1]) * 60;
  return 1800;
}

export default function RuntimeOverview({ sections, targetRuntime }) {
  const targetSeconds = parseRuntimeToSeconds(targetRuntime);
  const totalEstimated = sections.reduce((sum, s) => sum + estimateSpeakingTime(s.content), 0);
  const completionPct = targetSeconds > 0 ? Math.min(100, Math.round((totalEstimated / targetSeconds) * 100)) : 0;
  const isUnder = totalEstimated < targetSeconds * 0.85;
  const isOver = totalEstimated > targetSeconds * 1.15;
  const remaining = targetSeconds - totalEstimated;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Runtime Integrity
        </h3>
        <div className="flex items-center gap-2 text-xs">
          {isUnder ? (
            <span className="flex items-center gap-1 text-accent"><AlertTriangle className="w-3 h-3" /> Under target by {formatDuration(Math.abs(remaining))}</span>
          ) : isOver ? (
            <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="w-3 h-3" /> Over target by {formatDuration(Math.abs(remaining))}</span>
          ) : (
            <span className="flex items-center gap-1 text-berna-emerald"><CheckCircle2 className="w-3 h-3" /> On target</span>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Total Production Time</span>
          <span className="font-medium">{formatDuration(totalEstimated)} / {formatDuration(targetSeconds)}</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isUnder ? 'bg-accent' : isOver ? 'bg-destructive' : 'bg-berna-emerald'}`}
            style={{ width: `${Math.min(100, completionPct)}%` }}
          />
        </div>
      </div>

      {/* Per-Section Breakdown */}
      <div className="space-y-2">
        {sections.map((section, idx) => {
          const est = estimateSpeakingTime(section.content);
          const target = section.estimated_duration_seconds || est;
          const pct = target > 0 ? Math.min(100, Math.round((est / target) * 100)) : 0;
          const tooShort = est < target * 0.7;
          const tooLong = est > target * 1.3;

          return (
            <div key={section.id || idx} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-24 truncate">
                {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full ${tooShort ? 'bg-accent' : tooLong ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className={`text-xs w-20 text-right ${tooShort ? 'text-accent' : tooLong ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatDuration(est)}/{formatDuration(target)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}