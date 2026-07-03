import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Star, Pin } from 'lucide-react';

const COLUMNS = [
  { id: 'pending', label: 'PENDING', marker: 'text-yellow-600' },
  { id: 'approved', label: 'APPROVED', marker: 'text-emerald-600' },
  { id: 'needs_research', label: 'RESEARCH', marker: 'text-sky-600' },
  { id: 'bernas_pick', label: "BERNA'S PICK", marker: 'text-amber-700' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AssignmentWhiteboard({ articles = [], onUpdateStatus }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(articles);

  useEffect(() => { setItems(articles); }, [articles]);

  const getColumnItems = (status) => items.filter(a => a.status === status).slice(0, 4);

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
    <div className="relative rounded-lg overflow-hidden shadow-elevation-3 h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #f4f1e8 0%, #e8e2d0 100%)' }}>
      {/* Aluminum frame */}
      <div className="p-1.5 flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, #8a8a8a 0%, #c4c4c4 40%, #9a9a9a 60%, #b0b0b0 100%)' }}>
        <div className="rounded-md overflow-hidden flex-1 flex flex-col" style={{ background: 'linear-gradient(135deg, #f8f5ec 0%, #ece5d2 100%)' }}>
          {/* Whiteboard surface */}
          <div className="relative px-3 pt-2 pb-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-sm font-bold tracking-wide text-zinc-800" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, letterSpacing: '0.04em', textShadow: '0 0 1px rgba(0,0,0,0.05)' }}>
                  Assignment Whiteboard
                </h3>
                <span className="text-[9px] font-mono text-zinc-500">— Story Queue</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400 italic">drag to assign</span>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px p-2 pt-0 flex-1">
              {COLUMNS.map((col, colIdx) => {
                const colItems = getColumnItems(col.id);
                return (
                  <Droppable droppableId={col.id} key={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`relative rounded-sm p-1.5 min-h-[120px] transition-all ${snapshot.isDraggingOver ? 'bg-black/[0.04]' : ''}`}
                        style={{
                          borderLeft: colIdx > 0 ? '2px dashed rgba(0,0,0,0.12)' : 'none',
                          paddingLeft: colIdx > 0 ? '8px' : '6px',
                        }}
                      >
                        {/* Marker column heading */}
                        <div className="flex items-center justify-between mb-1.5 pb-1" style={{ borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
                          <span className={`text-[10px] font-bold tracking-wider uppercase ${col.marker}`} style={{ fontWeight: 800, letterSpacing: '0.05em' }}>
                            {col.label}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-400 bg-black/5 rounded-full px-1.5 py-0.5">{colItems.length}</span>
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
                                  className={`group relative rounded-sm p-1.5 pt-2 cursor-grab active:cursor-grabbing transition-all ${s.isDragging ? 'shadow-xl shadow-black/30 rotate-2 z-50' : ''}`}
                                  style={{
                                    background: 'linear-gradient(135deg, #fffef8 0%, #fff8e8 100%)',
                                    boxShadow: s.isDragging
                                      ? '0 8px 24px rgba(0,0,0,0.3)'
                                      : '0 1px 2px rgba(0,0,0,0.12)',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    transform: `rotate(${(index % 3 - 1) * 0.3}deg)`,
                                  }}
                                >
                                  {/* Pushpin */}
                                  <Pin className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 text-red-500/70 fill-red-500/30" style={{ transform: 'rotate(15deg)' }} />

                                  <p className="text-[10px] text-zinc-800 leading-tight line-clamp-2 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                                    {item.title}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="text-[8px] font-mono text-zinc-500 truncate">{item.source_name}</span>
                                    <span className="text-[8px] font-mono text-zinc-400 ml-auto">{timeAgo(item.published_at || item.created_date)}</span>
                                    {item.opportunity_score >= 4 && <Star className="w-2 h-2 text-amber-500 fill-amber-400 flex-shrink-0" />}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {colItems.length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-[9px] font-mono text-zinc-300 italic">— empty —</p>
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
      </div>
    </div>
  );
}