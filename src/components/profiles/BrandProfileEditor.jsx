import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import BrandAssetSection from '@/components/profiles/BrandAssetSection';

export default function BrandProfileEditor({ open, profile, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(profile || {});
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
          <DialogTitle className="text-white">{profile ? 'Edit Brand Profile' : 'Create Brand Profile'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Brand Name *</Label><Input value={form.brand_name || ''} onChange={e => set('brand_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Organization Name</Label><Input value={form.organization_name || ''} onChange={e => set('organization_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Network Name</Label><Input value={form.network_name || ''} onChange={e => set('network_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Website</Label><Input value={form.website || ''} onChange={e => set('website', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Logo URL</Label>
            <Input value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color || '#7c3aed'} onChange={e => set('primary_color', e.target.value)} className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                <Input value={form.primary_color || ''} onChange={e => set('primary_color', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs flex-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Secondary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.secondary_color || '#f97316'} onChange={e => set('secondary_color', e.target.value)} className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                <Input value={form.secondary_color || ''} onChange={e => set('secondary_color', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs flex-1" />
              </div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Typography</Label><Input value={form.typography || ''} onChange={e => set('typography', e.target.value)} placeholder="e.g. Inter, Oswald" className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>
          <div><Label className="text-xs text-muted-foreground">Brand Description</Label><Textarea value={form.brand_description || ''} onChange={e => set('brand_description', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Intro Text</Label><Textarea value={form.intro_text || ''} onChange={e => set('intro_text', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
            <div><Label className="text-xs text-muted-foreground">Outro Text</Label><Textarea value={form.outro_text || ''} onChange={e => set('outro_text', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
          </div>
          <div><Label className="text-xs text-muted-foreground">Social Accounts (comma-separated)</Label><Input value={form.social_accounts || ''} onChange={e => set('social_accounts', e.target.value)} placeholder="@TexasNomad, youtube.com/..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Brand Guidelines</Label><Textarea value={form.brand_guidelines || ''} onChange={e => set('brand_guidelines', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>
          <div><Label className="text-xs text-muted-foreground">Brand Notes</Label><Textarea value={form.brand_notes || ''} onChange={e => set('brand_notes', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1 min-h-16" /></div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Brand Asset Library</Label>
            <BrandAssetSection assets={form.brand_assets || '[]'} onChange={v => set('brand_assets', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Alternate Logos (comma-separated URLs)</Label><Input value={form.alternate_logos || ''} onChange={e => set('alternate_logos', e.target.value)} placeholder="https://logo2.png, ..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Default Template IDs (comma-separated)</Label><Input value={form.default_template_ids || ''} onChange={e => set('default_template_ids', e.target.value)} placeholder="template-id-1, ..." className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs text-muted-foreground">Intro Graphics (URLs)</Label><Input value={form.intro_graphics || ''} onChange={e => set('intro_graphics', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Outro Graphics (URLs)</Label><Input value={form.outro_graphics || ''} onChange={e => set('outro_graphics', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
            <div><Label className="text-xs text-muted-foreground">Sponsor Graphics (URLs)</Label><Input value={form.sponsor_graphics || ''} onChange={e => set('sponsor_graphics', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs mt-1" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="border-white/10 text-white text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={handleSave} disabled={saving || !form.brand_name}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            {profile ? 'Save Changes' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}