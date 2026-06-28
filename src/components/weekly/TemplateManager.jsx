import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BRIEFING_TYPES, CATEGORIES, parseJSON, stringifyJSON, DEFAULT_TEMPLATES } from '@/lib/weeklyConstants';
import { useToast } from '@/components/ui/use-toast';

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    try {
      const res = await base44.entities.BriefingTemplate.filter({}, '-created_date', 50);
      if (res.length === 0) {
        const seeded = await base44.entities.BriefingTemplate.bulkCreate(DEFAULT_TEMPLATES);
        setTemplates(seeded);
      } else {
        setTemplates(res);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (editing.id) {
      await base44.entities.BriefingTemplate.update(editing.id, editing);
    } else {
      const created = await base44.entities.BriefingTemplate.create(editing);
      setTemplates(prev => [created, ...prev]);
      setEditing(null);
      return;
    }
    setTemplates(prev => prev.map(t => t.id === editing.id ? editing : t));
    setEditing(null);
    toast({ title: 'Template saved' });
  };

  const handleDelete = async (id) => {
    await base44.entities.BriefingTemplate.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Template deleted' });
  };

  const toggleEnabled = async (t) => {
    const updated = { ...t, enabled: !t.enabled };
    await base44.entities.BriefingTemplate.update(t.id, { enabled: !t.enabled });
    setTemplates(prev => prev.map(x => x.id === t.id ? updated : x));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" /></div>;
  }

  if (editing) {
    return <TemplateEditor template={editing} onChange={setEditing} onSave={handleSave} onCancel={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Reusable briefing formats — {templates.length} templates</p>
        <Button size="sm" onClick={() => setEditing({ name: '', template_key: 'custom', description: '', included_sections: stringifyJSON([]), default_categories: stringifyJSON([]), tone: 'professional', default_read_time: '10 min', enabled: true })} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
          <Plus className="w-3 h-3 mr-1" />New Template
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {templates.map(t => {
          const sections = parseJSON(t.included_sections, []);
          const cats = parseJSON(t.default_categories, []);
          const typeInfo = BRIEFING_TYPES.find(b => b.key === t.template_key) || {};
          return (
            <div key={t.id} className={`glass-panel p-4 ${!t.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{t.name}</h3>
                  <p className="text-[10px] text-berna-purple uppercase tracking-wider">{typeInfo.label || t.template_key}</p>
                </div>
                <Switch checked={t.enabled} onCheckedChange={() => toggleEnabled(t)} />
              </div>
              <p className="text-xs text-white/60 mb-3 leading-relaxed">{t.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {cats.slice(0, 5).map(c => {
                  const cat = CATEGORIES.find(x => x.key === c);
                  return <span key={c} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-white/60">{cat?.label || c}</span>;
                })}
                {cats.length > 5 && <span className="text-[9px] text-muted-foreground">+{cats.length - 5}</span>}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{sections.length} sections · {t.default_read_time} · {t.tone}</span>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="p-1.5 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-berna-purple">
                    <Edit className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplateEditor({ template, onChange, onSave, onCancel }) {
  const sections = parseJSON(template.included_sections, []);
  const cats = parseJSON(template.default_categories, []);

  const toggleItem = (key, field) => {
    const list = parseJSON(template[field], []);
    const updated = list.includes(key) ? list.filter(x => x !== key) : [...list, key];
    onChange({ ...template, [field]: stringifyJSON(updated) });
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{template.id ? 'Edit Template' : 'New Template'}</h3>
        <Button size="sm" onClick={onSave} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
          <Check className="w-3 h-3 mr-1" />Save
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Name</label>
          <Input value={template.name} onChange={e => onChange({ ...template, name: e.target.value })} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Type</label>
          <Select value={template.template_key} onValueChange={v => onChange({ ...template, template_key: v })}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">{BRIEFING_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground uppercase block mb-1">Description</label>
        <Textarea value={template.description} onChange={e => onChange({ ...template, description: e.target.value })} className="bg-white/[0.03] border-white/[0.08] text-white text-sm min-h-[50px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-2">Included Sections</label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {CATEGORIES.map(c => (
              <label key={c.key} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02] cursor-pointer">
                <input type="checkbox" checked={sections.includes(c.key)} onChange={() => toggleItem(c.key, 'included_sections')} className="w-3 h-3 rounded accent-berna-purple" />
                <span className="text-[10px] text-white/70">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-2">Default Categories</label>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {CATEGORIES.map(c => (
              <label key={c.key} className="flex items-center gap-2 p-1.5 rounded bg-white/[0.02] cursor-pointer">
                <input type="checkbox" checked={cats.includes(c.key)} onChange={() => toggleItem(c.key, 'default_categories')} className="w-3 h-3 rounded accent-berna-purple" />
                <span className="text-[10px] text-white/70">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Tone</label>
          <Select value={template.tone} onValueChange={v => onChange({ ...template, tone: v })}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase block mb-1">Read Time</label>
          <Input value={template.default_read_time} onChange={e => onChange({ ...template, default_read_time: e.target.value })} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
        </div>
        <div className="flex items-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="w-full border-white/10 text-white text-xs">Cancel</Button>
        </div>
      </div>
    </div>
  );
}