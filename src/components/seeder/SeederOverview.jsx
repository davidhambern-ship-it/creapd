import React from 'react';
import { Database, CheckCircle2, Clock, AlertCircle, XCircle, BookOpen, Globe, Languages, TrendingUp, BarChart3 } from 'lucide-react';

export default function SeederOverview({ foundationWorks, importJobs, textWorks, onNavigate }) {
  const total = foundationWorks.length;
  const imported = foundationWorks.filter(w => ['Imported', 'Indexed', 'Published'].includes(w.roadmap_status)).length;
  const readyToImport = foundationWorks.filter(w => w.roadmap_status === 'Ready to Import').length;
  const importing = foundationWorks.filter(w => w.roadmap_status === 'Importing').length;
  const failed = foundationWorks.filter(w => w.roadmap_status === 'Failed').length;
  const missing = foundationWorks.filter(w => ['Missing', 'Source Needed'].includes(w.roadmap_status)).length;
  const licenseBlocked = foundationWorks.filter(w => w.roadmap_status === 'License Blocked').length;
  const parserMissing = foundationWorks.filter(w => w.roadmap_status === 'Parser Missing').length;
  const needsReview = foundationWorks.filter(w => w.roadmap_status === 'Needs Review').length;

  const completionPct = total > 0 ? Math.round((imported / total) * 100) : 0;

  // Coverage by tradition
  const traditionStats = {};
  foundationWorks.forEach(w => {
    if (!traditionStats[w.tradition]) traditionStats[w.tradition] = { total: 0, imported: 0 };
    traditionStats[w.tradition].total++;
    if (['Imported', 'Indexed', 'Published'].includes(w.roadmap_status)) traditionStats[w.tradition].imported++;
  });

  // Coverage by language
  const languageStats = {};
  foundationWorks.forEach(w => {
    let langs = [];
    try { langs = JSON.parse(w.language_coverage || '[]'); } catch { langs = []; }
    if (!Array.isArray(langs)) langs = [];
    if (langs.length === 0 && w.tradition) langs = ['English'];
    langs.forEach(l => {
      if (!languageStats[l]) languageStats[l] = { total: 0, imported: 0 };
      languageStats[l].total++;
      if (['Imported', 'Indexed', 'Published'].includes(w.roadmap_status)) languageStats[l].imported++;
    });
  });

  // Import job stats
  const runningJobs = importJobs.filter(j => ['Running', 'Validating'].includes(j.status)).length;
  const queuedJobs = importJobs.filter(j => j.status === 'Queued').length;
  const completedJobs = importJobs.filter(j => j.status === 'Completed').length;
  const failedJobs = importJobs.filter(j => j.status === 'Failed').length;

  // Native texts (already seeded via seedFoundationText)
  const nativeTextsCount = textWorks.filter(w => w.seeding_status === 'seeded').length;
  const totalVerses = textWorks.reduce((sum, w) => sum + (w.total_verses || 0), 0);

  const stats = [
    { label: 'Foundation Completion', value: `${completionPct}%`, icon: TrendingUp, color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
    { label: 'Imported Works', value: imported, icon: CheckCircle2, color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
    { label: 'Ready to Import', value: readyToImport, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Currently Importing', value: importing, icon: Database, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Failed Imports', value: failed, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Missing Sources', value: missing, icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-secondary/30' },
    { label: 'License Blocked', value: licenseBlocked, icon: AlertCircle, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Parser Missing', value: parserMissing, icon: AlertCircle, color: 'text-muted-foreground', bg: 'bg-secondary/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Completion Bar */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Foundation Collection Progress
          </h3>
          <span className="text-2xl font-heading font-bold text-berna-emerald">{completionPct}%</span>
        </div>
        <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden mb-3">
          <div className="bg-gradient-to-r from-primary to-berna-emerald h-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{imported} imported of {total} planned works</span>
          <span>·</span>
          <span>{nativeTextsCount} native texts with {totalVerses.toLocaleString()} verses</span>
          {needsReview > 0 && <><span>·</span><span className="text-accent">{needsReview} need review</span></>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              onClick={() => onNavigate?.('manifest')}
              className="glass-panel p-4 hover:border-primary/30 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Import Queue Summary */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Import Queue
          </h3>
          <button onClick={() => onNavigate?.('queue')} className="text-xs text-primary hover:underline">View all →</button>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-lg bg-accent/10">
            <p className="text-xl font-heading font-bold text-accent">{runningJobs}</p>
            <p className="text-xs text-muted-foreground">Running</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xl font-heading font-bold text-primary">{queuedJobs}</p>
            <p className="text-xs text-muted-foreground">Queued</p>
          </div>
          <div className="p-3 rounded-lg bg-berna-emerald/10">
            <p className="text-xl font-heading font-bold text-berna-emerald">{completedJobs}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10">
            <p className="text-xl font-heading font-bold text-destructive">{failedJobs}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>
      </div>

      {/* Coverage by Tradition */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-primary" /> Coverage by Tradition
        </h3>
        <div className="space-y-2">
          {Object.entries(traditionStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([tradition, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.imported / stats.total) * 100) : 0;
              return (
                <div key={tradition} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 truncate">{tradition}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${pct === 100 ? 'bg-berna-emerald' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-16 text-right">{stats.imported}/{stats.total}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Coverage by Language */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
          <Languages className="w-4 h-4 text-primary" /> Coverage by Language
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(languageStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([lang, stats]) => {
              const pct = stats.total > 0 ? Math.round((stats.imported / stats.total) * 100) : 0;
              return (
                <div key={lang} className={`px-3 py-1.5 rounded-lg text-xs border ${pct === 100 ? 'border-berna-emerald/30 bg-berna-emerald/10' : 'border-border bg-secondary/30'}`}>
                  <span className="font-medium">{lang}</span>
                  <span className="text-muted-foreground ml-1">({stats.imported}/{stats.total})</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Native Texts (already seeded) */}
      {textWorks.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-berna-emerald" /> Native Texts in Library
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {textWorks.map(w => (
              <div key={w.id} className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{w.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${w.seeding_status === 'seeded' ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-muted text-muted-foreground'}`}>
                    {w.seeding_status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{w.total_chapters || 0} chapters</span>
                  <span>{w.total_verses || 0} verses</span>
                  <span>{w.source_provider}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}