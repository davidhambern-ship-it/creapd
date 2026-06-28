import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Edit, ToggleLeft, ToggleRight, RefreshCw, Globe,
  Star, Shield, AlertCircle, Trash2, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const sourceTypes = [
  { value: 'major_news', label: 'Major News' },
  { value: 'wire_service', label: 'Wire Service' },
  { value: 'government', label: 'Government' },
  { value: 'state_government', label: 'State Government' },
  { value: 'local_business', label: 'Local Business' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'labor_workforce', label: 'Labor/Workforce' },
  { value: 'ai_technology', label: 'AI/Technology' },
  { value: 'agriculture_food', label: 'Agriculture/Food' },
  { value: 'creator_economy', label: 'Creator Economy' },
  { value: 'science_research', label: 'Science/Research' },
  { value: 'fact_checking', label: 'Fact-Checking' },
  { value: 'company_newsroom', label: 'Company Newsroom' },
  { value: 'university_research', label: 'University/Research' },
];

const emptySource = { name: '', source_type: 'major_news', url: '', feed_url: '', category: '', trust_rating: 4, enabled: true, notes: '', paywall: false };

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySource);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = () => {
    setLoading(true);
    base44.entities.Source.filter({}, 'name', 50)
      .then(setSources)
      .finally(() => setLoading(false));
  };

  const openAdd = () => { setEditing(null); setForm(emptySource); setDialogOpen(true); };
  const openEdit = (source) => { setEditing(source); setForm(source); setDialogOpen(true); };

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Source.update(editing.id, form);
      setSources(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
    } else {
      const created = await base44.entities.Source.create(form);
      setSources(prev => [...prev, created]);
    }
    setDialogOpen(false);
  };

  const toggleEnabled = async (source) => {
    await base44.entities.Source.update(source.id, { enabled: !source.enabled });
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, enabled: !s.enabled } : s));
  };

  const deleteSource = async (id) => {
    await base44.entities.Source.delete(id);
    setSources(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sources</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage where Producer pulls stories from</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <RefreshCw className="w-3 h-3 mr-1" />Refresh All
          </Button>
          <Button size="sm" onClick={openAdd} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            <Plus className="w-3 h-3 mr-1" />Add Source
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {sources.map(source => (
          <div key={source.id} className={`glass-panel p-4 transition-all ${source.enabled ? '' : 'opacity-50'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-berna-purple flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-white truncate">{source.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-muted-foreground">
                    {sourceTypes.find(t => t.value === source.source_type)?.label || source.source_type}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Shield key={i} className={`w-3 h-3 ${i <= (source.trust_rating || 0) ? 'text-berna-emerald' : 'text-white/10'}`} />
                    ))}
                  </div>
                  {source.paywall && <span className="text-[10px] text-yellow-400">Paywall</span>}
                </div>
                {source.url && <p className="text-[10px] text-muted-foreground mt-1 truncate">{source.url}</p>}
                {source.last_checked && <p className="text-[10px] text-muted-foreground font-mono mt-1">Last: {new Date(source.last_checked).toLocaleString()}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => toggleEnabled(source)}>
                  {source.enabled ? <ToggleRight className="w-4 h-4 text-berna-emerald" /> : <ToggleLeft className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white" onClick={() => openEdit(source)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => deleteSource(source.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No sources configured yet</p>
          <Button size="sm" onClick={openAdd} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            <Plus className="w-3 h-3 mr-1" />Add Your First Source
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'Edit Source' : 'Add Source'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Source Name</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={form.source_type} onValueChange={v => setForm(p => ({ ...p, source_type: v }))}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {sourceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" placeholder="https://" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Feed URL (RSS/API)</label>
              <Input value={form.feed_url} onChange={e => setForm(p => ({ ...p, feed_url: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Trust Rating (1-5)</label>
              <Input type="number" min={1} max={5} value={form.trust_rating} onChange={e => setForm(p => ({ ...p, trust_rating: parseInt(e.target.value) || 1 }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm w-24" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm min-h-16" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="border-white/10 text-white text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSave} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
                <Check className="w-3 h-3 mr-1" />{editing ? 'Update' : 'Add Source'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}