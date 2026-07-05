import React from 'react';
import { Zap, Users, Moon } from 'lucide-react';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import { useCREAPMode } from '@/context/CREAPModeContext';

const MODE_OPTIONS = [
  {
    key: CREAP_MODES.AUTOPILOT,
    label: 'Full',
    subtitle: 'Taskmaster',
    icon: Zap,
    activeClass: 'bg-berna-orange/20 text-berna-orange border-berna-orange/30',
  },
  {
    key: CREAP_MODES.HYBRID,
    label: 'Hybrid',
    subtitle: 'Co-Pilot',
    icon: Users,
    activeClass: 'bg-berna-purple/20 text-berna-purple border-berna-purple/30',
  },
  {
    key: CREAP_MODES.FREE,
    label: 'Free',
    subtitle: 'Quiet',
    icon: Moon,
    activeClass: 'bg-berna-emerald/20 text-berna-emerald border-berna-emerald/30',
  },
];

export default function ModeToggle() {
  const { mode, setMode } = useCREAPMode();

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-secondary/60 border border-border p-0.5">
      {MODE_OPTIONS.map((opt) => {
        const isActive = mode === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            onClick={() => setMode(opt.key)}
            title={`${opt.label} CREAP — ${opt.subtitle}`}
            className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
              isActive
                ? `${opt.activeClass} glow-purple`
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}