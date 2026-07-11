import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { useAuth } from '@/lib/AuthContext';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';
import { ClipboardList, Disc3, Play, Pause, Crown, Loader2, Volume2 } from 'lucide-react';
import { formatRuntime, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';
import RundownVoiceoverControls from '@/components/music/RundownVoiceoverControls';
import RundownSongPlayer from '@/components/music/RundownSongPlayer';
import RundownScriptPanel from '@/components/music/RundownScriptPanel';

const SEGMENT_COLORS = {
  intro: '#00FF88',
  song: '#FF00FF',
  talk_break: '#00FFFF',
  topic_segment: '#FF6B00',
  sponsor_break: '#FFD700',
  station_id: '#8B00FF',
  outro: '#00FF88',
};

export default function MusicRundown() {
  const { config, rundown, playlist, topics, loading } = useMusicProduction();
  const { user } = useAuth();
  const isPro = user?.subscription_tier === 'pro' || user?.role === 'admin';
  const { speak, stop, speakingId, isSupported } = useNativeSpeech();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Lookup maps for matching songs and topics to rundown items
  const playlistById = React.useMemo(() => {
    const m = {};
    (playlist || []).forEach(p => { m[p.id] = p; });
    return m;
  }, [playlist]);

  const playlistByTitle = React.useMemo(() => {
    const m = {};
    (playlist || []).forEach(p => {
      const key = (p.song_title || '').toLowerCase().trim();
      if (key) m[key] = p;
    });
    return m;
  }, [playlist]);

  const findSongTrack = (item) => {
    if (item.associated_song_id && playlistById[item.associated_song_id]) {
      return playlistById[item.associated_song_id];
    }
    const titleKey = (item.title || '').toLowerCase().trim();
    return playlistByTitle[titleKey] || null;
  };

  const topicMap = React.useMemo(() => {
    const m = {};
    (topics || []).forEach(t => { m[t.topic_name] = t; });
    return m;
  }, [topics]);

  const getScriptForItem = (item) => {
    return item.script_content ||
           (item.associated_topic && topicMap[item.associated_topic]?.talking_points) ||
           item.notes ||
           item.title || '';
  };

  const handleNativePreview = (item) => {
    const script = getScriptForItem(item);
    if (speakingId === item.id) {
      stop();
    } else {
      speak(script, item.id);
    }
  };

  const handleAudioGenerated = (itemId, audioUrl) => {
    // The hook will refresh on next load; for now just note it
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

  const totalSeconds = rundown.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

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
              style={{ background: 'rgba(255,0,255,0.12)', border: '1px solid rgba(255,0,255,0.4)', boxShadow: '0 0 16px rgba(255,0,255,0.2)' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#FF00FF' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white cp-glitch">Show Rundown</h1>
              <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="cp-glass px-4 py-2" style={{ borderColor: 'rgba(0,255,255,0.2)' }}>
              <span className="text-xs text-gray-400">Items</span>
              <span className="ml-2 font-bold" style={{ color: '#00FFFF' }}>{rundown.length}</span>
            </div>
            <div className="cp-glass px-4 py-2" style={{ borderColor: 'rgba(255,0,255,0.2)' }}>
              <span className="text-xs text-gray-400">Runtime</span>
              <span className="ml-2 font-bold" style={{ color: '#FF00FF' }}>{formatRuntime(totalSeconds)}</span>
            </div>
          </div>
        </motion.div>

        {/* Assembly sub-room tabs */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF00FF]/20 border border-[#FF00FF]/50 text-[#FF00FF]">Rundown</span>
        </div>

        {rundown.length > 0 ? (
          <>
            {/* Horizontal timeline bar — proportional segments */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="cp-glass p-4"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                {rundown.map((item, i) => {
                  const color = SEGMENT_COLORS[item.segment_type] || '#888888';
                  const pct = totalSeconds > 0 ? ((item.duration_seconds || 0) / totalSeconds) * 100 : 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className="relative group h-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}80`, minWidth: pct > 5 ? 'auto' : '4px' }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center overflow-hidden">
                        <span className="text-[8px] font-bold text-black whitespace-nowrap px-1">{SEGMENT_TYPE_LABELS[item.segment_type] || ''}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                {Object.entries(SEGMENT_COLORS).map(([type, color]) => {
                  const count = rundown.filter(r => r.segment_type === type).length;
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

            {/* Rundown cards — clock-feed style */}
            <div className="space-y-2">
              {rundown.map((item, i) => {
                const color = SEGMENT_COLORS[item.segment_type] || '#888888';
                const isSong = item.segment_type === 'song';
                const songTrack = isSong ? findSongTrack(item) : null;
                const script = getScriptForItem(item);
                const showVoiceover = !isSong;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="cp-glass group relative overflow-hidden"
                    style={{ borderColor: `${color}20` }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
                    <div className="flex items-center gap-3 p-3 pl-5">
                      {/* Time block */}
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-sm font-mono font-bold" style={{ color }}>{item.start_time || '--:--'}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{item.end_time || '--:--'}</p>
                      </div>

                      {/* Divider */}
                      <div className="w-px h-10 bg-white/10" />

                      {/* Segment type badge */}
                      <span className="text-xs px-2.5 py-1 rounded-full border flex-shrink-0"
                        style={{ background: `${color}15`, color, borderColor: `${color}40` }}>
                        {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                      </span>

                      {/* Title + notes */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                      </div>

                      {/* Native preview button (free for all) — only for non-song segments */}
                      {showVoiceover && isSupported && script && (
                        <button
                          onClick={() => handleNativePreview(item)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all"
                          style={{
                            background: speakingId === item.id ? 'rgba(0,255,255,0.15)' : 'rgba(0,255,255,0.06)',
                            borderColor: speakingId === item.id ? 'rgba(0,255,255,0.5)' : 'rgba(0,255,255,0.2)',
                          }}
                        >
                          {speakingId === item.id ? (
                            <Pause className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider hidden sm:inline">
                            {speakingId === item.id ? 'Stop' : 'Preview'}
                          </span>
                        </button>
                      )}

                      {/* ElevenLabs controls — only for non-song segments */}
                      {showVoiceover && (
                        <RundownVoiceoverControls
                          item={item}
                          isPro={isPro}
                          script={script}
                          onUpgradeNeeded={() => setShowUpgrade(true)}
                          onAudioGenerated={handleAudioGenerated}
                        />
                      )}

                      {/* Duration */}
                      <span className="text-sm font-mono text-gray-400 flex-shrink-0">{formatRuntime(item.duration_seconds)}</span>
                    </div>

                    {/* Inline YouTube player for song segments — placed before script so it's grouped with the song */}
                    {isSong && songTrack && songTrack.youtube_video_id && (
                      <div className="px-3 pl-5 pb-2">
                        <RundownSongPlayer
                          videoId={songTrack.youtube_video_id}
                          title={songTrack.song_title || item.title}
                          channelName={songTrack.channel_name}
                          thumbnailUrl={songTrack.thumbnail_url}
                        />
                      </div>
                    )}

                    {/* Script panel — expandable */}
                    <div className="px-3 pl-5 pb-2">
                      <RundownScriptPanel item={item} color={color} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(255,0,255,0.15)' }}>
            <ClipboardList className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,0,255,0.3)' }} />
            <p className="text-gray-400">No show rundown has been generated yet.</p>
          </div>
        )}
        <MusicDiscoveryNav />
      </div>

      {/* Upgrade modal for non-pro users */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpgrade(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="cp-glass p-8 max-w-md mx-4 text-center"
              style={{ borderColor: 'rgba(168,85,247,0.3)' }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)' }}>
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-gray-400 mb-6">
                Generate broadcast-quality voiceovers with ElevenLabs AI. Pro members get lifelike, studio-grade audio for every segment.
              </p>
              <button
                onClick={() => setShowUpgrade(false)}
                className="cp-btn-gradient px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              >
                Maybe Later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}