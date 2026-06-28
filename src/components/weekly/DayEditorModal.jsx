import React, { useState, useEffect } from 'react';
import { X, Save, Copy, RotateCcw, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import TagInput from './TagInput';
import { CATEGORIES, BRIEFING_TYPES, EDITORIAL_RULES, BRIEF_LENGTHS, DAY_LABELS, parseJSON, stringifyJSON } from '@/lib/weeklyConstants';

export default function DayEditorModal({ open, dayPlan, dayName, date, sources, onClose, onSave, onApplyWeek, onCopyDay, onReset, onPreview }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(dayPlan ? { ...dayPlan } : {
        day_name: dayName,
        date: date,
        enabled: true,
        automation_time: '06:00',
        briefing_type: 'tnn_morning',
        theme: '',
        energy: '',
        mission: '',
        producer_notes: '',
        selected_categories: stringifyJSON([]),
        priority_topics: stringifyJSON([]),
        avoid_topics: stringifyJSON([]),
        source_priority_mode: 'all_approved',
        prioritized_sources: stringifyJSON([]),
        excluded_sources: stringifyJSON([]),
        editorial_rules: stringifyJSON([]),
        brief_length: 'standard',
        approval_required: false,
        status: 'not_planned',
      });
    }
  }, [open, dayPlan, dayName, date]);

  if (!open || !form) return null;

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const cats = parseJSON(form.selected_categories, []);
  const toggleCategory = (key) => {
    update('selected_categories', stringifyJSON(cats.includes(key) ? cats.filter(c => c !== key) : [...cats, key]));
  };

  const rules = parseJSON(form.editorial_rules, []);
  const toggleRule = (key) => {
    update('editorial_rules', stringifyJSON(rules.includes(key) ? rules.filter(r => r !== key) : [...rules, key]));
  };

  const prioSources = parseJSON(form.prioritized_sources, []);
  const exclSources = parseJSON(form.excluded_sources, []);
  const toggleSource = (key, field) => {
    const list = field === 'prioritized' ? prioSources : exclSources;
    const setter = field === 'prioritized' ? 'prioritized_sources' : 'excluded_sources';
    update(setter, stringifyJSON(list.includes(key) ? list.filter(s => s !== key) : [...list, key]));
  };

  const handleSave = () => { onSave(form); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-3xl my-8 relative">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-white/[0.06] bg-gradient-to-r from-berna-purple/10 to-transparent rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-white">{DAY_LABELS[form.day_name]} Editor</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{form.date ? new Date(form.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* A. Basic Setup */}
          <Section title="Basic Setup">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Briefing Enabled</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.enabled} onCheckedChange={v => update('enabled', v)} />
                  <span className="text-xs text-white/70">{form.enabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
              <div>
                <Label>Automation Time</Label>
                <Input type="time" value={form.automation_time} onChange={e => update('automation_time', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1" />
              </div>
            </div>
            <div className="mt-3">
              <Label>Briefing Type</Label>
              <Select value={form.briefing_type} onValueChange={v => update('briefing_type', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 max-h-60">
                  {BRIEFING_TYPES.map(t => (
                    <SelectItem key={t.key} value={t.key}>
                      <div>
                        <div className="text-sm">{t.label}</div>
                        <div className="text-[10px] text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* B. Theme */}
          <Section title="Theme & Direction">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Today's Theme</Label>
                <Input value={form.theme} onChange={e => update('theme', e.target.value)} placeholder="e.g. AI and American Manufacturing" className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1" />
              </div>
              <div>
                <Label>Today's Energy</Label>
                <Input value={form.energy} onChange={e => update('energy', e.target.value)} placeholder="e.g. Optimistic, Urgent" className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1" />
              </div>
            </div>
            <div className="mt-3">
              <Label>Today's Mission</Label>
              <Textarea value={form.mission} onChange={e => update('mission', e.target.value)} placeholder="What should this briefing accomplish?" className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1 min-h-[60px]" />
            </div>
            <div className="mt-3">
              <Label>Producer Notes</Label>
              <Textarea value={form.producer_notes} onChange={e => update('producer_notes', e.target.value)} placeholder="Internal notes for this day..." className="bg-white/[0.03] border-white/[0.08] text-white text-sm mt-1 min-h-[60px]" />
            </div>
          </Section>

          {/* C. Categories */}
          <Section title="Categories">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <label key={cat.key} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cats.includes(cat.key)}
                    onChange={() => toggleCategory(cat.key)}
                    className="w-3.5 h-3.5 rounded accent-berna-purple"
                  />
                  <span className="text-xs text-white/80">{cat.label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* D & E. Topics */}
          <Section title="Priority & Avoid Topics">
            <div className="space-y-4">
              <div>
                <Label>Priority Topics (watch for these)</Label>
                <div className="mt-1">
                  <TagInput
                    tags={form.priority_topics}
                    onChange={v => update('priority_topics', stringifyJSON(v))}
                    placeholder="Add a priority topic..."
                    suggestions={['AI helping small businesses', 'American manufacturing', 'reshoring', 'apprenticeships', 'food security', 'creator monetization']}
                  />
                </div>
              </div>
              <div>
                <Label>Avoid Topics (block these)</Label>
                <div className="mt-1">
                  <TagInput
                    tags={form.avoid_topics}
                    onChange={v => update('avoid_topics', stringifyJSON(v))}
                    placeholder="Add a topic to avoid..."
                    suggestions={['presidential drama', 'celebrity gossip', 'outrage politics', 'recycled stories', 'unsourced viral claims']}
                  />
                </div>
              </div>
            </div>
          </Section>

          {/* F. Source Priority */}
          <Section title="Source Priority">
            <Select value={form.source_priority_mode} onValueChange={v => update('source_priority_mode', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="all_approved">Use all approved sources</SelectItem>
                <SelectItem value="prioritize_selected">Prioritize selected sources</SelectItem>
                <SelectItem value="exclude_selected">Exclude selected sources</SelectItem>
              </SelectContent>
            </Select>
            {form.source_priority_mode !== 'all_approved' && (
              <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5">
                {sources.map(src => {
                  const list = form.source_priority_mode === 'prioritize_selected' ? prioSources : exclSources;
                  const checked = list.includes(src.id);
                  return (
                    <label key={src.id} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSource(src.id, form.source_priority_mode === 'prioritize_selected' ? 'prioritized' : 'excluded')}
                        className="w-3.5 h-3.5 rounded accent-berna-purple"
                      />
                      <span className="text-xs text-white/80">{src.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{src.source_type}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Section>

          {/* G. Editorial Rules */}
          <Section title="Editorial Rules">
            <div className="space-y-2">
              {EDITORIAL_RULES.map(rule => (
                <div key={rule.key} className="flex items-center justify-between p-2 rounded-md bg-white/[0.02]">
                  <span className="text-xs text-white/80">{rule.label}</span>
                  <Switch checked={rules.includes(rule.key)} onCheckedChange={() => toggleRule(rule.key)} />
                </div>
              ))}
            </div>
          </Section>

          {/* H. Brief Length */}
          <Section title="Brief Length">
            <div className="grid grid-cols-3 gap-2">
              {BRIEF_LENGTHS.map(len => (
                <button
                  key={len.key}
                  onClick={() => update('brief_length', len.key)}
                  className={`p-3 rounded-lg border text-xs font-medium transition-all ${
                    form.brief_length === len.key
                      ? 'bg-berna-purple/10 border-berna-purple/30 text-berna-purple'
                      : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:border-white/[0.12]'
                  }`}
                >
                  {len.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 p-2 rounded-md bg-white/[0.02]">
              <span className="text-xs text-white/80">Require manual approval before finalizing</span>
              <Switch checked={form.approval_required} onCheckedChange={v => update('approval_required', v)} />
            </div>
          </Section>
        </div>

        {/* I. Save Options */}
        <div className="sticky bottom-0 flex flex-wrap gap-2 p-4 border-t border-white/[0.06] bg-gradient-to-t from-background/95 to-transparent rounded-b-xl">
          <Button size="sm" onClick={handleSave} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            <Save className="w-3 h-3 mr-1" />Save Day Plan
          </Button>
          <Button size="sm" variant="outline" onClick={() => onApplyWeek(form)} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <Copy className="w-3 h-3 mr-1" />Apply to Entire Week
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCopyDay(form)} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <Copy className="w-3 h-3 mr-1" />Copy to Another Day
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReset()} className="border-white/10 text-white/60 text-xs hover:bg-white/[0.04]">
            <RotateCcw className="w-3 h-3 mr-1" />Reset to Default
          </Button>
          <Button size="sm" variant="outline" onClick={() => onPreview(form)} className="border-white/10 text-white text-xs hover:bg-white/[0.04] ml-auto">
            <Eye className="w-3 h-3 mr-1" />Generate Preview
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="glass-panel p-4">
      <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 neon-underline">{title}</h3>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="text-[10px] text-muted-foreground uppercase tracking-wider block">{children}</label>;
}