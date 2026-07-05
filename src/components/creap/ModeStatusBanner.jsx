import React, { useState, useEffect, useRef } from 'react';
import { Zap, Users, Moon, ChevronRight } from 'lucide-react';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import { useCREAPMode } from '@/context/CREAPModeContext';

const MODE_CONFIG = {
  [CREAP_MODES.AUTOPILOT]: {
    icon: Zap,
    color: 'text-berna-orange',
    bg: 'from-berna-orange/10 to-transparent',
    border: 'border-berna-orange/20',
    glow: 'glow-orange',
    label: 'Full CREAP',
    status: "CREAPD's driving",
    pulse: true,
  },
  [CREAP_MODES.HYBRID]: {
    icon: Users,
    color: 'text-berna-purple',
    bg: 'from-berna-purple/10 to-transparent',
    border: 'border-berna-purple/20',
    glow: 'glow-purple',
    label: 'Hybrid CREAP',
    status: 'CREAPD co-piloting',
    pulse: false,
  },
  [CREAP_MODES.FREE]: {
    icon: Moon,
    color: 'text-berna-emerald',
    bg: 'from-berna-emerald/5 to-transparent',
    border: 'border-berna-emerald/10',
    glow: '',
    label: 'Free CREAP',
    status: 'On-demand only',
    pulse: false,
  },
};

const ZONE_LABELS = {
  story_review: 'Story Review',
  story_selection: 'Story Selection',
  package_generation: 'Package Generation',
  package_review: 'Package Review',
  presentation: 'Presentation',
  export: 'Export',
};

export default function ModeStatusBanner() {
  const { mode, focusZone, traits } = useCREAPMode();
  const config = MODE_CONFIG[mode] || MODE_CONFIG[CREAP_MODES.HYBRID];
  const Icon = config.icon;
  const [justChanged, setJustChanged] = useState(false);
  const prevMode = useRef(mode);

  useEffect(() => {
    if (prevMode.current !== mode) {
      setJustChanged(true);
      const timer = setTimeout(() => setJustChanged(false), 1500);
      prevMode.current = mode;
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // FREE mode: minimal, just a thin indicator line
  if (mode === CREAP_MODES.FREE) {
    return (
      <div className={`flex items-center gap-2 px-4 py-1 bg-gradient-to-r ${config.bg} border-b ${config.border} ${justChanged ? 'animate-fade-in' : ''}`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className={`text-[10px] font-mono uppercase tracking-wider ${config.color}`}>{config.status}</span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground">{ZONE_LABELS[focusZone]}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r ${config.bg} border-b ${config.border} ${justChanged ? 'animate-fade-in' : ''} ${config.glow}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${config.color} ${config.pulse ? 'pulse-glow' : ''}`} />
        <span className={`text-xs font-heading font-semibold ${config.color}`}>{config.status}</span>
      </div>
      <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{config.label}</span>
      <span className="text-[10px] text-muted-foreground/40">·</span>
      <span className="text-[10px] font-mono text-muted-foreground">{ZONE_LABELS[focusZone] || focusZone}</span>
      {traits.subtitle && (
        <>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground italic">{traits.subtitle}</span>
        </>
      )}
    </div>
  );
}