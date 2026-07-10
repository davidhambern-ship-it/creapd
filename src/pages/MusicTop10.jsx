import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock, Unlock, ArrowUp, ArrowDown, Trash2, Plus, Youtube, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import YouTubeAddModal from '@/components/music/YouTubeAddModal';
import CommanderPlayer from '@/components/music/CommanderPlayer';

export default function MusicTop10() {
  const [config, setConfig] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    let activeConfig = null;
    const configs = await base44.entities.MusicProductionConfiguration.list('-created_date', 1);
    if (configs && configs.length > 0) {
      activeConfig = configs[0];
    }
    setConfig(activeConfig);

    if (activeConfig) {
      const top10 = await base44.entities.Top10Item.filter({ configuration_id: activeConfig.id }, 'order');
      setItems(top10 || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = async (trackData) => {
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order || 0)) : -1;
    await base44.entities.Top10Item.create({
      configuration_id: config.id,
      order: maxOrder + 1,
      title: trackData.title,
      youtube_video_id: trackData.youtube_video_id,
      thumbnail_url: trackData.thumbnail_url,
      channel_name: trackData.channel_name,
    });
    loadData();
  };

  const handleToggleLock = async (item) => {
    await base44.entities.Top10Item.update(item.id, { locked: !item.locked });
    loadData();
  };

  const handleRemove = async (item) => {
    await base44.entities.Top10Item.delete(item.id);
    loadData();
  };

  const handleMove = async (item, direction) => {
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swapItem = items[swapIdx];
    await base44.entities.Top10Item.update(item.id, { order: swapItem.order });
    await base44.entities.Top10Item.update(swapItem.id, { order: item.order });
    loadData();
  };

  const handleSaveNote = async (item) => {
    await base44.entities.Top10Item.update(item.id, { note: noteText });
    setEditingId(null);
    loadData();
  };

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-black">
        <CyberpunkMusicBg />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          <Trophy className="w-10 h-10" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 8px #FFD700)' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.4)', boxShadow: '0 0 16px rgba(255,215,0,0.2)' }}>
              <Trophy className="w-6 h-6" style={{ color: '#FFD700' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white cp-glitch">Top 10 Videos</h1>
              <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="cp-btn-gradient border-0 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Video
          </Button>
        </motion.div>

        {/* Sub-room tabs */}
        <div className="flex gap-2">
          <Link to="/music/playlist" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:border-[#FF00FF]/40 hover:text-[#FF00FF] transition-colors flex items-center gap-1.5">
            <Youtube className="w-3 h-3" /> Playlist
          </Link>
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFD700]/20 border border-[#FFD700]/50 text-[#FFD700]">Top 10</span>
        </div>

        {/* Commander Player */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CommanderPlayer items={items} title="Top 10 Player" />
          </motion.div>
        )}

        {/* Top 10 List */}
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="cp-glass group relative overflow-hidden"
                style={{
                  borderColor: item.locked ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.06)',
                  boxShadow: item.locked ? '0 0 12px rgba(255,215,0,0.12)' : 'none',
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: item.locked ? '#FFD700' : '#FF00FF', opacity: 0.6 }} />
                <div className="flex items-center gap-3 p-3 pl-5">
                  {/* Rank badge */}
                  <div className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                      background: i < 3 ? `rgba(255,215,0,0.15)` : 'rgba(255,0,255,0.1)',
                      border: `1px solid ${i < 3 ? 'rgba(255,215,0,0.4)' : 'rgba(255,0,255,0.3)'}`,
                    }}>
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold" style={{ color: i < 3 ? '#FFD700' : '#FF00FF' }}>{i + 1}</span>
                    )}
                    {item.locked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: '#FFD700' }}>
                        <Lock className="w-2.5 h-2.5 text-black" />
                      </div>
                    )}
                  </div>

                  {/* Rank number */}
                  <div className="flex-shrink-0 w-6 text-center">
                    <span className="text-lg font-bold" style={{ color: i < 3 ? '#FFD700' : '#FF00FF' }}>#{i + 1}</span>
                  </div>

                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.channel_name}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleMove(item, 'up')} disabled={i === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleMove(item, 'down')} disabled={i === items.length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleToggleLock(item)}>
                      {item.locked ? <Unlock className="w-3.5 h-3.5" style={{ color: '#FFD700' }} /> : <Lock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => { setEditingId(editingId === item.id ? null : item.id); setNoteText(item.note || ''); }}>
                      <Youtube className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-500/10" onClick={() => handleRemove(item)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Note editor */}
                {editingId === item.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-5 pb-3"
                  >
                    <Textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note for this video..."
                      rows={2}
                      className="text-sm bg-black/40 border-[#FFD700]/20 focus:border-[#FFD700]/50"
                    />
                    <Button size="sm" className="mt-2 cp-btn-gradient border-0 text-white" onClick={() => handleSaveNote(item)}>
                      Save Note
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(255,215,0,0.15)' }}>
            <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,215,0,0.3)' }} />
            <p className="text-gray-400 mb-4">No videos in your Top 10 yet.</p>
            <Button onClick={() => setAddModalOpen(true)} className="cp-btn-gradient border-0 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Your First Video
            </Button>
          </div>
        )}
      </div>

      {/* Add Video Modal */}
      <YouTubeAddModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddItem}
        configurationId={config?.id}
        targetType="top10"
      />
    </div>
  );
}