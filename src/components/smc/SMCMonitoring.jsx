import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Clock, TrendingDown } from 'lucide-react';
import { HEALTH_STATUSES, HEALTH_STATUS_COLORS } from '@/lib/smcConstants';

export default function SMCMonitoring() {
  const [sources, setSources] = useState([]);
  const [events, setEvents] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');

  const load = async () => {
    try {
      const [s, e, t] = await Promise.all([
        base44.entities.SMCSource.filter({ approval_status: 'Approved' }, '-created_date', 200),
        base44.entities.SMCMonitoringEvent.list('-created_date', 100),
        base44.entities.SMCConnectionTest.filter({ test_type: 'Health Check' }, '-created_date', 50),
      ]);
      setSources(s || []); setEvents(e || []); setTests(t || []);
    } catch (err) { console.error('Monitoring load error:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleScan = async () => {
    setScanning(true);
    try { await base44.functions.invoke('runSMCMonitoring', {}); await load(); }
    catch (err) { console.error('Scan error:', err); }
    finally { setScanning(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const healthy = sources.filter(s => s.health_status === 'Healthy');
  const warnings = sources.filter(s => ['Slow Response', 'Rate Limited', 'Documentation Missing', 'License Review Needed', 'Monitoring'].includes(s.health_status));
  const offline = sources.filter(s => ['Offline', 'Connection Failed', 'Authentication Error', 'Schema Changed', 'Deprecated'].includes(s.health_status));
  const filteredEvents = filterSeverity ? events.filter(e => e.severity === filterSeverity) : events;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Automated health monitoring for all approved sources</p>
        <button onClick={handleScan} disabled={scanning} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Run Health Scan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel p-3"><CheckCircle2 className="w-5 h-5 text-berna-emerald mb-1" /><p className="text-xl font-bold">{healthy.length}</p><p className="text-xs text-muted-foreground">Healthy</p></div>
        <div className="glass-panel p-3"><AlertTriangle className="w-5 h-5 text-amber-400 mb-1" /><p className="text-xl font-bold">{warnings.length}</p><p className="text-xs text-muted-foreground">Warnings</p></div>
        <div className="glass-panel p-3"><XCircle className="w-5 h-5 text-red-400 mb-1" /><p className="text-xl font-bold">{offline.length}</p><p className="text-xs text-muted-foreground">Offline/Errors</p></div>
        <div className="glass-panel p-3"><Activity className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">{sources.length}</p><p className="text-xs text-muted-foreground">Total Monitored</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-4">
          <h3 className="font-heading font-semibold text-sm mb-3">Source Health Status</h3>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20">
                <span className={`w-2 h-2 rounded-full ${s.health_status === 'Healthy' ? 'bg-berna-emerald' : ['Offline', 'Connection Failed', 'Authentication Error', 'Deprecated'].includes(s.health_status) ? 'bg-red-400' : 'bg-amber-400'}`} />
                <span className="text-sm flex-1 truncate">{s.source_name}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${HEALTH_STATUS_COLORS[s.health_status] || ''}`}>{s.health_status}</span>
                {s.average_response_time_ms > 0 && <span className="text-xs text-muted-foreground font-mono">{s.average_response_time_ms}ms</span>}
              </div>
            ))}
            {sources.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No approved sources to monitor.</p>}
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-sm">Monitoring Events</h3>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="glass-panel px-2 py-1 text-xs rounded">
              <option value="">All</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {filteredEvents.map(e => (
              <div key={e.id} className="flex items-start gap-2 p-2 rounded-md bg-secondary/20">
                {e.severity === 'Critical' ? <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  : e.severity === 'Warning' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  : <CheckCircle2 className="w-4 h-4 text-berna-emerald shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{e.event_type}</p>
                  <p className="text-xs text-muted-foreground">{e.details}</p>
                  <p className="text-xs text-muted-foreground/60">{new Date(e.created_date).toLocaleString()}</p>
                  {e.recommended_action && <p className="text-xs text-primary mt-0.5">→ {e.recommended_action}</p>}
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No monitoring events.</p>}
          </div>
        </div>
      </div>

      {offline.length > 0 && (
        <div className="glass-panel p-4 border border-red-500/30">
          <h3 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> Sources Requiring Attention</h3>
          <div className="space-y-1">
            {offline.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-red-500/5">
                <span className="flex-1">{s.source_name}</span>
                <span className="text-xs text-red-400">{s.health_status}</span>
                {s.backup_source_id && <span className="text-xs text-berna-emerald">Backup available</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}