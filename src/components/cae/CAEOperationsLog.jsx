import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ScrollText, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function CAEOperationsLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      const data = await base44.entities.CAEOperationLog.list('-created_date', 200);
      setLogs(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? logs : logs.filter(l => l.outcome === filter);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'success', 'failure', 'pending', 'partial'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? 'bg-primary/20 text-primary' : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'}`}>
            {f} ({f === 'all' ? logs.length : logs.filter(l => l.outcome === f).length})
          </button>
        ))}
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold">Autonomous Operations Log</h3>
        </div>

        <div className="space-y-1 max-h-[700px] overflow-y-auto">
          {filtered.map(log => {
            const outcomeIcons = {
              success: <CheckCircle2 className="w-3.5 h-3.5 text-berna-emerald" />,
              failure: <XCircle className="w-3.5 h-3.5 text-destructive" />,
              pending: <Clock className="w-3.5 h-3.5 text-chart-4" />,
              partial: <AlertCircle className="w-3.5 h-3.5 text-accent" />,
              skipped: <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            };
            const outcomeColors = {
              success: 'border-l-berna-emerald',
              failure: 'border-l-destructive',
              pending: 'border-l-chart-4',
              partial: 'border-l-accent',
              skipped: 'border-l-muted-foreground'
            };

            return (
              <div key={log.id} className={`flex items-start gap-3 p-2 rounded-r-lg bg-secondary/10 border-l-2 ${outcomeColors[log.outcome] || 'border-l-muted-foreground'}`}>
                {outcomeIcons[log.outcome] || outcomeIcons.skipped}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium capitalize">{log.operation_type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(log.created_date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{log.description}</p>
                  {log.resource_title && <p className="text-xs text-muted-foreground">Resource: {log.resource_title}</p>}
                  {log.provider && <p className="text-xs text-muted-foreground">Provider: {log.provider}</p>}
                  {log.subsystem && <p className="text-xs text-muted-foreground">Subsystem: {log.subsystem}</p>}
                  {log.error_message && <p className="text-xs text-destructive mt-1">Error: {log.error_message}</p>}
                  {log.duration_seconds > 0 && <p className="text-xs text-muted-foreground mt-0.5">{log.duration_seconds}s</p>}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No operations logged yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}