import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3, TrendingUp, Globe, BookOpen, Languages, Database, Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function SMCAnalytics({ sources }) {
  const [works, setWorks] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [importJobs, setImportJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [w, l, j] = await Promise.all([
          base44.entities.SMCFoundationWork.list('-created_date', 200).catch(() => []),
          base44.entities.SMCLicenseRecord.list('-created_date', 100).catch(() => []),
          base44.entities.SMCImportJob.list('-created_date', 100).catch(() => []),
        ]);
        setWorks(w || []); setLicenses(l || []); setImportJobs(j || []);
      } catch (err) { console.error('Analytics load error:', err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Coverage analytics
  const traditions = [...new Set(works.map(w => w.tradition).filter(Boolean))];
  const imported = works.filter(w => w.roadmap_status === 'Imported');
  const coverageByTradition = traditions.map(t => {
    const total = works.filter(w => w.tradition === t).length;
    const done = works.filter(w => w.tradition === t && w.roadmap_status === 'Imported').length;
    return { tradition: t, percent: total > 0 ? Math.round((done / total) * 100) : 0, total, done };
  }).sort((a, b) => b.percent - a.percent);

  // License distribution
  const freeLicenses = licenses.filter(l => ['Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution'].includes(l.rights_classification));
  const paidLicenses = licenses.filter(l => l.purchase_required);
  const freePercent = licenses.length > 0 ? Math.round((freeLicenses.length / licenses.length) * 100) : 0;

  // Import stats
  const completedImports = importJobs.filter(j => j.status === 'Completed');
  const failedImports = importJobs.filter(j => j.status === 'Failed');
  const successRate = importJobs.length > 0 ? Math.round((completedImports.length / importJobs.length) * 100) : 0;
  const totalRecords = completedImports.reduce((sum, j) => sum + (j.records_imported || 0), 0);
  const avgImportTime = completedImports.length > 0 ? Math.round(completedImports.reduce((sum, j) => sum + (j.duration_seconds || 0), 0) / completedImports.length) : 0;

  // Provider type distribution
  const providerTypes = [...new Set(sources.map(s => s.provider_type).filter(Boolean))];
  const providerTypeCounts = providerTypes.map(pt => ({ type: pt, count: sources.filter(s => s.provider_type === pt).length })).sort((a, b) => b.count - a.count);

  // Source type distribution
  const sourceTypes = [...new Set(sources.map(s => s.source_type).filter(Boolean))];
  const sourceTypeCounts = sourceTypes.map(st => ({ type: st, count: sources.filter(s => s.source_type === st).length })).sort((a, b) => b.count - a.count);

  const kpis = [
    { label: 'Total Sources', value: sources.length, icon: Database, color: 'text-primary' },
    { label: 'Approved Providers', value: sources.filter(s => s.approval_status === 'Approved').length, icon: BookOpen, color: 'text-berna-emerald' },
    { label: 'Works Imported', value: imported.length, icon: CheckCircle2, color: 'text-berna-emerald' },
    { label: 'Total Records', value: totalRecords.toLocaleString(), icon: BarChart3, color: 'text-primary' },
    { label: 'Import Success Rate', value: `${successRate}%`, icon: Activity, color: successRate >= 80 ? 'text-berna-emerald' : 'text-amber-400' },
    { label: 'Avg Import Time', value: `${avgImportTime}s`, icon: Clock, color: 'text-accent' },
    { label: 'Free/Open %', value: `${freePercent}%`, icon: TrendingUp, color: 'text-berna-emerald' },
    { label: 'Traditions Covered', value: traditions.length, icon: Globe, color: 'text-primary' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="glass-panel p-3">
              <Icon className={`w-5 h-5 mb-1 ${kpi.color}`} />
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Collection Coverage Heat Map</h3>
          <div className="space-y-2">
            {coverageByTradition.map(c => (
              <div key={c.tradition} className="flex items-center gap-2">
                <span className="text-xs w-24 truncate">{c.tradition}</span>
                <div className="flex-1 h-4 rounded-full bg-secondary/30 overflow-hidden">
                  <div className={`h-full rounded-full ${c.percent >= 80 ? 'bg-berna-emerald' : c.percent >= 50 ? 'bg-primary' : c.percent >= 25 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.percent}%` }} />
                </div>
                <span className="text-xs font-mono w-12 text-right">{c.percent}%</span>
              </div>
            ))}
            {coverageByTradition.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No coverage data yet.</p>}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Provider Type Distribution</h3>
          <div className="space-y-1.5">
            {providerTypeCounts.slice(0, 10).map(pt => (
              <div key={pt.type} className="flex items-center gap-2">
                <span className="text-xs flex-1 truncate">{pt.type}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${sources.length > 0 ? (pt.count / sources.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{pt.count}</span>
              </div>
            ))}
            {providerTypeCounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No providers yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">Source Type Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sourceTypeCounts.map(st => (
            <div key={st.type} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
              <Database className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs flex-1 truncate">{st.type}</span>
              <span className="text-xs font-bold">{st.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">Gap Analysis — Missing Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {['Sikhism', 'Jainism', 'Taoism', 'Confucianism', 'Shinto', 'Bahá\'í', 'Indigenous Traditions', 'Pagan Traditions'].map(t => {
            const hasCoverage = traditions.includes(t);
            return (
              <div key={t} className={`flex items-center gap-2 p-2 rounded-md ${hasCoverage ? 'bg-berna-emerald/5' : 'bg-red-500/5'}`}>
                {hasCoverage ? <CheckCircle2 className="w-4 h-4 text-berna-emerald" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                <span className="text-sm flex-1">{t}</span>
                <span className="text-xs text-muted-foreground">{hasCoverage ? 'Covered' : 'No sources'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}