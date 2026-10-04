import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { useAuth } from '@/lib/AuthContext';
import { useShowPlayback } from '@/components/music/ShowPlaybackContext';
import { ClipboardList, Disc3, Plus, Volume2 } from 'lucide-react';
import { formatRuntime, SEGMENT_COLORS } from '@/lib/musicConstants';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';
import RundownDragList from '@/components/music/RundownDragList';
import AddSegmentModal from '@/components/music/AddSegmentModal';

export default function MusicRundown() {
  const { config, rundown, playlist, topics, assets, loading, refresh } = useMusicProduction();
  const { user } = useAuth();
  const isPro = user?.subscription_tier === 'pro' || user?.role === 'admin';

  const ctx = useShowPlayback();
  const {
    selectedVoiceURI,
    setSelectedVoiceURI,
    voices,
    isSupported,
    voiceEnabled,
    setVoiceEnabled,
    voiceStatus,
    voiceProgress,
    voiceError,
    previewVoice,
  } = ctx;

  const [showAddModal, setShowAddModal] = useState(false);

  // Register show data with the persistent playback engine
  useEffect(() => {
    ctx.registerShowData({ config, rundown, playlist, topics, assets });
  }, [config, rundown, playlist, topics, assets]);

  // Scroll active card into view when autoplay advances
  useEffect(() => {
    if (ctx.autoplayIndex === null) return;
    const el = document.getElementById(`rundown-card-${ctx.autoplayIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [ctx.autoplayIndex, ctx.songPhase]);

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

  const totalSeconds = rundown.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        <MusicDiscoveryNav config={config} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 16px rgba(255,0,255,0.2)' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#FF00FF' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white cp-glitch">Show Rundown</h1>
              <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {isSupported && (
              <div className="cp-glass flex items-center gap-2 px-3 py-1.5" style={{ borderColor: 'rgba(0,255,255,0.2)' }}>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                    voiceEnabled
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-white/45'
                  }`}
                >
                  {voiceEnabled ? 'Human Voice On' : 'Voice Off'}
                </button>
                {voiceEnabled && (
                  <>
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      className="bg-transparent text-xs text-cyan-300 outline-none cursor-pointer max-w-[180px]"
                    >
                      {voices.map(voice => (
                        <option key={voice.id} value={voice.id} className="bg-zinc-900 text-white">
                          {voice.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={previewVoice}
                      disabled={voiceStatus === 'loading' || voiceStatus === 'generating'}
                      className="text-[10px] font-semibold text-fuchsia-300 disabled:opacity-40"
                    >
                      {voiceStatus === 'loading'
                        ? `Loading ${voiceProgress || 0}%`
                        : voiceStatus === 'generating'
                          ? 'Generating…'
                          : 'Preview'}
                    </button>
                  </>
                )}
              </div>
            )}
            {voiceError && (
              <span className="text-[10px] text-red-300 max-w-[260px] truncate" title={voiceError}>{voiceError}</span>
            )}
            <div className="cp-glass px-4 py-2" style={{ borderColor: 'rgba(0,255,255,0.2)' }}>
              <span className="text-xs text-gray-400">Items</span>
              <span className="ml-2 font-bold" style={{ color: '#00FFFF' }}>{rundown.length}</span>
            </div>
            <div className="cp-glass px-4 py-2" style={{ borderColor: 'rgba(255,0,255,0.2)' }}>
              <span className="text-xs text-gray-400">Runtime</span>
              <span className="ml-2 font-bold" style={{ color: '#FF00FF' }}>{formatRuntime(totalSeconds)}</span>
            </div>
            {/* Add Segment button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{
                background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
                color: '#fff',
                boxShadow: '0 0 12px rgba(255,0,255,0.2)',
              }}
            >
              <Plus className="w-4 h-4" />
              Add Segment
            </button>
          </div>
        </motion.div>

        {/* Hint bar */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-1 h-4 rounded bg-white/20" />
            <span className="w-1 h-4 rounded bg-white/20" />
          </span>
          Drag segments to reorder · Click edit to modify scripts · Click timeline to jump playback
        </div>

        {rundown.length > 0 ? (
          <RundownDragList
            rundown={rundown}
            config={config}
            playlist={playlist}
            assets={assets}
            isPro={isPro}
            playbackCtx={ctx}
            onRefresh={refresh}
          />
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,0,255,0.3)' }} />
            <p className="text-gray-400 mb-4">No show rundown has been generated yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold mx-auto"
              style={{
                background: 'linear-gradient(135deg, #FF00FF, #8B00FF)',
                color: '#fff',
              }}
            >
              <Plus className="w-4 h-4" />
              Add First Segment
            </button>
          </div>
        )}
      </div>

      {/* Add Segment Modal */}
      <AnimatePresence>
        {showAddModal && config && (
          <AddSegmentModal
            configurationId={config.id}
            onClose={() => setShowAddModal(false)}
            onAdded={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}