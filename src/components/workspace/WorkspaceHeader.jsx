import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, User, Calendar, Hash, Lock } from 'lucide-react';

const PRODUCTION_STATUS_LABELS = {
  draft: 'Draft',
  in_progress: 'In Progress',
  ready_for_review: 'Ready for Review',
  approved: 'Approved',
  ready_for_export: 'Ready for Export',
  exported: 'Exported',
  archived: 'Archived',
};

export default function WorkspaceHeader({ production, brands, shows, storyCount, estimatedRuntime, onUpdate }) {
  const brand = brands.find(b => b.id === production.brand_profile_id);
  const show = shows.find(s => s.id === production.show_profile_id);

  return (
    <div className="glass-panel p-4 lg:p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Input
            value={production.title || ''}
            onChange={(e) => onUpdate({ ...production, title: e.target.value })}
            className="text-lg font-bold text-white border-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Production Title"
          />
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {brand && <span className="text-[10px] text-muted-foreground">Brand: <span className="text-white">{brand.brand_name}</span></span>}
            {show && <span className="text-[10px] text-muted-foreground">Show: <span className="text-white">{show.show_name}</span></span>}
          </div>
        </div>
        <Select value={production.status} onValueChange={(v) => onUpdate({ ...production, status: v })}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRODUCTION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Brand:</span>
          <Select value={production.brand_profile_id || ''} onValueChange={(v) => onUpdate({ ...production, brand_profile_id: v })}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.brand_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Show:</span>
          <Select value={production.show_profile_id || ''} onValueChange={(v) => onUpdate({ ...production, show_profile_id: v })}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {shows.map(s => <SelectItem key={s.id} value={s.id}>{s.show_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {production.production_date ? new Date(production.production_date).toLocaleDateString() : 'No date'}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          Est: <span className="text-white font-mono">{estimatedRuntime}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Hash className="w-3 h-3" />
          <span className="text-white font-mono">{storyCount}</span> stories
        </div>
        {production.updated_date && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Modified: {new Date(production.updated_date).toLocaleString()}
          </div>
        )}
        {production.owner_name && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="w-3 h-3" />
            {production.owner_name}
          </div>
        )}
      </div>
    </div>
  );
}