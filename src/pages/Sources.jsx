import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RefreshCw, Search, Loader2, AlertCircle, CheckCircle, X,
  Globe, Landmark, TrendingUp, Cpu, FlaskConical, Wheat, MapPin,
  Youtube, Store, Megaphone, Rss, FileInput, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import SourceLayerSection from '@/components/sources/SourceLayerSection';

const SOURCE_LAYERS = [
  { value: 'major_news', label: 'Layer 1 — Major News', icon: Globe, desc: 'National & international news organizations' },
  { value: 'government', label: 'Layer 2 — Government', icon: Landmark, desc: 'Official government sources' },
  { value: 'business_finance', label: 'Layer 3 — Business & Finance', icon: TrendingUp, desc: 'Economic, financial & business news' },
  { value: 'technology', label: 'Layer 4 — Technology', icon: Cpu, desc: 'Tech & AI news' },
  { value: 'science', label: 'Layer 5 — Science', icon: FlaskConical, desc: 'Scientific discoveries & research' },
  { value: 'agriculture', label: 'Layer 6 — Agriculture', icon: Wheat, desc: 'Agricultural & food production' },
  { value: 'local_news', label: 'Layer 7 — Local News', icon: MapPin, desc: 'Location-aware story collection' },
  { value: 'creator_economy', label: 'Layer 8 — Creator Economy', icon: Youtube, desc: 'Creators & digital entrepreneurs' },
  { value: 'small_business', label: 'Layer 9 — Small Business', icon: Store, desc: 'Entrepreneurship & small business' },
  { value: 'press_releases', label: 'Layer 10 — Press Releases', icon: Megaphone, desc: 'Official press release services' },
  { value: 'custom', label: 'Layer 11 — Custom Sources', icon: Rss, desc: 'Your custom source library' },
  { value: 'manual_import', label: 'Layer 12 — Manual Import', icon: FileInput, desc: 'Paste any URL to import' },
];

const sourceTypes = [
  { value: 'major_news', label: 'Major News' },
  { value: 'wire_service', label: 'Wire Service' },
  { value: 'government', label: 'Government' },
  { value: 'state_government', label: 'State Government' },
  { value: 'business_finance', label: 'Business & Finance' },
  { value: 'technology', label: 'Technology' },
  { value: 'small_business', label: 'Small Business' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'local_news', label: 'Local News' },
  { value: 'creator_economy', label: 'Creator Economy' },
  { value: 'science_research', label: 'Science/Research' },
  { value: 'agriculture_food', label: 'Agriculture/Food' },
  { value: 'company_newsroom', label: 'Company Newsroom' },
  { value: 'university_research', label: 'University/Research' },
  { value: 'fact_checking', label: 'Fact-Checking' },
  { value: 'custom', label: 'Custom' },
];

const emptySource = { name: '', source_type: 'major_news', source_layer: 'major_news', url: '', feed_url: '', category: '', trust_rating: 4, enabled: true, notes: '', paywall: false };

export default function Sources() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySource);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);

  useEffect(() => { loadSources(); }, []);

  const loadSources = () => {
    setLoading(true);
    base44.entities.Source.filter({}, 'name', 200)
      .then(setSources)
      .finally(() => setLoading(false));
  };

  const groupedByLayer = useMemo(() => {
    const filtered = search
      ? sources.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
      : sources;
    const groups = {};
    SOURCE_LAYERS.forEach(l => { groups[l.value] = []; });
    filtered.forEach(s => {
      const layer = s.source_layer || 'major_news';
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(s);
    });
    return groups;
  }, [sources, search]);

  const openAdd = () => { setEditing(null); setForm(emptySource); setDialogOpen(true); };
  const openEdit = (source) => { setEditing(source); setForm({ ...source }); setDialogOpen(true); };

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

  const handleFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await base44.functions.invoke('fetchStories', {});
      setFetchResult(res.data);
    } catch (e) {
      setFetchResult({ error: e.response?.data?.error || e.message });
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Story Source Engine</h1>
          <p className="text-xs text-muted-foreground mt-1">12-layer aggregation engine — manage where Producer pulls stories from</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/import')} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <FileInput className="w-3 h-3 mr-1" />Import URL
          </Button>
          <Button size="sm" onClick={handleFetch} disabled={fetching} className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs">
            {fetching ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Fetching...</> : <><RefreshCw className="w-3 h-3 mr-1" />Fetch Stories</>}
          </Button>
          <Button size="sm" onClick={openAdd} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            <Plus className="w-3 h-3 mr-1" />Add Source
          </Button>
        </div>
      </div>

      {fetchResult && (
        <div className={`glass-panel p-3 flex items-start gap-2 ${fetchResult.error ? 'border-red-500/20' : 'border-berna-emerald/20'}`}>
          {fetchResult.error ? <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-berna-emerald mt-0.5" />}
          <div className="flex-1 text-xs">
            {fetchResult.error ? (
              <p className="text-red-400">{fetchResult.error}</p>
            ) : (
              <p className="text-white/80">
                Checked <span className="text-berna-purple font-mono">{fetchResult.sources_checked}</span> sources ·
                Created <span className="text-berna-emerald font-mono">{fetchResult.articles_created}</span> new stories ·
                Removed <span className="text-berna-orange font-mono">{fetchResult.duplicates_removed}</span> duplicates
                {fetchResult.errors && <span className="text-yellow-400 block mt-1">Partial errors: {fetchResult.errors}</span>}
              </p>
            )}
          </div>
          <button onClick={() => setFetchResult(null)} className="text-muted-foreground hover:text-white"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search sources..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
      </div>

      <div className="space-y-4">
        {SOURCE_LAYERS.map(layer => (
          <SourceLayerSection
            key={layer.value}
            layer={layer}
            sources={groupedByLayer[layer.value] || []}
            onToggle={toggleEnabled}
            onEdit={openEdit}
            onDelete={deleteSource}
          />
        ))}
      </div>

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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Source Layer</label>
                <Select value={form.source_layer} onValueChange={v => setForm(p => ({ ...p, source_layer: v }))}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {SOURCE_LAYERS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <Select value={form.source_type} onValueChange={v => setForm(p => ({ ...p, source_type: v }))}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
                    {sourceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" placeholder="https://" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Feed URL (RSS/Atom)</label>
              <Input value={form.feed_url} onChange={e => setForm(p => ({ ...p, feed_url: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" placeholder="https://example.com/rss.xml" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Credibility Rating (1-5)</label>
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