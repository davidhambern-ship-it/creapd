import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrchestrator } from '@/context/OrchestratorProvider';
import { editorialSpotlightScript } from '@/lib/creapr/sampleScript';
import DemoAtomCard from '@/components/creapr/DemoAtomCard';
import { Play, Pause, RotateCcw, ChevronLeft, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * CreaprDemo — proves the end-to-end Engine loop:
 *   load script → run → logic module picks winner → atoms receive commands
 *
 * The DevTools panel (bottom-right) shows the live state as you interact.
 */
export default function CreaprDemo() {
  const { state, loadScript, run, pause, reset } = useOrchestrator();

  const handleLoadAndRun = async () => {
    loadScript(editorialSpotlightScript);
    // Small delay so the script ref is set before run reads it
    setTimeout(() => run(), 50);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="text-muted-foreground hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-berna-purple to-berna-orange flex items-center justify-center glow-purple">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-heading font-bold text-white">CREAPr Engine Demo</h1>
              <p className="text-xs text-muted-foreground">Hybrid script → logic module → atom commands</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Controls */}
        <div className="glass-panel p-4 flex items-center gap-2">
          <Button onClick={handleLoadAndRun} disabled={state.status === 'running'}>
            <Play className="w-4 h-4 mr-1" /> Load & Run
          </Button>
          <Button variant="outline" onClick={pause} disabled={state.status !== 'running'}>
            <Pause className="w-4 h-4 mr-1" /> Pause
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">
              status: <span className="text-white">{state.status}</span>
            </span>
            <span className="font-mono text-muted-foreground">
              step: <span className="text-white">{state.currentStepIndex}</span>
            </span>
          </div>
        </div>

        {/* Script description */}
        <div className="glass-panel p-4">
          <h3 className="text-sm font-heading font-semibold text-white mb-2">Script: {editorialSpotlightScript.name}</h3>
          <p className="text-xs text-muted-foreground mb-3">{editorialSpotlightScript.description}</p>
          <div className="space-y-1">
            {editorialSpotlightScript.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                  i < state.currentStepIndex ? 'bg-berna-emerald/20 text-berna-emerald' :
                  i === state.currentStepIndex && state.status === 'running' ? 'bg-berna-orange/20 text-berna-orange' :
                  'bg-white/[0.04] text-muted-foreground'
                }`}>
                  {i < state.currentStepIndex ? '✓' : i + 1}
                </span>
                <span className="text-muted-foreground">
                  {step.action}
                  {step.target && <span className="text-berna-purple"> → {step.target}</span>}
                  {step.script && <span className="text-berna-purple"> → {step.script}()</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Atoms */}
        <div>
          <p className="text-sm font-heading font-semibold text-white mb-3">Registered Atoms</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <DemoAtomCard id="demo-card-1" title="AI Bill Passes Senate" score={8.5} />
            <DemoAtomCard id="demo-card-2" title="Local Market Update" score={6.2} />
            <DemoAtomCard id="demo-card-3" title="Tech Earnings Beat" score={7.8} />
          </div>
        </div>

        {/* Context vars */}
        {Object.keys(state.contextVars).length > 0 && (
          <div className="glass-panel p-4">
            <h3 className="text-sm font-heading font-semibold text-white mb-2">Context Variables</h3>
            <div className="space-y-1">
              {Object.entries(state.contextVars).map(([key, val]) => (
                <div key={key} className="text-[10px] font-mono">
                  <span className="text-berna-purple">{key}</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="text-white/70">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50">
          Watch the DevTools panel (bottom-right) for the full execution log.
        </p>
      </div>
    </div>
  );
}