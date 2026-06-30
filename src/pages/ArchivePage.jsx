import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon, Calendar, Star, FileText, ChevronRight, Clock,
  Image as ImageIcon, Package, Archive as ArchiveIcon, RotateCcw, Trash2, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import SortDropdown from '@/components/shared/SortDropdown';
import { useToast } from '@/components/ui/use-toast';

const TABS = [
  { key: 'briefings', label: 'Briefings', icon: FileText },
  { key: 'stories', label: 'Stories', icon: FileText },
  { key: 'images', label: 'Images', icon: ImageIcon },
];

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('briefings');
  const [briefings, setBriefings] = useState([]);
  const [stories, setStories] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('archiveSort') || 'newest');
  const [restoring, setRestoring] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [briefs, arts, imgs] = await Promise.all([
        base44.entities.Briefing.filter({}, '-created_date', 50),
        base44.entities.Article.filter({ status: 'archived' }, '-created_date', 50),
        base44.entities.ImageAsset.filter({ approval_status: 'archived' }, '-created_date', 50),
      ]);
      setBriefings(briefs);
      setStories(arts);
      setImages(imgs);
    } catch (e) {
      console.error('Failed to load archive:', e);
    } finally {
      setLoading(false);
    }
  };

  const sortItems = (items) => {
    const sorted = [...items];
    switch (sortBy) {
      case 'oldest': return sorted.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return sorted.sort((a, b) => (a.title || a.brand_name || '').localeCompare(b.title || b.brand_name || ''));
      case 'date': return sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      default: return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  };

  const currentData = useMemo(() => {
    let items = activeTab === 'briefings' ? briefings : activeTab === 'stories' ? stories : images;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => {
        const title = (item.title || item.brand_name || '').toLowerCase();
        const sub = (item.theme || item.source_name || item.tags || '').toLowerCase();
        return title.includes(term) || sub.includes(term);
      });
    }
    return sortItems(items);
  }, [activeTab, briefings, stories, images, searchTerm, sortBy]);

  const handleRestoreStory = async (id) => {
    setRestoring(id);
    try {
      await base44.entities.Article.update(id, { status: 'pending' });
      setStories(prev => prev.filter(s => s.id !== id));
      toast({ title: 'Story restored', description: 'Story moved back to pending review.' });
    } catch (e) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setRestoring(null);
    }
  };

  const handleRestoreImage = async (id) => {
    setRestoring(id);
    try {
      await base44.entities.ImageAsset.update(id, { approval_status: 'pending' });
      setImages(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Image restored', description: 'Image moved back to pending review.' });
    } catch (e) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (id, type) => {
    if (!confirm('Permanently delete this asset? This cannot be undone.')) return;
    try {
      if (type === 'story') {
        await base44.entities.Article.delete(id);
        setStories(prev => prev.filter(s => s.id !== id));
      } else if (type === 'image') {
        await base44.entities.ImageAsset.delete(id);
        setImages(prev => prev.filter(i => i.id !== id));
      } else if (type === 'briefing') {
        await base44.entities.Briefing.delete(id);
        setBriefings(prev => prev.filter(b => b.id !== id));
      }
      toast({ title: 'Asset permanently deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  const counts = { briefings: briefings.length, stories: stories.length, images: images.length };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-berna-purple" />
            Archive
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Archived briefings, stories, and images — searchable and recoverable</p>
        </div>
        <span className="text-xs text-muted-foreground">{counts[activeTab]} items</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-panel p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-berna-purple text-white'
                : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className="opacity-60">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/[0.03] border-white/[0.08] text-white text-sm"
          />
        </div>
        <SortDropdown value={sortBy} onChange={setSortBy} storageKey="archiveSort" options={[
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
          { value: 'alphabetical', label: 'Alphabetical' },
          { value: 'date', label: 'Date' },
        ]} />
      </div>

      {/* Content */}
      {currentData.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <ArchiveIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? `No ${activeTab} match your search` : `No archived ${activeTab} yet`}
          </p>
        </div>
      ) : activeTab === 'images' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {currentData.map(img => (
            <div key={img.id} className="glass-panel overflow-hidden group">
              <div className="aspect-square bg-black/20 relative">
                {img.image_url && <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleRestoreImage(img.id)} disabled={restoring === img.id} className="border-white/20 text-white text-[10px] h-7 px-2">
                    {restoring === img.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Restore
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handlePermanentDelete(img.id, 'image')} className="text-[10px] h-7 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-white truncate">{img.title}</p>
                {img.tags && <p className="text-[9px] text-muted-foreground truncate">{img.tags}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {currentData.map(item => {
            const isStory = activeTab === 'stories';
            const isBriefing = activeTab === 'briefings';
            return (
              <div key={item.id} className="glass-panel p-4 hover:border-white/[0.12] transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isBriefing && (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-berna-purple" />
                          <span className="text-xs font-mono text-berna-purple">{item.date}</span>
                          <StatusBadge status={item.status} />
                        </>
                      )}
                      {isStory && (
                        <>
                          <FileText className="w-3.5 h-3.5 text-berna-orange" />
                          <span className="text-[10px] text-berna-orange uppercase tracking-wider">Archived Story</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      {item.theme && <span>Theme: {item.theme}</span>}
                      {item.source_name && <span>Source: {item.source_name}</span>}
                      {item.estimated_read_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.estimated_read_time}</span>
                      )}
                      {item.tags && <span>Tags: {item.tags}</span>}
                    </div>
                    {isBriefing && item.berna_pick_title && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
                        <span className="text-xs text-berna-orange">Pick: {item.berna_pick_title}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isStory && (
                      <Button size="sm" variant="outline" onClick={() => handleRestoreStory(item.id)} disabled={restoring === item.id} className="border-berna-emerald/20 text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7">
                        {restoring === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                        Restore
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handlePermanentDelete(item.id, isStory ? 'story' : 'briefing')} className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}