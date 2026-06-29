import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Plus, Star, Trash2, Pencil, Search, Upload, Loader2, X, Check,
  ImageIcon, FileText, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import SortDropdown from '@/components/shared/SortDropdown';
import { logActivity } from '@/lib/activityUtils';

const CATEGORIES = [
  { value: 'story_cards', label: 'Story Cards' },
  { value: 'lower_thirds', label: 'Lower Thirds' },
  { value: 'headline_graphics', label: 'Headline Graphics' },
  { value: 'breaking_news_graphics', label: 'Breaking News Graphics' },
  { value: 'sponsor_graphics', label: 'Sponsor Graphics' },
  { value: 'fullscreen_graphics', label: 'Fullscreen Graphics' },
  { value: 'social_media_graphics', label: 'Social Media Graphics' },
  { value: 'video_end_cards', label: 'Video End Cards' },
  { value: 'opening_graphics', label: 'Opening Graphics' },
  { value: 'closing_graphics', label: 'Closing Graphics' },
  { value: 'quote_cards', label: 'Quote Cards' },
  { value: 'statistics_graphics', label: 'Statistics Graphics' },
  { value: 'infographics', label: 'Infographics' },
  { value: 'advertisement_graphics', label: 'Advertisement Graphics' },
  { value: 'promotional_graphics', label: 'Promotional Graphics' },
  { value: 'custom', label: 'Custom' },
];

const STANDARD_PLACEHOLDERS = [
  '{{HEADLINE}}', '{{SUBHEAD}}', '{{BODY}}', '{{HOST}}', '{{SOURCE}}',
  '{{DATE}}', '{{TIME}}', '{{LOCATION}}', '{{QUOTE}}', '{{LOGO}}',
  '{{WEBSITE}}', '{{SOCIAL}}', '{{HASHTAGS}}'
];

const FORMATS = ['png', 'svg', 'jpeg', 'jpg', 'pdf', 'other'];

