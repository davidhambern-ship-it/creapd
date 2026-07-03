import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';

const COLUMNS = [
  { id: 'pending', label: 'PENDING', dot: 'bg-yellow-400', note: 'bg-yellow-100 border-yellow-300 text-yellow-950' },
  { id: 'approved', label: 'APPROVED', dot: 'bg-emerald-400', note: 'bg-emerald-100 border-emerald-300 text-emerald-950' },
  { id: 'needs_research', label: 'RESEARCH', dot: 'bg-sky-400', note: 'bg-sky-100 border-sky-300 text-sky-950' },
  { id: 'bernas_pick', label: "BERNA'S PICK", dot: 'bg-amber-500', note: 'bg-pink-100 border-pink-300 text-pink-950' },
];

export default function AssignmentWhiteboard({ articles = [], onUpdateStatus }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(articles);

  useEffect(() => { setItems(articles); }, [articles]);

  const getColumnItems = (status) => items.filter(a => a.status === status).slice(0, 8);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const sourceCol = result.source.droppableId;
    const destCol = result.destination.droppableId;
    if (sourceCol === destCol) return;

    const draggedItem = items.find(a => a.id === result.draggableId);
    if (!draggedItem) return;

    setItems(prev => prev.map(a => a.id === draggedItem.id ? { ...a, status: destCol } : a));
    try {
      await base44.entities.Article.update(draggedItem.id, { status: destCol });
      onUpdateStatus?.(draggedItem.id, destCol);
    } catch {
      setItems(prev => prev.map(a => a.id === draggedItem.id ? { ...a, status: sourceCol } : a));
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-zinc-400 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-zinc-800 tracking-wider uppercase">Assignment Whiteboard</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">DRAG TO ASSIGN</span>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const colItems = getColumnItems(col.id);
            return (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-lg border border-zinc-200 p-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-100' : 'bg-zinc-50'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-500">{col.label}</span>
                      <span className="text-[9px] font-mono text-zinc-400 ml-auto">{colItems.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {colItems.map((item, index) => (
                        <Draggable draggableId={item.id} index={index} key={item.id}>
                          {(p, s) => (
                            <div
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                              onClick={() => navigate(`/story/${item.id}`)}
                              className={`rounded-md border ${col.note} p-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-rotate-1 ${s.isDragging ? 'shadow-lg shadow-black/30 -rotate-2' : ''}`}
                            >
                              <p className="text-[11px] leading-snug line-clamp-2 font-medium">{item.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[8px] font-mono opacity-60 truncate">{item.source_name}</span>
                                {item.opportunity_score >= 4 && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colItems.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-[9px] font-mono text-zinc-300">drop here</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}