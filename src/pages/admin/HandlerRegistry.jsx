import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Loader2, ChevronRight, Server, Activity, HeartPulse, BarChart3,
  CheckCircle, AlertTriangle, XCircle, Zap, Clock, TrendingUp, Layers
} from 'lucide-react';
import SMCHandlerList from '@/components/smc/SMCHandlerList';

const TABS = [
  { key: 'registry', label: 'Handler Registry', icon: Server },
  { key: 'health', label: 'Health', icon: HeartPulse },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const HEALTH_META = {
  'Healthy': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle },
  'Warning': { color: 'text-accent', bg: 'bg-accent/10', icon: AlertTriangle },
  'Failing': { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  'Deprecated': { color: 'text-muted-foreground', bg: 'bg-muted', icon: AlertTriangle },
  'Disabled': { color: 'text-muted-foreground', bg: 'bg-muted', icon: XCircle },
  'Needs Update': { color: 'text-accent', bg: 'bg-accent/10', icon: AlertTriangle },
  'Unknown': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: Activity },
};

export default function HandlerRegistry() {
  const [activeTab, setActiveTab] = useState('registry');
  const [handlers, setHandlers] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([
        base44.entities.SMCHandler.list('-updated_date', 200).catch(() => []),
        base44.entities.SMCSource.list('-updated_date', 100).catch(() => []),
      ]);
      setHandlers(h || []);
      setSources(s || []);
    } catch (err) { console.error('Handler Registry load error:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Derived stats
  const stats = React.useMemo(() => {
    const total = handlers.length;
    const byHealth = {};
    handlers.forEach(h => {
      const status = h.health_status || 'Unknown';
      byHealth[status] = (byHealth[status] || 0) + 1;
    });
    const totalRuns = handlers.reduce((s, h) => s + (h.total_runs || 0), 0);
    const successfulRuns = handlers.reduce((s, h) => s + (h.successful_runs || 0), 0);
    const failedRuns = handlers.reduce((s, h) => s + (h.failed_runs || 0), 0);
    const rateLimitEvents = handlers.reduce((s, h) => s + (h.rate_limit_events || 0), 0);
    const timeoutEvents = handlers.reduce((s, h) => s + (h.timeout_events || 0), 0);
    const avgRuntime = totalRuns > 0
      ? Math.round(handlers.reduce((s, h) => s + (h.average_runtime_ms || 0) * (h.total_runs || 0), 0) / totalRuns)
      : 0;
    const overallSuccessRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

    return {
      total,
      byHealth,
      totalRuns,
      successfulRuns,
      failedRuns,
      rateLimitEvents,
      timeoutEvents,
      avgRuntime,
      overallSuccessRate,
      topByUsage: [...handlers].sort((a, b) => (b.total_runs || 0) - (a.total_runs || 0)).slice(0, 5),
      unhealthy: handlers.filter(h => !['Healthy', 'Unknown'].includes(h.health_status)),
    };
  }, [handlers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/admin/source-management-center" className="hover:text-foreground">Admin</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Handler Registry</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Handler Registry</h1>
              <p className="text-sm text-muted-foreground">
                The transport layer between the Source Management Center and the Foundation Seeder
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/source-management-center">
              <Button variant="outline" size="sm">Source Management Center</Button>
            </Link>
            <Link to="/admin/foundation-seeder">
              <Button variant="outline" size="sm">Foundation Seeder</Button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const badge = tab.key === 'registry' ? handlers.length : null;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-primary/20 text-primary glow-purple' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {badge !== null && badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-primary/30' : 'bg-secondary/40'}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'registry' && (
          <SMCHandlerList handlers={handlers} onRefresh={loadAll} sources={sources} />
        )}

        {activeTab === 'health' && (
          <div className="space-y-4">
            {/* Health Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.keys(HEALTH_META).map(status => {
                const meta = HEALTH_META[status];
                const Icon = meta.icon;
                const count = stats.byHealth[status] || 0;
                return (
                  <div key={status} className={`glass-panel p-3 ${meta.bg}`}>
                    <Icon className={`w-4 h-4 ${meta.color} mb-1`} />
                    <p className="text-2xl font-heading font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{status}</p>
                  </div>
                );
              })}
            </div>

            {/* Unhealthy Handlers */}
            {stats.unhealthy.length > 0 ? (
              <div className="glass-panel p-5">
                <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-accent" /> Handlers Needing Attention
                </h3>
                <div className="space-y-2">
                  {stats.unhealthy.map(h => {
                    const meta = HEALTH_META[h.health_status] || HEALTH_META['Unknown'];
                    const Icon = meta.icon;
                    return (
                      <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                          <div>
                            <p className="text-sm font-medium">{h.handler_name}</p>
                            <p className="text-xs text-muted-foreground">{h.handler_type} · {h.failed_runs || 0} failed runs</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{h.health_status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-8 text-center">
                <CheckCircle className="w-10 h-10 text-berna-emerald mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">All handlers are healthy or untested.</p>
              </div>
            )}

            {/* Handler Type Distribution */}
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Handler Type Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(
                  handlers.reduce((acc, h) => {
                    acc[h.handler_type] = (acc[h.handler_type] || 0) + 1;
                    return acc;
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <span className="text-xs truncate">{type}</span>
                    <span className="text-xs font-medium ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <StatCard icon={Activity} label="Total Runs" value={stats.totalRuns} />
              <StatCard icon={CheckCircle} label="Successful" value={stats.successfulRuns} color="text-berna-emerald" />
              <StatCard icon={XCircle} label="Failed" value={stats.failedRuns} color="text-destructive" />
              <StatCard icon={TrendingUp} label="Success Rate" value={`${stats.overallSuccessRate}%`} />
              <StatCard icon={Clock} label="Avg Runtime" value={`${stats.avgRuntime}ms`} />
              <StatCard icon={AlertTriangle} label="Rate Limits" value={stats.rateLimitEvents} color="text-accent" />
            </div>

            {/* Top Handlers by Usage */}
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Top Handlers by Usage
              </h3>
              {stats.topByUsage.filter(h => h.total_runs > 0).length > 0 ? (
                <div className="space-y-2">
                  {stats.topByUsage.filter(h => h.total_runs > 0).map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{h.handler_name}</p>
                        <p className="text-xs text-muted-foreground">{h.handler_type}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="font-medium">{h.total_runs}</p>
                          <p className="text-muted-foreground">runs</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-berna-emerald">{h.success_rate || 0}%</p>
                          <p className="text-muted-foreground">success</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{h.average_runtime_ms || 0}ms</p>
                          <p className="text-muted-foreground">avg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No handler runs yet. Test a handler to start collecting analytics.</p>
              )}
            </div>

            {/* Event Tracking */}
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" /> Event Tracking
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-heading font-bold text-accent">{stats.rateLimitEvents}</p>
                  <p className="text-xs text-muted-foreground">Rate Limit Events</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-heading font-bold text-accent">{stats.timeoutEvents}</p>
                  <p className="text-xs text-muted-foreground">Timeout Events</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-heading font-bold text-destructive">{stats.failedRuns}</p>
                  <p className="text-xs text-muted-foreground">Total Failures</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-2xl font-heading font-bold text-berna-emerald">{stats.successfulRuns}</p>
                  <p className="text-xs text-muted-foreground">Total Successes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Philosophy Section */}
        <div className="glass-panel p-5 mt-8">
          <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" /> Handler Registry Philosophy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">Handlers Retrieve</p>
              <p className="text-xs text-muted-foreground">Handlers are provider communication modules — they handle API requests, authentication, pagination, rate limits, and downloads. They never publish content directly.</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">Parsers Interpret</p>
              <p className="text-xs text-muted-foreground">The Parser Registry transforms the standardized response package into Producer schema records. Handlers and parsers are separate concerns.</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20">
              <p className="font-medium text-primary mb-1">Standardized Output</p>
              <p className="text-xs text-muted-foreground">Every handler returns the same response package structure — the Seeder never needs to know how a specific provider works internally.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-foreground' }) {
  return (
    <div className="glass-panel p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}