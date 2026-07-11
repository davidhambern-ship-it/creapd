import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle2, RefreshCw, Disc3, Edit3, Save, X } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/musicConstants';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';

const TYPE_COLORS = {
  song_intro: '#FF00FF',
  artist_fact: '#00FFFF',
  host_banter: '#8B00FF',
  song_outro: '#FF6B00',
  production_notes: '#00FF88',
  station_id: '#FFD700',
  video_prompt: '#00FF88',
};

export default function MusicAssets() {
  const { config, assets, loading, refresh } = useMusicProduction();
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-black">
        <CyberpunkMusicBg />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          <Disc3 className="w-10 h-10" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 8px #FF00FF)' }} />
        </motion.div>
      </div>
    );
  }

  const handleSave = async (asset) => {
    await base44.entities.MusicAsset.update(asset.id, { content: editContent, status: 'approved' });
    setEditingId(null);
    refresh();
  };

  const handleRegenerate = async () => {
    if (!config?.id) return;
    setRegenerating(true);
    try {
      await base44.functions.invoke('buildMusicProduction', { configuration_id: config.id });
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  // Group assets by type
  const grouped = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) acc[asset.asset_type] = [];
    acc[asset.asset_type].push(asset);
    return acc;
  }, {});

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="left" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        <MusicDiscoveryNav />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', boxShadow: '0 0 16px rgba(0,255,255,0.2)' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#00FFFF' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white cp-glitch">AI Assets</h1>
              <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}
            className="border-[#FF00FF]/40 hover:border-[#FF00FF]/70 hover:bg-[#FF00FF]/10">
            {regenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" style={{ color: '#FF00FF' }} />}
            Regenerate All
          </Button>
        </motion.div>

        {assets.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(grouped).map(([type, typeAssets], groupIdx) => {
              const color = TYPE_COLORS[type] || '#FFFFFF';
              return (
                <div key={type}>
                  {/* Section header with neon accent */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
                      <div className="w-3 h-3 rounded-sm" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    </div>
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-white">
                      {ASSET_TYPE_LABELS[type] || type}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ background: `${color}15`, color, borderColor: `${color}40` }}>
                      {typeAssets.length}
                    </span>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
                  </div>

                  {/* Asset grid — holographic data cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeAssets.map((asset, i) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: groupIdx * 0.1 + i * 0.05 }}
                        whileHover={{ y: -4 }}
                        className="cp-glass relative overflow-hidden"
                        style={{ borderColor: `${color}20` }}
                      >
                        {/* Top accent line */}
                        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-sm font-medium text-white flex-1 pr-2">{asset.title}</h3>
                            {asset.status === 'approved' && (
                              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: `${color}20` }}>
                                <CheckCircle2 className="w-3.5 h-3.5" style={{ color }} />
                              </div>
                            )}
                          </div>

                          {editingId === asset.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={6}
                                className="text-sm bg-black/40"
                                style={{ borderColor: `${color}30` }}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="cp-btn-gradient border-0 text-white" onClick={() => handleSave(asset)}>
                                  <Save className="w-3 h-3 mr-1" /> Save
                                </Button>
                                <Button size="sm" variant="outline" className="border-white/10" onClick={() => setEditingId(null)}>
                                  <X className="w-3 h-3 mr-1" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-400 whitespace-pre-wrap line-clamp-4 mb-3 leading-relaxed">{asset.content}</p>
                              <Button size="sm" variant="ghost" className="hover:bg-white/5"
                                onClick={() => { setEditingId(asset.id); setEditContent(asset.content || ''); }}>
                                <Edit3 className="w-3.5 h-3.5 mr-1" style={{ color }} /> Edit
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(0,255,255,0.15)' }}>
            <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(0,255,255,0.3)' }} />
            <p className="text-gray-400 mb-4">No AI assets have been generated yet.</p>
            <Button onClick={handleRegenerate} disabled={regenerating} className="cp-btn-gradient border-0 text-white">
              {regenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
              Generate Assets
            </Button>
          </div>
        )}
        <MusicDiscoveryNav />
        </div>
        </div>
        );
        }