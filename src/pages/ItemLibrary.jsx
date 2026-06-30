import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Bookmark, Search as SearchIcon, Trash2, Layers, Archive, ExternalLink, Tag, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryBadge from '@/components/shared/CategoryBadge';
import SortDropdown from '@/components/shared/SortDropdown';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';
import { logActivity } from '@/lib/activityUtils';

export default function ItemLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('librarySort') || 'newest');
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => { 
    const stored = sessionStorage.getItem('activeProductionProfile');
    if (stored) setActiveProfile(JSON.parse(stored));
    loadSaved(); 
  }, []);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const query = activeProfile 
        ? { is_selected: true, production_profile_id: activeProfile.id }
        : { is_selected: true };
      const saved = await base44.entities.ProductionItem.filter(query, '-created_date', 100);
      setItems(saved);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    await base44.entities.ProductionItem.update(id, { is_selected: false, status: 'new' });
    setItems(prev => prev.filter(i => i.id !== id));
    logActivity('update', { entity_type: 'ProductionItem', entity_id: id, details: 'Removed from item library' });
  };

  const handleDelete = async (id) => {
    await base44.entities.ProductionItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    logActivity('delete', { entity_type: 'ProductionItem', entity_id: id, details: 'Item deleted from library' });
  };

  const handleArchive = async (id) => {
    await base44.entities.ProductionItem.update(id, { status: 'archived', is_selected: false });
    setItems(prev => prev.filter(i => i.id !== id));
    logActivity('update', { entity_type: 'ProductionItem', entity_id: id, details: 'Item archived from library' });
  };

  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(i => {
      if (search) {
        const term = search.toLowerCase();
        const haystack = [i.title, i.summary, i.source, i.tags, i.content].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      return true;
    });
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'priority': return result.sort((a, b) => {
        const priorityOrder = { breaking: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(b.created_date));
    }
  }, [items, search, categoryFilter, sortBy]);

  const getItemTypeLabel = () => {
    if (!activeProfile) return 'Items';
    const type = activeProfile.profile_type;
    if (type === 'music_show') return 'Songs';
    if (type === 'cooking_show') return 'Recipes';
    if (type === 'podcast') return 'Topics';
    if (type === 'sports_show') return 'Stories';
    if (type === 'church_service') return 'Scriptures';
    return 'Items';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-white">{getItemTypeLabel()} Library</h1>
            {activeProfile && <ProductionProfileBadge profileType={activeProfile.profile_type} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Your saved {getItemTypeLabel().toLowerCase()} — review, categorize, and add to future productions</p>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} saved</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Search saved ${getItemTypeLabel().toLowerCase()}...`} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" 
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <SortDropdown value={sortBy} onChange={setSortBy} storageKey="librarySort" options={[
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
          { value: 'alphabetical', label: 'Alphabetical' },
          { value: 'priority', label: 'Highest Priority' },
        ]} />
      </div>

      {/* Item list */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? `No saved ${getItemTypeLabel().toLowerCase()} yet. Save ${getItemTypeLabel().toLowerCase()} from the ${getItemTypeLabel()} Queue to build your library.` : `No ${getItemTypeLabel().toLowerCase()} match your filters.`}
          </p>
          {items.length === 0 && (
            <Link to="/queue" className="inline-block mt-4">
              <Button variant="outline" size="sm" className="border-white/10 text-white text-xs">Go to {getItemTypeLabel()} Queue</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const tags = item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            return (
              <div key={item.id} className="glass-panel p-4 hover:border-white/[0.12] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/story/${item.id}`}>
                      <h3 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">{item.title}</h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {item.item_type && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-berna-purple/10 border border-berna-purple/20 text-[9px] text-berna-purple capitalize">
                          {item.item_type.replace('_', ' ')}
                        </span>
                      )}
                      {item.category && <CategoryBadge category={item.category} />}
                      {item.source && <span className="text-[10px] text-muted-foreground">{item.source}</span>}
                      {item.created_date && <span className="text-[10px] text-muted-foreground font-mono">{new Date(item.created_date).toLocaleDateString()}</span>}
                    </div>
                    {item.summary && <p className="text-xs text-white/60 mt-2 line-clamp-2">{item.summary}</p>}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-berna-purple/10 border border-berna-purple/20 text-[9px] text-berna-purple">
                            <Tag className="w-2 h-2" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {item.source_url && (
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white p-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Link to="/workspace" className="text-berna-emerald hover:text-berna-emerald/80 p-1" title="Add to production">
                      <Layers className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => handleArchive(item.id)} className="text-muted-foreground hover:text-yellow-400 p-1" title="Archive">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRemove(item.id)} className="text-muted-foreground hover:text-blue-400 p-1" title="Remove from library">
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-red-400 p-1" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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