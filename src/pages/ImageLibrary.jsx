import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Image as ImageIcon, Upload, Search, Trash2, Archive, Star, X, Loader2, Tag, Filter, Download, CheckCircle, Clock, Film } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImageAssetCard from '@/components/library/ImageAssetCard';
import ImageUploadModal from '@/components/library/ImageUploadModal';

const IMAGE_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'ai_generated', label: 'AI Generated' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'approved_graphic', label: 'Approved Graphics' },
  { value: 'archived_graphic', label: 'Archived Graphics' },
  { value: 'brand_asset', label: 'Brand Assets' },
  { value: 'thumbnail', label: 'Thumbnails' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export default function ImageLibrary() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [assetTab, setAssetTab] = useState('all');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const data = await base44.entities.ImageAsset.list('-created_date', 100);
      setImages(data);
    } catch (e) {
      console.error('Failed to load images:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return images.filter(img => {
      if (search) {
        const term = search.toLowerCase();
        const matchesSearch = (img.title || '').toLowerCase().includes(term) ||
          (img.tags || '').toLowerCase().includes(term) ||
          (img.source_prompt || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }
      if (assetTab !== 'all' && (img.asset_type || 'image') !== assetTab) return false;
      if (typeFilter !== 'all' && img.image_type !== typeFilter) return false;
      if (statusFilter !== 'all' && img.approval_status !== statusFilter) return false;
      return true;
    });
  }, [images, search, typeFilter, statusFilter]);

  const handleDelete = async (id) => {
    await base44.entities.ImageAsset.delete(id);
    setImages(prev => prev.filter(i => i.id !== id));
    setSelectedImage(null);
  };

  const handleArchive = async (id) => {
    await base44.entities.ImageAsset.update(id, { approval_status: 'archived' });
    setImages(prev => prev.map(i => i.id === id ? { ...i, approval_status: 'archived' } : i));
    setSelectedImage(null);
  };

  const handleApprove = async (id) => {
    await base44.entities.ImageAsset.update(id, { approval_status: 'approved', image_type: 'approved_graphic' });
    setImages(prev => prev.map(i => i.id === id ? { ...i, approval_status: 'approved', image_type: 'approved_graphic' } : i));
    setSelectedImage(null);
  };

  const handleToggleFavorite = async (img) => {
    await base44.entities.ImageAsset.update(img.id, { is_favorite: !img.is_favorite });
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, is_favorite: !i.is_favorite } : i));
  };

  const counts = useMemo(() => {
    const c = { all: images.length };
    IMAGE_TYPES.slice(1).forEach(t => { c[t.value] = images.filter(i => i.image_type === t.value).length; });
    return c;
  }, [images]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-berna-purple" />
            Image/Video Library
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Centralized management for all production images, graphics, and videos</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 text-white text-xs h-8">
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Upload
        </Button>
      </div>

      {/* Asset Type Tabs */}
      <div className="flex gap-1.5">
        {[
          { value: 'all', label: 'All Media', icon: null },
          { value: 'image', label: 'Images', icon: ImageIcon },
          { value: 'video', label: 'Videos', icon: Film },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setAssetTab(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              assetTab === tab.value
                ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                : 'bg-white/[0.02] text-muted-foreground border border-white/[0.04] hover:text-white'
            }`}
          >
            {tab.icon && <tab.icon className="w-3 h-3" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2">
        {IMAGE_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              typeFilter === type.value
                ? 'bg-berna-purple text-white'
                : 'bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:text-white'
            }`}
          >
            {type.label}
            <span className="ml-1.5 opacity-60">{counts[type.value] || 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, tag, or prompt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/[0.03] border-white/[0.08] text-white text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-xs bg-white/[0.03] border-white/[0.08]">
            <Filter className="w-3 h-3 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Image Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(img => (
            <ImageAssetCard
              key={img.id}
              image={img}
              onClick={() => setSelectedImage(img)}
              onToggleFavorite={() => handleToggleFavorite(img)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || typeFilter !== 'all' || statusFilter !== 'all' || assetTab !== 'all'
              ? 'No media matches your filters'
              : 'No media yet. Upload images/videos or generate them from production packages.'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      <ImageUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploaded={() => { setShowUpload(false); loadImages(); }}
      />

      {/* Detail Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(v) => !v && setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedImage?.title || 'Image Details'}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden bg-black/20">
                {selectedImage.asset_type === 'video' ? (
                  <video src={selectedImage.image_url} controls className="w-full max-h-80 object-contain" />
                ) : (
                  <img src={selectedImage.image_url} alt={selectedImage.title} className="w-full max-h-80 object-contain" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Type</p>
                  <p className="text-white capitalize">{(selectedImage.image_type || '').replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Status</p>
                  <p className="text-white capitalize">{selectedImage.approval_status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Format</p>
                  <p className="text-white uppercase">{selectedImage.file_format}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Version</p>
                  <p className="text-white font-mono">v{selectedImage.version_number || 1}</p>
                </div>
                {selectedImage.tags && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedImage.tags.split(',').map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-berna-purple/10 text-berna-purple text-[10px]">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedImage.source_prompt && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Generation Prompt</p>
                    <p className="text-white/70 text-[11px] italic">{selectedImage.source_prompt}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                {selectedImage.approval_status !== 'approved' && (
                  <Button size="sm" onClick={() => handleApprove(selectedImage.id)} className="bg-berna-emerald hover:bg-berna-emerald/80 text-white text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />Approve
                  </Button>
                )}
                {selectedImage.approval_status !== 'archived' && (
                  <Button size="sm" variant="outline" onClick={() => handleArchive(selectedImage.id)} className="border-white/10 text-white hover:bg-white/[0.04] text-xs">
                    <Archive className="w-3 h-3 mr-1" />Archive
                  </Button>
                )}
                <a href={selectedImage.image_url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/[0.04] text-xs">
                    <Download className="w-3 h-3 mr-1" />Download
                  </Button>
                </a>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedImage.id)} className="text-xs ml-auto">
                  <Trash2 className="w-3 h-3 mr-1" />Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}