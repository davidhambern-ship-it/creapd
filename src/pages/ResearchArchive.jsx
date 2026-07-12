import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon, Calendar, FileText, ChevronRight,
  Archive as ArchiveIcon, Loader2, FlaskConical, Package,
  CheckCircle2, Clock, Filter, Layers, BookOpen, Trash2, RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

const TABS = [
  { key: 'productions', label: 'Productions', icon: FlaskConical },
  { key: 'dossiers', label: 'Dossiers', icon: FileText },
  { key: 'packages', label: 'Packages', icon: Package },
];

const STATUS_COLORS = {
  ready: { bg: 'hsl(152 50% 15% / 0.3)', color: 'hsl(152 60% 50%)' },
  researching: { bg: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 80% 55%)' },
  failed: { bg: 'hsl(0 50% 15% / 0.3)', color: 'hsl(0 72% 60%)' },
  configuring: { bg: 'hsl(220 15% 18% / 0.3)', color: 'hsl(220 10% 55%)' },
  refreshing: { bg: 'hsl(35 60% 15% / 0.3)', color: 'hsl(35 90% 60%)' },
  approved: { bg: 'hsl(152 50% 15% / 0.3)', color: 'hsl(152 60% 50%)' },
  generated: { bg: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 70% 55%)' },
  finalized: { bg: 'hsl(152 50% 15% / 0.3)', color: 'hsl(152 60% 50%)' },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.configuring;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

export default function ResearchArchive() {
  const [activeTab, setActiveTab] = useState('productions');
  const [productions, setProductions] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [restoring, setRestoring] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [allProds, allDossiers, allPackages] = await Promise.all([
        base44.entities.ResearchProductionConfiguration.list('-created_date', 200),
        base44.entities.ResearchDossier.list('-created_date', 200),
        base44.entities.ProductionPackage.filter({ production_profile: 'research' }, '-created_date', 200),
      ]);
      setProductions(allProds);
      setDossiers(allDossiers);
      setPackages(allPackages);
    } catch (e) {
      console.error('Failed to load research archive:', e);
    } finally {
      setLoading(false);
    }
  };

  const sortItems = (items) => {
    const sorted = [...items];
    switch (sortBy) {
      case 'oldest': return sorted.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return sorted.sort((a, b) => (a.production_name || a.research_query || a.title || '').localeCompare(b.production_name || b.research_query || b.title || ''));
      default: return sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  };

  const currentData = useMemo(() => {
    let items = activeTab === 'productions' ? productions : activeTab === 'dossiers' ? dossiers : packages;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(item => {
        const name = (item.production_name || item.research_query || item.title || item.story_summary || '').toLowerCase();
        return name.includes(term);
      });
    }
    return sortItems(items);
  }, [activeTab, productions, dossiers, packages, searchTerm, sortBy]);

  const handleDeleteProduction = async (id) => {
    if (!confirm('Delete this research production? This will also remove its associated data.')) return;
    try {
      await base44.entities.ResearchProductionConfiguration.delete(id);
      setProductions(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Production deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  const counts = { productions: productions.length, dossiers: dossiers.length, packages: packages.length };

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <ArchiveIcon className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">Research Archive</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Past research productions, dossiers, and packages</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{counts[activeTab]} items</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 cc-glass-card p-1 rounded-lg w-fit">
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
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="alphabetical">Alphabetical</option>
        </select>
      </div>

      {/* Content */}
      {currentData.length === 0 ? (
        <div className="cc-glass-card p-12 text-center">
          <ArchiveIcon className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? `No ${activeTab} match your search` : `No archived ${activeTab} yet`}
          </p>
        </div>
      ) : activeTab === 'productions' ? (
        <div className="space-y-3">
          {currentData.map((prod, idx) => (
            <div
              key={prod.id}
              className={`cc-glass-card p-4 cc-animate-fade-up cc-stagger-${Math.min((idx % 6) + 1, 6)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FlaskConical className="w-3.5 h-3.5" style={{ color: 'hsl(190 80% 55%)' }} />
                    <StatusPill status={prod.status} />
                    {prod.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(35 60% 15% / 0.3)', color: 'hsl(35 90% 60%)' }}>Default</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{prod.production_name || 'Untitled'}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    {prod.show_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{prod.show_date}</span>}
                    {prod.research_depth && <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{prod.research_depth}</span>}
                    {prod.total_show_runtime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{prod.total_show_runtime} min</span>}
                    {prod.tone && <span>Tone: {prod.tone}</span>}
                  </div>
                  {prod.show_description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{prod.show_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/research/configure">
                    <Button size="sm" variant="outline" className="text-xs h-7" style={{ borderColor: 'hsl(190 40% 28% / 0.4)', color: 'hsl(190 80% 55%)' }}>
                      <ChevronRight className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteProduction(prod.id)} className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'dossiers' ? (
        <div className="space-y-3">
          {currentData.map((dossier, idx) => {
            const sources = safeParse(dossier.sources, []);
            return (
              <div
                key={dossier.id}
                className={`cc-glass-card p-4 cc-animate-fade-up cc-stagger-${Math.min((idx % 6) + 1, 6)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5" style={{ color: 'hsl(190 80% 55%)' }} />
                      <StatusPill status={dossier.status} />
                      {dossier.confidence_score > 0 && (
                        <span className="text-xs text-muted-foreground">Confidence: {dossier.confidence_score}%</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{dossier.research_query || 'Untitled Dossier'}</h3>
                    {dossier.executive_summary && (
                      <p className="text-xs text-muted-foreground line-clamp-3">{dossier.executive_summary}</p>
                    )}
                    {sources.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                        <BookOpen className="w-3 h-3" />
                        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <Link to="/research/dossier">
                    <Button size="sm" variant="outline" className="text-xs h-7" style={{ borderColor: 'hsl(190 40% 28% / 0.4)', color: 'hsl(190 80% 55%)' }}>
                      <ChevronRight className="w-3 h-3 mr-1" /> View
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {currentData.map((pkg, idx) => (
            <div
              key={pkg.id}
              className={`cc-glass-card p-4 cc-animate-fade-up cc-stagger-${Math.min((idx % 6) + 1, 6)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-3.5 h-3.5" style={{ color: 'hsl(190 80% 55%)' }} />
                    <StatusPill status={pkg.status} />
                    {pkg.generation_provider && (
                      <span className="text-xs text-muted-foreground">Model: {pkg.generation_provider}</span>
                    )}
                  </div>
                  {pkg.story_summary && (
                    <p className="text-xs text-muted-foreground line-clamp-3">{pkg.story_summary}</p>
                  )}
                </div>
                <Link to="/research/assets">
                  <Button size="sm" variant="outline" className="text-xs h-7" style={{ borderColor: 'hsl(190 40% 28% / 0.4)', color: 'hsl(190 80% 55%)' }}>
                    <ChevronRight className="w-3 h-3 mr-1" /> View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}