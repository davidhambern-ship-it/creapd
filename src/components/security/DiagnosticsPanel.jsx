import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Loader2, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CATEGORY_LABELS = {
  application_error: 'Application Error', sync_failure: 'Sync Failure',
  export_failure: 'Export Failure', connection_error: 'Connection Error', ai_generation_error: 'AI Generation Error'
};

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  warning: { icon: AlertTriangle, color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/20' }
};

export default function DiagnosticsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      const items = await base44.entities.DiagnosticsLog.list('-created_date', 50);
      setLogs(items);
    } catch (e) {
      toast({ title: 'Failed to load diagnostics', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const resolveLog = async (log) => {
    try {
      await base44.entities.DiagnosticsLog.update(log.id, { resolved: true });
      toast({ title: 'Marked as resolved' });
      fetchLogs();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const filtered = filter === 'all' ? logs : logs.filter(l => l.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Logging & Diagnostics</h3>
      </div>
      <p className="text-xs text-muted-foreground">Diagnostic information is maintained to improve reliability. Logs assist troubleshooting while respecting user privacy.</p>

      <div className="flex flex-wrap gap-1.5">
        {['all', ...Object.keys(CATEGORY_LABELS)].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
              filter === cat ? 'bg-white/[0.08] text-white border border-white/[0.1]' : 'bg-white/[0.02] text-muted-foreground border border-white/[0.04] hover:text-white'
            }`}
          >
            {cat === 'all' ? 'All Logs' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-berna-purple animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-6 text-center">
          <CheckCircle className="w-8 h-8 text-berna-emerald mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No diagnostic issues recorded.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.error;
            return (
              <div key={log.id} className={`glass-panel p-3 ${log.resolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded-md ${sev.bg} flex items-center justify-center flex-shrink-0`}>
                      <sev.icon className={`w-3.5 h-3.5 ${sev.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-white truncate">{log.message}</p>
                        {log.resolved && <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-emerald/20 text-berna-emerald">Resolved</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{CATEGORY_LABELS[log.category] || log.category}</p>
                      {log.details && <p className="text-[10px] text-muted-foreground/70 mt-1">{log.details}</p>}
                      <p className="text-[9px] text-muted-foreground/50 mt-1">{log.created_date ? new Date(log.created_date).toLocaleString() : ''}</p>
                    </div>
                  </div>
                  {!log.resolved && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] flex-shrink-0" onClick={() => resolveLog(log)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}