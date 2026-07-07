import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { STATUS_LABELS } from '@/lib/creapd/controllerConstants';
import QualityReportCard from './QualityReportCard';
import ControllerLogFeed from './ControllerLogFeed';
import { ShieldCheck, RotateCcw, ArrowUpRight, Eye, RefreshCw, Loader2 } from 'lucide-react';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: null },
  { key: 'pass', label: 'Approved', icon: ShieldCheck },
  { key: 'revise', label: 'In Revision', icon: RotateCcw },
  { key: 'escalate', label: 'Escalated', icon: ArrowUpRight },
  { key: 'producer_review', label: 'Needs Review', icon: Eye },
];

function StatPill({ label, count, color }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <span className={`w-2 h-2 rounded-full ${color}`} style={{ boxShadow: '0 0 6px currentColor' }} />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-mono font-bold text-white">{count}</span>
    </div>
  );
}

export default function ControllerDashboard({ productionId, embedded = false }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({ pass: 0, revise: 0, escalate: 0, producer_review: 0, total: 0 });

  const fetchReports = useCallback(async () => {
    try {
      const query = productionId ? { production_id: productionId } : {};
      const result = await base44.entities.QualityReport.filter(query, '-created_date', 50);
      setReports(result);

      const newStats = { pass: 0, revise: 0, escalate: 0, producer_review: 0, total: result.length };
      result.forEach((r) => {
        if (newStats[r.status] !== undefined) newStats[r.status]++;
      });
      setStats(newStats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [productionId]);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 8000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const filteredReports = activeFilter === 'all'
    ? reports
    : reports.filter((r) => r.status === activeFilter);

  return (
    <div className={`space-y-4 ${embedded ? '' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-berna-purple/10 border border-white/[0.08] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-berna-purple" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-base text-white">Controller Dashboard</h2>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Quality Reports & Decision Logs
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/5 transition-all"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="Total" count={stats.total} color="bg-muted-foreground" />
        <StatPill label="Approved" count={stats.pass} color="bg-berna-emerald" />
        <StatPill label="Revising" count={stats.revise} color="bg-berna-orange" />
        <StatPill label="Escalated" count={stats.escalate} color="bg-destructive" />
        <StatPill label="Needs Review" count={stats.producer_review} color="bg-yellow-400" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-berna-purple/15 border border-berna-purple/30 text-berna-purple'
                  : 'border border-white/[0.06] text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Two column layout: reports + log feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quality Reports */}
        <div className="lg:col-span-2 space-y-3">
          {loading && reports.length === 0 ? (
            <div className="glass-panel p-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-berna-purple" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="glass-panel p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {activeFilter === 'all'
                  ? 'No quality reports yet. The Controller will populate this as assets are evaluated.'
                  : `No reports with status "${STATUS_LABELS[activeFilter]?.label || activeFilter}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredReports.map((report) => (
                <QualityReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>

        {/* Controller Log Feed */}
        <div className="lg:col-span-1">
          <ControllerLogFeed productionId={productionId} limit={30} />
        </div>
      </div>
    </div>
  );
}