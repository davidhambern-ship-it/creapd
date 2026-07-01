import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Search, Download, RefreshCw, FileText, Lock, Wallet, Users, AlertTriangle, HeartPulse, TrendingUp, Clock, BookCheck, ShieldCheck, Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import CAEActivityFeed from '@/components/cae/CAEActivityFeed';
import FoundationLibraryProgress from '@/components/cae/FoundationLibraryProgress';

export default function CAEOverview({ config, activityEvents, onRefresh }) {
  const [stats, setStats] = useState({ providers: 0, discoveries: 0, published: 0, blocked: 0, missions: 0, goals: 0, subsystemsHealthy: 0, subsystemsTotal: 0, budgetBalance: 0, purchaseQueue: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [providers, discoveries, missions, goals, subsystems, purchases] = await Promise.all([
        base44.entities.CAESourceProvider.filter({}),
        base44.entities.CAEDiscovery.filter({}),
        base44.entities.CAEMission.filter({}),
        base44.entities.CAECollectionGoal.filter({}),
        base44.entities.CAESubsystemStatus.filter({}),
        base44.entities.CAEPurchaseQueueItem.filter({})
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const discoveriesToday = discoveries.filter(d => d.discovered_at && new Date(d.discovered_at) >= today).length;
      const publishedToday = discoveries.filter(d => d.published_to_library && d.processed_at && new Date(d.processed_at) >= today).length;

      setStats({
        providers: providers.length,
        providersApproved: providers.filter(p => p.approval_state === 'approved').length,
        discoveries: discoveries.length,
        discoveriesToday,
        publishedToday,
        published: discoveries.filter(d => d.published_to_library).length,
        blocked: discoveries.filter(d => d.discovery_stage === 'blocked').length,
        importing: discoveries.filter(d => ['importing', 'processing'].includes(d.discovery_stage)).length,
        missions: missions.filter(m => m.status === 'active').length,
        goals: goals.filter(g => g.status === 'active').length,
        subsystemsHealthy: subsystems.filter(s => s.status === 'running').length,
        subsystemsTotal: subsystems.length,
        budgetBalance: config?.wallet_balance || 0,
        purchaseQueue: purchases.filter(p => p.approval_status === 'pending').length,
        verificationQueue: discoveries.filter(d => d.discovery_stage === 'discovered' || d.discovery_stage === 'metadata_harvested').length
      });
    } catch (err) {
      console.error(err);
    }
  };

  const statCards = [
    { label: 'Sources Connected', value: stats.providersApproved || 0, sub: `of ${stats.providers} total`, icon: Globe, color: 'text-primary' },
    { label: 'Discoveries Today', value: stats.discoveriesToday || 0, sub: `${stats.discoveries} total`, icon: Search, color: 'text-chart-4' },
    { label: 'Free Resources Acquired Today', value: stats.publishedToday || 0, sub: `${stats.published} total published`, icon: Download, color: 'text-berna-emerald' },
    { label: 'Imports Running', value: stats.importing || 0, icon: RefreshCw, color: 'text-accent' },
    { label: 'Verification Queue', value: stats.verificationQueue || 0, icon: FileText, color: 'text-chart-4' },
    { label: 'Licensing Issues', value: stats.blocked || 0, icon: Lock, color: 'text-accent' },
    { label: 'Budget Balance', value: `$${(stats.budgetBalance || 0).toFixed(2)}`, icon: Wallet, color: 'text-berna-emerald' },
    { label: 'Purchase Queue', value: stats.purchaseQueue || 0, icon: TrendingUp, color: 'text-accent' },
    { label: 'Active Missions', value: stats.missions || 0, icon: Users, color: 'text-primary' },
    { label: 'Collection Goals', value: stats.goals || 0, icon: ShieldCheck, color: 'text-primary' },
    { label: 'Engine Health', value: `${stats.subsystemsHealthy}/${stats.subsystemsTotal}`, icon: HeartPulse, color: stats.subsystemsHealthy === stats.subsystemsTotal ? 'text-berna-emerald' : 'text-accent' },
    { label: 'Failed Jobs', value: config?.error_rate > 0 ? `${config.error_rate}%` : '0%', icon: AlertTriangle, color: 'text-destructive' }
  ];

  return (
    <div className="space-y-6">
      <FoundationLibraryProgress config={config} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-2xl font-heading font-bold">{card.value}</p>
              {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CAEActivityFeed events={activityEvents.slice(0, 20)} compact />
        </div>
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Engine Summary</h3>
          <Link to="/admin/world-scripture-registry" className="flex items-center gap-1 text-xs text-primary hover:underline mb-4">
            <Database className="w-3.5 h-3.5" /> View World Scripture Registry <ArrowRight className="w-3 h-3" />
          </Link>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Engine Status:</span> <span className="capitalize font-medium">{config?.engine_status || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Operating Mode:</span> <span className="capitalize font-medium">{config?.operating_mode || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CAE Identity:</span> <span className="font-medium">{config?.cae_identity_email || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Scan Interval:</span> <span className="font-medium">{config?.scan_interval_minutes || 30} min</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quality Threshold:</span> <span className="font-medium">{config?.quality_threshold || 60}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Auto Free Registration:</span> <span className="font-medium">{config?.automatic_free_registration ? 'Enabled' : 'Disabled'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Auto Purchasing:</span> <span className="font-medium">{config?.allow_automatic_purchasing ? 'Enabled' : 'Disabled'}</span></div>
          </div>
          {config?.started_at && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Engine uptime: {Math.floor((Date.now() - new Date(config.started_at).getTime()) / 3600000)}h
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}