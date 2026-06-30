import React from 'react';
import { CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';

const STATUS_CONFIG = {
  met: { label: 'Met', icon: CheckCircle2, color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', border: 'border-berna-emerald/20', bar: 'bg-berna-emerald' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/20', bar: 'bg-berna-orange' },
  not_met: { label: 'Not Met', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', bar: 'bg-destructive' },
  not_applicable: { label: 'N/A', icon: MinusCircle, color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-border', bar: 'bg-muted-foreground' },
};

const STATUSES = ['met', 'in_progress', 'not_met', 'not_applicable'];

export default function RequirementCard({ item, onStatusChange }) {
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.in_progress;
  const Icon = config.icon;

  const cycleStatus = () => {
    const currentIdx = STATUSES.indexOf(item.status);
    const nextStatus = STATUSES[(currentIdx + 1) % STATUSES.length];
    onStatusChange(item.id, nextStatus);
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.border} ${config.bg} transition-all hover:bg-white/[0.04]`}>
      <button
        onClick={cycleStatus}
        className="flex-shrink-0 mt-0.5 group"
        title="Click to cycle status"
      >
        <Icon className={`w-5 h-5 ${config.color} group-hover:scale-110 transition-transform`} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">{item.requirement_text}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.color}`}>
            {config.label}
          </span>
          {item.notes && (
            <span className="text-[10px] text-muted-foreground italic truncate">— {item.notes}</span>
          )}
        </div>
      </div>
    </div>
  );
}