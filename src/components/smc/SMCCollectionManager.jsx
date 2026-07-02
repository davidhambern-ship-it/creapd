import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, BookMarked, Plus, TrendingUp, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { COLLECTION_CATEGORIES, ROADMAP_STATUSES, ROADMAP_STATUS_COLORS } from '@/lib/smcConstants';

export default function SMCCollectionManager() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  const load = async () => {
    try { const data = await base44.entities.SMCFoundationWork.list('-priority_score', 200); setWorks(data || []); }
    catch (err) { console.error('FCM load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const imported = works.filter(w => w.roadmap_status === 'Imported');
  const missing = works.filter(w => w.roadmap_status === 'Missing');
  const ready = works.filter(w => w.roadmap_status === 'Ready to Seed' || w.roadmap_status === 'Approved');
  const importing = works.filter(w => w.roadmap_status === 'Importing');

  const filtered = filterCategory ? works.filter(w => w.collection_category === filterCategory) : works;

  const traditions = [...new Set(works.map(w => w.tradition).filter(Boolean))];
  const coverageByTradition = traditions.map(t => {
    const total = works.filter(w => w.tradition === t).length;
    const done = works.filter(w => w.tradition === t && w.roadmap_status === 'Imported').length;
    return { tradition: t, total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
  }).sort((a, b) => b.percent - a.percent);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><BookMarked className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{works.length}</p><p className="text-xs text-muted-foreground">Total Works</p></div>
        <div className="glass-panel p-3"><CheckCircle2 className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{imported.length}</p><p className="text-xs text-muted-foreground">Imported</p></div>
        <div className="glass-panel p-3"><AlertTriangle className="w-5 h-5 text-red-400 mb-1" /><p className="text-xl font-bold">{missing.length}</p><p className="text-xs text-muted-foreground">Missing</p></div>
        <div className="glass-panel p-3"><Target className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{ready.length}</p><p className="text-xs text-muted-foreground">Ready to Seed</p></div>
      </div>

      <div className="glass-panel p-4">
        <h3 className="font-heading font-semibold text-sm mb-3">Coverage by Tradition</h3>
        <div className="space-y-2">
          {coverageByTradition.map(c => (
            <div key={c.tradition} className="flex items-center gap-2">
              <span className="text-xs w-24 truncate">{c.tradition}</span>
              <div className="flex-1 h-3 rounded-full bg-secondary/30 overflow-hidden">
                <div className={`h-full rounded-full ${c.percent >= 80 ? 'bg-berna-emerald' : c.percent >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${c.percent}%` }} />
              </div>
              <span className="text-xs font-mono w-12 text-right">{c.percent}%</span>
            </div>
          ))}
          {coverageByTradition.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No works tracked yet.</p>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Foundation Collection Roadmap</h3>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="glass-panel px-2 py-1 text-xs rounded">
            <option value="">All Categories</option>
            {COLLECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm"><Plus className="w-4 h-4" /> Add Work</button>
      </div>

      <div className="space-y-1.5">
        {filtered.sort((a, b) => b.priority_score - a.priority_score).map(w => (
          <div key={w.id} className="glass-panel p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{w.work_title}</p>
                <span className={`px-2 py-0.5 rounded text-xs ${ROADMAP_STATUS_COLORS[w.roadmap_status] || ''}`}>{w.roadmap_status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{w.tradition} · {w.collection_category}</p>
              {w.estimated_import_time_minutes > 0 && <p className="text-xs text-muted-foreground">Est. {w.estimated_import_time_minutes} min import</p>}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{w.priority_score}</p>
              <p className="text-xs text-muted-foreground">Priority</p>
            </div>
            {w.public_domain && <span className="px-2 py-0.5 rounded text-xs bg-berna-emerald/20 text-berna-emerald">Public Domain</span>}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No works in the roadmap yet.</p>}
      </div>

      {showAdd && <AddWorkModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddWorkModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ work_title: '', tradition: '', collection_category: 'Christianity', roadmap_status: 'Missing', priority_score: 50, public_domain: false, estimated_import_time_minutes: 5 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.work_title) return;
    setSaving(true);
    try { await base44.entities.SMCFoundationWork.create(form); onSaved(); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-panel p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold">Add Foundation Work</h3>
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Work Title *" value={form.work_title} onChange={e => setForm({ ...form, work_title: e.target.value })} />
        <input className="w-full glass-panel px-3 py-2 text-sm" placeholder="Tradition" value={form.tradition} onChange={e => setForm({ ...form, tradition: e.target.value })} />
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.collection_category} onChange={e => setForm({ ...form, collection_category: e.target.value })}>
          {COLLECTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="w-full glass-panel px-3 py-2 text-sm" value={form.roadmap_status} onChange={e => setForm({ ...form, roadmap_status: e.target.value })}>
          {ROADMAP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm flex-1">Priority Score (0-100)</label>
          <input type="number" min="0" max="100" className="w-20 glass-panel px-3 py-2 text-sm" value={form.priority_score} onChange={e => setForm({ ...form, priority_score: parseInt(e.target.value) || 0 })} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.public_domain} onChange={e => setForm({ ...form, public_domain: e.target.checked })} /> Public Domain</label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-secondary/50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.work_title} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}</button>
        </div>
      </div>
    </div>
  );
}