import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search as SearchIcon, Compass, ArrowUpDown, CheckSquare,
  Square, Layers, RefreshCw, Bookmark, Copy, Loader2, Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StoryCard from '@/components/stories/StoryCard';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import ContentIntelligenceControls from '@/components/shared/ContentIntelligenceControls';
import { logActivity } from '@/lib/activityUtils';
import CreapdLoading from '@/components/shared/CreapdLoading';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'recently_edited', label: 'Recently Edited' },
  { value: 'publication_date', label: 'Publication Date' },
  { value: 'priority', label: 'Highest Priority' },
  { value: 'source', label: 'Source' },
  { value: 'custom', label: 'Custom Order' },
];

function sortArticles(articles, sortBy, selectedIds = []) {
  const sorted = [...articles];
  switch (sortBy) {
    case 'oldest': return sorted.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    case 'alphabetical': return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'recently_edited': return sorted.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
    case 'publication_date': return sorted.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    case 'priority': return sorted.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    case 'source': return sorted.sort((a, b) => (a.source_name || '').localeCompare(b.source_name || ''));
    case 'custom': return sorted.sort((a, b) => {
      const aIdx = selectedIds.indexOf(a.id);
      const bIdx = selectedIds.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
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
  const [selectionFilter, setSelectionFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('storyQueueSort') || 'newest');
  const [tab, setTab] = useState('active');
  const [directionOpen, setDirectionOpen] = useState(false);
  const [groupDuplicates, setGroupDuplicates] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedStoryIds') || '[]'); } catch { return []; }
  });
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);

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
        base44.entities.ProductionPackage.filter({ production_profile: 'news' }, '-created_date', 200),
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
    if (status === 'saved_for_later') update.is_saved = true;

    if (status === 'rejected') {
      // Archive immediately and remove from view
      update.archived_date = new Date().toISOString();
      setArticles(prev => prev.filter(a => a.id !== id));
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
    }

    await base44.entities.Article.update(id, update);

    const article = articles.find(a => a.id === id);
    const actionMap = { approved: 'approve', rejected: 'reject', saved_for_later: 'update', bernas_pick: 'approve', needs_research: 'update' };
    logActivity(actionMap[status] || 'update', {
      entity_type: 'Article',
      entity_id: id,
      entity_name: article?.title || '',
      details: `Status changed to "${status}"${reason ? `: ${reason}` : ''}`,
    });

    // Auto-load a new story to replace the rejected one
    if (status === 'rejected') {
      try {
        await base44.functions.invoke('fetchStories', {});
      } catch (e) {
        console.error('Auto-fetch replacement story failed:', e);
      }
      loadArticles();
    }
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

  const READY_STATUSES = ['generated', 'edited', 'approved'];
  const selectedReady = selectedIds.filter(id => {
    const p = packages[id];
    return p && READY_STATUSES.includes(p.status);
  });
  const allSelectedReady = selectedIds.length > 0 && selectedReady.length === selectedIds.length;

  const handleSendToManager = async () => {
    const readyIds = selectedReady;
    if (readyIds.length === 0) return;
    setSending(true);
    try {
      await base44.entities.Article.updateMany(
        { id: { $in: readyIds } },
        { $set: { status: 'approved' } }
      );
      logActivity('approve', {
        entity_type: 'Article',
        entity_name: `${readyIds.length} story${readyIds.length > 1 ? 'ies' : ''}`,
        details: `Sent ${readyIds.length} story${readyIds.length > 1 ? 'ies' : ''} to Story Manager`,
      });
      navigate('/workspace');
    } catch (e) {
      console.error('Failed to send stories to manager:', e);
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const handleSave = async (id) => {
    await base44.entities.Article.update(id, { is_saved: true, status: 'saved_for_later' });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, is_saved: true, status: 'saved_for_later' } : a));
    const article = articles.find(a => a.id === id);
    logActivity('update', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Story saved to library' });
  };

  const activeStatuses = ['pending', 'approved', 'bernas_pick', 'needs_research', 'saved_for_later'];
  const rejectedStatuses = ['rejected'];

  const sourceNames = useMemo(() => {
    const set = new Set(articles.map(a => a.source_name).filter(Boolean));
    return Array.from(set).sort();
  }, [articles]);

  const categoryOptions = useMemo(() => {
    const set = new Set(articles.map(a => a.category).filter(Boolean));
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles.filter(a => {
      if (tab === 'active' && !activeStatuses.includes(a.status)) return false;
      if (tab === 'rejected' && !rejectedStatuses.includes(a.status)) return false;
      if (tab === 'used' && a.status !== 'used') return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = [a.title, a.summary, a.source_name, a.publication, a.author, a.tags, a.companies, a.people, a.state, a.industry].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && a.source_name !== sourceFilter) return false;
      if (dateFilter === 'today' && !isWithinDays(a.published_at, 1)) return false;
      if (dateFilter === 'week' && !isWithinDays(a.published_at, 7)) return false;
      if (dateFilter === 'month' && !isWithinDays(a.published_at, 30)) return false;
      if (selectionFilter === 'selected' && !selectedIds.includes(a.id)) return false;
      if (selectionFilter === 'unselected' && selectedIds.includes(a.id)) return false;
      if (selectionFilter === 'saved' && !a.is_saved && a.status !== 'saved_for_later') return false;
      return true;
    });
    return sortArticles(result, sortBy, selectedIds);
  }, [articles, tab, searchTerm, categoryFilter, statusFilter, sourceFilter, dateFilter, selectionFilter, sortBy, selectedIds]);

  // Group duplicate stories (duplicate_score > 3, same category or similar title)
  const groupedFiltered = useMemo(() => {
    if (!groupDuplicates) return filtered.map(a => ({ primary: a, duplicates: [] }));
    const used = new Set();
    const groups = [];
    filtered.forEach(a => {
      if (used.has(a.id)) return;
      if ((a.duplicate_score || 0) <= 3) {
        groups.push({ primary: a, duplicates: [] });
        used.add(a.id);
        return;
      }
      const dups = filtered.filter(b =>
        b.id !== a.id &&
        !used.has(b.id) &&
        (b.duplicate_score || 0) > 3 &&
        b.category === a.category &&
        (a.duplicate_group_id ? a.duplicate_group_id === b.duplicate_group_id : true)
      );
      dups.forEach(d => used.add(d.id));
      groups.push({ primary: a, duplicates: dups });
    });
    return groups;
  }, [filtered, groupDuplicates]);

  if (loading) {
    return <CreapdLoading fullHeight profile="news" />;
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Story Queue</h1>
          <p className="text-xs text-muted-foreground mt-1">Assignment desk — review and manage incoming stories</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/review" className="border-berna-purple/20 text-berna-purple text-xs hover:bg-berna-purple/10 inline-flex items-center justify-center gap-2 h-8 rounded-md px-3">
              <Sparkles className="w-3 h-3" />Intelligence Review
            </Link>
          </Button>
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
          <SelectContent className="bg-card border-white/10 max-h-60">
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
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
        <Select value={selectionFilter} onValueChange={setSelectionFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue placeholder="Selection" />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Stories</SelectItem>
            <SelectItem value="selected">Selected Only</SelectItem>
            <SelectItem value="unselected">Unselected Only</SelectItem>
            <SelectItem value="saved">Saved Stories</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setGroupDuplicates(!groupDuplicates)}
          className={`px-3 h-9 rounded-md text-xs font-medium border transition-colors ${
            groupDuplicates ? 'bg-berna-purple/10 border-berna-purple/30 text-berna-purple' : 'bg-white/[0.03] border-white/[0.08] text-muted-foreground'
          }`}
          title="Group duplicate stories"
        >
          <Copy className="w-3 h-3 inline mr-1" />
          Group Duplicates
        </button>
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
            {selectedIds.length} selected · {selectedReady.length} ready
          </span>
          {selectedIds.length > 0 && (
            <Button
              size="sm"
              className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7"
              onClick={handleSendToManager}
              disabled={sending || !allSelectedReady}
              title={!allSelectedReady ? 'All selected stories need a generated package' : ''}
            >
              {sending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Layers className="w-3 h-3 mr-1" />}
              {sending ? 'Sending...' : 'Send to Manager'}
            </Button>
          )}
        </div>
      )}

      {/* Story Cards */}
      <div className="space-y-3">
        {groupedFiltered.map(({ primary, duplicates }) => (
          <div key={primary.id} className="space-y-1">
            <StoryCard
              article={primary}
              pkg={packages[primary.id]}
              hasNotes={!!notesMap[primary.id]}
              isSelected={selectedIds.includes(primary.id)}
              onSelect={handleSelect}
              onDeselect={handleDeselect}
              onStatusChange={updateStatus}
              onArchive={handleArchive}
              onDelete={handleDelete}
              tab={tab}
            />
            {duplicates.length > 0 && (
              <div className="ml-8 px-3 py-1.5 rounded-lg bg-yellow-400/[0.04] border border-yellow-400/10 flex items-center gap-2">
                <Copy className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400">{duplicates.length} additional source{duplicates.length > 1 ? 's' : ''} reporting same story</span>
                <Link to={`/story/${primary.id}`} className="text-[10px] text-berna-purple hover:underline ml-auto">
                  View all sources →
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {groupedFiltered.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No stories match your filters</p>
        </div>
      )}

      <ContentIntelligenceControls articles={articles} onRefresh={loadArticles} />

      <ChangeDirectionModal open={directionOpen} currentFocus="" onClose={() => setDirectionOpen(false)} />
    </div>
  );
}