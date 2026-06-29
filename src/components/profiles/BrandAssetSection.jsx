import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, Loader2, ImageIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const ASSET_TYPES = [
  { value: 'logo', label: 'Logo' },
  { value: 'alternate_logo', label: 'Alternate Logo' },
  { value: 'icon', label: 'Icon' },
  { value: 'background', label: 'Background' },
  { value: 'sponsor_logo', label: 'Sponsor Logo' },
  { value: 'watermark', label: 'Watermark' },
  { value: 'station_bug', label: 'Station Bug' },
  { value: 'other', label: 'Other' },
];

function parseAssets(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

export default function BrandAssetSection({ assets, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [newType, setNewType] = useState('logo');
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  const list = parseAssets(assets);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url || result?.data?.file_url;
      if (!url) throw new Error('Upload failed');
      const entry = {
        type: newType,
        name: newName || file.name.replace(/\.[^/.]+$/, ''),
        url,
      };
      onChange(JSON.stringify([...list, entry]));
      setNewName('');
      toast({ title: 'Asset uploaded' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = (idx) => {
    const next = list.filter((_, i) => i !== idx);
    onChange(JSON.stringify(next));
  };

  return (
    <div className="space-y-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <Label className="text-xs text-muted-foreground">Brand Asset Library</Label>
      <p className="text-[10px] text-muted-foreground -mt-1">Logos, icons, backgrounds, sponsor logos, watermarks, and station bugs</p>

      {/* Existing assets */}
      {list.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {list.map((asset, idx) => {
            const typeInfo = ASSET_TYPES.find(t => t.value === asset.type);
            return (
              <div key={idx} className="flex items-center gap-2 p-1.5 rounded-md bg-white/[0.03]">
                {asset.url ? (
                  <img src={asset.url} alt={asset.name} className="w-8 h-8 rounded object-cover border border-white/10 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/[0.04] flex items-center justify-center border border-white/10">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{asset.name}</p>
                  <span className="text-[9px] text-muted-foreground">{typeInfo?.label || asset.type}</span>
                </div>
                <button onClick={() => removeAsset(idx)} className="p-1 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new asset */}
      <div className="flex items-center gap-2">
        <Select value={newType} onValueChange={setNewType}>
          <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Asset name" className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-8 flex-1" />
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files[0])} />
          <div className="flex items-center gap-1 px-3 h-8 rounded-md bg-berna-purple hover:bg-berna-purple/90 text-white text-xs cursor-pointer">
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? 'Uploading' : 'Upload'}
          </div>
        </label>
      </div>
    </div>
  );
}