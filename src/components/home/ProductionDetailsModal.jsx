import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, CheckCircle, ArrowRight, Film } from 'lucide-react';

export default function ProductionDetailsModal({ profile, onClose }) {
  if (!profile) return null;
  const Icon = profile.icon;

  return (
    <Dialog open={!!profile} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg bg-card border-white/10 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${profile.gradient} flex items-center justify-center mb-2`}>
            <Icon className={`w-6 h-6 ${profile.accent}`} />
          </div>
          <DialogTitle className="text-lg font-heading font-bold text-white">
            {profile.label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* What it does */}
          <div>
            <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-1">What it does</p>
            <p className="text-sm text-white/80 leading-relaxed">{profile.description}</p>
          </div>

          {/* Spotlight Feature */}
          {profile.spotlightFeature && (
            <div className={`p-3 rounded-lg ${profile.accentBg} border ${profile.accentBorder}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className={`w-3.5 h-3.5 ${profile.accent}`} />
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-white">Spotlight Feature: {profile.spotlightFeature}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{profile.spotlightDescription}</p>
            </div>
          )}

          {/* Workflow */}
          {profile.workflow.length > 0 && (
            <div>
              <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-2">Workflow</p>
              <div className="space-y-1.5">
                {profile.workflow.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-berna-purple font-bold mt-0.5 w-4">{i + 1}.</span>
                    <span className="text-xs text-white/80 leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outputs */}
          {profile.outputs && (
            <div>
              <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-1">Outputs</p>
              <p className="text-xs text-white/80 leading-relaxed">{profile.outputs}</p>
            </div>
          )}

          {/* Examples */}
          {profile.examples.length > 0 && (
            <div>
              <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground mb-2">Example Productions</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.examples.map((ex) => (
                  <span key={ex} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/70">
                    <Film className="w-3 h-3 text-muted-foreground" />
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {profile.available && (
            <button
              onClick={() => {
                onClose();
                if (profile.path) window.location.href = profile.path;
              }}
              disabled={!profile.path}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                profile.path
                  ? `bg-gradient-to-r ${profile.gradient} ${profile.accent} hover:scale-[1.01] border ${profile.accentBorder}`
                  : 'bg-white/[0.04] text-muted-foreground border border-white/5 cursor-not-allowed'
              }`}
            >
              {profile.path ? 'Get Started' : 'Coming Soon'}
              {profile.path && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}