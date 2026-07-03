import React from 'react';
import { Clock } from 'lucide-react';
import { formatDuration, estimateSpeakingTime } from '@/lib/spiritualConstants';

export default function RuntimeOverview({ sections, targetRuntime }) {
  const totalEstimated = sections.reduce((sum, s) => sum + (s.voice_duration_seconds || estimateSpeakingTime(s.content)), 0);

  return (
    <div className="glass-panel px-4 py-2 flex items-center gap-2">
      <Clock className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">{formatDuration(totalEstimated)}</span>
      <span className="text-xs text-muted-foreground">total runtime</span>
    </div>
  );
}