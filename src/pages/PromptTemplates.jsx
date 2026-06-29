import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Star, Copy, Trash2, Pencil, FileText, Sparkles, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PromptTemplateEditor from '@/components/prompts/PromptTemplateEditor';
import { logActivity } from '@/lib/activityUtils';

const TASK_LABELS = {
  script_writing: 'Script Writing',
  image_generation: 'Image Generation',
  thumbnail_generation: 'Thumbnail Generation',
  headline_suggestions: 'Headline Suggestions',
  talking_points: 'Talking Points',
  fact_check: 'Fact Check Assistance',
  translation: 'Translation',
  social_caption: 'Social Media Caption',
  lower_thirds: 'Lower Thirds',
  story_summary: 'Story Summary',
  visual_suggestions: 'Visual Suggestions',
  broll_suggestions: 'B-roll Suggestions',
  custom: 'Custom',
};

const TASK_COLORS = {
  script_writing: 'bg-berna-purple/10 text-berna-purple border-berna-purple/20',
  image_generation: 'bg-berna-orange/10 text-berna-orange border-berna-orange/20',
  thumbnail_generation: 'bg-berna-orange/10 text-berna-orange border-berna-orange/20',
  translation: 'bg-berna-emerald/10 text-berna-emerald border-berna-emerald/20',
  custom: 'bg-white/5 text-gray-400 border-white/10',
};

export default function PromptTemplates() {
  const [templates, setTemplates] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tpls, brnds, shws] = await Promise.all([
        base44.entities.PromptTemplate.list('-created_date', 100),
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

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !search ||
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.tags?.toLowerCase().includes(search.toLowerCase());
      const matchesTask = taskFilter === 'all' || t.task_type === taskFilter;
      return matchesSearch && matchesTask;
    });
  }, [templates, search, taskFilter]);

  const handleSave = async (form) => {
    if (form.id) {
      const updated = await base44.entities.PromptTemplate.update(form.id, form);
      setTemplates(prev => prev.map(t => t.id === form.id ? updated : t));
      logActivity('update', { entity_type: 'PromptTemplate', entity_id: form.id, entity_name: form.name, details: 'Updated prompt template' });
      toast({ title: 'Template updated' });
    } else {
      const created = await base44.entities.PromptTemplate.create(form);
      setTemplates(prev => [created, ...prev]);
      logActivity('create', { entity_type: 'PromptTemplate', entity_id: created.id, entity_name: form.name, details: 'Created prompt template' });
      toast({ title: 'Template created' });
    }
  };

  const handleDuplicate = async (tpl) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = tpl;
    const dup = await base44.entities.PromptTemplate.create({ ...rest, name: `${tpl.name} (Copy)` });
    setTemplates(prev => [dup, ...prev]);
    logActivity('create', { entity_type: 'PromptTemplate', entity_id: dup.id, entity_name: dup.name, details: 'Duplicated prompt template' });
    toast({ title: 'Template duplicated' });
  };

  const handleDelete = async (tpl) => {
    await base44.entities.PromptTemplate.delete(tpl.id);
    setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    logActivity('delete', { entity_type: 'PromptTemplate', entity_id: tpl.id, entity_name: tpl.name, details: 'Deleted prompt template' });
    toast({ title: 'Template deleted' });
  };

  const handleToggleFavorite = async (tpl) => {
    const updated = await base44.entities.PromptTemplate.update(tpl.id, { is_favorite: !tpl.is_favorite });
    setTemplates(prev => prev.map(t => t.id === tpl.id ? updated : t));
  };

  const brandName = (id) => brands.find(b => b.id === id)?.brand_name || '';
  const showName = (id) => shows.find(s => s.id === id)?.show_name || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Prompt Templates</h1>
          <p className="text-xs text-muted-foreground mt-1">Reusable AI prompts — reduce repetitive prompting while maintaining consistency</p>
        </div>
        <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white" onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />New Template
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="bg-white/[0.03] border-white/[0.08] text-white text-sm pl-9"
          />
        </div>
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all" className="text-xs">All Task Types</SelectItem>
            {Object.entries(TASK_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-white mb-1">No prompt templates yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create reusable prompts for scripts, images, translations, and more.</p>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(tpl => (
            <div key={tpl.id} className="glass-panel p-4 flex flex-col gap-2 group hover:border-white/[0.12] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${TASK_COLORS[tpl.task_type] || TASK_COLORS.custom}`}>
                    {TASK_LABELS[tpl.task_type] || tpl.task_type}
                  </span>
                  {tpl.is_active === false && (
                    <span className="text-[10px] text-muted-foreground">Inactive</span>
                  )}
                </div>
                <button onClick={() => handleToggleFavorite(tpl)} className="flex-shrink-0">
                  <Star className={`w-3.5 h-3.5 ${tpl.is_favorite ? 'text-berna-orange fill-berna-orange' : 'text-muted-foreground hover:text-berna-orange'}`} />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-white truncate">{tpl.name}</h3>
              {tpl.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</p>}
              <div className="flex-1 min-h-0">
                <p className="text-[10px] text-white/50 line-clamp-3 font-mono bg-white/[0.02] rounded p-2 border border-white/[0.04]">{tpl.content}</p>
              </div>
              {(brandName(tpl.brand_profile_id) || showName(tpl.show_profile_id)) && (
                <div className="flex flex-wrap gap-1">
                  {brandName(tpl.brand_profile_id) && <span className="text-[9px] text-berna-purple bg-berna-purple/10 px-1.5 py-0.5 rounded">{brandName(tpl.brand_profile_id)}</span>}
                  {showName(tpl.show_profile_id) && <span className="text-[9px] text-berna-emerald bg-berna-emerald/10 px-1.5 py-0.5 rounded">{showName(tpl.show_profile_id)}</span>}
                </div>
              )}
              {tpl.tags && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">{tpl.tags}</span>
                </div>
              )}
              <div className="flex items-center gap-1 pt-1 border-t border-white/[0.04]">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04]" onClick={() => { setEditing(tpl); setEditorOpen(true); }}>
                  <Pencil className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04]" onClick={() => handleDuplicate(tpl)}>
                  <Copy className="w-3 h-3 mr-1" />Duplicate
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-muted-foreground hover:text-red-400 hover:bg-red-400/10 ml-auto" onClick={() => handleDelete(tpl)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromptTemplateEditor
        open={editorOpen}
        template={editing}
        brands={brands}
        shows={shows}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}