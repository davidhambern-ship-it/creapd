import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search as SearchIcon, RefreshCw, Loader2, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import IntelligenceCard from '@/components/review/IntelligenceCard';
import CreapdLoading from '@/components/shared/CreapdLoading';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const SCORE_THRESHOLDS = [
  { key: 'all', label: 'All Scores' },
  { key: 'low', label: 'Low Score (≤3)' },
  { key: 'high', label: 'High Score (≥7)' },
];

export default function StoryIntelligenceReview() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadArticles = async () => {
    setRefreshing(true);
    try {
      const data = await base44.entities.Article.list('-created_date', 100);
      setArticles(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadArticles(); }, []);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (typeFilter !== 'all' && a.content_type !== typeFilter) return false;
      if (scoreFilter === 'low' && !((a.overall_story_score ?? 99) <= 3 || (a.source_quality_score ?? 99) <= 3)) return false;
      if (scoreFilter === 'high' && !((a.overall_story_score ?? 0) >= 7)) return false;
      if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) && !a.source_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [articles, statusFilter, typeFilter, scoreFilter, search]);

  const needsReviewCount = articles.filter(a => a.status === 'needs_review').length;
  const lowScoreCount = articles.filter(a => (a.overall_story_score ?? 99) <= 3 || (a.source_quality_score ?? 99) <= 3).length;
  const metadataOnlyCount = articles.filter(a => a.transcription_status === 'metadata_only').length;

  if (loading) return <CreapdLoading fullHeight profile="news" />;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Story Intelligence Review</h1>
          <p className="text-xs text-muted-foreground mt-1">Inspect AI output, verify quality, and control story selection</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadArticles} disabled={refreshing}
          className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
          <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* Safeguard counters */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel p-3 text-center">
          <p className="text-2xl font-bold text-yellow-400 font-mono">{needsReviewCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Needs Review</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-2xl font-bold text-red-400 font-mono">{lowScoreCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Low Score</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-2xl font-bold text-berna-orange font-mono">{metadataOnlyCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Metadata Only</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by title or source..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {STATUS_FILTERS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-36 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {SCORE_THRESHOLDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28 bg-white/[0.03] border-white/[0.08] text-white text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="w-3 h-3" />
        <span>{filtered.length} of {articles.length} stories</span>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No stories match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <IntelligenceCard key={article.id} article={article} onRefresh={loadArticles} />
          ))}
        </div>
      )}
    </div>
  );
}