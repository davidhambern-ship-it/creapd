import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { LayoutTemplate, Plus, Loader2, Trash2, Power, Copy, Check, X, Edit3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { CATEGORIES, BRIEFING_TYPES, DEFAULT_TEMPLATES, parseJSON, stringifyJSON } from '@/lib/weeklyConstants';
import { logActivity } from '@/lib/activityUtils';
import SortDropdown from '@/components/shared/SortDropdown';

const TONES = ['professional', 'conversational', 'energetic'];

export default function TemplateLibrary() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('templateSort') || 'newest');
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const sortedTemplates = useMemo(() => {
    let result = templates.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()));
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'enabled': return result.sort((a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0));
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  }, [templates, sortBy, search]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      let res = await base44.entities.BriefingTemplate.list('-created_date', 50);
      if (res.length === 0) {
        // Seed defaults
        const created = await base44.entities.BriefingTemplate.bulkCreate(DEFAULT_TEMPLATES);
        res = created;
      }
      setTemplates(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleToggle = async (template) => {
    try {
      const updated = await base44.entities.BriefingTemplate.update(template.id, { enabled: !template.enabled });
      setTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
      logActivity('update', { entity_type: 'BriefingTemplate', entity_id: template.id, entity_name: template.name, details: `${updated.enabled ? 'Enabled' : 'Disabled'} template` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete "${template.name}"?`)) return;
    try {
      await base44.entities.BriefingTemplate.delete(template.id);
      setTemplates(prev => prev.filter(t => t.id !== template.id));
      logActivity('delete', { entity_type: 'BriefingTemplate', entity_id: template.id, entity_name: template.name });
      toast({ title: 'Template deleted' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDuplicate = async (template) => {
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = template;
      const created = await base44.entities.BriefingTemplate.create({
        ...rest,
        name: `${template.name} (Copy)`,
        template_key: 'custom',
      });
      setTemplates(prev => [created, ...prev]);
      logActivity('create', { entity_type: 'BriefingTemplate', entity_id: created.id, entity_name: created.name, details: `Duplicated from "${template.name}"` });
      toast({ title: 'Template duplicated' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async (data) => {
    try {
      if (data.id) {
        const updated = await base44.entities.BriefingTemplate.update(data.id, data);
        setTemplates(prev => prev.map(t => t.id === data.id ? updated : t));
        logActivity('update', { entity_type: 'BriefingTemplate', entity_id: data.id, entity_name: data.name });
      } else {
        const created = await base44.entities.BriefingTemplate.create(data);
        setTemplates(prev => [created, ...prev]);
        logActivity('create', { entity_type: 'BriefingTemplate', entity_id: created.id, entity_name: created.name });
      }
      setShowEditor(false);
      setEditing(null);
      toast({ title: 'Template saved' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Template Library</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage briefing templates — define sections, categories, scoring, and source rules</p>
        </div>
        <div className="flex items-center gap-2">
          <SortDropdown value={sortBy} onChange={setSortBy} storageKey="templateSort" options={[
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
            { value: 'alphabetical', label: 'Alphabetical' },
            { value: 'enabled', label: 'Enabled First' },
          ]} />
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={() => { setEditing(null); setShowEditor(true); }}>
            <Plus className="w-3 h-3 mr-1" />New Template
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedTemplates.map(tpl => {
          const sections = parseJSON(tpl.included_sections, []);
          const cats = parseJSON(tpl.default_categories, []);
          const typeInfo = BRIEFING_TYPES.find(b => b.key === tpl.template_key);
          return (
            <div key={tpl.id} className={`glass-panel p-4 flex flex-col ${!tpl.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-berna-purple/30 to-berna-orange/20 flex items-center justify-center">
                    <LayoutTemplate className="w-4 h-4 text-berna-purple" />
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-berna-orange font-semibold px-2 py-0.5 rounded-full bg-berna-orange/10 border border-berna-orange/20">
                    {typeInfo?.label || tpl.template_key}
                  </span>
                </div>
                <Switch checked={tpl.enabled} onCheckedChange={() => handleToggle(tpl)} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">{tpl.name}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mb-3 flex-1">{tpl.description || 'No description'}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {cats.slice(0, 4).map(c => {
                  const cat = CATEGORIES.find(x => x.key === c);
                  return <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/60">{cat?.label || c}</span>;
                })}
                {cats.length > 4 && <span className="text-[9px] text-muted-foreground">+{cats.length - 4}</span>}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                <span>{sections.length} sections</span>
                <span>·</span>
                <span className="capitalize">{tpl.tone}</span>
                <span>·</span>
                <span>{tpl.default_read_time || 'N/A'}</span>
              </div>
              <div className="flex gap-1 pt-2 border-t border-white/[0.04]">
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7 flex-1" onClick={() => { setEditing(tpl); setShowEditor(true); }}>
                  <Edit3 className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7" onClick={() => handleDuplicate(tpl)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-400 text-xs h-7" onClick={() => handleDelete(tpl)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {showEditor && (
        <TemplateEditorModal template={editing} onSave={handleSave} onClose={() => { setShowEditor(false); setEditing(null); }} />
      )}
    </div>
  );
}

function TemplateEditorModal({ template, onSave, onClose }) {
  const [data, setData] = useState(template || {
    name: '',
    template_key: 'custom',
    description: '',
    included_sections: stringifyJSON([]),
    default_categories: stringifyJSON([]),
    scoring_weights: stringifyJSON({ freshness: 1, credibility: 1, opportunity: 1.5, usefulness: 1, duplicate: -0.5 }),
    required_source_types: stringifyJSON([]),
    tone: 'professional',
    default_read_time: '10 min',
    enabled: true,
  });

  const update = (key, value) => setData(prev => ({ ...prev, [key]: value }));

  const toggleArrayItem = (field, item) => {
    const arr = parseJSON(data[field], []);
    const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
    update(field, stringifyJSON(next));
  };

  const sections = parseJSON(data.included_sections, []);
  const cats = parseJSON(data.default_categories, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel-navy w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">{template ? 'Edit Template' : 'New Template'}</h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Template Name</label>
              <Input value={data.name} onChange={e => update('name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={data.template_key} onValueChange={v => update('template_key', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {BRIEFING_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Textarea value={data.description} onChange={e => update('description', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm min-h-16" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
              <Select value={data.tone} onValueChange={v => update('tone', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {TONES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Read Time</label>
              <Input value={data.default_read_time} onChange={e => update('default_read_time', e.target.value)} placeholder="e.g. 10 min" className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Enabled</label>
              <div className="flex items-center h-9"><Switch checked={data.enabled} onCheckedChange={v => update('enabled', v)} /></div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Included Sections ({sections.length})</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg bg-white/[0.02]">
              {CATEGORIES.map(cat => {
                const checked = sections.includes(cat.key);
                return (
                  <label key={cat.key} className="flex items-center gap-1.5 p-1 rounded cursor-pointer hover:bg-white/[0.04]">
                    <input type="checkbox" checked={checked} onChange={() => toggleArrayItem('included_sections', cat.key)} className="w-3 h-3 rounded accent-berna-purple" />
                    <span className="text-[10px] text-white/70">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Default Categories ({cats.length})</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg bg-white/[0.02]">
              {CATEGORIES.map(cat => {
                const checked = cats.includes(cat.key);
                return (
                  <label key={cat.key} className="flex items-center gap-1.5 p-1 rounded cursor-pointer hover:bg-white/[0.04]">
                    <input type="checkbox" checked={checked} onChange={() => toggleArrayItem('default_categories', cat.key)} className="w-3 h-3 rounded accent-berna-orange" />
                    <span className="text-[10px] text-white/70">{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/[0.06]">
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white" onClick={() => onSave(data)} disabled={!data.name}>
            <Check className="w-3 h-3 mr-1" />Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}