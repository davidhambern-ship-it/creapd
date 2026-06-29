import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const TASK_TYPES = [
  { value: 'script_writing', label: 'Script Writing' },
  { value: 'image_generation', label: 'Image Generation' },
  { value: 'thumbnail_generation', label: 'Thumbnail Generation' },
  { value: 'headline_suggestions', label: 'Headline Suggestions' },
  { value: 'talking_points', label: 'Talking Points' },
  { value: 'fact_check', label: 'Fact Check Assistance' },
  { value: 'translation', label: 'Translation' },
  { value: 'social_caption', label: 'Social Media Caption' },
  { value: 'lower_thirds', label: 'Lower Thirds' },
  { value: 'story_summary', label: 'Story Summary' },
  { value: 'visual_suggestions', label: 'Visual Suggestions' },
  { value: 'broll_suggestions', label: 'B-roll Suggestions' },
  { value: 'custom', label: 'Custom' },
];

const ASSIGNMENT_LEVELS = [
  { value: 'organization_default', label: 'Organization Default' },
  { value: 'brand_default', label: 'Brand Default' },
  { value: 'show_default', label: 'Show Default' },
  { value: 'production_default', label: 'Production Default' },
  { value: 'story_specific', label: 'Story Specific' },
];

export default function PromptTemplateEditor({ open, template, brands, shows, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(template || {
        task_type: 'script_writing',
        assignment_level: 'organization_default',
        is_active: true,
      });
    }
  }, [open, template]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{template ? 'Edit Prompt Template' : 'Create Prompt Template'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Template Name *</Label>
              <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. Breaking News Script" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Task Type *</Label>
              <Select value={form.task_type || 'script_writing'} onValueChange={v => set('task_type', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="What this prompt template is for..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Prompt Content *</Label>
            <p className="text-[10px] text-muted-foreground mb-1.5">Use variables like {'{title}'}, {'{summary}'}, {'{tone}'}, {'{audience}'} — they'll be replaced at generation time.</p>
            <Textarea
              value={form.content || ''}
              onChange={e => set('content', e.target.value)}
              placeholder="You are a professional broadcast producer. Write a teleprompter script for the following story...&#10;&#10;Title: {title}&#10;Summary: {summary}&#10;Tone: {tone}"
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-32 font-mono resize-y"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Variables (comma-separated)</Label>
            <Input value={form.variables || ''} onChange={e => set('variables', e.target.value)} placeholder="title, summary, tone, audience" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Assignment Level</Label>
              <Select value={form.assignment_level || 'organization_default'} onValueChange={v => set('assignment_level', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {ASSIGNMENT_LEVELS.map(l => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Associated Brand</Label>
              <Select value={form.brand_profile_id || 'none'} onValueChange={v => set('brand_profile_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue placeholder="Any brand" /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="none" className="text-xs">Any brand</SelectItem>
                  {brands?.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.brand_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Associated Show</Label>
              <Select value={form.show_profile_id || 'none'} onValueChange={v => set('show_profile_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue placeholder="Any show" /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="none" className="text-xs">Any show</SelectItem>
                  {shows?.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.show_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
            <Input value={form.tags || ''} onChange={e => set('tags', e.target.value)} placeholder="breaking, urgent, morning" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
            <div>
              <p className="text-sm text-white">Active</p>
              <p className="text-[10px] text-muted-foreground">Inactive templates won't appear in selection menus</p>
            </div>
            <Switch checked={form.is_active !== false} onCheckedChange={v => set('is_active', v)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="border-white/10 text-white text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={handleSave} disabled={saving || !form.name || !form.content}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}