export default function ProductionTemplates() {
  const [templates, setTemplates] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('prodTemplateSort') || 'newest');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [tpls, brnds, shws] = await Promise.all([
        base44.entities.ProductionTemplate.list('-created_date', 100),
        base44.entities.BrandProfile.list('-created_date', 50),
        base44.entities.ShowProfile.list('-created_date', 50),
      ]);
      setTemplates(tpls);
      setBrands(brnds);
      setShows(shws);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sortedTemplates = (() => {
    let result = templates.filter(t => {
      if (search && !t.name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterBrand !== 'all' && t.brand_profile_id !== filterBrand) return false;
      return true;
    });
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'favorites': return result.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
      case 'category': return result.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  })();

  const handleDelete = async (tpl) => {
    if (!confirm(`Delete "${tpl.name}"?`)) return;
    try {
      await base44.entities.ProductionTemplate.delete(tpl.id);
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      logActivity('delete', { entity_type: 'ProductionTemplate', entity_id: tpl.id, entity_name: tpl.name });
      toast({ title: 'Template deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const toggleFavorite = async (tpl) => {
    try {
      const updated = await base44.entities.ProductionTemplate.update(tpl.id, { is_favorite: !tpl.is_favorite });
      setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t));
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async (data) => {
    if (editing) {
      const updated = await base44.entities.ProductionTemplate.update(editing.id, data);
      setTemplates(prev => prev.map(t => t.id === editing.id ? updated : t));
      logActivity('update', { entity_type: 'ProductionTemplate', entity_id: editing.id, entity_name: data.name });
    } else {
      const created = await base44.entities.ProductionTemplate.create(data);
      setTemplates(prev => [created, ...prev]);
      logActivity('create', { entity_type: 'ProductionTemplate', entity_id: created.id, entity_name: data.name });
    }
    setEditorOpen(false);
    setEditing(null);
    toast({ title: 'Template saved' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Graphics Templates</h1>
          <p className="text-xs text-muted-foreground mt-1">Upload and manage reusable production graphics — lower thirds, headline graphics, sponsor graphics, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown value={sortBy} onChange={setSortBy} storageKey="prodTemplateSort" options={[
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
            { value: 'alphabetical', label: 'Alphabetical' },
            { value: 'category', label: 'By Category' },
            { value: 'favorites', label: 'Favorites First' },
          ]} />
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Plus className="w-3 h-3 mr-1" />Upload Template
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9 w-full sm:w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all" className="text-xs">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9 w-full sm:w-40"><SelectValue placeholder="All Brands" /></SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all" className="text-xs">All Brands</SelectItem>
            {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.brand_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedTemplates.map(tpl => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            brands={brands}
            onEdit={() => { setEditing(tpl); setEditorOpen(true); }}
            onDelete={() => handleDelete(tpl)}
            onToggleFavorite={() => toggleFavorite(tpl)}
          />
        ))}
      </div>

      {sortedTemplates.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">No Templates Yet</h2>
          <p className="text-xs text-muted-foreground mb-4">Upload your first production graphic template — lower thirds, headline graphics, sponsor graphics, and more.</p>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Upload className="w-3 h-3 mr-1" />Upload Your First Template
          </Button>
        </div>
      )}

      {editorOpen && (
        <TemplateUploadModal
          template={editing}
          brands={brands}
          shows={shows}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, brands, onEdit, onDelete, onToggleFavorite }) {
  const cat = CATEGORIES.find(c => c.value === template.category);
  const brand = brands.find(b => b.id === template.brand_profile_id);
  const placeholders = template.placeholders ? (() => {
    try { return JSON.parse(template.placeholders); } catch { return []; }
  })() : [];
  const isImage = ['png', 'svg', 'jpeg', 'jpg'].includes(template.file_format);

  return (
    <div className="glass-panel overflow-hidden hover:border-white/[0.12] transition-all flex flex-col">
      {/* Thumbnail preview */}
      <div className="aspect-video bg-black/30 flex items-center justify-center border-b border-white/[0.04] relative">
        {template.file_url && isImage ? (
          <img src={template.file_url} alt={template.name} className="w-full h-full object-contain" />
        ) : template.file_url ? (
          <FileText className="w-8 h-8 text-muted-foreground" />
        ) : (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        )}
        <button
          onClick={onToggleFavorite}
          className="absolute top-2 right-2 p-1 rounded-md bg-black/40 backdrop-blur-sm hover:bg-black/60"
        >
          <Star className={`w-3.5 h-3.5 ${template.is_favorite ? 'text-berna-orange fill-berna-orange' : 'text-white/60'}`} />
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2">{template.name}</h3>
        </div>
        <span className="inline-block text-[9px] uppercase tracking-wider text-berna-orange font-semibold px-1.5 py-0.5 rounded-full bg-berna-orange/10 border border-berna-orange/20 mb-2 w-fit">
          {cat?.label || template.category}
        </span>
        {template.description && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-2">{template.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mb-2">
          {placeholders.slice(0, 4).map(p => (
            <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-berna-purple/10 text-berna-purple border border-berna-purple/20">{p}</span>
          ))}
          {placeholders.length > 4 && <span className="text-[9px] text-muted-foreground">+{placeholders.length - 4}</span>}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground mb-2">
          <span className="uppercase">{template.file_format}</span>
          {brand && <><span>·</span><span>{brand.brand_name}</span></>}
        </div>
        <div className="flex gap-1 pt-2 border-t border-white/[0.04] mt-auto">
          <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-white flex-1" onClick={onEdit}>
            <Pencil className="w-3 h-3 mr-1" />Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 text-red-400 hover:bg-red-500/10" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TemplateUploadModal({ template, brands, shows, onClose, onSave }) {
  const [form, setForm] = useState(template || {
    name: '',
    description: '',
    category: 'custom',
    file_url: '',
    file_format: 'png',
    placeholders: '[]',
    brand_profile_id: '',
    show_profile_id: '',
    assignment_level: 'organization_default',
    tags: '',
    is_favorite: false,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const formatMap = { png: 'png', svg: 'svg', jpg: 'jpeg', jpeg: 'jpeg', pdf: 'pdf' };
      const format = formatMap[ext] || 'other';
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url || result?.data?.file_url;
      if (!url) throw new Error('Upload failed');
      set('file_url', url);
      set('file_format', format);
      if (!form.name) set('name', file.name.replace(/\.[^/.]+$/, ''));
      toast({ title: 'File uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const togglePlaceholder = (ph) => {
    let arr = [];
    try { arr = JSON.parse(form.placeholders || '[]'); } catch {}
    const next = arr.includes(ph) ? arr.filter(x => x !== ph) : [...arr, ph];
    set('placeholders', JSON.stringify(next));
  };

  const selectedPlaceholders = (() => {
    try { return JSON.parse(form.placeholders || '[]'); } catch { return []; }
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel-navy w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">{template ? 'Edit Template' : 'Upload Template'}</h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          {/* File upload */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Template File</Label>
            {form.file_url ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
                {['png', 'svg', 'jpeg', 'jpg'].includes(form.file_format) ? (
                  <img src={form.file_url} alt="preview" className="w-16 h-16 rounded object-cover border border-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded bg-white/[0.04] flex items-center justify-center border border-white/10">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{form.file_url}</p>
                  <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{form.file_format}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-white" onClick={() => document.getElementById('template-file-input').click()}>
                  Replace
                </Button>
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-white/[0.1] hover:border-berna-purple/40 hover:bg-berna-purple/[0.03] cursor-pointer transition-all"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('template-file-input').click()}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-berna-purple animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click or drag to upload (PNG, SVG, JPEG, PDF)'}
                </span>
                <input
                  id="template-file-input"
                  type="file"
                  accept="image/*,.pdf,.svg"
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files[0])}
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Template Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Morning News Lower Third" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes about this template..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs min-h-16" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Placeholders ({selectedPlaceholders.length} selected)</Label>
            <p className="text-[10px] text-muted-foreground mb-2">Select the placeholder fields this template contains. Producer will populate these without altering your design.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 p-2 rounded-lg bg-white/[0.02]">
              {STANDARD_PLACEHOLDERS.map(ph => {
                const checked = selectedPlaceholders.includes(ph);
                return (
                  <label key={ph} className="flex items-center gap-1.5 p-1 rounded cursor-pointer hover:bg-white/[0.04]">
                    <input type="checkbox" checked={checked} onChange={() => togglePlaceholder(ph)} className="w-3 h-3 rounded accent-berna-purple" />
                    <span className="text-[10px] font-mono text-white/70">{ph}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Assignment Level</Label>
              <Select value={form.assignment_level} onValueChange={v => set('assignment_level', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="organization_default" className="text-xs">Org Default</SelectItem>
                  <SelectItem value="brand_default" className="text-xs">Brand Default</SelectItem>
                  <SelectItem value="show_default" className="text-xs">Show Default</SelectItem>
                  <SelectItem value="production_default" className="text-xs">Production Default</SelectItem>
                  <SelectItem value="story_specific" className="text-xs">Story Specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Brand Association</Label>
              <Select value={form.brand_profile_id || 'none'} onValueChange={v => set('brand_profile_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.brand_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Show Association</Label>
              <Select value={form.show_profile_id || 'none'} onValueChange={v => set('show_profile_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                  {shows.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.show_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. elections, sponsor, breaking" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/[0.06]">
          <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={handleSave} disabled={saving || !form.name || !form.file_url}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
            {template ? 'Save Changes' : 'Upload Template'}
          </Button>
        </div>
      </div>
    </div>
  );
}