import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, BookOpen, Package, CheckCircle2, Clock, TrendingUp, Library, Layers, Globe, Languages, FileText, Zap } from 'lucide-react';

const FOUNDATION_TARGET = 100;

const COLLECTION_LABELS = {
  sacred_scriptures: 'Sacred Scriptures',
  historical_documents: 'Historical Documents',
  ancient_manuscripts: 'Ancient Manuscripts',
  lexicons: 'Lexicons & Dictionaries',
  reference_works: 'Reference Works',
  language_learning: 'Language Resources',
  apocryphal: 'Apocryphal Texts',
  original_languages: 'Original Language Texts',
  historical_records: 'Historical Records',
  organization_publications: 'Organization Publications',
  research_collections: 'Research Collections',
  personal_collections: 'Personal Collections'
};

export default function FoundationLibraryProgress({ config }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const texts = await base44.entities.LibraryText.list('-created_date', 200);
      const nativeTexts = texts.filter(t => t.full_text_available && t.packaging_status === 'packaged');
      const pendingTexts = texts.filter(t => t.packaging_status === 'not_packaged' || t.packaging_status === 'packaging');
      const failedTexts = texts.filter(t => t.packaging_status === 'failed');
      const foundationTexts = texts.filter(t => t.is_foundation);

      // Group by collection
      const byCollection = {};
      nativeTexts.forEach(t => {
        const key = t.collection || 'reference_works';
        if (!byCollection[key]) byCollection[key] = { native: 0, pending: 0 };
        byCollection[key].native++;
      });
      pendingTexts.forEach(t => {
        const key = t.collection || 'reference_works';
        if (!byCollection[key]) byCollection[key] = { native: 0, pending: 0 };
        byCollection[key].pending++;
      });

      // Group by tradition
      const byTradition = {};
      nativeTexts.forEach(t => {
        const key = t.tradition || 'Unknown';
        byTradition[key] = (byTradition[key] || 0) + 1;
      });

      // Calculate total words
      const totalWords = nativeTexts.reduce((sum, t) => sum + (t.word_count || 0), 0);

      setStats({
        totalTexts: texts.length,
        nativeCount: nativeTexts.length,
        pendingCount: pendingTexts.length,
        failedCount: failedTexts.length,
        foundationCount: foundationTexts.length,
        foundationProgress: Math.min(100, Math.round((nativeTexts.length / FOUNDATION_TARGET) * 100)),
        byCollection,
        byTradition,
        totalWords,
        totalReadingHours: Math.round((nativeTexts.reduce((s, t) => s + (t.reading_time_minutes || 0), 0)) / 60),
        recentNative: nativeTexts.slice(0, 8)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const topTraditions = Object.entries(stats.byTradition).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Foundation Library Progress Hero */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg">Foundation Library Progress</h2>
            <p className="text-xs text-muted-foreground">Building a native digital library — not a collection of links</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">Native Resources Acquired</span>
            <span className="text-sm text-muted-foreground">{stats.nativeCount} / {FOUNDATION_TARGET} foundation target</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-berna-emerald transition-all duration-500"
              style={{ width: `${stats.foundationProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stats.foundationProgress}% complete</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <FoundationStat icon={BookOpen} label="Native Books" value={stats.nativeCount} color="text-berna-emerald" />
          <FoundationStat icon={Package} label="Acquiring" value={stats.pendingCount} color="text-accent" />
          <FoundationStat icon={FileText} label="Total Words" value={stats.totalWords.toLocaleString()} color="text-primary" />
          <FoundationStat icon={Clock} label="Reading Hours" value={stats.totalReadingHours} color="text-chart-4" />
        </div>
      </div>

      {/* Collection Breakdown */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Native Resources by Collection
        </h3>
        {Object.keys(stats.byCollection).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No native resources yet. The CAE is acquiring content...</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(stats.byCollection)
              .sort((a, b) => (b[1].native + b[1].pending) - (a[1].native + a[1].pending))
              .map(([key, data]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-48 shrink-0">{COLLECTION_LABELS[key] || key}</span>
                  <div className="flex-1 h-6 rounded-md bg-secondary/40 overflow-hidden flex">
                    <div
                      className="h-full bg-berna-emerald/60 flex items-center justify-center text-xs text-white font-medium"
                      style={{ width: `${data.native > 0 ? (data.native / (data.native + data.pending)) * 100 : 0}%` }}
                    >
                      {data.native > 0 ? data.native : ''}
                    </div>
                    <div
                      className="h-full bg-accent/40 flex items-center justify-center text-xs text-accent-foreground"
                      style={{ width: `${data.pending > 0 ? (data.pending / (data.native + data.pending)) * 100 : 0}%` }}
                    >
                      {data.pending > 0 ? data.pending : ''}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-berna-emerald/60" /> Native (full text)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent/40" /> Acquiring</span>
        </div>
      </div>

      {/* Traditions Covered */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> Traditions in the Library
        </h3>
        {topTraditions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No traditions covered yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topTraditions.map(([tradition, count]) => (
              <div key={tradition} className="px-3 py-1.5 rounded-lg bg-secondary/40 border border-border text-sm flex items-center gap-2">
                <span>{tradition}</span>
                <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Native Acquisitions */}
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" /> Recent Native Acquisitions
        </h3>
        {stats.recentNative.length === 0 ? (
          <div className="text-center py-6">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">The CAE is acquiring native content. Check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentNative.map(text => (
              <div key={text.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{text.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {text.tradition} · {text.word_count ? `${text.word_count.toLocaleString()} words` : 'Unknown length'}
                    {text.reading_time_minutes ? ` · ${text.reading_time_minutes} min` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-berna-emerald/20 text-berna-emerald flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Native
                  </span>
                  {text.acquisition_method === 'llm_acquired' && (
                    <span className="text-xs text-muted-foreground">LLM</span>
                  )}
                  {text.acquisition_method === 'native_fetch' && (
                    <span className="text-xs text-muted-foreground">Fetched</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FoundationStat({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30">
      <Icon className={`w-4 h-4 ${color} mb-1.5`} />
      <p className="text-xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}