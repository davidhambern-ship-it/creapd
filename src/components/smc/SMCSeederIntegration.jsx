import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Download, CheckCircle2, XCircle, Clock, Play, Pause, RotateCcw, FileText, Search, Zap, Bot } from 'lucide-react';
import { IMPORT_STATUSES } from '@/lib/smcConstants';

export default function SMCSeederIntegration() {
  const [jobs, setJobs] = useState([]);
  const [sources, setSources] = useState([]);
  const [parsers, setParsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQueue, setShowQueue] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    try {
      const [j, s, p] = await Promise.all([
        base44.entities.SMCImportJob.list('-created_date', 50),
        base44.entities.SMCSource.filter({ seeder_enabled: true }, '-created_date', 50),
        base44.entities.SMCParser.list('-created_date', 50),
      ]);
      setJobs(j || []); setSources(s || []); setParsers(p || []);
    } catch (err) { console.error('Seeder load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (job, action) => {
    try {
      if (action === 'pause') await base44.entities.SMCImportJob.update(job.id, { status: 'Paused' });
      else if (action === 'resume') await base44.entities.SMCImportJob.update(job.id, { status: 'Queued' });
      else if (action === 'retry') await base44.entities.SMCImportJob.update(job.id, { status: 'Queued', error_log: '' });
      else if (action === 'cancel') await base44.entities.SMCImportJob.update(job.id, { status: 'Cancelled' });
      load();
    } catch (err) { console.error(err); }
  };

  const handleScanSources = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke('runSMCImport', { mode: 'auto_create' });
      await load();
    } catch (err) { console.error('Scan error:', err); }
    finally { setScanning(false); }
  };

  const handleApproveAndRun = async (jobId) => {
    setExecuting(jobId);
    try {
      await base44.functions.invoke('runSMCImport', { mode: 'execute', job_id: jobId });
      await load();
    } catch (err) { console.error('Execute error:', err); }
    finally { setExecuting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const completed = jobs.filter(j => j.status === 'Completed');
  const running = jobs.filter(j => j.status === 'Running');
  const queued = jobs.filter(j => j.status === 'Queued');
  const failed = jobs.filter(j => j.status === 'Failed');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><Clock className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{queued.length}</p><p className="text-xs text-muted-foreground">Queued</p></div>
        <div className="glass-panel p-3"><Loader2 className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{running.length}</p><p className="text-xs text-muted-foreground">Running</p></div>
        <div className="glass-panel p-3"><CheckCircle2 className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{completed.length}</p><p className="text-xs text-muted-foreground">Completed</p></div>
        <div className="glass-panel p-3"><XCircle className="w-5 h-5 text-red-400 mb-1" /><p className="text-xl font-bold">{failed.length}</p><p className="text-xs text-muted-foreground">Failed</p></div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="font-heading font-semibold text-sm mb-2">Import Pipeline</h3>
        <p className="text-xs text-muted-foreground mb-3">Every import follows: Approved Source → Authentication → Fetch Data → Validate → Parse → Normalize → Map to Schema → Validate Metadata → Create Registry Entry → Index Search → Publish to Library</p>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {['Approved Source', 'Authenticate', 'Fetch', 'Validate', 'Parse', 'Normalize', 'Map Schema', 'Validate Metadata', 'Registry Entry', 'Index Search', 'Publish Library', 'Available'].map((step, idx, arr) => (
            <React.Fragment key={step}>
              <span className="px-2 py-1 rounded bg-primary/10 text-primary">{step}</span>
              {idx < arr.length - 1 && <span className="text-muted-foreground">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Import Queue</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleScanSources} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm hover:bg-primary/30 disabled:opacity-50">
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Scan Sources
          </button>
          <button onClick={() => setShowQueue(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Download className="w-4 h-4" /> Queue Import</button>
        </div>
      </div>

      <div className="space-y-2">
        {jobs.map(job => (
          <div key={job.id} className="glass-panel p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{job.work_title}</p>
                  <span className={`px-2 py-0.5 rounded text-xs ${job.status === 'Completed' ? 'bg-berna-emerald/20 text-berna-emerald' : job.status === 'Running' ? 'bg-primary/20 text-primary' : job.status === 'Failed' ? 'bg-red-500/20 text-red-400' : job.status === 'Paused' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>{job.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{job.tradition} · {job.import_method} · {job.collection}</p>
                {job.status === 'Running' && job.progress_percent > 0 && (
                  <div className="mt-2 h-1.5 rounded-full bg-secondary/30 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress_percent}%` }} />
                  </div>
                )}
                {job.admin_notes?.includes('Auto-created') && <p className="text-xs text-primary/70 mt-0.5 flex items-center gap-1"><Bot className="w-3 h-3" /> Auto-created — awaiting your approval</p>}
                {job.records_imported > 0 && <p className="text-xs text-muted-foreground mt-1">{job.records_imported} / {job.total_records_expected || '?'} records imported</p>}
                {job.error_log && <p className="text-xs text-red-400 mt-1">{job.error_log}</p>}
                {executing === job.id && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Importing data...</p>}
              </div>
              <div className="flex items-center gap-1">
                {job.status === 'Queued' && (
                  <button onClick={() => handleApproveAndRun(job.id)} disabled={executing === job.id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-berna-emerald/20 text-berna-emerald text-xs hover:bg-berna-emerald/30 disabled:opacity-50" title="Approve & Run">
                    {executing === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Run
                  </button>
                )}
                {job.status === 'Running' && <button onClick={() => handleAction(job, 'pause')} className="p-1.5 rounded hover:bg-orange-500/20" title="Pause"><Pause className="w-3.5 h-3.5 text-orange-400" /></button>}
                {job.status === 'Paused' && <button onClick={() => handleAction(job, 'resume')} className="p-1.5 rounded hover:bg-berna-emerald/20" title="Resume"><Play className="w-3.5 h-3.5 text-berna-emerald" /></button>}
                {job.status === 'Failed' && <button onClick={() => handleAction(job, 'retry')} className="p-1.5 rounded hover:bg-primary/20" title="Retry"><RotateCcw className="w-3.5 h-3.5 text-primary" /></button>}
                {(job.status === 'Queued' || job.status === 'Paused') && <button onClick={() => handleAction(job, 'cancel')} className="p-1.5 rounded hover:bg-red-500/20" title="Cancel"><XCircle className="w-3.5 h-3.5 text-red-400" /></button>}
              </div>
            </div>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No import jobs yet. Queue an import from an approved seeder-enabled source.</p>}
      </div>

      <div className="glass-panel p-4">
        <h4 className="font-heading font-semibold text-sm mb-2">Seeder-Enabled Sources ({sources.length})</h4>
        <p className="text-xs text-muted-foreground mb-3">Only Approved + Seeder Enabled sources may be used by the Foundation Seeder.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sources.map(s => (
            <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
              <CheckCircle2 className="w-4 h-4 text-berna-emerald shrink-0" />
              <span className="text-sm flex-1 truncate">{s.source_name}</span>
              <span className="text-xs text-muted-foreground">{s.source_type}</span>
            </div>
          ))}
        </div>
      </div>

      {showQueue && <QueueImportModal sources={sources} parsers={parsers} onClose={() => setShowQueue(false)} onSaved={() => { setShowQueue(false); load(); }} />}
    </div>
  );
}

function QueueImportModal({ sources, parsers, onClose, onSaved }) {
  const [form, setForm] = useState({ source_id: '', work_title: '', tradition: '', collection: '', parser_id: '', import_method: 'API Fetch', total_records_expected: 0 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.source_id || !form.work_title) return;
    setSaving(true);
    try { await base44.entities.SMCImportJob.create({ ...form, status: 'Queued', progress_percent: 0, records_imported: 0, validation_status: 'Pending', duplicate_check_status: 'Not Checked', rollback_available: true }); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Queue Import Job</h3>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.source_id} onChange={e => setForm({ ...form, source_id: e.target.value })}>
          <option value="">— Select Source —</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.source_name}</option>)}
        </select>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Work Title *" value={form.work_title} onChange={e => setForm({ ...form, work_title: e.target.value })} />
        <div className="flex gap-2">
          <input className="flex-1 glass-panel px-3 py-2 text-sm" placeholder="Tradition" value={form.tradition} onChange={e => setForm({ ...form, tradition: e.target.value })} />
          <input className="flex-1 glass-panel px-3 py-2 text-sm" placeholder="Collection" value={form.collection} onChange={e => setForm({ ...form, collection: e.target.value })} />
        </div>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.parser_id} onChange={e => setForm({ ...form, parser_id: e.target.value })}>
          <option value="">— Select Parser —</option>
          {parsers.map(p => <option key={p.id} value={p.id}>{p.parser_name} ({p.parser_type})</option>)}
        </select>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.import_method} onChange={e => setForm({ ...form, import_method: e.target.value })}>
          {['API Fetch', 'Bulk Download', 'Manual Upload', 'OAI-PMH', 'IIIF', 'RSS', 'GitHub Clone'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.source_id || !form.work_title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Queue'}</button>
        </div>
      </div>
    </div>
  );
}