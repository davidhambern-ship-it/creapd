import React, { useState } from 'react';
import { useSportsProduction } from '@/hooks/useSportsProduction';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Download, Package, CheckCircle2 } from 'lucide-react';

export default function SportsExport() {
  const { config, games, segments, assets, research, athletes, loading } = useSportsProduction();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const exportData = {
        production_name: config.production_name,
        host_name: config.host_name,
        show_date: config.show_date,
        show_format: config.show_format,
        show_tone: config.show_tone,
        total_runtime: config.total_show_runtime,
        games, research, athletes, segments, assets,
        exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.production_name.replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExportResult({ success: true, count: games.length + research.length + athletes.length + segments.length + assets.length });
    }, 1500);
  };

  const exportItems = [
    { label: 'Configuration', count: 1, done: !!config.production_name },
    { label: 'Research Items', count: research.length, done: research.length > 0 },
    { label: 'Games', count: games.length, done: games.length > 0 },
    { label: 'Athletes', count: athletes.length, done: athletes.length > 0 },
    { label: 'Rundown Segments', count: segments.length, done: segments.length > 0 },
    { label: 'AI Assets', count: assets.length, done: assets.length > 0 },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Export</h1>
        <p className="text-sm text-muted-foreground mt-1">Export your complete sports production package</p>
      </div>

      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Export Summary</h3>
        <div className="space-y-2">
          {exportItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
              <div className="flex items-center gap-2">
                {item.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {exportResult && (
        <div className="glass-panel p-4 border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="text-sm font-medium">Export complete! {exportResult.count} items exported.</p>
          </div>
        </div>
      )}

      <Button onClick={handleExport} disabled={exporting} size="lg">
        {exporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</> : <><Download className="w-4 h-4 mr-2" /> Export Production Package</>}
      </Button>
    </div>
  );
}