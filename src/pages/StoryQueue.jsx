import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle, XCircle, Bookmark, Star, Search as SearchIcon,
  ExternalLink, Filter, Clock, AlertTriangle, Compass
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';

export default function StoryQueue() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState('active');
  const [directionOpen, setDirectionOpen] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = () => {
    setLoading(true);
    base44.entities.Article.filter({}, '-created_date', 50)
      .then(setArticles)
      .finally(() => setLoading(false));
  };

  const updateStatus = async (id, status, reason) => {
    const update = { status };
    if (reason) update.rejection_reason = reason;
    await base44.entities.Article.update(id, update);
    setArticles(prev => prev.map(a => a.id === id ? { ...a, ...update } : a));
  };

  const activeStatuses = ['pending', 'approved', 'bernas_pick', 'needs_research', 'saved_for_later'];
  const rejectedStatuses = ['rejected'];

  const filtered = articles.filter(a => {
    if (tab === 'active' && !activeStatuses.includes(a.status)) return false;
    if (tab === 'rejected' && !rejectedStatuses.includes(a.status)) return false;
    if (tab === 'used' && a.status !== 'used') return false;
    if (searchTerm && !a.title?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

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
      </div>

      {/* Story Cards */}
      <div className="space-y-3">
        {filtered.map(article => (
          <div key={article.id} className={`glass-panel p-4 transition-all hover:border-white/[0.12] ${article.status === 'bernas_pick' ? 'glow-orange border-berna-orange/20' : ''}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={article.status} />
                  {article.duplicate_score > 3 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400">
                      <AlertTriangle className="w-3 h-3" />
                      Duplicate Risk
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug mb-2">{article.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {article.category && <CategoryBadge category={article.category} />}
                  <OpportunityScore score={article.opportunity_score} />
                  {article.source_name && <span className="text-[10px] text-muted-foreground">{article.source_name}</span>}
                  {article.published_at && (
                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {article.summary && <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{article.summary}</p>}
                {article.rejection_reason && (
                  <p className="text-xs text-red-400/80 mt-2 italic">Rejected: {article.rejection_reason}</p>
                )}
              </div>

              {/* Score column */}
              <div className="hidden lg:flex flex-col gap-1 text-[10px] min-w-20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fresh</span>
                  <span className="text-white font-mono">{article.freshness_score || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cred</span>
                  <span className="text-white font-mono">{article.credibility_score || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Use</span>
                  <span className="text-white font-mono">{article.usefulness_score || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dup</span>
                  <span className="text-white font-mono">{article.duplicate_score || '-'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {tab === 'active' && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                <Button size="sm" variant="ghost" className="text-berna-emerald hover:bg-berna-emerald/10 text-xs h-7" onClick={() => updateStatus(article.id, 'approved')}>
                  <CheckCircle className="w-3 h-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 text-xs h-7" onClick={() => updateStatus(article.id, 'rejected', 'Manually rejected')}>
                  <XCircle className="w-3 h-3 mr-1" />Reject
                </Button>
                <Button size="sm" variant="ghost" className="text-blue-400 hover:bg-blue-500/10 text-xs h-7" onClick={() => updateStatus(article.id, 'saved_for_later')}>
                  <Bookmark className="w-3 h-3 mr-1" />Save
                </Button>
                <Button size="sm" variant="ghost" className="text-berna-orange hover:bg-berna-orange/10 text-xs h-7" onClick={() => updateStatus(article.id, 'bernas_pick')}>
                  <Star className="w-3 h-3 mr-1" />Berna's Pick
                </Button>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white text-xs h-7">
                      <ExternalLink className="w-3 h-3 mr-1" />Source
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
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