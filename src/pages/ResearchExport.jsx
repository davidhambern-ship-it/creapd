import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import { Button } from '@/components/ui/button';
import { Loader2, FlaskConical, Download, FileText, Package, CheckCircle2, Archive } from 'lucide-react';

export default function ResearchExport() {
  const researchData = useResearchProduction();
  const { config, topics, points, packages, loading } = researchData;
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center cc-animate-fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <FlaskConical className="w-8 h-8" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
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
        research_depth: config.research_depth,
        tone: config.tone,
        reading_style: config.reading_style,
        total_runtime: config.total_show_runtime,
        topics,
        points,
        packages,
        exported_at: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.production_name.replace(/\s+/g, '_')}_research_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExportResult({ success: true, count: topics.length + points.length + packages.length });
    }, 1500);
  };

  const exportItems = [
    { label: 'Configuration', count: 1, done: !!config.production_name, icon: FileText },
    { label: 'Research Topics', count: topics.length, done: topics.length > 0, icon: Archive },
    { label: 'Point Cards', count: points.length, done: points.length > 0, icon: FileText },
    { label: 'Approved Points', count: points.filter(p => p.status === 'approved' || p.status === 'used').length, done: points.some(p => p.status === 'approved' || p.status === 'used'), icon: CheckCircle2 },
    { label: 'Production Packages', count: packages.length, done: packages.length > 0, icon: Package },
  ];

  const doneCount = exportItems.filter(i => i.done).length;
  const readinessPercent = Math.round((doneCount / exportItems.length) * 100);

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <Download className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">Export Console</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Export your complete research production package</p>
          </div>
        </div>
      </div>

      {/* Centered Export Panel */}
      <div className="px-4 md:px-6 pb-6 max-w-3xl mx-auto">
        {/* Readiness Meter */}
        <div className="cc-glass-card p-4 mb-4 cc-animate-fade-up cc-stagger-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Export Readiness</span>
            <span className="text-sm font-bold" style={{ color: 'hsl(35 90% 60%)' }}>{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${readinessPercent}%`, background: 'linear-gradient(90deg, hsl(190 55% 45%), hsl(35 80% 55%))' }} />
          </div>
        </div>

        {/* Export Items as Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {exportItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`cc-metric-card cc-animate-scale-in cc-stagger-${Math.min(i + 1, 6)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: item.done ? 'hsl(152 60% 50%)' : 'hsl(190 60% 50% / 0.5)' }} />
                  </div>
                  {item.done && <CheckCircle2 className="w-4 h-4" style={{ color: 'hsl(152 60% 50%)' }} />}
                </div>
                <p className="text-xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: `${0.15 + i * 0.05}s` }}>{item.count}</p>
                <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>{item.label}</p>
              </div>
            );
          })}
        </div>

        {/* Export Result */}
        {exportResult && (
          <div className="cc-glass-card p-4 mb-4 cc-animate-fade-up" style={{ borderColor: 'hsl(152 50% 28% / 0.3)' }}>
            <div className="flex items-center gap-2" style={{ color: 'hsl(152 60% 50%)' }}>
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm font-medium">Export complete! {exportResult.count} items exported.</p>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-center cc-animate-fade-up cc-stagger-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, hsl(152 50% 18% / 0.4), hsl(152 40% 10% / 0.2))',
              border: '1px solid hsl(152 50% 28% / 0.5)',
              color: 'hsl(152 60% 55%)',
              boxShadow: '0 0 20px hsl(152 50% 25% / 0.1)',
            }}
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Export Research Package</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}