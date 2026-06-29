import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const TONES = ['professional', 'conversational', 'energetic', 'serious', 'investigative', 'educational', 'inspirational', 'neutral', 'urgent', 'humorous'];
const STYLES = ['broadcast_news', 'podcast', 'livestream', 'interview', 'documentary', 'educational_presentation', 'corporate_communication', 'storytelling'];
const AUDIENCES = ['General Public', 'Local Community', 'National Audience', 'Business Professionals', 'Students', 'Families', 'Church Congregations', 'Sports Fans', 'Industry Professionals'];
const RUNTIMES = ['15 Seconds', '30 Seconds', '45 Seconds', '1 Minute', '2 Minutes', '5 Minutes', 'Custom'];
const FORMATS = ['pdf', 'docx', 'markdown', 'html', 'text'];

export default function ShowProfileEditor({ open, profile, brands, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(profile || { default_tone: 'professional', reading_style: 'broadcast_news', audience: 'General Public', target_runtime: '1 Minute', default_export_format: 'pdf' });
  }, [open, profile]);

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
          <DialogTitle className="text-white">{profile ? 'Edit Show Profile' : 'Create Show Profile'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Preferred Categories (comma-separated)</Label><Input value={form.preferred_categories || ''} onChange={e => set('preferred_categories', e.target.value)} placeholder="ai_business, manufacturing" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Preferred Assets (comma-separated)</Label><Input value={form.preferred_assets || ''} onChange={e => set('preferred_assets', e.target.value)} placeholder="teleprompter_script, talking_points" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
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