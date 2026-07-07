import React from 'react';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';

export default function LobbyHero({ userName, config, recommendation, ctaLabel, onCTAClick, readinessPercent }) {
  const firstName = userName || 'there';
  return (
    <div className="cc-glass-card relative overflow-hidden cc-animate-fade-up" style={{ minHeight: '150px' }}>
      {/* Warm ambient glow — like a reception desk lamp */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 80% at 15% 50%, hsl(35 60% 12% / 0.35) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 85% 50%, hsl(190 50% 10% / 0.2) 0%, transparent 60%)'
      }} />

      <div className="relative z-10 p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-3.5 h-3.5" style={{ color: 'hsl(35 80% 55%)' }} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Research Production Profile · Lobby</span>
          </div>
          <h1 className="text-xl md:text-2xl font-heading font-bold mb-1">
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            {config?.production_name
              ? <>Your <span style={{ color: 'hsl(35 80% 58%)' }}>{config.production_name}</span> project is <span style={{ color: 'hsl(152 55% 50%)' }}>{readinessPercent}% ready</span>.</>
              : 'No active research project configured yet.'}
          </p>
          {recommendation && (
            <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: 'hsl(190 70% 55%)' }}>
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>{recommendation}</span>
            </div>
          )}
        </div>
        <button
          onClick={onCTAClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:gap-3 shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(35 60% 18% / 0.4), hsl(35 50% 10% / 0.2))',
            border: '1px solid hsl(35 50% 28% / 0.5)',
            color: 'hsl(35 90% 60%)',
          }}
        >
          {ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}