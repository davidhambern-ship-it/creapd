import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Globe, ExternalLink, Star, Shield, Activity } from 'lucide-react';
import { PROVIDER_TYPES, APPROVAL_STATES, RELATIONSHIP_STATUSES, DISCOVERY_LAYER_LABELS, PROVIDER_HEALTH_LABELS } from '@/lib/caeConstants';

export default function CAESourceIntelligence() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadProviders(); }, []);

  const loadProviders = async () => {
    try {
      const data = await base44.entities.CAESourceProvider.list('-created_date', 100);
      setProviders(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? providers : providers.filter(p => p.approval_state === filter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', ...APPROVAL_STATES.map(a => a.value)].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`}>
            {f === 'all' ? 'All' : f.replace('_', ' ')} ({f === 'all' ? providers.length : providers.filter(p => p.approval_state === f).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(provider => {
          const typeOpt = PROVIDER_TYPES.find(t => t.value === provider.provider_type) || PROVIDER_TYPES[3];
          const approval = APPROVAL_STATES.find(a => a.value === provider.approval_state) || APPROVAL_STATES[2];
          const relationship = RELATIONSHIP_STATUSES.find(r => r.value === provider.relationship_status) || RELATIONSHIP_STATUSES[0];
          const layer = DISCOVERY_LAYER_LABELS[provider.discovery_layer] || DISCOVERY_LAYER_LABELS.intelligent_exploration;
          const health = PROVIDER_HEALTH_LABELS[provider.api_health] || PROVIDER_HEALTH_LABELS.unknown;
          const trustColor = provider.trust_score >= 70 ? 'berna-emerald' : provider.trust_score >= 40 ? 'accent' : 'destructive';

          return (
            <div key={provider.id} className="glass-panel p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{provider.name}</h3>
                  <p className="text-xs text-muted-foreground">{typeOpt.label}{provider.country && ` · ${provider.country}`}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-${approval.color}/20 text-${approval.color}`}>{approval.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full bg-${relationship.color}/20 text-${relationship.color}`}>{relationship.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground">Trust Score</p>
                  <p className={`font-bold text-${trustColor}`}>{provider.trust_score || 0}/100</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discovered</p>
                  <p className="font-bold">{provider.total_resources_discovered || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Imported</p>
                  <p className="font-bold text-berna-emerald">{provider.total_resources_imported || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className={`text-${layer.color}`}>{layer.label}</span>
                <span className={`text-${health.color}`}>API: {health.label}</span>
                {provider.import_success_rate > 0 && <span className="text-muted-foreground">{provider.import_success_rate}% success</span>}
                {provider.broken_link_count > 0 && <span className="text-destructive">{provider.broken_link_count} broken</span>}
              </div>

              {provider.website && (
                <a href={provider.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-2">
                  <ExternalLink className="w-3 h-3" /> {provider.website}
                </a>
              )}

              {provider.next_follow_up && (
                <p className="text-xs text-accent mt-2">Follow-up: {new Date(provider.next_follow_up).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel p-8 text-center text-muted-foreground">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No providers found. The CAE will discover providers automatically.</p>
        </div>
      )}
    </div>
  );
}