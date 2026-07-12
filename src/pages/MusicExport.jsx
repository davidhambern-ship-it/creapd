import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Music, ClipboardList, Image, Archive, Disc3, Terminal } from 'lucide-react';
import { ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS, formatRuntime } from '@/lib/musicConstants';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';
import PPNavBar from '@/components/layout/PPNavBar';

export default function MusicExport() {
  const { config, playlist, topics, research, rundown, assets, loading } = useMusicProduction();
  const [exporting, setExporting] = useState('');

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

  const downloadFile = (filename, content, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFullPackage = () => {
    setExporting('full');
    let content = `MUSIC PRODUCTION PACKAGE\n${config?.production_name || ''}\n${'='.repeat(50)}\n\n`;
    content += `Show Date: ${config?.show_date || ''}\nHost: ${config?.host_name || ''}\nStation: ${config?.station_name || ''}\n\n`;
    content += `\n--- PLAYLIST (${playlist.length} songs) ---\n`;
    playlist.forEach((s, i) => {
      content += `${i + 1}. ${s.song_title} - ${s.artist} (${formatRuntime(s.length_seconds)}, ${s.genre})\n`;
    });
    content += `\n--- SHOW RUNDOWN (${rundown.length} items) ---\n`;
    rundown.forEach(r => {
      content += `${r.start_time || ''} | ${SEGMENT_TYPE_LABELS[r.segment_type] || r.segment_type} | ${r.title} (${formatRuntime(r.duration_seconds)})\n`;
    });
    content += `\n--- MUSIC TOPICS (${topics.length}) ---\n`;
    topics.forEach(t => {
      content += `\n${t.topic_name}\n${t.generated_summary || ''}\n\nTalking Points:\n${t.talking_points || ''}\n`;
    });
    content += `\n--- AI ASSETS (${assets.length}) ---\n`;
    assets.forEach(a => {
      content += `\n${ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}: ${a.title}\n${a.content || ''}\n`;
    });
    downloadFile(`${config?.production_name || 'music_production'}_package.txt`, content);
    setExporting('');
  };

  const exportPlaylistCSV = () => {
    setExporting('playlist');
    let csv = 'Order,Song,Artist,Length (sec),Genre,Mood,Era\n';
    playlist.forEach((s, i) => {
      csv += `${i + 1},"${s.song_title}","${s.artist}",${s.length_seconds || ''},"${s.genre || ''}","${s.mood || ''}","${s.era_year || ''}"\n`;
    });
    downloadFile(`${config?.production_name || 'playlist'}.csv`, csv, 'text/csv');
    setExporting('');
  };

  const exportRundown = () => {
    setExporting('rundown');
    let content = `SHOW RUNDOWN\n${config?.production_name || ''}\n${'='.repeat(50)}\n\n`;
    rundown.forEach(r => {
      content += `${r.start_time || ''} - ${r.end_time || ''} | ${SEGMENT_TYPE_LABELS[r.segment_type] || r.segment_type} | ${r.title} (${formatRuntime(r.duration_seconds)})\n`;
      if (r.notes) content += `  Notes: ${r.notes}\n`;
    });
    downloadFile(`${config?.production_name || 'rundown'}.txt`, content);
    setExporting('');
  };

  const exportAssets = () => {
    setExporting('assets');
    let content = `AI ASSETS\n${config?.production_name || ''}\n${'='.repeat(50)}\n\n`;
    assets.forEach(a => {
      content += `\n${ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}: ${a.title}\n${'─'.repeat(40)}\n${a.content || ''}\n`;
    });
    downloadFile(`${config?.production_name || 'assets'}_package.txt`, content);
    setExporting('');
  };

  const exports = [
    { key: 'full', label: 'Full Production Package', desc: 'Complete package with all content', icon: FileText, action: exportFullPackage, accent: 'pink' },
    { key: 'playlist', label: 'Playlist CSV', desc: 'Set list as spreadsheet', icon: Music, action: exportPlaylistCSV, accent: 'cyan' },
    { key: 'rundown', label: 'Show Rundown', desc: 'Full show structure with timing', icon: ClipboardList, action: exportRundown, accent: 'pink' },
    { key: 'assets', label: 'AI Assets Package', desc: 'All generated AI content', icon: Image, action: exportAssets, accent: 'cyan' },
  ];

  const stats = [
    { label: 'Songs', value: playlist.length, color: '#FF00FF' },
    { label: 'Topics', value: topics.length, color: '#00FFFF' },
    { label: 'Segments', value: rundown.length, color: '#8B00FF' },
    { label: 'Assets', value: assets.length, color: '#00FF88' },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        <MusicDiscoveryNav />
        {/* Terminal-style header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', boxShadow: '0 0 16px rgba(0,255,255,0.2)' }}>
            <Download className="w-6 h-6" style={{ color: '#00FFFF' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white cp-glitch">Export Console</h1>
            <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="cp-glass p-4 flex items-center gap-4 flex-wrap"
          style={{ borderColor: 'rgba(255,0,255,0.15)' }}
        >
          <Terminal className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400 font-mono">~/export {'>'}</span>
          <div className="flex items-center gap-6 flex-1">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span className="text-xs text-gray-400">{s.label}:</span>
                <span className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Export cards — terminal command style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exports.map((exp, i) => {
            const Icon = exp.icon;
            const isExporting = exporting === exp.key;
            const color = exp.accent === 'pink' ? '#FF00FF' : '#00FFFF';
            return (
              <motion.div
                key={exp.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="cp-glass relative overflow-hidden"
                style={{ borderColor: `${color}25` }}
              >
                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}12`, border: `1px solid ${color}40`, boxShadow: `0 0 12px ${color}20` }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono" style={{ color }}>export_{exp.key}.sh</span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{exp.label}</h3>
                      <p className="text-sm text-gray-400 mb-4">{exp.desc}</p>
                      <Button size="sm" onClick={exp.action} disabled={isExporting || !playlist.length}
                        className="border-0 text-white"
                        style={{
                          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                          boxShadow: `0 0 12px ${color}40`,
                        }}>
                        {isExporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Future feature note */}
        <div className="cp-glass p-4 flex items-center gap-3 text-sm text-gray-400"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Archive className="w-4 h-4 shrink-0" style={{ color: '#8B00FF' }} />
          <span className="font-mono text-xs">[pending] ZIP package export will be available in a future update.</span>
        </div>
        <PPNavBar />
      </div>
    </div>
  );
}