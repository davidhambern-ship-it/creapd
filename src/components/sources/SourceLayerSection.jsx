import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SourceCard from './SourceCard';

export default function SourceLayerSection({ layer, sources, onToggle, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = layer.icon;
  const enabledCount = sources.filter(s => s.enabled).length;

  return (
    <div className="space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 w-full text-left group">
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-berna-purple" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white group-hover:text-berna-purple transition-colors">{layer.label}</h2>
          <p className="text-[10px] text-muted-foreground truncate">{layer.desc}</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{enabledCount}/{sources.length}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="pl-12 space-y-2">
          {sources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sources.map(s => (
                <SourceCard key={s.id} source={s} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground py-2 italic">No sources in this layer yet.</p>
          )}
        </div>
      )}
    </div>
  );
}