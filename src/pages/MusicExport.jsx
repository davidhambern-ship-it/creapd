import React, { useState } from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Music, ClipboardList, Image, Archive } from 'lucide-react';
import { ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS, formatRuntime } from '@/lib/musicConstants';

export default function MusicExport() {
  const { config, playlist, topics, research, rundown, assets, loading } = useMusicProduction();
  const [exporting, setExporting] = useState('');

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

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
    { key: 'full', label: 'Full Production Package', desc: 'Complete package with all content', icon: FileText, action: exportFullPackage },
    { key: 'playlist', label: 'Playlist CSV', desc: 'Set list as spreadsheet', icon: Music, action: exportPlaylistCSV },
    { key: 'rundown', label: 'Show Rundown', desc: 'Full show structure with timing', icon: ClipboardList, action: exportRundown },
    { key: 'assets', label: 'AI Assets Package', desc: 'All generated AI content', icon: Image, action: exportAssets },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Download className="w-6 h-6 text-primary" /> Export</h1>
        <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exports.map(exp => {
          const Icon = exp.icon;
          const isExporting = exporting === exp.key;
          return (
            <div key={exp.key} className="glass-panel p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold mb-1">{exp.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{exp.desc}</p>
                  <Button size="sm" onClick={exp.action} disabled={isExporting || !playlist.length}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                    Download
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Archive className="w-4 h-4 shrink-0" />
        ZIP package export will be available in a future update.
      </div>
    </div>
  );
}