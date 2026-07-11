import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Pencil, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatRuntime, SEGMENT_TYPE_LABELS, SEGMENT_COLORS } from '@/lib/musicConstants';
import RundownVoiceoverControls from '@/components/music/RundownVoiceoverControls';
import RundownSongPlayer from '@/components/music/RundownSongPlayer';
import RundownScriptPanel from '@/components/music/RundownScriptPanel';
import RundownEditModal from '@/components/music/RundownEditModal';

export default function RundownDragList({
  rundown,
  config,
  playlist,
  assets,
  isPro,
  playbackCtx,
  onRefresh,
}) {
  const [localRundown, setLocalRundown] = useState(rundown);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setLocalRundown(rundown);
  }, [rundown]);

  const {
    autoplayIndex, songPhase, speakingId, isSupported,
    startAutoplay, stopAutoplay, handleNativePreview,
    findSongTrack, getScriptForItem, songScriptsByTitle,
  } = playbackCtx;

  // Retiming helper — recalculates start/end times based on durations
  const retime = (items) => {
    const showStartSecs = parseTimeToSeconds(config?.show_start_time || '00:00');
    let cursor = showStartSecs;
    return items.map(item => {
      const start_time = formatSecondsToTime(cursor);
      cursor += item.duration_seconds || 60;
      const end_time = formatSecondsToTime(cursor);
      return { ...item, start_time, end_time };
    });
  };

  const onDragEnd = async (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setReordering(true);

    const reordered = [...localRundown];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update order fields
    const withOrder = reordered.map((item, i) => ({ ...item, order: i }));
    // Retime
    const retimed = retime(withOrder);
    setLocalRundown(retimed);

    // Persist to DB
    try {
      const updates = retimed.map((item, i) => ({
        id: item.id,
        order: i,
        start_time: item.start_time,
        end_time: item.end_time,
      }));
      await base44.entities.ShowRundownItem.bulkUpdate(updates);
    } catch (e) {
      console.error('Failed to persist reorder:', e);
    } finally {
      setReordering(false);
    }
  };

  const handleDelete = async (itemId) => {
    setDeletingId(itemId);
    try {
      await base44.entities.ShowRundownItem.delete(itemId);
      const remaining = localRundown.filter(item => item.id !== itemId);
      const retimed = retime(remaining.map((item, i) => ({ ...item, order: i })));
      setLocalRundown(retimed);
      // Persist new order/times
      const updates = retimed.map((item, i) => ({
        id: item.id,
        order: i,
        start_time: item.start_time,
        end_time: item.end_time,
      }));
      await base44.entities.ShowRundownItem.bulkUpdate(updates);
      onRefresh();
    } catch (e) {
      console.error('Failed to delete item:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSaved = () => {
    onRefresh();
    setEditingItem(null);
  };

  if (localRundown.length === 0) {
    return null;
  }

  const totalSeconds = localRundown.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

  return (
    <>
      {/* Horizontal timeline bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="cp-glass p-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
          {localRundown.map((item, i) => {
            const color = SEGMENT_COLORS[item.segment_type] || '#888888';
            const pct = totalSeconds > 0 ? ((item.duration_seconds || 0) / totalSeconds) * 100 : 0;
            const isActive = autoplayIndex === i;
            return (
              <div
                key={item.id}
                onClick={() => startAutoplay(i)}
                className="relative group h-full cursor-pointer hover:brightness-125 transition-all"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: isActive ? `0 0 12px ${color}, inset 0 0 8px rgba(255,255,255,0.3)` : `0 0 8px ${color}80`,
                  minWidth: pct > 5 ? 'auto' : '4px',
                  outline: isActive ? `2px solid white` : 'none',
                  outlineOffset: '-2px',
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-hidden">
                  <span className="text-[8px] font-bold text-black whitespace-nowrap px-1">
                    {SEGMENT_TYPE_LABELS[item.segment_type] || ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
          {Object.entries(SEGMENT_COLORS).map(([type, color]) => {
            const count = localRundown.filter(r => r.segment_type === type).length;
            if (count === 0) return null;
            return (
              <span key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                {SEGMENT_TYPE_LABELS[type] || type} ({count})
              </span>
            );
          })}
        </div>
      </motion.div>

      {/* Drag-and-drop rundown list */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="rundown-list">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {localRundown.map((item, i) => {
                const color = SEGMENT_COLORS[item.segment_type] || '#888888';
                const isSong = item.segment_type === 'song';
                const songTrack = isSong ? findSongTrack(item) : null;
                const script = getScriptForItem(item);
                const showVoiceover = !isSong;


                return (
                  <Draggable key={item.id} draggableId={item.id} index={i}>
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        id={`rundown-card-${i}`}
                        className="cp-glass group relative overflow-hidden transition-all"
                        style={{
                          ...dragProvided.draggableProps.style,
                          borderColor: autoplayIndex === i ? color : `${color}20`,
                          boxShadow: autoplayIndex === i
                            ? `0 0 20px ${color}40, inset 0 0 8px ${color}10`
                            : dragSnapshot.isDragging
                              ? `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${color}30`
                              : 'none',
                        }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
                        <div className="flex items-center gap-3 p-3 pl-5">
                          {/* Drag handle */}
                          <div {...dragProvided.dragHandleProps} className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Time block */}
                          <div className="flex-shrink-0 w-16 text-center">
                            <p className="text-sm font-mono font-bold" style={{ color }}>{item.start_time || '--:--'}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{item.end_time || '--:--'}</p>
                          </div>

                          <div className="w-px h-10 bg-white/10" />

                          {/* Segment type badge */}
                          <span className="text-xs px-2.5 py-1 rounded-full border flex-shrink-0"
                            style={{ background: `${color}15`, color, borderColor: `${color}40` }}>
                            {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                          </span>

                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{item.title}</p>
                            {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                          </div>

                          {/* Preview button */}
                          {showVoiceover && isSupported && script && (
                            <button
                              onClick={() => handleNativePreview(item, i)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0"
                              style={{
                                background: speakingId === item.id ? 'rgba(0,255,255,0.15)' : 'rgba(0,255,255,0.06)',
                                borderColor: speakingId === item.id ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,255,0.2)',
                              }}
                            >
                              {speakingId === item.id ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider hidden sm:inline">
                                {speakingId === item.id ? (autoplayIndex !== null ? 'Stop' : 'Stop') : (item.segment_type === 'intro' ? 'Play Show' : 'Preview')}
                              </span>
                            </button>
                          )}

                          {/* Voiceover controls */}
                          {showVoiceover && (
                            <RundownVoiceoverControls
                              item={item}
                              isPro={isPro}
                              script={script}
                              onUpgradeNeeded={() => {}}
                              onAudioGenerated={() => {}}
                            />
                          )}

                          {/* Edit button */}
                          <button
                            onClick={() => setEditingItem(item)}
                            className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            title="Edit / Regenerate"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Delete segment"
                          >
                            {deletingId === item.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Duration */}
                          <span className="text-sm font-mono text-gray-400 flex-shrink-0">{formatRuntime(item.duration_seconds)}</span>
                        </div>

                        {/* Script panel for non-song segments */}
                        {!isSong && (
                          <div className="px-3 pl-5 pb-2">
                            <RundownScriptPanel item={item} color={color} />
                          </div>
                        )}

                        {/* Inline YouTube player for songs */}
                        {isSong && songTrack && songTrack.youtube_video_id && (
                          <div className="px-3 pb-3 pl-5">
                            <RundownSongPlayer
                              videoId={songTrack.youtube_video_id}
                              title={songTrack.song_title || item.title}
                              channelName={songTrack.channel_name}
                              thumbnailUrl={songTrack.thumbnail_url}
                              introScript={songScriptsByTitle[(songTrack.song_title || item.title || '').toLowerCase().trim()]?.intro || script}
                              outroScript={songScriptsByTitle[(songTrack.song_title || item.title || '').toLowerCase().trim()]?.outro}
                              color={color}
                              itemIndex={i}
                            />
                          </div>
                        )}

                        {isSong && (!songTrack || !songTrack.youtube_video_id) && (
                          <div className="px-3 pl-5 pb-2">
                            <RundownScriptPanel item={item} color={color} />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit modal */}
      <AnimatePresence>
        {editingItem && (
          <RundownEditModal
            item={editingItem}
            config={config}
            onClose={() => setEditingItem(null)}
            onSaved={handleEditSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Timing helpers (inline to avoid import issues) ──
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60;
}

function formatSecondsToTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600) % 24;
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}