import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Database, CheckCircle2, Clock, AlertTriangle, KeyRound, ShieldCheck, Activity, TrendingUp, Loader2, Search } from 'lucide-react';
import { APPROVAL_STATUS_COLORS, HEALTH_STATUS_COLORS } from '@/lib/smcConstants';

export default function SMCDashboard({ sources, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [candidates, jobs, accounts, importJobs, works, parsers] = await Promise.all([
          base44.entities.SMCCandidateSource.list('-created_date', 50).catch(() => []),
          base44.entities.SMCDiscoveryJob.list('-created_date', 50).catch(() => []),
          base44.entities.SMCProviderAccount.list('-created_date', 50).catch(() => []),
          base44.entities.SMCImportJob.list('-created_date', 50).catch(() => []),
          base44.entities.SMCFoundationWork.list('-created_date', 100).catch(() => []),
          base44.entities.SMCParser.list('-created_date', 50).catch(() => []),
        ]);
        const approved = sources.filter(s => s.approval_status === 'Approved');
        const healthy = sources.filter(s => s.health_status === 'Healthy');
        const seederEnabled = sources.filter(s => s.seeder_enabled);
        const caeEnabled = sources.filter(s => s.cae_enabled);
        const apiKeyReq = sources.filter(s => s.api_key_required);
        const errors = sources.filter(s => ['Connection Failed', 'Authentication Error', 'Offline', 'Deprecated'].includes(s.health_status));
        const free = sources.filter(s => ['Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution'].includes(s.license_status));
        const licenseReq = sources.filter(s => ['Commercial License', 'Subscription Required', 'Institutional License', 'Negotiation Required'].includes(s.license_status));
        const imported = works.filter(w => w.roadmap_status === 'Imported');
        const missing = works.filter(w => w.roadmap_status === 'Missing');
        const runningJobs = importJobs.filter(j => j.status === 'Running' || j.status === 'Queued');
        setStats({
          total: sources.length, approved: approved.length, candidates: candidates.length,
          discoveryJobs: jobs.length, accounts: accounts.length, parsers: parsers.length,
          seederEnabled: seederEnabled.length, caeEnabled: caeEnabled.length,
          apiKeyReq: apiKeyReq.length, errors: errors.length, free: free.length,
          licenseReq: licenseReq.length, healthy: healthy.length,
          worksTotal: works.length, imported: imported.length, missing: missing.length,
          runningJobs: runningJobs.length,
        });
      } catch (err) { console.error('SMC dashboard error:', err); }
      finally { setLoading(false); }
    })();
  }, [sources]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const cards = [
    { label: 'Total Sources', value: stats.total, icon: Database, color: 'text-primary', onClick: () => onNavigate('sources') },
    { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-berna-emerald', onClick: () => onNavigate('sources') },
    { label: 'Candidates', value: stats.candidates, icon: Clock, color: 'text-blue-400', onClick: () => onNavigate('discovery') },
    { label: 'Discovery Jobs', value: stats.discoveryJobs, icon: Search, color: 'text-cyan-400', onClick: () => onNavigate('discovery') },
    { label: 'Provider Accounts', value: stats.accounts, icon: KeyRound, color: 'text-amber-400', onClick: () => onNavigate('vault') },
    { label: 'Healthy Sources', value: stats.healthy, icon: ShieldCheck, color: 'text-berna-emerald', onClick: () => onNavigate('monitoring') },
    { label: 'Sources With Errors', value: stats.errors, icon: AlertTriangle, color: 'text-red-400', onClick: () => onNavigate('monitoring') },
    { label: 'Seeder Enabled', value: stats.seederEnabled, icon: Database, color: 'text-primary', onClick: () => onNavigate('sources') },
    { label: 'CAE Enabled', value: stats.caeEnabled, icon: Activity, color: 'text-accent', onClick: () => onNavigate('sources') },
    { label: 'API Keys Required', value: stats.apiKeyReq, icon: KeyRound, color: 'text-amber-400', onClick: () => onNavigate('vault') },
    { label: 'Free/Open Sources', value: stats.free, icon: CheckCircle2, color: 'text-berna-emerald', onClick: () => onNavigate('sources') },
    { label: 'License Required', value: stats.licenseReq, icon: AlertTriangle, color: 'text-orange-400', onClick: () => onNavigate('licensing') },
    { label: 'Works Imported', value: stats.imported, icon: CheckCircle2, color: 'text-berna-emerald', onClick: () => onNavigate('collection') },
    { label: 'Works Missing', value: stats.missing, icon: AlertTriangle, color: 'text-red-400', onClick: () => onNavigate('collection') },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button key={card.label} onClick={card.onClick}
              className="glass-panel p-3 text-left hover:glow-purple transition-all">
              <Icon className={`w-5 h-5 mb-2 ${card.color}`} />
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Approval Status Distribution</h3>
          <div className="space-y-2">
            {['Approved', 'Under Review', 'Candidate', 'Discovered', 'Rejected', 'Paused', 'Archived'].map(status => {
              const count = sources.filter(s => s.approval_status === status).length;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${APPROVAL_STATUS_COLORS[status] || ''}`}>{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Health Summary</h3>
          <div className="space-y-2">
            {['Healthy', 'Slow Response', 'Rate Limited', 'Authentication Error', 'Schema Changed', 'Connection Failed', 'Offline', 'Unknown'].map(status => {
              const count = sources.filter(s => s.health_status === status).length;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${HEALTH_STATUS_COLORS[status] || ''}`}>{status}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {stats.runningJobs > 0 && (
        <div className="glass-panel p-4 flex items-center gap-3 border border-primary/30">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium">{stats.runningJobs} import job(s) currently running</p>
            <p className="text-xs text-muted-foreground">Click the Seeder tab to view progress</p>
          </div>
        </div>
      )}
    </div>
  );
}