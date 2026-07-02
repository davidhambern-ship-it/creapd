import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Plus, FileCode, CheckCircle2, XCircle, TrendingUp, Clock } from 'lucide-react';
import { PARSER_TYPES } from '@/lib/smcConstants';

export default function SMCParserRegistry() {
  const [parsers, setParsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    try { const data = await base44.entities.SMCParser.list('-created_date', 100); setParsers(data || []); }
    catch (err) { console.error('Parser load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const active = parsers.filter(p => p.status === 'Active');
  const beta = parsers.filter(p => p.status === 'Beta' || p.status === 'Experimental');
  const deprecated = parsers.filter(p => p.status === 'Deprecated' || p.status === 'Retired');
  const totalParses = parsers.reduce((sum, p) => sum + (p.total_parses || 0), 0);
  const totalFailures = parsers.reduce((sum, p) => sum + (p.failed_parses || 0), 0);
  const overallSuccessRate = totalParses > 0 ? Math.round(((totalParses - totalFailures) / totalParses) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><FileCode className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{parsers.length}</p><p className="text-xs text-muted-foreground">Total Parsers</p></div>
        <div className="glass-panel p-3"><CheckCircle2 className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{active.length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        <div className="glass-panel p-3"><TrendingUp className="w-5 h-5 text-accent mb-1" /><p className="text-xl font-bold">{overallSuccessRate}%</p><p className="text-xs text-muted-foreground">Success Rate</p></div>
        <div className="glass-panel p-3"><Clock className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{parsers.filter(p => p.average_runtime_ms > 0).length}</p><p className="text-xs text-muted-foreground">With Metrics</p></div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">Parser Registry</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus className="w-4 h-4" /> Register Parser</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parsers.map(p => (
          <div key={p.id} className="glass-panel p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{p.parser_name}</p>
                <p className="text-xs text-muted-foreground">{p.parser_type} · v{p.version}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'Active' ? 'bg-berna-emerald/20 text-berna-emerald' : p.status === 'Beta' || p.status === 'Experimental' ? 'bg-amber-500/20 text-amber-400' : 'bg-muted/30 text-muted-foreground'}`}>{p.status}</span>
            </div>
            {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Success:</span> <span className={`font-mono ${p.success_rate >= 80 ? 'text-berna-emerald' : 'text-amber-400'}`}>{p.success_rate}%</span></div>
              <div><span className="text-muted-foreground">Parses:</span> <span className="font-mono">{p.total_parses}</span></div>
              <div><span className="text-muted-foreground">Avg Time:</span> <span className="font-mono">{p.average_runtime_ms}ms</span></div>
            </div>
            {p.failed_parses > 0 && <p className="text-xs text-red-400">{p.failed_parses} failed parses</p>}
            {p.maintainer && <p className="text-xs text-muted-foreground">Maintainer: {p.maintainer}</p>}
          </div>
        ))}
        {parsers.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm col-span-2">No parsers registered yet. Register parsers to enable automated imports.</p>}
      </div>

      {showAdd && <AddParserModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddParserModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ parser_name: '', parser_type: 'JSON Parser', version: '1.0.0', status: 'Active', description: '', maintainer: '', supported_formats: '["JSON"]' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.parser_name) return;
    setSaving(true);
    try { await base44.entities.SMCParser.create({ ...form, success_rate: 0, total_parses: 0, failed_parses: 0, average_runtime_ms: 0 }); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Register Parser</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Parser Name *" value={form.parser_name} onChange={e => setForm({ ...form, parser_name: e.target.value })} />
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.parser_type} onChange={e => setForm({ ...form, parser_type: e.target.value })}>
          {PARSER_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="flex-1 glass-panel px-3 py-2 text-sm" placeholder="Version" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
          <select className="flex-1 glass-panel px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {['Active', 'Beta', 'Experimental', 'Deprecated', 'Retired'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Maintainer" value={form.maintainer} onChange={e => setForm({ ...form, maintainer: e.target.value })} />
        <textarea className="w-full glass-panel px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder='Supported Formats (JSON array, e.g. ["JSON","XML"])' value={form.supported_formats} onChange={e => setForm({ ...form, supported_formats: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.parser_name} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register'}</button>
        </div>
      </div>
    </div>
  );
}