import React from 'react';
import { Globe, Edit, ToggleLeft, ToggleRight, Trash2, Star, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SourceCard({ source, onToggle, onEdit, onDelete }) {
  return (
    <div className={`glass-panel p-3 transition-all ${source.enabled ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-3.5 h-3.5 text-berna-purple flex-shrink-0" />
            <h3 className="text-sm font-semibold text-white truncate">{source.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className={`w-2.5 h-2.5 ${i <= (source.trust_rating || 0) ? 'text-berna-orange fill-berna-orange' : 'text-white/10'}`} />
              ))}
            </div>
            {source.feed_url && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-berna-emerald">
                <Rss className="w-2.5 h-2.5" />RSS
              </span>
            )}
            {source.paywall && <span className="text-[9px] text-yellow-400">Paywall</span>}
          </div>
          {source.last_checked && (
            <p className="text-[9px] text-muted-foreground font-mono mt-1">Last: {new Date(source.last_checked).toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggle(source)}>
            {source.enabled ? <ToggleRight className="w-4 h-4 text-berna-emerald" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => onEdit(source)}>
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400" onClick={() => onDelete(source.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}