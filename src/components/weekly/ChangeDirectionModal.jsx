import React, { useState, useEffect } from 'react';
import { X, Compass, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import TagInput from './TagInput';
import { CATEGORIES, stringifyJSON } from '@/lib/weeklyConstants';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function ChangeDirectionModal({ open, currentFocus, onClose }) {
  const [newFocus, setNewFocus] = useState('');
  const [addTopics, setAddTopics] = useState(stringifyJSON([]));
  const [removeTopics, setRemoveTopics] = useState(stringifyJSON([]));
  const [prioritizeCat, setPrioritizeCat] = useState('');
  const [excludeCat, setExcludeCat] = useState('');
  const [replacePick, setReplacePick] = useState(false);
  const [regenMode, setRegenMode] = useState('full');
  const [regenSections, setRegenSections] = useState(stringifyJSON([]));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setNewFocus('');
      setAddTopics(stringifyJSON([]));
      setRemoveTopics(stringifyJSON([]));
      setPrioritizeCat('');
      setExcludeCat('');
      setReplacePick(false);
      setRegenMode('full');
      setRegenSections(stringifyJSON([]));
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await base44.entities.DirectionChange.create({
        date: new Date().toISOString().split('T')[0],
        previous_focus: currentFocus || '',
        new_focus: newFocus,
        changed_by: 'Berna',
        change_notes: `Add: ${addTopics} | Remove: ${removeTopics} | Prioritize: ${prioritizeCat} | Exclude: ${excludeCat} | Replace Pick: ${replacePick}`,
        regenerated_sections: regenMode === 'full' ? 'full_brief' : regenSections,
      });
      toast({ title: 'Direction changed', description: 'The brief will be regenerated with the new focus.' });
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key) => {
    const list = JSON.parse(regenSections || '[]');
    setRegenSections(stringifyJSON(list.includes(key) ? list.filter(s => s !== key) : [...list, key]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl my-8 relative glow-orange">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] bg-gradient-to-r from-berna-orange/10 to-transparent rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-berna-orange/10 border border-berna-orange/20">
              <Compass className="w-5 h-5 text-berna-orange" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Change Direction</h2>
              <p className="text-xs text-muted-foreground">Pivot today's briefing focus in real time</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {currentFocus && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Focus</p>
              <p className="text-sm text-white/80">{currentFocus}</p>
            </div>
          )}

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">New Focus for Today</label>
            <Textarea value={newFocus} onChange={e => setNewFocus(e.target.value)} placeholder="e.g. Small businesses and state wins" className="bg-white/[0.03] border-white/[0.08] text-white text-sm min-h-[60px]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Add Topics</label>
              <TagInput tags={addTopics} onChange={v => setAddTopics(stringifyJSON(v))} placeholder="Add topic..." />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Remove Topics</label>
              <TagInput tags={removeTopics} onChange={v => setRemoveTopics(stringifyJSON(v))} placeholder="Remove topic..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Prioritize Category</label>
              <Select value={prioritizeCat} onValueChange={setPrioritizeCat}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 max-h-60">
                  {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Exclude Category</label>
              <Select value={excludeCat} onValueChange={setExcludeCat}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 max-h-60">
                  {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-berna-orange/5 border border-berna-orange/10">
            <div>
              <p className="text-sm text-white">Replace Berna's Pick</p>
              <p className="text-[10px] text-muted-foreground">Override the current pick with a new one</p>
            </div>
            <Switch checked={replacePick} onCheckedChange={setReplacePick} />
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">Regeneration</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRegenMode('full')}
                className={`p-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${
                  regenMode === 'full' ? 'bg-berna-purple/10 border-berna-purple/30 text-berna-purple' : 'bg-white/[0.02] border-white/[0.06] text-white/70'
                }`}
              >
                <RefreshCw className="w-3 h-3" />Regenerate Full Brief
              </button>
              <button
                onClick={() => setRegenMode('sections')}
                className={`p-3 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 ${
                  regenMode === 'sections' ? 'bg-berna-purple/10 border-berna-purple/30 text-berna-purple' : 'bg-white/[0.02] border-white/[0.06] text-white/70'
                }`}
              >
                <RefreshCw className="w-3 h-3" />Selected Sections Only
              </button>
            </div>
            {regenMode === 'sections' && (
              <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                {CATEGORIES.map(c => {
                  const list = JSON.parse(regenSections || '[]');
                  const checked = list.includes(c.key);
                  return (
                    <label key={c.key} className="flex items-center gap-2 p-1.5 rounded-md bg-white/[0.02] cursor-pointer">
                      <input type="checkbox" checked={checked} onChange={() => toggleSection(c.key)} className="w-3 h-3 rounded accent-berna-purple" />
                      <span className="text-[10px] text-white/70">{c.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-berna-emerald/5 border border-berna-emerald/10">
            <p className="text-[10px] text-berna-emerald">✓ Already approved stories will be preserved unless you choose to replace them.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-white/[0.06]">
          <Button variant="outline" size="sm" onClick={onClose} className="border-white/10 text-white text-xs">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || !newFocus.trim()} className="bg-berna-orange hover:bg-berna-orange/90 text-white text-xs">
            {saving ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Compass className="w-3 h-3 mr-1" />}
            Apply Direction Change
          </Button>
        </div>
      </div>
    </div>
  );
}