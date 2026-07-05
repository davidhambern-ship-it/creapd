import React, { useState, useMemo } from 'react';
import { useOrchestrator } from '@/context/OrchestratorProvider';
import {
  Activity, ChevronDown, ChevronUp, Circle, Boxes, Layers,
  Terminal, Zap, Pause, Play, RotateCcw, X,
} from 'lucide-react';

/**
 * OrchestratorDevTools — a floating, collapsible panel that renders the live
 * state of the CREAPr Engine. Shows registered atoms, execution status,
 * context vars, and the step log. Read-only (no mutation controls beyond
 * run/pause/reset).
 */
export default function OrchestratorDevTools() {
  const { state, run, pause, reset } = useOrchestrator();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('atoms'); // 'atoms' | 'state' | 'log'

  const statusColor = useMemo(() => {
    switch (state.status) {
      case 'running': return 'text-berna-emerald';
      case 'paused': return 'text-berna-orange';
      case 'faulted': return 'text-red-400';
      case 'completed': return 'text-blue-400';
      default: return 'text-muted-foreground';
    }
  }, [state.status]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] h-10 w-10 rounded-full bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center shadow-lg glow-purple hover:scale-110 transition-transform"
        title="CREAPr Engine DevTools"
      >
        <Activity className="w-5 h-5 text-white" />
        {state.status === 'running' && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-berna-emerald pulse-glow" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[70vh] rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#0a0e1a] to-[#0f1424] backdrop-blur-2xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-heading font-bold text-white">CREAPr Engine</span>
          <span className={`text-[10px] font-mono flex items-center gap-1 ${statusColor}`}>
            <Circle className="w-2 h-2 fill-current" />
            {state.status}
          </span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.04]">
        {state.status === 'running' ? (
          <button onClick={pause} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-berna-orange/10 text-berna-orange hover:bg-berna-orange/20 transition-colors">
            <Pause className="w-3 h-3" /> Pause
          </button>
        ) : (
          <button onClick={run} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-berna-emerald/10 text-berna-emerald hover:bg-berna-emerald/20 transition-colors">
            <Play className="w-3 h-3" /> Run
          </button>
        )}
        <button onClick={reset} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.05] text-muted-foreground hover:text-white transition-colors">
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <div className="flex-1" />
        {state.fault && (
          <span className="text-[10px] text-red-400 font-mono truncate max-w-[120px]" title={state.fault.message}>
            ⚠ {state.fault.targetId}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2">
        {[
          { key: 'atoms', label: 'Atoms', icon: Boxes, count: state.activeAtoms.length },
          { key: 'state', label: 'State', icon: Layers, count: Object.keys(state.contextVars).length },
          { key: 'log', label: 'Log', icon: Terminal, count: state.log.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-t-md transition-colors ${
              tab === t.key ? 'bg-white/[0.06] text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            <span className="text-muted-foreground/50 font-mono">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[120px] max-h-[300px]">
        {tab === 'atoms' && (
          <div className="space-y-1">
            {state.activeAtoms.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 text-center py-4">No atoms registered</p>
            ) : (
              state.activeAtoms.map((id) => (
                <div key={id} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.02] border border-white/[0.03]">
                  <span className="w-1.5 h-1.5 rounded-full bg-berna-emerald shrink-0" />
                  <span className="text-white/80 truncate">{id}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'state' && (
          <div className="space-y-1">
            {Object.keys(state.contextVars).length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 text-center py-4">No context vars set</p>
            ) : (
              Object.entries(state.contextVars).map(([key, val]) => (
                <div key={key} className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.02] border border-white/[0.03]">
                  <span className="text-berna-purple">{key}</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="text-white/80">
                    {typeof val === 'object' ? JSON.stringify(val).slice(0, 80) : String(val).slice(0, 80)}
                  </span>
                </div>
              ))
            )}
            <div className="pt-2 mt-2 border-t border-white/[0.04]">
              <div className="text-[10px] font-mono text-muted-foreground">
                script: <span className="text-white/60">{state.activeScriptId || 'none'}</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                step: <span className="text-white/60">{state.currentStepIndex}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'log' && (
          <div className="space-y-0.5">
            {state.log.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 text-center py-4">No log entries</p>
            ) : (
              state.log.slice(-30).reverse().map((entry, i) => (
                <div key={i} className="text-[10px] font-mono px-2 py-0.5 text-muted-foreground/70 leading-relaxed">
                  <span className="text-muted-foreground/40">
                    {new Date(entry.ts).toLocaleTimeString([], { hour12: false })}{' '}
                  </span>
                  {entry.msg}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}