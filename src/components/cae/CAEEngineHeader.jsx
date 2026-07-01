import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Pause, Play, RefreshCw, Clock, Zap, AlertCircle, TrendingUp, Database } from 'lucide-react';
import { ENGINE_STATUS_OPTIONS, OPERATING_MODES } from '@/lib/caeConstants';

export default function CAEEngineHeader({ config, running, onRunNow, onToggleEngine }) {
  if (!config) {
    return (
      <div className="glass-panel m-4 p-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
          <div>
            <h1 className="text-lg font-heading font-bold">Content Acquisition Engine</h1>
            <p className="text-sm text-muted-foreground">Initializing engine configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  const statusOpt = ENGINE_STATUS_OPTIONS.find(s => s.value === config.engine_status) || ENGINE_STATUS_OPTIONS[0];
  const modeOpt = OPERATING_MODES.find(m => m.value === config.operating_mode) || OPERATING_MODES[0];
  const uptime = config.started_at ? Math.floor((Date.now() - new Date(config.started_at).getTime()) / 3600000) : 0;

  return (
    <div className="sticky top-0 z-40 glass-panel-navy border-b border-white/10 rounded-none px-4 md:px-6 py-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${statusOpt.color}/20`}>
              <Activity className={`w-6 h-6 text-${statusOpt.color} ${config.engine_status === 'running' ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold flex items-center gap-3">
                Content Acquisition Engine
                <span className={`text-xs px-2 py-0.5 rounded-full bg-${statusOpt.color}/20 text-${statusOpt.color} capitalize`}>
                  {statusOpt.label}
                </span>
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <span className="capitalize">{modeOpt.label}</span>
                {config.current_mission_name && (
                  <span className="text-primary">· Mission: {config.current_mission_name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRunNow} disabled={running}>
              <RefreshCw className={`w-4 h-4 mr-2 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running...' : 'Run Now'}
            </Button>
            <Button variant={config.engine_status === 'running' ? 'destructive' : 'default'} size="sm" onClick={onToggleEngine}>
              {config.engine_status === 'running' ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Resume</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          <HeaderStat icon={Clock} label="Last Run" value={config.last_run ? new Date(config.last_run).toLocaleTimeString() : '—'} />
          <HeaderStat icon={Clock} label="Next Run" value={config.next_scheduled_run ? new Date(config.next_scheduled_run).toLocaleTimeString() : '—'} />
          <HeaderStat icon={Database} label="Queue Depth" value={config.queue_depth || 0} />
          <HeaderStat icon={Zap} label="Processing Rate" value={`${config.processing_rate || 0}/hr`} />
          <HeaderStat icon={AlertCircle} label="Error Rate" value={`${config.error_rate || 0}%`} color={config.error_rate > 10 ? 'text-destructive' : 'text-muted-foreground'} />
          <HeaderStat icon={TrendingUp} label="Total Discoveries" value={config.total_discoveries || 0} />
          <HeaderStat icon={Database} label="Published" value={config.total_published || 0} color="text-berna-emerald" />
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${color || 'text-muted-foreground'}`} />
      <div>
        <p className="text-xs text-muted-foreground leading-none">{label}</p>
        <p className={`text-sm font-medium ${color || ''}`}>{value}</p>
      </div>
    </div>
  );
}