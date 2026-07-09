import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Activity, Database, Plug, RefreshCw, Download,
  CheckCircle, XCircle, AlertCircle, Globe, Zap, Shield, ChevronDown, ChevronRight
} from 'lucide-react';

const CATEGORY_LABELS = {
  research: 'Research',
  images: 'Images',
  svg: 'SVG',
  icons: 'Icons',
  audio: 'Audio',
  music_metadata: 'Music Metadata',
  video: 'Video',
  maps: 'Maps',
  statistics: 'Statistics',
  government: 'Government',
  scientific: 'Scientific',
  presentation_assets: 'Presentation Assets',
};

const PRIORITY_LABELS = {
  0: 'Local Registry',
  10: 'Public Domain',
  20: 'Open License',
  30: 'Free API',
  40: 'Premium',
  50: 'AI Generation',
};

export default function ConnectorSystem() {
  const [connectors, setConnectors] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [results, setResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [healthChecking, setHealthChecking] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [expandedConnector, setExpandedConnector] = useState(null);
  const [activeTab, setActiveTab] = useState('connectors');

  const loadConnectors = useCallback(async () => {
    try {
      const items = await base44.entities.Connector.list('priority', 100);
      setConnectors(items);
      const health = await base44.entities.ProviderHealth.list('-created_date', 100);
      setHealthRecords(health);
    } catch (err) {
      console.error('Failed to load connectors:', err);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await base44.functions.invoke('connectorManager', {
        action: 'search',
        payload: {
          query: searchQuery,
          limit: 5,
          production_profile: 'research',
          department: 'knowledge',
          worker: 'connector_ui',
        },
      });
      setResults(res.data?.results || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleHealthCheckAll = async () => {
    setHealthChecking(true);
    try {
      await base44.functions.invoke('connectorManager', { action: 'health_check_all' });
      await loadConnectors();
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setHealthChecking(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke('connectorManager', { action: 'seed_defaults' });
      await loadConnectors();
    } catch (err) {
      console.error('Seed failed:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleConnector = async (connector) => {
    await base44.entities.Connector.update(connector.id, { enabled: !connector.enabled });
    loadConnectors();
  };

  const handleImportResult = async (resultId) => {
    try {
      await base44.functions.invoke('connectorManager', {
        action: 'import_to_registry',
        payload: { connector_result_id: resultId },
      });
      setResults(prev => prev.map(r => r.id === resultId ? { ...r, imported_to_registry: true } : r));
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const getHealthFor = (connectorId) => healthRecords.find(h => h.connector_id === connectorId);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Plug className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Connector System</h1>
            <p className="text-sm text-muted-foreground">KAAE-CON-001 · Unified integration layer for all external providers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>
            {seeding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Database className="w-4 h-4 mr-1.5" />}
            Seed Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={handleHealthCheckAll} disabled={healthChecking}>
            {healthChecking ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Activity className="w-4 h-4 mr-1.5" />}
            Check Health
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { id: 'connectors', label: 'Connectors', icon: Plug },
          { id: 'search', label: 'Search', icon: Search },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connectors Tab */}
      {activeTab === 'connectors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {connectors.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <Plug className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground mb-4">No connectors configured yet.</p>
              <Button onClick={handleSeedDefaults} disabled={seeding}>
                {seeding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Database className="w-4 h-4 mr-1.5" />}
                Seed Default Connectors
              </Button>
            </div>
          ) : (
            connectors.map((c, i) => {
              const health = getHealthFor(c.id);
              const isExpanded = expandedConnector === c.id;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-panel overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedConnector(isExpanded ? null : c.id)}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[c.category] || c.category}</Badge>
                        <Badge variant="outline" className="text-xs">{PRIORITY_LABELS[c.priority] || `Priority ${c.priority}`}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description || c.provider_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <HealthBadge status={c.health_status} />
                      <SupportIcons connector={c} />
                      <Button
                        size="sm"
                        variant={c.enabled ? 'default' : 'outline'}
                        onClick={(e) => { e.stopPropagation(); handleToggleConnector(c); }}
                        className="ml-2"
                      >
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <DetailItem label="Provider" value={c.provider_name} />
                      <DetailItem label="Base URL" value={c.base_url || '—'} />
                      <DetailItem label="Auth Type" value={c.authentication_type} />
                      <DetailItem label="Timeout" value={`${c.timeout_seconds}s`} />
                      <DetailItem label="Rate Limit /min" value={c.rate_limit_per_minute} />
                      <DetailItem label="Rate Limit /day" value={c.rate_limit_per_day} />
                      <DetailItem label="Retry Count" value={c.retry_count} />
                      <DetailItem label="Last Success" value={c.last_success ? new Date(c.last_success).toLocaleString() : '—'} />
                      {health && (
                        <>
                          <DetailItem label="Latency" value={health.latency ? `${health.latency}ms` : '—'} />
                          <DetailItem label="Uptime" value={`${(health.uptime_percentage || 0).toFixed(1)}%`} />
                          <DetailItem label="Auth Status" value={health.authentication_status} />
                          <DetailItem label="Error Count" value={health.error_count} />
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search across all enabled providers..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              Search
            </Button>
          </div>

          {searching && (
            <div className="glass-panel p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Querying providers in priority order...</p>
            </div>
          )}

          {!searching && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{results.length} results from connector system</p>
              {results.map(r => (
                <ResultCard key={r.id} result={r} onImport={() => handleImportResult(r.id)} />
              ))}
            </div>
          )}

          {!searching && results.length === 0 && searchQuery && (
            <div className="glass-panel p-8 text-center">
              <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No results. Try a different query.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function HealthBadge({ status }) {
  const config = {
    healthy: { color: '#00FF88', icon: CheckCircle, label: 'Healthy' },
    degraded: { color: '#FFA500', icon: AlertCircle, label: 'Degraded' },
    down: { color: '#FF4444', icon: XCircle, label: 'Down' },
    unknown: { color: '#888', icon: AlertCircle, label: 'Unknown' },
  };
  const { color, icon: Icon, label } = config[status] || config.unknown;
  return (
    <div className="flex items-center gap-1 text-xs" style={{ color }}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

function SupportIcons({ connector }) {
  const icons = [
    { key: 'supports_search', icon: Search, label: 'Search' },
    { key: 'supports_download', icon: Download, label: 'Download' },
    { key: 'supports_preview', icon: Globe, label: 'Preview' },
    { key: 'supports_metadata', icon: Database, label: 'Metadata' },
    { key: 'supports_streaming', icon: Zap, label: 'Streaming' },
  ];
  return (
    <div className="hidden md:flex items-center gap-1">
      {icons.filter(ic => connector[ic.key]).map(ic => (
        <div key={ic.key} title={ic.label} className="w-6 h-6 rounded flex items-center justify-center bg-primary/5 text-primary">
          <ic.icon className="w-3 h-3" />
        </div>
      ))}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground truncate">{value || '—'}</p>
    </div>
  );
}

function ResultCard({ result, onImport }) {
  const license = (() => {
    try { return JSON.parse(result.license_data || '{}'); } catch { return {}; }
  })();
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel p-4 flex items-center gap-4"
    >
      {result.thumbnail_url && (
        <img src={result.thumbnail_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{result.title}</p>
        <p className="text-xs text-muted-foreground truncate">{result.creator}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">{result.asset_type}</Badge>
          <Badge variant="outline" className="text-xs">{license.license_type || 'unknown'}</Badge>
          {license.commercial_use_allowed && (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">Commercial OK</Badge>
          )}
          {license.attribution_required && (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">Attribution</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {result.imported_to_registry ? (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-400/30">
            <CheckCircle className="w-3 h-3 mr-1" /> Imported
          </Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={onImport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Import
          </Button>
        )}
      </div>
    </motion.div>
  );
}