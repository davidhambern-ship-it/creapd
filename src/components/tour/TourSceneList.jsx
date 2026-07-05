import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TourSceneCard from './TourSceneCard';

export default function TourSceneList({ scenes, onReorder, onChange, onDelete, onAdd, onPreview }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="scenes">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {scenes.map((scene, index) => (
                <Draggable key={scene._key || scene.id || index} draggableId={String(scene._key || scene.id || index)} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <TourSceneCard
                        scene={scene}
                        index={index}
                        onChange={(field, value) => onChange(index, field, value)}
                        onDelete={() => onDelete(index)}
                        onPreview={onPreview}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button variant="outline" className="w-full mt-3 border-dashed" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1" />
        Add Scene
      </Button>
    </div>
  );
}