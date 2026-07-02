import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Play, Plus, CheckCircle2, XCircle, FlaskConical, Trash2, Clock } from 'lucide-react';
import { DISCOVERY_METHODS, RECOMMENDED_USES } from '@/lib/smcConstants';

export default function SMCDiscovery({ onSourcesChanged }) {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    try {
      const [j, c] = await Promise.all([
        base44.entities.SMCDiscoveryJob.list('-created_date', 50),
        base44.entities.SMCCandidateSource.list('-created_date', 50),
      ]);
      setJobs(j || []); setCandidates(c || []);
    } catch (err) { console.error('Discovery load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRun = async (jobId) => {
    setRunning(jobId);
    try { await base44.functions.invoke('runSMCDiscovery', { job_id: jobId }); await load(); }
    catch (err) { console.error('Discovery run error:', err); }
    finally { setRunning(null); }
  };

  const handleApproveCandidate = async (candidate) => {
    try {
      const source = await base44.entities.SMCSource.create({
        source_name: candidate.source_name, provider_name: candidate.provider_name,
        provider_type: candidate.provider_type, source_type: candidate.source_type,
        website: candidate.website, documentation_url: candidate.documentation_url,
        api_base_url: candidate.api_base_url, api_key_required: candidate.api_key_required,
        authentication_type: candidate.authentication_required ? 'API Key' : 'Anonymous',
        trust_score: candidate.trust_score, confidence_score: candidate.confidence_score,
        license_status: candidate.license_summary || 'Unknown', approval_status: 'Under Review',
        recommended_use: candidate.recommended_use, evidence_links: candidate.evidence_links,
        discovery_method: candidate.discovery_method, health_status: 'Unknown',
      });
      await base44.entities.SMCCandidateSource.update(candidate.id, { review_status: 'Approved', converted_to_source_id: source.id });
      if (onSourcesChanged) onSourcesChanged();
      load();
    } catch (err) { console.error('Approve candidate error:', err); }
  };

  const handleRejectCandidate = async (candidate) => {
    try { await base44.entities.SMCCandidateSource.update(candidate.id, { review_status: 'Rejected' }); load(); }
    catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const pendingReview = candidates.filter(c => c.review_status === 'New' || c.review_status === 'Under Review');
  const approved = candidates.filter(c => c.review_status === 'Approved');
  const rejected = candidates.filter(c => c.review_status === 'Rejected');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><p className="text-2xl font-bold">{jobs.length}</p><p className="text-xs text-muted-foreground">Discovery Jobs</p></div>
        <div className="glass-panel p-3"><p className="text-2xl font-bold text-amber-400">{pendingReview.length}</p><p className="text-xs text-muted-foreground">Pending Review</p></div>
        <div className="glass-panel p-3"><p className="text-2xl font-bold text-berna-emerald">{approved.length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        <div className="glass-panel p-3"><p className="text-2xl font-bold text-red-400">{rejected.length}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Discovery Jobs</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus className="w-4 h-4" /> New Job</button>
      </div>

      <div className="space-y-2">
        {jobs.map(job => (
          <div key={job.id} className="glass-panel p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{job.job_name}</p>
                <span className={`px-2 py-0.5 rounded text-xs ${job.status === 'Running' ? 'bg-primary/20 text-primary' : job.status === 'Completed' ? 'bg-berna-emerald/20 text-berna-emerald' : job.status === 'Failed' ? 'bg-red-500/20 text-red-400' : 'bg-muted/30 text-muted-foreground'}`}>{job.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{job.discovery_type} · {job.frequency} · {job.target_tradition || 'All traditions'}</p>
              {job.last_run && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Last run: {new Date(job.last_run).toLocaleString()}</p>}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{job.results_found || 0}</p>
              <p className="text-xs text-muted-foreground">Found</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{job.candidates_created || 0}</p>
              <p className="text-xs text-muted-foreground">Candidates</p>
            </div>
            <button onClick={() => handleRun(job.id)} disabled={running === job.id} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/20 text-primary text-sm hover:bg-primary/30 disabled:opacity-50">
              {running === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run
            </button>
          </div>
        ))}
        {jobs.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No discovery jobs yet. Create one to start finding sources.</p>}
      </div>

      <h3 className="font-heading font-semibold pt-2">Candidate Sources — Review Queue</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pendingReview.map(c => (
          <div key={c.id} className="glass-panel p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{c.source_name}</p>
                <p className="text-xs text-muted-foreground">{c.provider_name} · {c.provider_type}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">{c.review_status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Trust:</span> <span className="font-mono text-berna-emerald">{c.trust_score}</span></div>
              <div><span className="text-muted-foreground">Confidence:</span> <span className="font-mono text-accent">{c.confidence_score}</span></div>
              <div><span className="text-muted-foreground">API Key:</span> {c.api_key_required ? 'Yes' : 'No'}</div>
              <div><span className="text-muted-foreground">Method:</span> {c.discovery_method}</div>
            </div>
            {c.license_summary && <p className="text-xs text-muted-foreground">License: {c.license_summary}</p>}
            <p className="text-xs text-muted-foreground">Recommended: {c.recommended_use}</p>
            {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block">Visit Website →</a>}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => handleApproveCandidate(c)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-berna-emerald/20 text-berna-emerald text-xs hover:bg-berna-emerald/30"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
              <button onClick={() => handleRejectCandidate(c)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"><XCircle className="w-3.5 h-3.5" /> Reject</button>
            </div>
          </div>
        ))}
        {pendingReview.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No candidates pending review.</p>}
      </div>

      {showAdd && <AddDiscoveryJobModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddDiscoveryJobModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ job_name: '', discovery_type: 'API Search', query: '', target_tradition: '', frequency: 'On Demand', auto_approve: false, min_trust_threshold: 80, min_confidence_threshold: 80 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.job_name) return;
    setSaving(true);
    try { await base44.entities.SMCDiscoveryJob.create({ ...form, status: 'Idle', is_active: true }); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">New Discovery Job</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Job Name *" value={form.job_name} onChange={e => setForm({ ...form, job_name: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Search Query" value={form.query} onChange={e => setForm({ ...form, query: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Target Tradition (optional)" value={form.target_tradition} onChange={e => setForm({ ...form, target_tradition: e.target.value })} />
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
          {['On Demand', 'Daily', 'Weekly', 'Biweekly', 'Monthly', 'Quarterly'].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.auto_approve} onChange={e => setForm({ ...form, auto_approve: e.target.checked })} /> Auto-approve high-confidence candidates</label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.job_name} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}