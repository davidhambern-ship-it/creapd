import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Bookmark, Search as SearchIcon, Trash2, Layers, Archive, ExternalLink, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CategoryBadge from '@/components/shared/CategoryBadge';
import SortDropdown from '@/components/shared/SortDropdown';
import { logActivity } from '@/lib/activityUtils';

export default function StoryLibrary() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('librarySort') || 'newest');

  useEffect(() => { loadSaved(); }, []);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const [saved, pkgs] = await Promise.all([
        base44.entities.Article.filter({ is_saved: true }, '-created_date', 100),
        base44.entities.ProductionPackage.filter({ status: 'generated' }, '-created_date', 100),
      ]);
      const packageArticleIds = [...new Set(pkgs.map(p => p.article_id).filter(Boolean))];
      const packageArticles = (await Promise.all(
        packageArticleIds.map(id => base44.entities.Article.get(id).catch(() => null))
      )).filter(Boolean);
      const savedIds = new Set(saved.map(a => a.id));
      const merged = [...saved, ...packageArticles.filter(a => !savedIds.has(a.id))];
      setArticles(merged);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    await base44.entities.Article.update(id, { is_saved: false, status: 'pending' });
    setArticles(prev => prev.filter(a => a.id !== id));
    logActivity('update', { entity_type: 'Article', entity_id: id, details: 'Removed from story library' });
  };

  const handleDelete = async (id) => {
    await base44.entities.Article.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
    logActivity('delete', { entity_type: 'Article', entity_id: id, details: 'Story deleted from library' });
  };

  const handleArchive = async (id) => {
    await base44.entities.Article.update(id, { status: 'archived', is_saved: false });
    setArticles(prev => prev.filter(a => a.id !== id));
    logActivity('update', { entity_type: 'Article', entity_id: id, details: 'Story archived from library' });
  };

  const categories = useMemo(() => {
    const set = new Set(articles.map(a => a.category).filter(Boolean));
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles.filter(a => {
      if (search) {
        const term = search.toLowerCase();
        const haystack = [a.title, a.summary, a.source_name, a.tags, a.author, a.state, a.industry].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      return true;
    });
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'priority': return result.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  }, [articles, search, categoryFilter, sortBy]);

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
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-400" />
            Story Package Library
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Your saved stories and generated packages — review, categorize, and add to future productions</p>
        </div>
        <span className="text-xs text-muted-foreground">{articles.length} stories</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search saved stories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
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

      {/* Story list */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {articles.length === 0 ? 'No stories yet. Save stories from the Story Queue or generate packages to build your library.' : 'No stories match your filters.'}
          </p>
          {articles.length === 0 && (
            <Link to="/queue" className="inline-block mt-4">
              <Button variant="outline" size="sm" className="border-white/10 text-white text-xs">Go to Story Queue</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const tags = a.tags ? a.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
            return (
              <div key={a.id} className="glass-panel p-4 hover:border-white/[0.12] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link to={`/story/${a.id}`}>
                      <h3 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">{a.title}</h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {a.category && <CategoryBadge category={a.category} />}
                      {a.source_name && <span className="text-[10px] text-muted-foreground">{a.source_name}</span>}
                      {a.published_at && <span className="text-[10px] text-muted-foreground font-mono">{new Date(a.published_at).toLocaleDateString()}</span>}
                    </div>
                    {a.summary && <p className="text-xs text-white/60 mt-2 line-clamp-2">{a.summary}</p>}
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
                    {a.url && (
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white p-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <Link to="/workspace" className="text-berna-emerald hover:text-berna-emerald/80 p-1" title="Send to Manager">
                      <Layers className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => handleArchive(a.id)} className="text-muted-foreground hover:text-yellow-400 p-1" title="Archive">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRemove(a.id)} className="text-muted-foreground hover:text-blue-400 p-1" title="Remove from library">
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-red-400 p-1" title="Delete">
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