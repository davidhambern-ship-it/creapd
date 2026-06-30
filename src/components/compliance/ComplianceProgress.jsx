import React from 'react';
import { CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';

export default function ComplianceProgress({ items }) {
  const total = items.length;
  const met = items.filter(i => i.status === 'met').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const notMet = items.filter(i => i.status === 'not_met').length;
  const na = items.filter(i => i.status === 'not_applicable').length;
  const completionPct = total > 0 ? Math.round((met / total) * 100) : 0;

  const stats = [
    { label: 'Met', value: met, icon: CheckCircle2, color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
    { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
    { label: 'Not Met', value: notMet, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'N/A', value: na, icon: MinusCircle, color: 'text-muted-foreground', bg: 'bg-muted/20' },
  ];

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white font-display uppercase tracking-wide">Overall Compliance</h3>
          <p className="text-xs text-muted-foreground">{total} total requirements tracked</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-berna-purple font-display">{completionPct}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Complete</p>
        </div>
      </div>

      <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="bg-berna-emerald h-full transition-all" style={{ width: `${(met / total) * 100}%` }} />
          <div className="bg-berna-orange h-full transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
          <div className="bg-destructive h-full transition-all" style={{ width: `${(notMet / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-lg p-2 text-center ${stat.bg}`}>
              <Icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}