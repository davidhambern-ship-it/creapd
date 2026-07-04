import React from 'react';
import { Lightbulb, Clapperboard, Package, Volume2, Presentation, Share2 } from 'lucide-react';

const PIPELINE_STEPS = [
  { icon: Lightbulb, label: 'Idea', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Clapperboard, label: 'Production Profile', color: 'text-berna-purple', bg: 'bg-berna-purple/10' },
  { icon: Package, label: 'Story / Message Package', color: 'text-berna-emerald', bg: 'bg-berna-emerald/10' },
  { icon: Volume2, label: 'Voice + Media', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Presentation, label: 'Presentation', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { icon: Share2, label: 'Export / Share', color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function PipelineExplainer() {
  return (
    <section className="px-4 lg:px-6 py-8 lg:py-12 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white neon-underline inline-block">
          What Is CREAPD?
        </h2>
        <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
          CREAPD helps creators turn ideas into complete productions. Choose a Production Profile,
          generate a structured package, create voice, media, and presentation assets, direct the
          final presentation, then export or share your finished production.
        </p>
      </div>

      {/* Pipeline — horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col lg:flex-row items-stretch justify-center gap-2 lg:gap-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === PIPELINE_STEPS.length - 1;
          return (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-3 lg:flex-col lg:text-center glass-panel px-4 py-3 lg:px-3 lg:py-4 flex-1 lg:max-w-[180px]">
                <div className={`w-10 h-10 rounded-lg ${step.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <span className="text-xs lg:text-[11px] font-heading font-semibold text-white/90 leading-tight">
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div className="flex items-center justify-center lg:px-0.5">
                  <svg className="w-4 h-4 text-muted-foreground/40 rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}