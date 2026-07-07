import React from 'react';
import { Package, PackageCheck, Loader2, ArrowRight } from 'lucide-react';

export default function PacketPickupPanel({ packetState, packetTitle, onAction }) {
  const config = {
    none: {
      icon: Package,
      iconColor: 'hsl(220 10% 35%)',
      bgColor: 'hsl(220 10% 12% / 0.2)',
      borderColor: 'hsl(220 10% 20% / 0.3)',
      title: 'Your Production Packet is not ready yet.',
      subtitle: 'Continue building your research to assemble the final packet.',
      ctaLabel: 'Continue Building',
    },
    in_progress: {
      icon: Loader2,
      iconColor: 'hsl(35 90% 55%)',
      bgColor: 'hsl(35 50% 12% / 0.2)',
      borderColor: 'hsl(35 50% 28% / 0.4)',
      title: 'Your packet is being assembled.',
      subtitle: packetTitle ? `"${packetTitle}" is in the Develop stage.` : 'Assets are being generated and packaged.',
      ctaLabel: 'View Progress',
    },
    ready: {
      icon: PackageCheck,
      iconColor: 'hsl(152 60% 50%)',
      bgColor: 'hsl(152 40% 12% / 0.2)',
      borderColor: 'hsl(152 40% 28% / 0.4)',
      title: 'Your Production Packet is ready.',
      subtitle: packetTitle ? `"${packetTitle}" is ready for collection.` : 'Your final packet is ready to collect.',
      ctaLabel: 'Collect Packet',
    },
  };

  const c = config[packetState] || config.none;
  const Icon = c.icon;

  return (
    <div className="cc-glass-card relative overflow-hidden cc-animate-fade-up cc-stagger-2" style={{
      background: `linear-gradient(135deg, ${c.bgColor}, hsl(210 40% 7% / 0.55))`,
      borderColor: c.borderColor,
    }}>
      {/* Premium glow for ready state */}
      {packetState === 'ready' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 80% 50%, hsl(152 60% 30% / 0.12) 0%, transparent 60%)',
        }} />
      )}

      <div className="relative z-10 p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
            background: c.bgColor,
            border: `1px solid ${c.borderColor}`,
          }}>
            <Icon className="w-6 h-6" style={{
              color: c.iconColor,
              animation: packetState === 'in_progress' ? 'spin 2s linear infinite' : 'none',
            }} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Packet Pickup</p>
            <h3 className="text-sm md:text-base font-heading font-semibold">{c.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{c.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:gap-3 shrink-0"
          style={{
            background: packetState === 'ready'
              ? 'linear-gradient(135deg, hsl(152 50% 18% / 0.4), hsl(152 40% 10% / 0.2))'
              : 'linear-gradient(135deg, hsl(35 50% 18% / 0.4), hsl(35 40% 10% / 0.2))',
            border: `1px solid ${c.borderColor}`,
            color: c.iconColor,
          }}
        >
          {c.ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}