import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { STATUS_LABELS } from '@/lib/creapd/controllerConstants';
import { ShieldCheck, ArrowUpRight, RotateCcw, Eye, FileX, Activity } from 'lucide-react';

const STATUS_ICONS = {
  pass: ShieldCheck,
  revise: RotateCcw,
  escalate: ArrowUpRight,
  producer_review: Eye,
  invalid_report: FileX,
};

function LogEntry({ log }) {
  const statusInfo = STATUS_LABELS[log.decision] || STATUS_LABELS.pass;
  const Icon = STATUS_ICONS[log.decision] || Activity;
  const time = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })
    : '--:--:--';

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-white/[0.03] transition-colors">
      <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${statusInfo.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{time}</span>
          <span className="truncate">{log.department}</span>
          <span className="truncate">· {log.asset_id}</span>
        </div>
        <p className="text-[11px] text-white/70 truncate">{log.reason}</p>
        {log.assigned_worker && (
          <p className="text-[10px] text-berna-purple mt-0.5">→ {log.assigned_worker}</p>
        )}
      </div>
      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
        {log.quality_score}%
      </span>
    </div>
  );
}

export default function ControllerLogFeed({ productionId, limit = 30, autoRefresh = true }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const query = productionId ? { production_id: productionId } : {};
      const result = await base44.entities.ControllerLog.filter(query, '-created_date', limit);
      setLogs(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [productionId, limit]);

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, autoRefresh]);

  if (loading) {
    return (
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4 animate-pulse" />
          Loading controller decisions...
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-berna-purple" />
          <span className="text-xs font-heading font-semibold text-white">Controller Decisions</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No decisions logged yet.
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {logs.map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}