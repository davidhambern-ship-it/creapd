import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';

const COLUMNS = [
  { id: 'pending', label: 'PENDING', dot: 'bg-yellow-400' },
  { id: 'approved', label: 'APPROVED', dot: 'bg-emerald-400' },
  { id: 'needs_research', label: 'RESEARCH', dot: 'bg-sky-400' },
  { id: 'bernas_pick', label: "BERNA'S PICK", dot: 'bg-amber-500' },
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
    <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-white/60 rounded-full" />
          <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Assignment Whiteboard</h3>
        </div>
        <span className="text-[10px] font-mono text-white/30">DRAG TO ASSIGN</span>
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
                    className={`rounded-lg border border-white/[0.06] p-2 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? 'bg-white/[0.06]' : 'bg-black/20'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-[9px] font-mono font-bold tracking-wider text-white/50">{col.label}</span>
                      <span className="text-[9px] font-mono text-white/30 ml-auto">{colItems.length}</span>
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
                              className={`rounded-md bg-white/[0.04] border border-white/[0.08] p-2 cursor-grab active:cursor-grabbing transition-shadow ${s.isDragging ? 'shadow-lg shadow-black/50 border-white/20' : ''}`}
                            >
                              <p className="text-[11px] text-white/80 leading-snug line-clamp-2">{item.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[8px] font-mono text-white/30 truncate">{item.source_name}</span>
                                {item.opportunity_score >= 4 && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {colItems.length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-[9px] font-mono text-white/20">drop here</p>
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