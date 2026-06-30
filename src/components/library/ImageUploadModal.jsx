import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const IMAGE_TYPES = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'ai_generated', label: 'AI Generated' },
  { value: 'approved_graphic', label: 'Approved Graphic' },
  { value: 'brand_asset', label: 'Brand Asset' },
  { value: 'thumbnail', label: 'Thumbnail' },
];

export default function ImageUploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [imageType, setImageType] = useState('uploaded');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async () => {
    if (!file || !title) return;
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const formatMap = { jpg: 'jpg', jpeg: 'jpeg', png: 'png', webp: 'webp', svg: 'svg' };
      await base44.entities.ImageAsset.create({
        title,
        image_url: file_url,
        image_type: imageType,
        tags,
        file_format: formatMap[ext] || 'other',
        approval_status: 'pending',
      });
      toast({ title: 'Image uploaded', description: title });
      setFile(null);
      setPreview(null);
      setTitle('');
      setTags('');
      setImageType('uploaded');
      onUploaded();
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-berna-purple" />
            Upload Image
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {preview && (
            <div className="rounded-lg overflow-hidden bg-black/20 max-h-48 flex items-center justify-center">
              <img src={preview} alt="Preview" className="max-h-48 w-auto" />
            </div>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Image File</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs cursor-pointer"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Image title..."
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Image Type</Label>
            <Select value={imageType} onValueChange={setImageType}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" />Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="breaking, politics, interview..."
              className="bg-white/[0.03] border-white/[0.08] text-white text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/[0.04] text-xs">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || !title || saving} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            {saving ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}