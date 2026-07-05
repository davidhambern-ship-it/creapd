import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, Pencil, X, Check } from 'lucide-react';

const MODULE_TYPES = [
  { value: 'news', label: 'News', icon: 'Newspaper', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'spiritual', label: 'Spiritual', icon: 'Church', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { value: 'talk', label: 'Talk', icon: 'Mic2', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { value: 'music', label: 'Music', icon: 'Music', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { value: 'sports', label: 'Sports', icon: 'Trophy', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { value: 'cooking', label: 'Cooking', icon: 'ChefHat', color: 'text-green-400', bg: 'bg-green-500/10' },
  { value: 'cosmo', label: 'Cosmo', icon: 'Brush', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
];

const DOMAIN_DEFAULTS = {
  news: {
    asset_types: '["teleprompter_script","talking_points","lower_thirds","headline_graphics","social_captions","fact_check_notes"]',
    segment_types: '["Lead Story","Quick Hit","Feature","Breaking","Talking Points","Fact Check","B-Roll Package"]',
    domain_categories: '["top_story","politics","world","business","technology","science","health"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in a broadcast news teleprompter style with clear, concise delivery.',
    research_instructions: 'Prioritize breaking news and verified facts from credible sources.',
    content_filtering_rules: 'Reject opinion pieces and unverified claims. Prioritize factual reporting.',
  },
  spiritual: {
    asset_types: '["host_script","scripture_references","reflection_notes","social_caption","thumbnail_prompt"]',
    segment_types: '["intro","scripture_reading","message","reflection","prayer","outro"]',
    domain_categories: '["opinion","community","good_news"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in an inspirational, spiritual style with scripture references and reflection questions.',
    research_instructions: 'Find relevant scripture passages, theological insights, and faith-based content.',
    content_filtering_rules: 'Prioritize faith-based, inspirational, and community-focused content.',
  },
  talk: {
    asset_types: '["host_script","cohost_script","talking_points","discussion_questions","social_caption","thumbnail_prompt"]',
    segment_types: '["intro","host_monologue","topic_discussion","guest_interview","audience_qa","debate","outro"]',
    domain_categories: '["entertainment","opinion","community"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in a conversational, engaging talk show style with discussion prompts.',
    research_instructions: 'Find trending topics, discussion-worthy stories, and conversation starters.',
    content_filtering_rules: 'Prioritize conversation-driving topics and discussion-worthy content.',
  },
  music: {
    asset_types: '["host_script","cohost_script","artist_facts","playlist_segment","social_caption","thumbnail_prompt"]',
    segment_types: '["intro","new_release","artist_spotlight","chart_movement","playlist_segment","outro"]',
    domain_categories: '["new_release","tour_announcement","artist_news","chart_movement","festival_lineup","album_review","interview","music_industry","streaming","local_concert","genre_spotlight","classic_track"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in an energetic radio host style with artist facts and playlist context.',
    research_instructions: 'Find new releases, chart movements, tour announcements, and artist news.',
    content_filtering_rules: 'Prioritize music industry news, new releases, and artist content.',
  },
  sports: {
    asset_types: '["host_script","cohost_script","talking_points","social_caption","thumbnail_prompt","production_notes"]',
    segment_types: '["intro","game_preview","game_recap","scoreboard_update","athlete_interview","analysis","debate","outro"]',
    domain_categories: '["sports"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in an energetic, analytical sports commentary style with stats and figures.',
    research_instructions: 'Find game previews, recaps, stats, and athlete news.',
    content_filtering_rules: 'Prioritize sports content, game analysis, and athlete stories.',
  },
  cooking: {
    asset_types: '["host_script","cohost_script","ingredient_list","cooking_notes","social_caption","thumbnail_prompt"]',
    segment_types: '["intro","recipe_walkthrough","technique_demo","ingredient_spotlight","tasting","audience_qa","outro"]',
    domain_categories: '["food_agriculture","small_business"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in a warm, instructional style. Include cooking times, temperatures, and technique tips.',
    research_instructions: 'Find trending recipes, seasonal ingredients, and cooking technique tips.',
    content_filtering_rules: 'Prioritize content with recipes, cooking demonstrations, or ingredient spotlights.',
  },
  cosmo: {
    asset_types: '["host_script","cohost_script","talking_points","discussion_questions","social_caption","thumbnail_prompt"]',
    segment_types: '["intro","host_monologue","tutorial_demo","product_review","expert_interview","audience_qa","outro"]',
    domain_categories: '["health","entertainment"]',
    domain_content_types: '["text","video"]',
    scripting_instructions: 'Write in a warm, empowering style. Focus on wellness, beauty, and self-care guidance.',
    research_instructions: 'Find trending beauty products, wellness routines, and skincare research.',
    content_filtering_rules: 'Prioritize content about beauty, wellness, skincare, and health tips.',
  },
};

function getModuleTypeInfo(typeKey) {
  return MODULE_TYPES.find(t => t.value === typeKey) || MODULE_TYPES[0];
}

export default function ModuleManager({ showProfile, onModuleChanged }) {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [newModule, setNewModule] = useState({ module_name: '', module_type: 'news' });

  const load = async () => {
    if (!showProfile?.id) return;
    setLoading(true);
    try {
      const mods = await base44.entities.ProductionModule.filter(
        { show_profile_id: showProfile.id }, '-created_date', 50
      );
      setModules(mods);
    } catch (e) {
      console.error('Failed to load modules', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showProfile?.id) {
      load();
    } else {
      setModules([]);
    }
  }, [showProfile?.id]);

  const handleCreate = async () => {
    if (!newModule.module_name || !newModule.module_type) return;
    const defaults = DOMAIN_DEFAULTS[newModule.module_type] || {};
    try {
      await base44.entities.ProductionModule.create({
        module_name: newModule.module_name,
        module_type: newModule.module_type,
        show_profile_id: showProfile.id,
        is_active: modules.length === 0,
        ...defaults,
      });
      setShowCreate(false);
      setNewModule({ module_name: '', module_type: 'news' });
      load();
      if (onModuleChanged) onModuleChanged();
    } catch (e) {
      console.error('Failed to create module', e);
    }
  };

  const handleActivate = async (mod) => {
    // Deactivate all other modules for this show
    const others = modules.filter(m => m.id !== mod.id && m.is_active);
    for (const o of others) {
      await base44.entities.ProductionModule.update(o.id, { is_active: false });
    }
    // Activate the selected module
    await base44.entities.ProductionModule.update(mod.id, { is_active: true });
    // Update the ShowProfile's active_module_id
    await base44.entities.ShowProfile.update(showProfile.id, {
      active_module_id: mod.id,
      content_domain: mod.module_type,
    });
    load();
    if (onModuleChanged) onModuleChanged();
  };

  const handleDelete = async (mod) => {
    if (!confirm(`Delete module "${mod.module_name}"?`)) return;
    await base44.entities.ProductionModule.delete(mod.id);
    // If this was the active module, clear it
    if (showProfile.active_module_id === mod.id) {
      await base44.entities.ShowProfile.update(showProfile.id, {
        active_module_id: '',
        content_domain: 'news',
      });
    }
    load();
    if (onModuleChanged) onModuleChanged();
  };

  const handleSaveEdit = async (updated) => {
    await base44.entities.ProductionModule.update(updated.id, {
      module_name: updated.module_name,
      domain_topics: updated.domain_topics,
      domain_categories: updated.domain_categories,
      scripting_instructions: updated.scripting_instructions,
      content_filtering_rules: updated.content_filtering_rules,
      research_instructions: updated.research_instructions,
    });
    setEditingModule(null);
    load();
    if (onModuleChanged) onModuleChanged();
  };

  return (
    <div className="glass-panel p-3 space-y-3 border-berna-emerald/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-berna-emerald" />
          <Label className="text-xs text-white font-semibold">Production Modules</Label>
        </div>
        <Button size="sm" variant="ghost" className="text-xs h-7 text-berna-emerald hover:bg-berna-emerald/10" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3 h-3 mr-1" />Add Module
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Each module is a production domain (Cooking, Cosmo, News, etc.) you can attach to this show. Switch the active module to change what your show produces — without reconfiguring your brand.
      </p>

      {showCreate && (
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Module Name</Label>
              <Input value={newModule.module_name} onChange={e => setNewModule(p => ({ ...p, module_name: e.target.value }))} placeholder="e.g. Cooking Hour" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 h-8" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Domain Type</Label>
              <Select value={newModule.module_type} onValueChange={v => setNewModule(p => ({ ...p, module_type: v }))}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {MODULE_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7" onClick={handleCreate} disabled={!newModule.module_name}>
              <Check className="w-3 h-3 mr-1" />Create Module
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => setShowCreate(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {loading && <p className="text-[10px] text-muted-foreground">Loading modules...</p>}

      {!loading && modules.length === 0 && !showCreate && (
        <div className="text-center py-3">
          <p className="text-[10px] text-muted-foreground">No modules yet. Add your first production domain to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {modules.map(mod => {
          const typeInfo = getModuleTypeInfo(mod.module_type);
          const isActive = mod.id === showProfile?.active_module_id || (modules.length === 1 && !showProfile?.active_module_id && mod.is_active);
          return (
            <div key={mod.id} className={`p-2.5 rounded-lg border transition-all ${isActive ? 'border-berna-emerald/30 bg-berna-emerald/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color} font-medium`}>{typeInfo.label}</span>
                  <span className="text-xs text-white font-medium">{mod.module_name}</span>
                  {isActive && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-berna-emerald/20 text-berna-emerald font-bold uppercase tracking-wide">Active</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingModule(mod)} className="text-muted-foreground hover:text-white p-1">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(mod)} className="text-muted-foreground hover:text-red-400 p-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {mod.scripting_instructions && (
                <p className="text-[10px] text-muted-foreground truncate">{mod.scripting_instructions}</p>
              )}
              {!isActive && (
                <Button size="sm" variant="ghost" className="text-[10px] h-6 mt-1 text-berna-emerald hover:bg-berna-emerald/10 px-2" onClick={() => handleActivate(mod)}>
                  <Zap className="w-2.5 h-2.5 mr-1" />Switch to this Module
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {editingModule && (
        <ModuleEditModal module={editingModule} onClose={() => setEditingModule(null)} onSave={handleSaveEdit} />
      )}
    </div>
  );
}

function ModuleEditModal({ module, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      id: module.id,
      module_name: module.module_name || '',
      domain_topics: module.domain_topics || '',
      domain_categories: module.domain_categories || '',
      scripting_instructions: module.scripting_instructions || '',
      content_filtering_rules: module.content_filtering_rules || '',
      research_instructions: module.research_instructions || '',
    });
  }, [module]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-white/10 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-4 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Edit Module: {module.module_name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div><Label className="text-[10px] text-muted-foreground">Module Name</Label><Input value={form.module_name || ''} onChange={e => set('module_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Domain Topics (comma-separated)</Label><Input value={form.domain_topics || ''} onChange={e => set('domain_topics', e.target.value)} placeholder="skincare, wellness, tutorials" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Domain Categories (comma-separated)</Label><Input value={form.domain_categories || ''} onChange={e => set('domain_categories', e.target.value)} placeholder="health, entertainment" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Scripting Instructions</Label><Textarea value={form.scripting_instructions || ''} onChange={e => set('scripting_instructions', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Content Filtering Rules</Label><Textarea value={form.content_filtering_rules || ''} onChange={e => set('content_filtering_rules', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-12" /></div>
        <div><Label className="text-[10px] text-muted-foreground">Research Instructions</Label><Textarea value={form.research_instructions || ''} onChange={e => set('research_instructions', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-12" /></div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs" onClick={handleSave} disabled={saving || !form.module_name}>Save Module</Button>
          <Button size="sm" variant="outline" className="border-white/10 text-white text-xs" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}