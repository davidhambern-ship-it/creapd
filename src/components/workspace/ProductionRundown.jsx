import React from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RundownItem from './RundownItem';

export default function ProductionRundown({
  stories, packages, notesMap, storyOrder,
  onReorder, onRemoveStory, onDuplicateStory, onArchiveStory,
  onUpdateStoryStatus, onUpdateStoryPriority, onToggleLock, onOpenPackage, onAddStories
}) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const newOrder = Array.from(storyOrder);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    onReorder(newOrder);
  };

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="rundown">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {storyOrder.map((id, index) => {
                const story = stories.find(s => s.id === id);
                if (!story) return null;
                const pkg = packages.find(p => p.article_id === id);
                return (
                  <RundownItem
                    key={story.id}
                    story={story}
                    pkg={pkg}
                    hasNotes={!!notesMap[id]}
                    index={index}
                    onRemove={onRemoveStory}
                    onDuplicate={onDuplicateStory}
                    onArchive={onArchiveStory}
                    onUpdateStatus={onUpdateStoryStatus}
                    onUpdatePriority={onUpdateStoryPriority}
                    onToggleLock={onToggleLock}
                    onOpenPackage={onOpenPackage}
                  />
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {storyOrder.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No stories in the rundown yet. Click "Add Stories" to get started.
        </div>
      )}

      <Button
        variant="outline"
        className="w-full border-dashed border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04]"
        onClick={onAddStories}
      >
        <Plus className="w-4 h-4 mr-2" />Add Stories
      </Button>
    </div>
  );
}