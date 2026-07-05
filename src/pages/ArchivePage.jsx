import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon, Calendar, FileText, ChevronRight, Clock,
  Archive as ArchiveIcon, RotateCcw, Trash2, Loader2, Package, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import SortDropdown from '@/components/shared/SortDropdown';
import { useToast } from '@/components/ui/use-toast';

const TABS = [
  { key: 'productions', label: 'Productions', icon: Package },
  { key: 'approved', label: 'Approved Articles', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rejected Articles', icon: XCircle },
];

function daysUntilDeletion(archivedDate) {
  if (!archivedDate) return null;
  const archived = new Date(archivedDate);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - archived.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 7 - elapsed);
}

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState('productions');
  const [productions, setProductions] = useState([]);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [rejectedArticles, setRejectedArticles] = useState([]);
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
      const [exportedProds, archivedProds, approvedArts, rejectedArts] = await Promise.all([
        base44.entities.Production.filter({ status: 'exported' }, '-created_date', 100),
        base44.entities.Production.filter({ status: 'archived' }, '-created_date', 100),
        base44.entities.Article.filter({ status: 'archived' }, '-archived_date', 100),
        base44.entities.Article.filter({ status: 'rejected' }, '-archived_date', 100),
      ]);
      setProductions([...exportedProds, ...archivedProds]);
      setApprovedArticles(approvedArts);
      setRejectedArticles(rejectedArts);
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
      case 'alphabetical': return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'date': return sorted.sort((a, b) => new Date(b.date || b.production_date || 0) - new Date(a.date || a.production_date || 0));
      default: return sorted.sort((a, b) => new Date(b.archived_date || b.created_date) - new Date(a.archived_date || a.created_date));
    }
  };

  const currentData = useMemo(() => {
    let items = activeTab === 'productions' ? productions : activeTab === 'approved' ? approvedArticles : rejectedArticles;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => {
        const title = (item.title || '').toLowerCase();
        const sub = (item.source_name || item.owner_name || item.tags || '').toLowerCase();
        return title.includes(term) || sub.includes(term);
      });
    }
    return sortItems(items);
  }, [activeTab, productions, approvedArticles, rejectedArticles, searchTerm, sortBy]);

  const handleRestoreArticle = async (id, type) => {
    setRestoring(id);
    try {
      await base44.entities.Article.update(id, { status: 'pending', archived_date: null });
      if (type === 'approved') {
        setApprovedArticles(prev => prev.filter(a => a.id !== id));
      } else {
        setRejectedArticles(prev => prev.filter(a => a.id !== id));
      }
      toast({ title: 'Article restored', description: 'Article moved back to pending review.' });
    } catch (e) {
      toast({ title: 'Restore failed', description: e.message, variant: 'destructive' });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (id, type) => {
    if (!confirm('Permanently delete this article? This cannot be undone.')) return;
    try {
      await base44.entities.Article.delete(id);
      if (type === 'approved') {
        setApprovedArticles(prev => prev.filter(a => a.id !== id));
      } else {
        setRejectedArticles(prev => prev.filter(a => a.id !== id));
      }
      toast({ title: 'Article permanently deleted' });
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

  const counts = { productions: productions.length, approved: approvedArticles.length, rejected: rejectedArticles.length };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ArchiveIcon className="w-5 h-5 text-berna-purple" />
            Archive
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Completed productions, approved articles, and rejected articles (auto-deleted after 7 days)</p>
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
      ) : activeTab === 'productions' ? (
        <div className="space-y-3">
          {currentData.map(prod => (
            <Link
              key={prod.id}
              to={`/workspace?production=${prod.id}`}
              className="glass-panel p-4 hover:border-white/[0.12] transition-all group flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-3.5 h-3.5 text-berna-purple" />
                  <span className="text-[10px] text-berna-purple uppercase tracking-wider">{prod.status}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{prod.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  {prod.production_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{prod.production_date}</span>}
                  {prod.owner_name && <span>Producer: {prod.owner_name}</span>}
                  {prod.target_runtime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{prod.target_runtime}</span>}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {currentData.map(item => {
            const isRejected = activeTab === 'rejected';
            const daysLeft = isRejected ? daysUntilDeletion(item.archived_date) : null;
            return (
              <div key={item.id} className="glass-panel p-4 hover:border-white/[0.12] transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isRejected ? (
                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-berna-emerald" />
                      )}
                      <span className={`text-[10px] uppercase tracking-wider ${isRejected ? 'text-destructive' : 'text-berna-emerald'}`}>
                        {isRejected ? 'Rejected Article' : 'Approved Article'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      {item.source_name && <span>Source: {item.source_name}</span>}
                      {item.estimated_reading_time && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.estimated_reading_time}</span>
                      )}
                      {item.tags && <span>Tags: {item.tags}</span>}
                    </div>
                    {isRejected && item.rejection_reason && (
                      <p className="text-[10px] text-muted-foreground mt-1">Reason: {item.rejection_reason}</p>
                    )}
                    {isRejected && daysLeft !== null && (
                      <div className={`flex items-center gap-1 mt-2 text-xs ${daysLeft <= 2 ? 'text-destructive' : 'text-accent'}`}>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Auto-deletes in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => handleRestoreArticle(item.id, activeTab)} disabled={restoring === item.id} className="border-berna-emerald/20 text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7">
                      {restoring === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                      Restore
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handlePermanentDelete(item.id, activeTab)} className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2">
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