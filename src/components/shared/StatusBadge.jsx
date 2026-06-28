import React from 'react';

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  saved_for_later: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  bernas_pick: 'bg-berna-orange/10 text-berna-orange border-berna-orange/20',
  needs_research: 'bg-berna-purple/10 text-berna-purple border-berna-purple/20',
  used: 'bg-white/5 text-muted-foreground border-white/10',
  ready: 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
  generating: 'bg-berna-orange/10 text-berna-orange border-berna-orange/20',
  needs_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  running: 'bg-berna-purple/10 text-berna-purple border-berna-purple/20',
  success: 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
  partial: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  archived: 'bg-white/5 text-muted-foreground border-white/10',
};

const labels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  saved_for_later: 'Saved',
  bernas_pick: "Berna's Pick",
  needs_research: 'Research',
  used: 'Used',
  ready: 'Ready',
  generating: 'Generating',
  needs_review: 'Review',
  failed: 'Failed',
  running: 'Running',
  success: 'Success',
  partial: 'Partial',
  archived: 'Archived',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusStyles[status] || 'bg-white/5 text-muted-foreground border-white/10'}`}>
      {labels[status] || status}
    </span>
  );
}