import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatRuntime } from '@/lib/musicConstants';
import { Loader2, Lock, Unlock, ArrowUp, ArrowDown, Trash2, Music, RefreshCw, Disc3, Play, ShieldCheck, ShieldAlert } from 'lucide-react';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicPlayer from '@/components/music/MusicPlayer';
import { formatLicenseLabel, isPlayableLicense } from '@/lib/musicPlaybackEngine';

export default function MusicPlaylist() {
  const { config, playlist, loading, refresh } = useMusicProduction();
  const [regenerating, setRegenerating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');

  const handleToggleLock = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, {
      status: song.status === 'locked' ? 'suggested' : 'locked'
    });
    refresh();
  };

  const handleRemove = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, { status: 'removed' });
    refresh();
  };

  const handleMove = async (song, direction) => {
    const idx = playlist.findIndex(s => s.id === song.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= playlist.length) return;
    const swapSong = playlist[swapIdx];
    await base44.entities.PlaylistItem.update(song.id, { order: swapSong.order });
    await base44.entities.PlaylistItem.update(swapSong.id, { order: song.order });
    refresh();
  };

  const handleSaveNote = async (song) => {
    await base44.entities.PlaylistItem.update(song.id, { note: noteText });
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

  // Fetch AssetRegistry record for KAAE validation
  const getAssetRecord = useCallback(async (assetId) => {
    if (!assetId) return null;
    try {
      return await base44.entities.AssetRegistry.get(assetId);
    } catch (err) {
      console.error('Failed to fetch asset record:', err);
      return null;
    }
  }, []);

  const [playbackTrackIndex, setPlaybackTrackIndex] = useState(null);

  const handlePlayTrack = (index) => {
    setPlaybackTrackIndex(index);
  };

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

  const activePlaylist = playlist.filter(s => s.status !== 'removed');
  const totalSeconds = activePlaylist.reduce((sum, s) => sum + (s.length_seconds || 0), 0);
  const requiredSeconds = (config?.required_music_runtime || 0) * 60;
  const remaining = requiredSeconds - totalSeconds;
  const fillPct = requiredSeconds > 0 ? Math.min(100, (totalSeconds / requiredSeconds) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        {/* Header bar — DJ deck style */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 16px rgba(255,0,255,0.2)' }}>
              <Disc3 className="w-6 h-6" style={{ color: '#FF00FF' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white cp-glitch">Playlist Builder</h1>
              <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}
            className="border-[#FF00FF]/40 hover:border-[#FF00FF]/70 hover:bg-[#FF00FF]/10">
            {regenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" style={{ color: '#FF00FF' }} />}
            Regenerate
          </Button>
        </motion.div>

        {/* Runtime gauge — horizontal fill bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cp-glass p-5"
          style={{ borderColor: 'rgba(0,255,255,0.2)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-gray-400">Runtime Fill</span>
            <span className="text-sm font-bold" style={{ color: fillPct >= 100 ? '#FF00FF' : '#00FFFF' }}>
              {fillPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full relative"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, fillPct)}%` }}
              transition={{ duration: 0.8 }}
              style={{
                background: fillPct >= 100
                  ? 'linear-gradient(90deg, #FF00FF, #FF6B00)'
                  : 'linear-gradient(90deg, #00FFFF, #FF00FF)',
                boxShadow: fillPct >= 100 ? '0 0 12px #FF00FF' : '0 0 12px #00FFFF',
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div>
              <p className="text-xs text-gray-400">Songs</p>
              <p className="text-lg font-bold text-white">{activePlaylist.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Runtime</p>
              <p className="text-lg font-bold" style={{ color: '#00FFFF' }}>{formatRuntime(totalSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Required</p>
              <p className="text-lg font-bold text-white">{formatRuntime(requiredSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{remaining >= 0 ? 'Remaining' : 'Over'}</p>
              <p className="text-lg font-bold" style={{ color: remaining >= 0 ? '#00FF88' : '#FF6B00' }}>
                {formatRuntime(Math.abs(remaining))}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Music Playback Engine — KAAE-licensed playback */}
        {activePlaylist.length > 0 && (
          <MusicPlayer
            tracks={activePlaylist}
            getAssetRecord={getAssetRecord}
            startIndex={playbackTrackIndex}
          />
        )}

        {/* Track list — vinyl record row style */}
        {activePlaylist.length > 0 ? (
          <div className="space-y-2">
            {activePlaylist.map((song, i) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="cp-glass group relative overflow-hidden"
                style={{
                  borderColor: song.status === 'locked' ? 'rgba(255,0,255,0.35)' : 'rgba(255,255,255,0.06)',
                  boxShadow: song.status === 'locked' ? '0 0 12px rgba(255,0,255,0.12)' : 'none',
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: song.status === 'locked' ? '#FF00FF' : '#00FFFF', opacity: 0.6 }} />
                <div className="flex items-center gap-3 p-3 pl-5">
                  {/* Play button + track number disc */}
                  <button
                    onClick={() => handlePlayTrack(i)}
                    className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center group/play transition-all"
                    style={{ background: 'rgba(255,0,255,0.1)', border: '1px solid rgba(255,0,255,0.3)' }}
                  >
                    <span className="text-sm font-bold group-hover/play:hidden" style={{ color: '#FF00FF' }}>{i + 1}</span>
                    <Play className="w-4 h-4 hidden group-hover/play:block text-white fill-white" />
                    {song.status === 'locked' && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: '#FF00FF' }}>
                        <Lock className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{song.song_title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>

                  {/* Tags + KAAE badge */}
                  <div className="hidden md:flex items-center gap-1.5">
                    {song.genre && (
                      <span className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ background: 'rgba(0,255,255,0.08)', color: '#00FFFF', borderColor: 'rgba(0,255,255,0.2)' }}>
                        {song.genre}
                      </span>
                    )}
                    {song.mood && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-400">
                        {song.mood}
                      </span>
                    )}
                    {song.kaae_validated ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={{ background: 'rgba(0,255,136,0.08)', color: '#00FF88', borderColor: 'rgba(0,255,136,0.25)' }}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {formatLicenseLabel(song.audio_license)}
                      </span>
                    ) : song.audio_asset_id ? (
                      <span className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                        style={{ background: 'rgba(255,107,0,0.08)', color: '#FF6B00', borderColor: 'rgba(255,107,0,0.25)' }}>
                        <ShieldAlert className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-gray-500">
                        No Audio
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-gray-400 font-mono w-12 text-right">{formatRuntime(song.length_seconds)}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleMove(song, 'up')} disabled={i === 0}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleMove(song, 'down')} disabled={i === activePlaylist.length - 1}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => handleToggleLock(song)}>
                      {song.status === 'locked' ? <Unlock className="w-3.5 h-3.5" style={{ color: '#FF00FF' }} /> : <Lock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-white/10" onClick={() => { setEditingId(editingId === song.id ? null : song.id); setNoteText(song.note || ''); }}>
                      <Music className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-red-500/10" onClick={() => handleRemove(song)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Note editor */}
                {editingId === song.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-5 pb-3"
                  >
                    <Textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note for this song..."
                      rows={2}
                      className="text-sm bg-black/40 border-[#00FFFF]/20 focus:border-[#00FFFF]/50"
                    />
                    <Button size="sm" className="mt-2 cp-btn-gradient border-0 text-white" onClick={() => handleSaveNote(song)}>
                      Save Note
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
            <Disc3 className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,0,255,0.3)' }} />
            <p className="text-gray-400 mb-4">No playlist has been generated yet.</p>
            <Button onClick={handleRegenerate} disabled={regenerating} className="cp-btn-gradient border-0 text-white">
              {regenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              Generate Playlist
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}