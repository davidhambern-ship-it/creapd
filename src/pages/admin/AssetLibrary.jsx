import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Image as ImageIcon, FileText, Video, Music, Type, Map, BarChart3, Database, LayoutTemplate, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const RESOURCE_TYPE_ICONS = {
  knowledge: FileText, image: ImageIcon, svg: Type, icon: Type,
  video: Video, audio: Music, music: Music, dataset: Database,
  template: LayoutTemplate, font: Type, map: Map, chart: BarChart3,
  diagram: BarChart3, animation: Video, rss_feed: FileText,
};

const LICENSE_COLORS = {
  public_domain: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  creative_commons: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  mit: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  apache: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  bsd: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  official_free_access: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  commercial_license: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  premium_subscription: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  restricted: 'bg-red-500/20 text-red-400 border-red-500/30',
  unknown: 'bg-red-500/20 text-red-400 border-red-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const PRIORITY_LABELS = {
  library_reuse: { label: 'Library Reuse', color: 'text-emerald-400' },
  free_api: { label: 'Free API', color: 'text-cyan-400' },
  public_domain: { label: 'Public Domain', color: 'text-emerald-400' },
  open_license: { label: 'Open License', color: 'text-blue-400' },
  premium_purchase: { label: 'Premium', color: 'text-amber-400' },
  ai_generation: { label: 'AI Generated', color: 'text-purple-400' },
  manual_import: { label: 'Manual Import', color: 'text-gray-400' },
  connector_discovery: { label: 'Discovered', color: 'text-gray-400' },
};

export default function AssetLibrary() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLicense, setFilterLicense] = useState('all');
  const [stats, setStats] = useState({ total: 0, healthy: 0, degraded: 0, down: 0, reused: 0, ai_generated: 0 });

  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.AssetRegistry.list('-created_date', 100);
      setAssets(list || []);
      computeStats(list || []);
    } catch (e) {
      console.error('Failed to load assets:', e);
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (list) => {
    setStats({
      total: list.length,
      healthy: list.filter(a => a.health_status === 'healthy').length,
      degraded: list.filter(a => a.health_status === 'degraded').length,
      down: list.filter(a => a.health_status === 'down').length,
      reused: list.reduce((sum, a) => sum + (a.usage_count || 0), 0),
      ai_generated: list.filter(a => a.acquisition_method === 'ai_generation').length,
    });
  };

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (filterType !== 'all' && a.resource_type !== filterType) return false;
      if (filterLicense !== 'all' && a.license !== filterLicense) return false;
      if (search.trim()) {
        const terms = search.toLowerCase().split(/\s+/);
        const haystack = [a.title, a.description, a.category, a.provider, a.resource_type]
          .join(' ').toLowerCase();
        if (!terms.every(t => haystack.includes(t))) return false;
      }
      return true;
    });
  }, [assets, search, filterType, filterLicense]);

  const resourceTypes = ['all', ...new Set(assets.map(a => a.resource_type))];
  const licenseTypes = ['all', ...new Set(assets.map(a => a.license))];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-berna-purple" />
            KAAE Asset Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Knowledge & Asset Acquisition Engine — Centralized resource registry
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total Assets" value={stats.total} icon={Database} color="text-berna-purple" />
          <StatCard label="Healthy" value={stats.healthy} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Degraded" value={stats.degraded} icon={AlertTriangle} color="text-amber-400" />
          <StatCard label="Down" value={stats.down} icon={XCircle} color="text-red-400" />
          <StatCard label="Times Reused" value={stats.reused} icon={RefreshCw} color="text-cyan-400" />
          <StatCard label="AI Generated" value={stats.ai_generated} icon={ImageIcon} color="text-purple-400" />
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets by title, description, keywords..."
              className="pl-9"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            {resourceTypes.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>)}
          </select>
          <select
            value={filterLicense}
            onChange={(e) => setFilterLicense(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-2 text-sm"
          >
            {licenseTypes.map(l => <option key={l} value={l}>{l === 'all' ? 'All Licenses' : l.replace(/_/g, ' ')}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={loadAssets} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No assets found. Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(asset => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-panel p-3 flex items-center gap-3">
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function AssetCard({ asset }) {
  const Icon = RESOURCE_TYPE_ICONS[asset.resource_type] || FileText;
  const priority = PRIORITY_LABELS[asset.acquisition_method] || PRIORITY_LABELS.connector_discovery;
  const licenseColor = LICENSE_COLORS[asset.license] || LICENSE_COLORS.unknown;

  return (
    <div className="glass-panel p-4 hover:border-primary/30 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{asset.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{asset.provider || 'Unknown provider'}</p>
        </div>
      </div>

      {asset.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{asset.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="outline" className={`text-[10px] ${licenseColor}`}>
          {asset.license?.replace(/_/g, ' ')}
        </Badge>
        {asset.cc_variant && asset.cc_variant !== 'n/a' && (
          <Badge variant="outline" className="text-[10px]">{asset.cc_variant.toUpperCase()}</Badge>
        )}
        <Badge variant="outline" className="text-[10px]">{asset.resource_type}</Badge>
        <Badge variant="outline" className={`text-[10px] ${priority.color}`}>
          {priority.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {asset.health_status === 'healthy' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {asset.health_status === 'degraded' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
          {asset.health_status === 'down' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
          {asset.health_status === 'unknown' && <div className="w-3.5 h-3.5 rounded-full bg-gray-500/30" />}
          <span className="text-muted-foreground">
            Confidence: {asset.confidence || 0}%
          </span>
          {asset.usage_count > 0 && (
            <span className="text-cyan-400">Used {asset.usage_count}×</span>
          )}
        </div>
        {asset.source_url && (
          <a href={asset.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {asset.attribution_required && asset.attribution_text && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground italic">Attribution: {asset.attribution_text}</p>
        </div>
      )}
    </div>
  );
}