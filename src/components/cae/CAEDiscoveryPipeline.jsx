import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, ExternalLink, FileText, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { DISCOVERY_STAGES, RIGHTS_CLASSIFICATIONS, BLOCKER_TYPES, RESOURCE_TYPES } from '@/lib/caeConstants';

export default function CAEDiscoveryPipeline() {
  const [discoveries, setDiscoveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('all');

  useEffect(() => { loadDiscoveries(); }, []);

  const loadDiscoveries = async () => {
    try {
      const data = await base44.entities.CAEDiscovery.list('-created_date', 100);
      setDiscoveries(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filtered = stageFilter === 'all' ? discoveries : discoveries.filter(d => d.discovery_stage === stageFilter);

  const stageCounts = DISCOVERY_STAGES.reduce((acc, s) => {
    acc[s.value] = discoveries.filter(d => d.discovery_stage === s.value).length;
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {DISCOVERY_STAGES.map(stage => (
          <button
            key={stage.value}
            onClick={() => setStageFilter(stageFilter === stage.value ? 'all' : stage.value)}
            className={`glass-panel p-3 text-left transition-colors ${stageFilter === stage.value ? 'border-primary/40' : ''}`}
          >
            <div className={`w-2 h-2 rounded-full bg-${stage.color} mb-1`} />
            <p className="text-xs text-muted-foreground">{stage.label}</p>
            <p className="text-lg font-heading font-bold">{stageCounts[stage.value] || 0}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass-panel p-8 text-center text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No discoveries at this stage.</p>
          </div>
        ) : (
          filtered.map(disc => {
            const stage = DISCOVERY_STAGES.find(s => s.value === disc.discovery_stage) || DISCOVERY_STAGES[0];
            const rights = RIGHTS_CLASSIFICATIONS.find(r => r.value === disc.rights_classification) || RIGHTS_CLASSIFICATIONS[14];
            const blocker = BLOCKER_TYPES.find(b => b.value === disc.blocker_type) || BLOCKER_TYPES[0];
            const resourceType = RESOURCE_TYPES.find(r => r.value === disc.resource_type);
            let metadata = {};
            try { metadata = JSON.parse(disc.metadata_harvested || '{}'); } catch {}

            return (
              <div key={disc.id} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${stage.color}/20 text-${stage.color}`}>{stage.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-${rights.color}/20 text-${rights.color}`}>{rights.label}</span>
                      {resourceType && <span className="text-xs text-muted-foreground">{resourceType.label}</span>}
                      {disc.acquisition_priority_score > 0 && <span className="text-xs text-muted-foreground">Priority: {disc.acquisition_priority_score}</span>}
                    </div>
                    <h3 className="font-medium truncate">{disc.title}</h3>
                    {metadata.author && <p className="text-sm text-muted-foreground">{metadata.author}</p>}
                    {metadata.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{metadata.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>via {disc.source_provider_name}</span>
                      {metadata.tradition && <span>· {metadata.tradition}</span>}
                      {metadata.language && <span>· {metadata.language}</span>}
                      {disc.published_to_library && <span className="text-berna-emerald flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Published</span>}
                    </div>
                    {disc.blocker_type !== 'none' && disc.blocker_type && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-accent">
                        <AlertCircle className="w-3 h-3" /> Blocked: {blocker.label}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {disc.source_url && (
                      <a href={disc.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                    )}
                    {disc.registry_record_id && (
                      <span className="text-xs text-berna-emerald flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Registry linked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}