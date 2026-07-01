import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { SUBSYSTEMS, HEALTH_STATUS_COLORS } from '@/lib/caeConstants';

export default function CAESubsystems() {
  const [subsystems, setSubsystems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSubsystems(); }, []);

  const loadSubsystems = async () => {
    try {
      const data = await base44.entities.CAESubsystemStatus.list();
      setSubsystems(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const healthy = subsystems.filter(s => s.status === 'running').length;
  const degraded = subsystems.filter(s => s.status === 'degraded').length;
  const errored = subsystems.filter(s => s.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-heading font-bold text-berna-emerald">{healthy}</p>
          <p className="text-xs text-muted-foreground">Healthy Subsystems</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-heading font-bold text-accent">{degraded}</p>
          <p className="text-xs text-muted-foreground">Degraded</p>
        </div>
        <div className="glass-panel p-4 text-center">
          <p className="text-2xl font-heading font-bold text-destructive">{errored}</p>
          <p className="text-xs text-muted-foreground">Errors</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SUBSYSTEMS.map(subDef => {
          const sub = subsystems.find(s => s.subsystem_name === subDef.name);
          const status = sub?.status || 'offline';
          const color = HEALTH_STATUS_COLORS[status] || 'muted-foreground';
          const healthScore = sub?.health_score || 0;
          const queueDepth = sub?.queue_depth || 0;

          return (
            <div key={subDef.name} className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-${color} ${status === 'running' ? 'pulse-glow' : ''}`} />
                  <h3 className="text-sm font-medium">{subDef.label}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${color}/20 text-${color} capitalize`}>{status}</span>
              </div>

              <p className="text-xs text-muted-foreground mb-3">{subDef.description}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Health</p>
                  <p className={`font-bold text-${healthScore >= 70 ? 'berna-emerald' : healthScore >= 40 ? 'accent' : 'destructive'}`}>{healthScore}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Queue</p>
                  <p className="font-bold">{queueDepth}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Errors</p>
                  <p className="font-bold text-destructive">{sub?.error_count || 0}</p>
                </div>
              </div>

              {sub?.last_run && (
                <p className="text-xs text-muted-foreground mt-2">Last run: {new Date(sub.last_run).toLocaleTimeString()}</p>
              )}
              {sub?.current_job && (
                <p className="text-xs text-accent mt-1 truncate">Current: {sub.current_job}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}