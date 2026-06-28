import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Play, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Activity, Zap, ArrowRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';

export default function AutomationCenter() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AutomationLog.filter({}, '-created_date', 20)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const lastSuccess = logs.find(l => l.status === 'success');
  const lastRun = logs[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  // Workflow steps
  const workflowSteps = [
    { label: 'Pull Sources', status: 'complete' },
    { label: 'Fetch Articles', status: 'complete' },
    { label: 'Filter by Date', status: 'complete' },
    { label: 'Remove Duplicates', status: 'complete' },
    { label: 'Check Archive', status: 'complete' },
    { label: 'Categorize', status: 'complete' },
    { label: 'Score Stories', status: 'complete' },
    { label: 'Select Candidates', status: 'complete' },
    { label: 'Build Brief', status: 'complete' },
    { label: 'Generate Content', status: 'complete' },
    { label: 'Save to Archive', status: 'complete' },
    { label: 'Send Notification', status: 'complete' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Automation Center</h1>
          <p className="text-xs text-muted-foreground mt-1">Daily briefing engine controls</p>
        </div>
        <Button size="sm" className="bg-gradient-to-r from-berna-purple to-berna-purple/80 text-white text-xs glow-purple">
          <Play className="w-3 h-3 mr-1" />
          Run Now
        </Button>
      </div>

      {/* Main automation card */}
      <div className="glass-panel glow-purple p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-berna-purple/10 to-transparent rounded-full -mr-12 -mt-12" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">TNN Morning Brief</h2>
              <p className="text-xs text-muted-foreground">Sunday–Friday · 6:00 AM Eastern · Saturday Off</p>
            </div>
            <div className="ml-auto">
              <div className="px-3 py-1.5 rounded-full bg-berna-emerald/10 border border-berna-emerald/20">
                <span className="text-xs text-berna-emerald font-medium">Enabled</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Next Run</p>
              <p className="text-sm text-berna-purple font-mono mt-1">Tomorrow 6:00 AM</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Last Run</p>
              <p className="text-sm text-white font-mono mt-1">{lastRun?.started_at ? new Date(lastRun.started_at).toLocaleString() : 'Not yet'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Duration</p>
              <p className="text-sm text-white font-mono mt-1">{lastRun?.duration_seconds ? `${lastRun.duration_seconds}s` : '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Status</p>
              <div className="mt-1">
                <StatusBadge status={lastRun?.status || 'success'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow visualization */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-semibold text-white neon-underline mb-4">Automation Workflow</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {workflowSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[10px] font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
              <CheckCircle className="w-3 h-3 text-berna-emerald flex-shrink-0" />
              <span className="text-xs text-white/70">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Automation Logs */}
      <div className="glass-panel p-5">
        <h3 className="text-sm font-semibold text-white neon-underline mb-4">Run History</h3>
        <div className="space-y-2">
          {logs.length > 0 ? logs.map(log => (
            <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2 min-w-32">
                {log.status === 'success' && <CheckCircle className="w-4 h-4 text-berna-emerald" />}
                {log.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                {log.status === 'running' && <Loader2 className="w-4 h-4 text-berna-purple animate-spin" />}
                {log.status === 'partial' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                <StatusBadge status={log.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium">{log.automation_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {log.started_at ? new Date(log.started_at).toLocaleString() : '-'}
                  {log.duration_seconds ? ` · ${log.duration_seconds}s` : ''}
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>Sources: {log.sources_checked || 0}</span>
                <span>Pulled: {log.articles_pulled || 0}</span>
                <span>Dupes: {log.duplicates_removed || 0}</span>
                <span>Selected: {log.articles_selected || 0}</span>
                {log.notification_sent && <CheckCircle className="w-3 h-3 text-berna-emerald" />}
              </div>
              {log.errors && (
                <span className="text-[10px] text-red-400 truncate max-w-32">{log.errors}</span>
              )}
            </div>
          )) : (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No automation runs yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}