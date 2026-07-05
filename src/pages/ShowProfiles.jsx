import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Star, Pencil, Trash2, Tv, Clock, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ShowProfileEditor from '@/components/profiles/ShowProfileEditor';
import SortDropdown from '@/components/shared/SortDropdown';

export default function ShowProfiles() {
  const [shows, setShows] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [brandFilter, setBrandFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('showSort') || 'newest');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        base44.entities.ShowProfile.list('-created_date', 100),
        base44.entities.BrandProfile.list('-created_date', 100),
      ]);
      setShows(s);
      setBrands(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const brandMap = {};
  brands.forEach(b => { brandMap[b.id] = b; });

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.ShowProfile.update(editing.id, form);
    } else {
      await base44.entities.ShowProfile.create(form);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this show profile?')) return;
    await base44.entities.ShowProfile.delete(id);
    load();
  };

  const toggleFavorite = async (show) => {
    await base44.entities.ShowProfile.update(show.id, { is_favorite: !show.is_favorite });
    load();
  };

  const filtered = useMemo(() => {
    let result = brandFilter === 'all' ? shows : shows.filter(s => s.brand_profile_id === brandFilter);
    result = result.filter(s => !search || s.show_name?.toLowerCase().includes(search.toLowerCase()));
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (a.show_name || '').localeCompare(b.show_name || ''));
      case 'favorites': return result.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0));
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  }, [shows, brandFilter, sortBy, search]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Show Profiles</h1>
          <p className="text-xs text-muted-foreground mt-1">Reusable production configurations — tone, style, runtime, and AI preferences</p>
        </div>
        <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="w-3 h-3 mr-1" />Create Show
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search shows..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8" />
        </div>
        {brands.length > 0 && (
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8"><SelectValue placeholder="Filter by brand" /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all" className="text-xs">All Brands</SelectItem>
              {brands.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.brand_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <SortDropdown value={sortBy} onChange={setSortBy} storageKey="showSort" options={[
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
          { value: 'alphabetical', label: 'Alphabetical' },
          { value: 'favorites', label: 'Favorites First' },
        ]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(show => {
          const brand = brandMap[show.brand_profile_id];
          return (
            <div key={show.id} className="glass-panel p-4 hover:border-white/[0.12] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple/20 to-berna-emerald/20 flex items-center justify-center">
                    <Tv className="w-4 h-4 text-berna-purple" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{show.show_name}</h3>
                    {brand && <p className="text-[10px] text-muted-foreground">{brand.brand_name}</p>}
                  </div>
                </div>
                <button onClick={() => toggleFavorite(show)} className="flex-shrink-0">
                  <Star className={`w-4 h-4 ${show.is_favorite ? 'text-berna-orange fill-berna-orange' : 'text-muted-foreground hover:text-berna-orange'}`} />
                </button>
              </div>

              {show.host_names && <p className="text-[10px] text-muted-foreground mb-2">Host: {show.host_names}</p>}

              <div className="flex flex-wrap gap-1.5 mb-3">
                {show.content_domain && show.content_domain !== 'news' && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-berna-emerald/10 text-berna-emerald flex items-center gap-0.5 capitalize"><Zap className="w-2.5 h-2.5" />{show.content_domain}</span>
                )}
                {show.default_tone && <span className="text-[9px] px-2 py-0.5 rounded-full bg-berna-purple/10 text-berna-purple capitalize">{show.default_tone.replace(/_/g, ' ')}</span>}
                {show.reading_style && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground capitalize">{show.reading_style.replace(/_/g, ' ')}</span>}
                {show.target_runtime && <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{show.target_runtime}</span>}
              </div>

              {show.preferred_categories && <p className="text-[10px] text-muted-foreground mb-2 truncate">Categories: {show.preferred_categories}</p>}
              {show.audience && <p className="text-[10px] text-muted-foreground mb-3">Audience: {show.audience}</p>}

              <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-white" onClick={() => { setEditing(show); setEditorOpen(true); }}>
                  <Pencil className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 text-red-400 hover:bg-red-500/10 ml-auto" onClick={() => handleDelete(show.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">No Show Profiles Yet</h2>
          <p className="text-xs text-muted-foreground mb-4">Create a show profile to save reusable production settings like tone, style, and runtime.</p>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Plus className="w-3 h-3 mr-1" />Create Your First Show
          </Button>
        </div>
      )}

      <ShowProfileEditor open={editorOpen} profile={editing} brands={brands} onClose={() => setEditorOpen(false)} onSave={handleSave} />
    </div>
  );
}