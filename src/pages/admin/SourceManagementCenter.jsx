import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ChevronRight, Zap } from 'lucide-react';
import {
  LayoutDashboard, Database, Search, KeyRound, Activity, Download,
  BookMarked, Scale, BarChart3, FileCode, ArrowLeft
} from 'lucide-react';
import SMCDashboard from '@/components/smc/SMCDashboard';
import SMCSourceRegistry from '@/components/smc/SMCSourceRegistry';
import SMCDiscovery from '@/components/smc/SMCDiscovery';
import SMCKeyVault from '@/components/smc/SMCKeyVault';
import SMCMonitoring from '@/components/smc/SMCMonitoring';
import SMCSeederIntegration from '@/components/smc/SMCSeederIntegration';
import SMCCollectionManager from '@/components/smc/SMCCollectionManager';
import SMCLicensing from '@/components/smc/SMCLicensing';
import SMCAnalytics from '@/components/smc/SMCAnalytics';
import SMCParserRegistry from '@/components/smc/SMCParserRegistry';
import SMCSourceDetail from '@/components/smc/SMCSourceDetail';

const ICONS = { LayoutDashboard, Database, Search, KeyRound, Activity, Download, BookMarked, Scale, BarChart3, FileCode };

const TABS = [
  { key: 'overview', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'sources', label: 'Source Registry', icon: 'Database' },
  { key: 'discovery', label: 'Discovery', icon: 'Search' },
  { key: 'vault', label: 'Key Vault', icon: 'KeyRound' },
  { key: 'monitoring', label: 'Monitoring', icon: 'Activity' },
  { key: 'seeder', label: 'Seeder', icon: 'Download' },
  { key: 'collection', label: 'Collections', icon: 'BookMarked' },
  { key: 'licensing', label: 'Licensing', icon: 'Scale' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { key: 'parsers', label: 'Parsers', icon: 'FileCode' }
];

export default function SourceManagementCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineResult, setPipelineResult] = useState(null);

  const loadSources = useCallback(async () => {
    try {
      const data = await base44.entities.SMCSource.list('-created_date', 200);
      setSources(data || []);
    } catch (err) { console.error('SMC source load error:', err); }
    finally { setLoading(false); }
  }, []);

  const handleRunPipeline = useCallback(async () => {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const resp = await base44.functions.invoke('runSMCImport', { mode: 'auto_execute' });
      const data = resp.data || resp;
      setPipelineResult(data);
      loadSources();
    } catch (err) {
      setPipelineResult({ error: err.message });
    } finally {
      setPipelineRunning(false);
    }
  }, [loadSources]);

  useEffect(() => { loadSources(); }, [loadSources]);

  const handleSourceSelect = (id) => { setSelectedSourceId(id); };
  const handleBackToList = () => { setSelectedSourceId(null); loadSources(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedSourceId) {
    return <SMCSourceDetail sourceId={selectedSourceId} onBack={handleBackToList} />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <SMCDashboard sources={sources} onNavigate={setActiveTab} />;
      case 'sources': return <SMCSourceRegistry sources={sources} onRefresh={loadSources} onSelect={handleSourceSelect} />;
      case 'discovery': return <SMCDiscovery onSourcesChanged={loadSources} />;
      case 'vault': return <SMCKeyVault />;
      case 'monitoring': return <SMCMonitoring />;
      case 'seeder': return <SMCSeederIntegration />;
      case 'collection': return <SMCCollectionManager />;
      case 'licensing': return <SMCLicensing />;
      case 'analytics': return <SMCAnalytics sources={sources} />;
      case 'parsers': return <SMCParserRegistry />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Link to="/admin/world-scripture-registry" className="hover:text-foreground">Admin</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Source Management Center</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Source Management Center</h1>
            <p className="text-sm text-muted-foreground">Producer's source authority — discover, evaluate, approve, monitor & manage trusted knowledge providers</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleRunPipeline}
            disabled={pipelineRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 glow-purple"
          >
            {pipelineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {pipelineRunning ? 'Running Pipeline...' : 'Run Pipeline Now'}
          </button>
          {pipelineResult && !pipelineResult.error && (
            <p className="text-xs text-berna-emerald">
              {pipelineResult.executed || 0} jobs processed · {pipelineResult.results?.filter(r => r.status === 'completed').length || 0} completed · {pipelineResult.results?.filter(r => r.status === 'failed').length || 0} failed
            </p>
          )}
          {pipelineResult?.error && (
            <p className="text-xs text-red-400">{pipelineResult.error}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-border">
        {TABS.map(tab => {
          const Icon = ICONS[tab.icon];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive ? 'bg-primary/20 text-primary glow-purple' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {renderTab()}
      </div>
    </div>
  );
}