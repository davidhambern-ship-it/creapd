import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, Eye, CheckCircle2, XCircle, Pause, Play, ExternalLink, KeyRound, FlaskConical, Filter } from 'lucide-react';
import { APPROVAL_STATUSES, HEALTH_STATUSES, PROVIDER_TYPES, SOURCE_TYPES, APPROVAL_STATUS_COLORS, HEALTH_STATUS_COLORS } from '@/lib/smcConstants';

export default function SMCSourceRegistry({ sources, onRefresh, onSelect }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHealth, setFilterHealth] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState(null);

  const filtered = useMemo(() => {
    return sources.filter(s => {
      if (filterStatus && s.approval_status !== filterStatus) return false;
      if (filterHealth && s.health_status !== filterHealth) return false;
      if (search && !`${s.source_name} ${s.provider_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [sources, filterStatus, filterHealth, search]);

  const handleQuickAction = async (source, action) => {
    try {
      if (action === 'approve') {
        await base44.entities.SMCSource.update(source.id, { approval_status: 'Approved', is_approved: true, seeder_enabled: source.seeder_compatible, cae_enabled: source.cae_compatible });
      } else if (action === 'reject') {
        await base44.entities.SMCSource.update(source.id, { approval_status: 'Rejected', is_approved: false });
      } else if (action === 'pause') {
        await base44.entities.SMCSource.update(source.id, { approval_status: 'Paused', seeder_enabled: false, cae_enabled: false });
      } else if (action === 'resume') {
        await base44.entities.SMCSource.update(source.id, { approval_status: 'Approved', is_approved: true });
      } else if (action === 'seeder') {
        await base44.entities.SMCSource.update(source.id, { seeder_enabled: !source.seeder_enabled });
      } else if (action === 'cae') {
        await base44.entities.SMCSource.update(source.id, { cae_enabled: !source.cae_enabled });
      } else if (action === 'test') {
        setTesting(source.id);
        await base44.functions.invoke('testSMCConnection', { source_id: source.id });
      }
      onRefresh();
    } catch (err) { console.error('Quick action error:', err); }
    finally { setTesting(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 glass-panel px-3 py-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sources..." className="bg-transparent text-sm flex-1 focus:outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
          <option value="">All Statuses</option>
          {APPROVAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
          <option value="">All Health</option>
          {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Source
        </button>
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left p-3 font-medium">Source Name</th>
              <th className="text-left p-3 font-medium">Provider</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Auth</th>
              <th className="text-left p-3 font-medium">License</th>
              <th className="text-left p-3 font-medium">Trust</th>
              <th className="text-left p-3 font-medium">Health</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-center p-3 font-medium">Seeder</th>
              <th className="text-center p-3 font-medium">CAE</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(source => (
              <tr key={source.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                <td className="p-3">
                  <button onClick={() => onSelect(source.id)} className="font-medium text-primary hover:underline text-left">{source.source_name}</button>
                </td>
                <td className="p-3 text-muted-foreground">{source.provider_name || '—'}</td>
                <td className="p-3 text-muted-foreground text-xs">{source.source_type}</td>
                <td className="p-3 text-xs">{source.api_key_required ? <span className="flex items-center gap-1 text-amber-400"><KeyRound className="w-3 h-3" /> Key</span> : source.authentication_type === 'None' ? 'None' : source.authentication_type}</td>
                <td className="p-3 text-xs text-muted-foreground">{source.license_status || 'Unknown'}</td>
                <td className="p-3"><span className={`text-xs font-mono ${source.trust_score >= 70 ? 'text-berna-emerald' : source.trust_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{source.trust_score}</span></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${HEALTH_STATUS_COLORS[source.health_status] || ''}`}>{source.health_status}</span></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${APPROVAL_STATUS_COLORS[source.approval_status] || ''}`}>{source.approval_status}</span></td>
                <td className="p-3 text-center">
                  <button onClick={() => handleQuickAction(source, 'seeder')} className={`px-2 py-0.5 rounded text-xs ${source.seeder_enabled ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-muted/30 text-muted-foreground'}`}>
                    {source.seeder_enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => handleQuickAction(source, 'cae')} className={`px-2 py-0.5 rounded text-xs ${source.cae_enabled ? 'bg-accent/20 text-accent' : 'bg-muted/30 text-muted-foreground'}`}>
                    {source.cae_enabled ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onSelect(source.id)} className="p-1 rounded hover:bg-secondary/50" title="View"><Eye className="w-3.5 h-3.5" /></button>
                    {source.approval_status !== 'Approved' && <button onClick={() => handleQuickAction(source, 'approve')} className="p-1 rounded hover:bg-berna-emerald/20" title="Approve"><CheckCircle2 className="w-3.5 h-3.5 text-berna-emerald" /></button>}
                    {source.approval_status !== 'Rejected' && <button onClick={() => handleQuickAction(source, 'reject')} className="p-1 rounded hover:bg-red-500/20" title="Reject"><XCircle className="w-3.5 h-3.5 text-red-400" /></button>}
                    {source.approval_status === 'Approved' && <button onClick={() => handleQuickAction(source, 'pause')} className="p-1 rounded hover:bg-orange-500/20" title="Pause"><Pause className="w-3.5 h-3.5 text-orange-400" /></button>}
                    {source.approval_status === 'Paused' && <button onClick={() => handleQuickAction(source, 'resume')} className="p-1 rounded hover:bg-berna-emerald/20" title="Resume"><Play className="w-3.5 h-3.5 text-berna-emerald" /></button>}
                    <button onClick={() => handleQuickAction(source, 'test')} disabled={testing === source.id} className="p-1 rounded hover:bg-primary/20" title="Test Connection">
                      {testing === source.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5 text-primary" />}
                    </button>
                    {source.documentation_url && <a href={source.documentation_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-secondary/50" title="Docs"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">No sources found. Add one or run a discovery job.</div>}
      </div>

      {showAdd && <AddSourceModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); onRefresh(); }} />}
    </div>
  );
}

function AddSourceModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ source_name: '', provider_name: '', provider_type: 'Unknown', source_type: 'Unknown', website: '', documentation_url: '', api_base_url: '', api_key_required: false, license_status: 'Unknown', authentication_type: 'None' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.source_name) return;
    setSaving(true);
    try {
      await base44.entities.SMCSource.create({ ...form, approval_status: 'Discovered', health_status: 'Unknown' });
      onSaved();
    } catch (err) { console.error('Create source error:', err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-lg w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Add Source Manually</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Source Name *" value={form.source_name} onChange={e => setForm({ ...form, source_name: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Provider Name" value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })} />
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.provider_type} onChange={e => setForm({ ...form, provider_type: e.target.value })}>
          {PROVIDER_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })}>
          {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Website URL" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Documentation URL" value={form.documentation_url} onChange={e => setForm({ ...form, documentation_url: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="API Base URL" value={form.api_base_url} onChange={e => setForm({ ...form, api_base_url: e.target.value })} />
        <div className="flex gap-2">
          <select className="flex-1 glass-panel px-3 py-2 text-sm" value={form.authentication_type} onChange={e => setForm({ ...form, authentication_type: e.target.value })}>
            {['None', 'API Key', 'OAuth 2.0', 'Bearer Token', 'Basic Auth', 'Client ID/Secret', 'Anonymous'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="flex-1 glass-panel px-3 py-2 text-sm" value={form.license_status} onChange={e => setForm({ ...form, license_status: e.target.value })}>
            {['Unknown', 'Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution', 'Personal License', 'Commercial License', 'Subscription Required', 'Institutional License', 'Negotiation Required'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.api_key_required} onChange={e => setForm({ ...form, api_key_required: e.target.checked })} /> API Key Required
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.source_name} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}