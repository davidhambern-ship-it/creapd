import React from 'react';
import { FileText, Save, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ASSET_LABELS, ASSET_OPTIONS } from '@/lib/exportUtils';

const FORMATS = [
  { value: 'pdf', label: 'PDF Document' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'text', label: 'Plain Text' },
  { value: 'teleprompter', label: 'Teleprompter' },
  { value: 'html', label: 'HTML' },
];

export default function ExportSettings({ format, setFormat, selectedAssets, toggleAsset, includeBranding, setIncludeBranding, profiles, profileName, setProfileName, onSaveProfile, onLoadProfile }) {
  return (
    <div className="glass-panel p-4 space-y-4">
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Export Format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {FORMATS.map(f => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Included Assets</Label>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {ASSET_OPTIONS.map(key => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs text-white/70 hover:text-white">
              <input
                type="checkbox"
                checked={selectedAssets.has(key)}
                onChange={() => toggleAsset(key)}
                className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.05] accent-berna-purple"
              />
              {ASSET_LABELS[key]}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
        <input
          type="checkbox"
          checked={includeBranding}
          onChange={e => setIncludeBranding(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.05] accent-berna-purple"
        />
        Include metadata & branding
      </label>

      {profiles.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Load Export Profile</Label>
          <Select value="" onValueChange={onLoadProfile}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Select a saved profile..." /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {profiles.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.is_favorite && <Star className="w-3 h-3 inline mr-1 text-berna-orange fill-berna-orange" />}
                  {p.name} ({p.format})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="pt-2 border-t border-white/[0.06]">
        <Label className="text-xs text-muted-foreground mb-1.5 block">Save Current Settings as Profile</Label>
        <div className="flex gap-2">
          <Input
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder="Profile name..."
            className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"
          />
          <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-8 px-2" onClick={onSaveProfile} disabled={!profileName.trim()}>
            <Save className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}