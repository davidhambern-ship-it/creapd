import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import CategoryBadge from '@/components/shared/CategoryBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';

export default function AddStoriesModal({ open, onClose, availableStories, onAdd, itemLabel = 'Story', itemLabelPlural = 'Stories' }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {itemLabelPlural} to Rundown</DialogTitle>
        </DialogHeader>
        {availableStories.length > 0 ? (
          <div className="space-y-2">
            {availableStories.map(story => (
              <button
                key={story.id}
                onClick={() => toggle(story.id)}
                className={`flex items-start gap-2 w-full p-3 rounded-lg border transition-all text-left ${
                  selected.includes(story.id) ? 'border-berna-emerald/40 bg-berna-emerald/5' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected.includes(story.id) ? 'bg-berna-emerald border-berna-emerald' : 'border-white/20'}`}>
                  {selected.includes(story.id) && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium leading-snug">{story.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {story.category && <CategoryBadge category={story.category} />}
                    <OpportunityScore score={story.opportunity_score} />
                    {story.source_name && <span className="text-[10px] text-muted-foreground">{story.source_name}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No selected {itemLabelPlural.toLowerCase()} available. Select {itemLabelPlural.toLowerCase()} from the queue first.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAdd(selected)} disabled={selected.length === 0}>
            Add{selected.length > 0 ? ` ${selected.length}` : ''} {itemLabelPlural}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}