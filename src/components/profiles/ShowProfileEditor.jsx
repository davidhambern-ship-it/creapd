import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import ModuleManager from '@/components/profiles/ModuleManager';

const TONES = ['professional', 'conversational', 'energetic', 'serious', 'investigative', 'educational', 'inspirational', 'neutral', 'urgent', 'humorous'];
const STYLES = ['broadcast_news', 'podcast', 'livestream', 'interview', 'documentary', 'educational_presentation', 'corporate_communication', 'storytelling'];
const AUDIENCES = ['General Public', 'Local Community', 'National Audience', 'Business Professionals', 'Students', 'Families', 'Church Congregations', 'Sports Fans', 'Industry Professionals'];
const RUNTIMES = ['15 Seconds', '30 Seconds', '45 Seconds', '1 Minute', '2 Minutes', '5 Minutes', 'Custom'];
const FORMATS = ['pdf', 'docx', 'markdown', 'html', 'text'];
const IMAGE_PROVIDERS = ['default', 'dalle', 'midjourney', 'stable_diffusion', 'custom'];
const PRODUCTION_ASSETS = [
  { value: 'teleprompter_script', label: 'Teleprompter Script' },
  { value: 'talking_points', label: 'Talking Points' },
  { value: 'lower_thirds', label: 'Lower Thirds' },
  { value: 'headline_graphics', label: 'Headline Graphics' },
  { value: 'ai_images', label: 'AI Images' },
  { value: 'social_captions', label: 'Social Captions' },
  { value: 'fact_check_notes', label: 'Fact Check Notes' },
  { value: 'visual_suggestions', label: 'Visual Suggestions' },
  { value: 'broll_suggestions', label: 'B-roll Suggestions' },
];

