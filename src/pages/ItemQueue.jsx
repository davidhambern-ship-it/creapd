import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search as SearchIcon, Compass, ArrowUpDown, CheckSquare,
  Square, Layers, RefreshCw, Copy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ItemCard from '@/components/items/ItemCard';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import { logActivity } from '@/lib/activityUtils';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'recently_edited', label: 'Recently Edited' },
  { value: 'priority', label: 'Highest Priority' },
  { value: 'source', label: 'Source' },
];

function sortItems(items, sortBy, selectedIds = []) {
  const sorted = [...items];
  switch (sortBy) {
    case 'oldest': return sorted.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    case 'alphabetical': return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'recently_edited': return sorted.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
    case 'priority': return sorted.sort((a, b) => {
      const priorityOrder = { breaking: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
    case 'source': return sorted.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
    default: return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }
}

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

export default function ItemQueue() {
  const [items, setItems] = useState([]);
  const [packages, setPackages] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectionFilter, setSelectionFilter] = useState('all');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('itemQueueSort') || 'newest');
  const [tab, setTab] = useState('active');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('selectedItemIds') || '[]'); } catch { return []; }
  });
  const [activeProfile, setActiveProfile] = useState(null);
  const [directionOpen, setDirectionOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('activeProductionProfile');
    if (stored) {
      setActiveProfile(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('itemQueueSort', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('selectedItemIds', JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const query = activeProfile ? { production_profile_id: activeProfile.id } : {};
      const [its, pkgs, notes] = await Promise.all([
        base44.entities.ProductionItem.filter(query, '-created_date', 50),
        base44.entities.ProductionPackage.list('-created_date', 200),
        base44.entities.ProducerNote.list('-created_date', 200),
      ]);
      setItems(its);
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
    if (status === 'selected') update.is_selected = true;
    await base44.entities.ProductionItem.update(id, update);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...update } : i));
    const item = items.find(i => i.id === id);
    logActivity(status === 'selected' ? 'approve' : status === 'rejected' ? 'reject' : 'update', {
      entity_type: 'ProductionItem',
      entity_id: id,
      entity_name: item?.title || '',
      details: `Status changed to "${status}"${reason ? `: ${reason}` : ''}`,
    });
  };

  const handleArchive = async (id) => {
    await base44.entities.ProductionItem.update(id, { status: 'archived' });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'archived' } : i));
    logActivity('update', { entity_type: 'ProductionItem', entity_id: id, entity_name: items.find(i => i.id === id)?.title || '', details: 'Item archived' });
  };

  const handleDelete = async (id) => {
    await base44.entities.ProductionItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
    logActivity('delete', { entity_type: 'ProductionItem', entity_id: id, details: 'Item deleted from queue' });
  };

  const handleSelect = (id) => setSelectedIds(prev => [...prev, id]);
  const handleDeselect = (id) => setSelectedIds(prev => prev.filter(sid => sid !== id));
  const selectAll = () => setSelectedIds(filtered.map(i => i.id));
  const deselectAll = () => setSelectedIds([]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const activeStatuses = ['new', 'reviewing', 'selected', 'in_production'];
  const rejectedStatuses = ['rejected'];

  const sourceNames = useMemo(() => {
    const set = new Set(items.map(i => i.source).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const categoryOptions = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(i => {
      if (tab === 'active' && !activeStatuses.includes(i.status)) return false;
      if (tab === 'rejected' && !rejectedStatuses.includes(i.status)) return false;
      if (tab === 'archived' && i.status !== 'archived') return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = [i.title, i.summary, i.source, i.content, i.tags].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && i.source !== sourceFilter) return false;
      if (dateFilter === 'today' && !isWithinDays(i.created_date, 1)) return false;
      if (dateFilter === 'week' && !isWithinDays(i.created_date, 7)) return false;
      if (dateFilter === 'month' && !isWithinDays(i.created_date, 30)) return false;
      if (selectionFilter === 'selected' && !selectedIds.includes(i.id)) return false;
      if (selectionFilter === 'unselected' && selectedIds.includes(i.id)) return false;
      return true;
    });
    return sortItems(result, sortBy, selectedIds);
  }, [items, tab, searchTerm, categoryFilter, statusFilter, sourceFilter, dateFilter, selectionFilter, sortBy, selectedIds]);

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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{getItemTypeLabel()} Queue</h1>
            {activeProfile && <ProductionProfileBadge profileType={activeProfile.profile_type} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Assignment desk — review and manage incoming {getItemTypeLabel().toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{items.length} total</span>
            <span>·</span>
            <span className="text-berna-emerald">{items.filter(i => i.status === 'selected' || i.status === 'in_production').length} selected</span>
            <span>·</span>
            <span className="text-berna-purple">{selectedIds.length} selected</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03]">
        {[
          { key: 'active', label: 'Active', count: items.filter(i => activeStatuses.includes(i.status)).length },
          { key: 'rejected', label: 'Rejected', count: items.filter(i => i.status === 'rejected').length },
          { key: 'archived', label: 'Archived', count: items.filter(i => i.status === 'archived').length },
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
            placeholder={`Search ${getItemTypeLabel().toLowerCase()}...`}
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
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="in_production">In Production</SelectItem>
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
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="selected">Selected Only</SelectItem>
            <SelectItem value="unselected">Unselected Only</SelectItem>
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
            <Link to="/workspace">
              <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7">
                <Layers className="w-3 h-3 mr-1" />Send to Production
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Item Cards */}
      <div className="space-y-3">
        {filtered.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            pkg={packages[item.id]}
            hasNotes={!!notesMap[item.id]}
            isSelected={selectedIds.includes(item.id)}
            onSelect={handleSelect}
            onDeselect={handleDeselect}
            onStatusChange={updateStatus}
            onArchive={handleArchive}
            onDelete={handleDelete}
            tab={tab}
            itemTypeLabel={getItemTypeLabel()}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No {getItemTypeLabel().toLowerCase()} match your filters</p>
        </div>
      )}

      <ChangeDirectionModal open={directionOpen} currentFocus="" onClose={() => setDirectionOpen(false)} />
    </div>
  );
}