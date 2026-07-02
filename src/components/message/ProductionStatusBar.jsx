import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Search, GraduationCap, PenTool, Presentation, Package, Clock, Volume2, Image as ImageIcon } from 'lucide-react';

const STAGES = [
  { key: 'research', label: 'Research', icon: Search },
  { key: 'topics', label: 'Study Topics', icon: GraduationCap },
  { key: 'message', label: 'Message Script', icon: PenTool },
  { key: 'slides', label: 'Presentation Slides', icon: Presentation },
  { key: 'voice', label: 'Voiceover', icon: Volume2 },
  { key: 'images', label: 'AI Images', icon: ImageIcon },
  { key: 'assets', label: 'Production Assets', icon: Package },
  { key: 'package', label: 'Delivery Package', icon: CheckCircle2 }
];

export default function ProductionStatusBar({ generating, configStatus, generatingVoice, generatingImages }) {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (!generating && configStatus !== 'building') return;
    const interval = setInterval(() => {
      setActiveStage(prev => Math.min(prev + 1, STAGES.length - 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [generating, configStatus]);

  if (!generating && configStatus !== 'building' && !generatingVoice && !generatingImages) return null;

  // Voice generation phase — show after build completes
  if (generatingVoice) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <h3 className="font-heading font-semibold">Generating Voiceovers...</h3>
            <p className="text-xs text-muted-foreground">Creating audio for each message section</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isComplete = idx < 4;
            const isActive = stage.key === 'voice';
            return (
              <div
                key={stage.key}
                className={`p-3 rounded-lg border transition-all ${
                  isComplete ? 'bg-berna-emerald/10 border-berna-emerald/30'
                  : isActive ? 'bg-primary/10 border-primary/30 glow-purple'
                  : 'bg-secondary/20 border-border opacity-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-medium ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {stage.label}
                </p>
                <p className="text-xs mt-0.5">
                  {isComplete ? <span className="text-berna-emerald">✓ Complete</span>
                  : isActive ? <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Generating</span>
                  : <span className="text-muted-foreground">Pending</span>}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Generating voice audio for each section. This typically takes 30-60 seconds.</span>
        </div>
      </div>
    );
  }

  // Image generation phase — show after voice completes
  if (generatingImages) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <h3 className="font-heading font-semibold">Generating AI Images...</h3>
            <p className="text-xs text-muted-foreground">Creating visual artwork for each presentation scene</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isComplete = idx < 5;
            const isActive = stage.key === 'images';
            return (
              <div
                key={stage.key}
                className={`p-3 rounded-lg border transition-all ${
                  isComplete ? 'bg-berna-emerald/10 border-berna-emerald/30'
                  : isActive ? 'bg-primary/10 border-primary/30 glow-purple'
                  : 'bg-secondary/20 border-border opacity-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-medium ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {stage.label}
                </p>
                <p className="text-xs mt-0.5">
                  {isComplete ? <span className="text-berna-emerald">✓ Complete</span>
                  : isActive ? <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Generating</span>
                  : <span className="text-muted-foreground">Pending</span>}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Generating scene images. This typically takes 30-90 seconds depending on the number of scenes.</span>
        </div>
      </div>
    );
  }

  // Build phase
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <div>
          <h3 className="font-heading font-semibold">Building Production...</h3>
          <p className="text-xs text-muted-foreground">Generating all production assets simultaneously</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isComplete = idx < activeStage;
          const isActive = idx === activeStage;
          const isPending = idx > activeStage;

          return (
            <div
              key={stage.key}
              className={`p-3 rounded-lg border transition-all ${
                isComplete ? 'bg-berna-emerald/10 border-berna-emerald/30'
                : isActive ? 'bg-primary/10 border-primary/30 glow-purple'
                : 'bg-secondary/20 border-border opacity-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className={`text-xs font-medium ${isComplete ? 'text-berna-emerald' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {stage.label}
              </p>
              <p className="text-xs mt-0.5">
                {isComplete ? <span className="text-berna-emerald">✓ Complete</span>
                : isActive ? <span className="text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Building</span>
                : <span className="text-muted-foreground">Pending</span>}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>This typically takes 30-60 seconds. Voiceovers generate after the build completes.</span>
      </div>
    </div>
  );
}