export default function ShowProfileEditor({ open, profile, brands, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [contentDomains, setContentDomains] = useState([]);

  useEffect(() => {
    if (open) {
      setForm(profile || { content_domain: 'news', default_tone: 'professional', reading_style: 'broadcast_news', audience: 'General Public', target_runtime: '1 Minute', default_export_format: 'pdf' });
      base44.entities.ContentDomain.list().then(domains => {
        setContentDomains(domains.filter(d => d.is_active).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      }).catch(() => {});
    }
  }, [open, profile]);

  const selectedDomain = contentDomains.find(d => d.domain_key === (form.content_domain || 'news'));

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleAsset = (asset) => {
    const current = (form.preferred_assets || '').split(',').map(s => s.trim()).filter(Boolean);
    const next = current.includes(asset) ? current.filter(a => a !== asset) : [...current, asset];
    set('preferred_assets', next.join(', '));
  };

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
          <DialogTitle className="text-white">{profile ? 'Edit Show Profile' : 'Create Show Profile'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Production Modules — Show-as-Container Architecture */}
          {profile?.id ? (
            <ModuleManager showProfile={{ ...form, id: profile.id }} onModuleChanged={() => { /* parent can refresh if needed */ }} />
          ) : (
            <div className="glass-panel p-3 space-y-2 border-berna-emerald/20">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-berna-emerald" />
                <Label className="text-xs text-white font-semibold">Production Modules</Label>
              </div>
              <p className="text-[10px] text-muted-foreground">Save this show first, then add production modules (Cooking, Cosmo, News, etc.) and switch between them anytime — without reconfiguring your brand.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Show Name *</Label><Input value={form.show_name || ''} onChange={e => set('show_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div>
              <Label className="text-xs text-muted-foreground">Associated Brand</Label>
              <Select value={form.brand_profile_id || 'none'} onValueChange={v => set('brand_profile_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  <SelectItem value="none" className="text-xs">No brand</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.brand_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Host Name(s)</Label><Input value={form.host_names || ''} onChange={e => set('host_names', e.target.value)} placeholder="e.g. Berna, Guest Host" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Default Tone</Label>
              <Select value={form.default_tone || 'professional'} onValueChange={v => set('default_tone', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">{TONES.map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reading Style</Label>
              <Select value={form.reading_style || 'broadcast_news'} onValueChange={v => set('reading_style', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">{STYLES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Audience</Label>
              <Select value={form.audience || 'General Public'} onValueChange={v => set('audience', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">{AUDIENCES.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Target Runtime</Label>
              <Select value={form.target_runtime || '1 Minute'} onValueChange={v => set('target_runtime', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">{RUNTIMES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs text-muted-foreground">Preferred Categories (comma-separated)</Label><Input value={form.preferred_categories || ''} onChange={e => set('preferred_categories', e.target.value)} placeholder="ai_business, manufacturing" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Default Production Assets ({(form.preferred_assets || '').split(',').filter(Boolean).length} selected)</Label>
            <p className="text-[10px] text-muted-foreground mb-2">Assets generated automatically for this show — producer may modify at any time</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 p-2 rounded-lg bg-white/[0.02]">
              {PRODUCTION_ASSETS.map(a => {
                const current = (form.preferred_assets || '').split(',').map(s => s.trim()).filter(Boolean);
                const checked = current.includes(a.value);
                return (
                  <label key={a.value} className="flex items-center gap-1.5 p-1 rounded cursor-pointer hover:bg-white/[0.04]">
                    <input type="checkbox" checked={checked} onChange={() => toggleAsset(a.value)} className="w-3 h-3 rounded accent-berna-purple" />
                    <span className="text-[10px] text-white/70">{a.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Default Export Format</Label>
            <Select value={form.default_export_format || 'pdf'} onValueChange={v => set('default_export_format', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 w-40"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-white/10">{FORMATS.map(f => <SelectItem key={f} value={f} className="text-xs uppercase">{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-muted-foreground">Opening Script</Label><Textarea value={form.opening_script || ''} onChange={e => set('opening_script', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
          <div><Label className="text-xs text-muted-foreground">Closing Script</Label><Textarea value={form.closing_script || ''} onChange={e => set('closing_script', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
          <div><Label className="text-xs text-muted-foreground">Producer Notes</Label><Textarea value={form.producer_notes || ''} onChange={e => set('producer_notes', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>

          {/* Content Strategy — Show Profile */}
          <div className="glass-panel p-3 space-y-3 border-berna-purple/20">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-white font-semibold">Content Strategy — Show Profile</Label>
            </div>
            <p className="text-[10px] text-muted-foreground">These settings control how CREAPD filters and scores stories for THIS show. Backend story filtering uses these preferences.</p>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Preferred Topics (comma-separated)</Label><Input value={form.preferred_topics || ''} onChange={e => set('preferred_topics', e.target.value)} placeholder="AI, manufacturing, local jobs" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Excluded Topics (comma-separated)</Label><Input value={form.excluded_topics || ''} onChange={e => set('excluded_topics', e.target.value)} placeholder="celebrity gossip, outrage" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Region / Local Focus</Label><Input value={form.region_local_focus || ''} onChange={e => set('region_local_focus', e.target.value)} placeholder="Midwest, Texas, NYC" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Political/Cultural Balance</Label>
                <Select value={form.political_cultural_balance || 'balanced'} onValueChange={v => set('political_cultural_balance', v)}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-white/10">{['balanced', 'lean_left', 'lean_right', 'neutral', 'custom'].map(b => <SelectItem key={b} value={b} className="text-xs capitalize">{b.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Preferred Sources (comma-separated)</Label><Input value={form.preferred_sources || ''} onChange={e => set('preferred_sources', e.target.value)} placeholder="Reuters, AP" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Blocked Sources (comma-separated)</Label><Input value={form.blocked_sources || ''} onChange={e => set('blocked_sources', e.target.value)} placeholder="Blog spam, aggregator" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Allowed Categories (comma-separated)</Label><Input value={form.allowed_categories || ''} onChange={e => set('allowed_categories', e.target.value)} placeholder="business, ai, manufacturing" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Rejected Categories (comma-separated)</Label><Input value={form.rejected_categories || ''} onChange={e => set('rejected_categories', e.target.value)} placeholder="opinion, celebrity" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            </div>

            <div><Label className="text-[10px] text-muted-foreground">Content Types Allowed (comma-separated)</Label><Input value={form.content_types_allowed || ''} onChange={e => set('content_types_allowed', e.target.value)} placeholder="text, video, audio, social" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-[10px] text-muted-foreground">Focus Areas (comma-separated)</Label><Input value={form.focus_areas || ''} onChange={e => set('focus_areas', e.target.value)} placeholder="faith, family, business, community" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-[10px] text-muted-foreground">Segment Structure</Label><Input value={form.segment_structure || ''} onChange={e => set('segment_structure', e.target.value)} placeholder="Lead Story, Quick Hits, Feature, Closing" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-[10px] text-muted-foreground">Story Priority Rules</Label><Textarea value={form.story_priority_rules || ''} onChange={e => set('story_priority_rules', e.target.value)} placeholder="e.g. Local business stories first, then national AI wins" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-12" /></div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><Label className="text-[10px] text-muted-foreground">Min Story Score (0-10)</Label><Input type="number" min={0} max={10} value={form.minimum_story_score ?? 5} onChange={e => set('minimum_story_score', parseInt(e.target.value) || 5)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Freshness Window (hrs)</Label><Input type="number" min={1} value={form.freshness_window_hours ?? 48} onChange={e => set('freshness_window_hours', parseInt(e.target.value) || 48)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Entertainment (0-10)</Label><Input type="number" min={0} max={10} value={form.entertainment_level ?? 5} onChange={e => set('entertainment_level', parseInt(e.target.value) || 5)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              <div><Label className="text-[10px] text-muted-foreground">Educational (0-10)</Label><Input type="number" min={0} max={10} value={form.educational_level ?? 5} onChange={e => set('educational_level', parseInt(e.target.value) || 5)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Controversy Tolerance</Label>
              <Select value={form.controversy_tolerance || 'medium'} onValueChange={v => set('controversy_tolerance', v)}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 w-40"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-white/10">{['low', 'medium', 'high'].map(c => <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs text-white">Active Show Profile</Label>
                <p className="text-[10px] text-muted-foreground">When enabled, backend uses this profile for story filtering and scoring</p>
              </div>
              <Switch checked={form.is_active || false} onCheckedChange={v => set('is_active', v)} />
            </div>
          </div>

          <div className="glass-panel p-3 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">AI Preferences</Label>
              <p className="text-[10px] text-muted-foreground mb-2">Default AI behavior — may be overridden per production</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Image Generation Provider</Label>
                  <Select value={form.preferred_image_provider || 'default'} onValueChange={v => set('preferred_image_provider', v)}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      {IMAGE_PROVIDERS.map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-[10px] text-muted-foreground">Preferred Image Style</Label><Input value={form.preferred_image_style || ''} onChange={e => set('preferred_image_style', e.target.value)} placeholder="e.g. photorealistic, illustrative" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
              </div>
              <div className="mt-2"><Label className="text-[10px] text-muted-foreground">Default AI Settings (JSON)</Label><Textarea value={form.default_ai_settings || ''} onChange={e => set('default_ai_settings', e.target.value)} placeholder='{"creativity": "balanced"}' className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-12 font-mono text-[10px]" /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Default Template IDs (comma-separated)</Label><Input value={form.default_template_ids || ''} onChange={e => set('default_template_ids', e.target.value)} placeholder="template-id-1, template-id-2" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="border-white/10 text-white text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={handleSave} disabled={saving || !form.show_name}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            {profile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}