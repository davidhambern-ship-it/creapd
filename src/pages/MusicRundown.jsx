import React from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, ClipboardList, Disc3, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatRuntime, SEGMENT_TYPE_LABELS } from '@/lib/musicConstants';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicPageNav from '@/components/music/MusicPageNav';

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
  const { config, rundown, loading } = useMusicProduction();

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
        <MusicPageNav />
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
          <Link to="/music/export" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 border border-white/10 hover:border-[#FF00FF]/40 hover:text-[#FF00FF] transition-colors flex items-center gap-1.5">
            <Download className="w-3 h-3" /> Export
          </Link>
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

                      {/* Duration */}
                      <span className="text-sm font-mono text-gray-400 flex-shrink-0">{formatRuntime(item.duration_seconds)}</span>
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
        <MusicPageNav />
      </div>
    </div>
  );
}