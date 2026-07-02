import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, Database, BarChart3, ListChecks, FileCode, Search } from 'lucide-react';
import SeederOverview from '@/components/seeder/SeederOverview';
import SeedManifestPanel from '@/components/seeder/SeedManifestPanel';
import ImportQueuePanel from '@/components/seeder/ImportQueuePanel';
import NativeSeeder from '@/components/seeder/NativeSeeder';
import { SEED_MANIFEST } from '@/lib/seedManifest';

const TABS = [
  { key: 'overview', label: 'Dashboard', icon: BarChart3 },
  { key: 'manifest', label: 'Seed Manifest', icon: ListChecks },
  { key: 'queue', label: 'Import Queue', icon: Database },
  { key: 'seeder', label: 'Native Seeder', icon: FileCode },
];

export default function FoundationSeeder() {
  const [activeTab, setActiveTab] = useState('overview');
  const [foundationWorks, setFoundationWorks] = useState([]);
  const [importJobs, setImportJobs] = useState([]);
  const [textWorks, setTextWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [manifestSeeded, setManifestSeeded] = useState(false);
  const [seedingManifest, setSeedingManifest] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [works, jobs, texts] = await Promise.all([
        base44.entities.SMCFoundationWork.list('-priority_score', 200).catch(() => []),
        base44.entities.SMCImportJob.list('-created_date', 100).catch(() => []),
        base44.entities.TextWork.filter({ is_foundation: true }, '-updated_date', 50).catch(() => []),
      ]);
      setFoundationWorks(works || []);
      setImportJobs(jobs || []);
      setTextWorks(texts || []);
      setManifestSeeded((works || []).length > 0);
    } catch (err) {
      console.error('Foundation Seeder load error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh when jobs are running
  useEffect(() => {
    const hasActiveJobs = importJobs.some(j => ['Running', 'Validating', 'Queued'].includes(j.status));
    if (!hasActiveJobs) return;
    const interval = setInterval(() => loadAll(), 10000);
    return () => clearInterval(interval);
  }, [importJobs, loadAll]);

  // ─── Seed Manifest: populate SMCFoundationWork from the manifest data ───
  const handleSeedManifest = async () => {
    setSeedingManifest(true);
    try {
      const existing = await base44.entities.SMCFoundationWork.list('-created_date', 200);
      const existingTitles = new Set((existing || []).map(w => w.work_title));

      const newRecords = SEED_MANIFEST
        .filter(m => !existingTitles.has(m.title))
        .map(m => ({
          work_title: m.title,
          tradition: m.tradition,
          collection_category: m.category,
          roadmap_status: m.source_key ? 'Imported' : 'Source Needed',
          priority_score: m.priority,
          importance_label: m.importance,
          provider_name: m.provider,
          import_complexity: 'Medium',
          estimated_import_time_minutes: Math.ceil(m.estimated_records / 1000),
          language_coverage: JSON.stringify(m.languages || []),
          dependencies: JSON.stringify(m.dependencies || []),
          admin_notes: m.import_notes || '',
          open_availability: m.license === 'Public Domain' || m.license === 'Open Access' || m.license === 'Official Free Access',
          public_domain: m.license === 'Public Domain',
        }));

      if (newRecords.length > 0) {
        await base44.entities.SMCFoundationWork.bulkCreate(newRecords);
      }
      await loadAll();
    } catch (err) {
      console.error('Manifest seed error:', err);
    }
    setSeedingManifest(false);
  };

  // ─── Import actions ───
  const handleImportNow = async (work) => {
    setActionLoading(work.id);
    try {
      // Check if this work has a source in SMC
      const sources = await base44.entities.SMCSource.filter({ seeder_enabled: true, is_approved: true }, '-updated_date', 50).catch(() => []);

      // Find matching source by name or provider
      const matchingSource = sources.find(s => {
        const name = (s.source_name || '').toLowerCase();
        return name.includes((work.work_title || '').toLowerCase()) ||
               name.includes((work.provider_name || '').toLowerCase()) ||
               (work.provider_name || '').toLowerCase().includes(name);
      });

      if (matchingSource) {
        // Create an import job and execute it
        const job = await base44.entities.SMCImportJob.create({
          source_id: matchingSource.id,
          work_title: work.work_title,
          tradition: work.tradition,
          collection: work.collection_category,
          import_method: matchingSource.source_type === 'API' ? 'API Fetch' : 'Bulk Download',
          status: 'Queued',
          progress_percent: 0,
          records_imported: 0,
          total_records_expected: 0,
          validation_status: 'Pending',
          duplicate_check_status: 'Not Checked',
          rollback_available: true,
        });

        // Update foundation work status
        await base44.entities.SMCFoundationWork.update(work.id, {
          roadmap_status: 'Importing',
          import_job_id: job.id,
        });

        // Execute the import
        await base44.functions.invoke('runSMCImport', { mode: 'execute', job_id: job.id });
        await loadAll();
      } else {
        // No matching SMC source — check if it's a direct seed (Bible/Quran)
        const manifestEntry = SEED_MANIFEST.find(m => m.title === work.work_title);
        if (manifestEntry?.source_key) {
          await base44.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Importing' });
          const resp = await base44.functions.invoke('seedFoundationText', { source: manifestEntry.source_key });
          const data = resp.data || resp;
          await base44.entities.SMCFoundationWork.update(work.id, {
            roadmap_status: 'Imported',
            import_complexity: 'Low',
          });
          await loadAll();
        } else {
          // No source available — update status
          await base44.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Source Needed' });
          await loadAll();
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      await base44.entities.SMCFoundationWork.update(work.id, {
        roadmap_status: 'Failed',
        admin_notes: (work.admin_notes || '') + `\n\nImport failed: ${err.message || 'Unknown error'}`,
      }).catch(() => {});
      await loadAll();
    }
    setActionLoading(null);
  };

  const handleQueueImport = async (work) => {
    setActionLoading(work.id);
    try {
      await base44.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Queued' });
      await loadAll();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handleRetryImport = async (work) => {
    setActionLoading(work.id);
    try {
      await base44.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Ready to Import' });
      await loadAll();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  // ─── SMC Source Acquisition ───
  // Automated pipeline: discovers, approves, and links an SMC source to a foundation work
  const handleAcquireSource = async (work) => {
    setActionLoading(work.id);
    try {
      const resp = await base44.functions.invoke('acquireFoundationSource', { work_id: work.id });
      const data = resp.data || resp;
      await loadAll();
      // Surface result to the user via a toast or alert (simplified — the UI refresh shows the new status)
      if (!data.source_found) {
        console.warn('SMC acquisition: no source approved automatically', data);
      }
    } catch (err) {
      console.error('SMC acquisition error:', err);
      await loadAll();
    }
    setActionLoading(null);
  };

  // ─── Import job actions ───
  const handleExecuteJob = async (job) => {
    setActionLoading(job.id);
    try {
      await base44.functions.invoke('runSMCImport', { mode: 'execute', job_id: job.id });
      await loadAll();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handlePauseJob = async (job) => {
    setActionLoading(job.id);
    try {
      await base44.entities.SMCImportJob.update(job.id, { status: 'Paused' });
      await loadAll();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handleRetryJob = async (job) => {
    setActionLoading(job.id);
    try {
      await base44.entities.SMCImportJob.update(job.id, { status: 'Queued', error_log: '' });
      await base44.functions.invoke('runSMCImport', { mode: 'execute', job_id: job.id });
      await loadAll();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/admin/world-scripture-registry" className="hover:text-foreground">Admin</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/admin/source-management-center" className="hover:text-foreground">Source Management Center</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Foundation Seeder</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Foundation Seeder</h1>
              <p className="text-sm text-muted-foreground">
                Import foundational texts from approved sources into the native World Scripture Library
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/source-management-center">
              <Button variant="outline" size="sm">Source Management Center</Button>
            </Link>
          </div>
        </div>

        {/* Manifest not seeded yet — show seed button */}
        {!manifestSeeded && (
          <div className="glass-panel p-5 mb-6 border-accent/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold mb-1">Seed Manifest Not Initialized</h3>
                <p className="text-sm text-muted-foreground">
                  Initialize the Seed Manifest with {SEED_MANIFEST.length} planned foundational works. This creates the collection development roadmap that guides all imports.
                </p>
              </div>
              <Button onClick={handleSeedManifest} disabled={seedingManifest} className="shrink-0 ml-4">
                {seedingManifest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Initialize Manifest
              </Button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const badge = tab.key === 'queue'
              ? importJobs.filter(j => ['Running', 'Validating', 'Queued'].includes(j.status)).length
              : tab.key === 'manifest'
                ? foundationWorks.length
                : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-primary/20 text-primary glow-purple' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {badge !== null && badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-primary/30' : 'bg-secondary/40'}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <SeederOverview
            foundationWorks={foundationWorks}
            importJobs={importJobs}
            textWorks={textWorks}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'manifest' && (
          <SeedManifestPanel
            foundationWorks={foundationWorks}
            onImport={handleImportNow}
            onQueue={handleQueueImport}
            onRetry={handleRetryImport}
            onAcquireSource={handleAcquireSource}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'queue' && (
          <ImportQueuePanel
            jobs={importJobs}
            onExecute={handleExecuteJob}
            onRetry={handleRetryJob}
            onPause={handlePauseJob}
            loading={actionLoading !== null}
          />
        )}

        {activeTab === 'seeder' && (
          <NativeSeeder textWorks={textWorks} onRefresh={loadAll} />
        )}

        {/* Native Import Philosophy (from Section 1) */}
        <div className="glass-panel p-5 mt-8">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" /> Foundation Seeder Philosophy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">Native Import</p>
              <p className="text-xs text-muted-foreground">Imports actual text content — every verse stored as its own database row with its own Producer ID.</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">SMC Sources Only</p>
              <p className="text-xs text-muted-foreground">Only uses approved, healthy, seeder-enabled sources from the Source Management Center.</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">No Links as Books</p>
              <p className="text-xs text-muted-foreground">External URLs stored only as source metadata, citation metadata, and audit references — never as library books.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}