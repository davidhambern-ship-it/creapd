import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search as SearchIcon, Compass, ArrowUpDown, CheckSquare,
  Square, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StoryCard from '@/components/stories/StoryCard';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import { logActivity } from '@/lib/activityUtils';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'recently_edited', label: 'Recently Edited' },
  { value: 'publication_date', label: 'Publication Date' },
  { value: 'priority', label: 'Story Priority' },
];

function sortArticles(articles, sortBy) {
  const sorted = [...articles];
  switch (sortBy) {
    case 'oldest': return sorted.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    case 'alphabetical': return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'recently_edited': return sorted.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
    case 'publication_date': return sorted.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    case 'priority': return sorted.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    default: return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

export default function StoryQueue() {
  const [articles, setArticles] = useState([]);
  const [packages, setPackages] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('storyQueueSort') || 'newest');
  const [tab, setTab] = useState('active');
  const [directionOpen, setDirectionOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedStoryIds') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('storyQueueSort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('selectedStoryIds', JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const [arts, pkgs, notes] = await Promise.all([
        base44.entities.Article.filter({}, '-created_date', 50),
        base44.entities.ProductionPackage.list('-created_date', 200),
        base44.entities.ProducerNote.list('-created_date', 200),
      ]);
      setArticles(arts);
      const pkgMap = {};
      pkgs.forEach(p => { if (p.article_id) pkgMap[p.article_id] = p; });
      setPackages(pkgMap);
      const nMap = {};
      notes.forEach(n => { if (n.article_id) nMap[n.article_id] = true; });
      setNotesMap(nMap);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status, reason) => {
    const update = { status };
    if (reason) update.rejection_reason = reason;
    await base44.entities.Article.update(id, update);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
    const article = articles.find(a => a.id === id);
    const actionMap = { approved: 'approve', rejected: 'reject', saved_for_later: 'update', bernas_pick: 'approve', needs_research: 'update' };
    logActivity(actionMap[status] || 'update', {
      entity_type: 'Article',
      entity_id: id,
      entity_name: article?.title || '',
      details: `Status changed to "${status}"${reason ? `: ${reason}` : ''}`,
    });
  };

  const handleArchive = async (id) => {
    await base44.entities.Article.update(id, { status: 'saved_for_later' });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'saved_for_later' } : a));
    const article = articles.find(a => a.id === id);
    logActivity('update', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Story archived' });
  };

  const handleDelete = async (id) => {
    await base44.entities.Article.delete(id);
    setArticles(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
    const article = articles.find(a => a.id === id);
    logActivity('delete', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Story deleted from queue' });
  };

  const handleSelect = (id) => setSelectedIds(prev => [...prev, id]);
  const handleDeselect = (id) => setSelectedIds(prev => prev.filter(sid => sid !== id));
  const selectAll = () => setSelectedIds(filtered.map(a => a.id));
  const deselectAll = () => setSelectedIds([]);

  const activeStatuses = ['pending', 'approved', 'bernas_pick', 'needs_research', 'saved_for_later'];
  const rejectedStatuses = ['rejected'];

  const sourceNames = useMemo(() => {
    const set = new Set(articles.map(a => a.source_name).filter(Boolean));
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles.filter(a => {
      if (tab === 'active' && !activeStatuses.includes(a.status)) return false;
      if (tab === 'rejected' && !rejectedStatuses.includes(a.status)) return false;
      if (tab === 'used' && a.status !== 'used') return false;
      if (searchTerm && !a.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && a.source_name !== sourceFilter) return false;
      if (dateFilter === 'today' && !isWithinDays(a.published_at, 1)) return false;
      if (dateFilter === 'week' && !isWithinDays(a.published_at, 7)) return false;
      if (dateFilter === 'month' && !isWithinDays(a.published_at, 30)) return false;
      return true;
    });
    return sortArticles(result, sortBy);
  }, [articles, tab, searchTerm, categoryFilter, statusFilter, sourceFilter, dateFilter, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Story Queue</h1>
          <p className="text-xs text-muted-foreground mt-1">Assignment desk — review and manage incoming stories</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setDirectionOpen(true)} className="border-berna-orange/20 text-berna-orange text-xs hover:bg-berna-orange/10">
            <Compass className="w-3 h-3 mr-1" />Change Direction
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{articles.length} total</span>
            <span>·</span>
            <span className="text-berna-emerald">{articles.filter(a => a.status === 'approved' || a.status === 'bernas_pick').length} approved</span>
            <span>·</span>
            <span className="text-berna-purple">{selectedIds.length} selected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03]">
        {[
          { key: 'active', label: 'Active', count: articles.filter(a => activeStatuses.includes(a.status)).length },
          { key: 'rejected', label: 'Rejected', count: articles.filter(a => a.status === 'rejected').length },
          { key: 'used', label: 'Used', count: articles.filter(a => a.status === 'used').length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/[0.08] text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stories..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ai_business">AI & Business</SelectItem>
            <SelectItem value="manufacturing">Manufacturing</SelectItem>
            <SelectItem value="small_business">Small Business</SelectItem>
            <SelectItem value="state_economy">State Economy</SelectItem>
            <SelectItem value="hiring">Hiring</SelectItem>
            <SelectItem value="food_agriculture">Food & Agriculture</SelectItem>
            <SelectItem value="creator_economy">Creator Economy</SelectItem>
            <SelectItem value="science">Science</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="bernas_pick">Berna's Pick</SelectItem>
            <SelectItem value="needs_research">Needs Research</SelectItem>
            <SelectItem value="saved_for_later">Saved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10 max-h-60">
            <SelectItem value="all">All Sources</SelectItem>
            {sourceNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <ArrowUpDown className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection bar */}
      {tab === 'active' && filtered.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-berna-emerald/[0.04] border border-berna-emerald/10">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-berna-emerald hover:text-berna-emerald/80">
            <CheckSquare className="w-3.5 h-3.5" />Select All
          </button>
          <button onClick={deselectAll} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white">
            <Square className="w-3.5 h-3.5" />Deselect All
          </button>
          <span className="text-xs text-muted-foreground ml-auto">
            {selectedIds.length} selected for production
          </span>
          {selectedIds.length > 0 && (
            <Link to="/production">
              <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7">
                <Layers className="w-3 h-3 mr-1" />Send to Production
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Story Cards */}
      <div className="space-y-3">
        {filtered.map(article => (
          <StoryCard
            key={article.id}
            article={article}
            pkg={packages[article.id]}
            hasNotes={!!notesMap[article.id]}
            isSelected={selectedIds.includes(article.id)}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            onStatusChange={updateStatus}
            onArchive={handleArchive}
            onDelete={handleDelete}
            tab={tab}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No stories match your filters</p>
        </div>
      )}

      <ChangeDirectionModal open={directionOpen} currentFocus="" onClose={() => setDirectionOpen(false)} />
    </div>
  );
}