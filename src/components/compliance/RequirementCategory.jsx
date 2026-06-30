import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import RequirementCard from './RequirementCard';

export default function RequirementCategory({ category, items, onStatusChange }) {
  const [expanded, setExpanded] = useState(true);
  const metCount = items.filter(i => i.status === 'met').length;
  const pct = items.length > 0 ? Math.round((metCount / items.length) * 100) : 0;

  return (
    <div className="glass-panel overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <h4 className="text-sm font-semibold text-white">{category}</h4>
          <span className="text-[10px] text-muted-foreground bg-white/[0.06] px-1.5 py-0.5 rounded">{items.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-berna-emerald transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {items.map(item => (
            <RequirementCard key={item.id} item={item} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}