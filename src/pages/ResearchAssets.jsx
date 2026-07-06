import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import PointMediaGenerator from '@/components/research/PointMediaGenerator';
import { Loader2, FlaskConical, Sparkles, AlertCircle, ChevronDown, ChevronUp, Package, CheckCircle2 } from 'lucide-react';

const ASSET_LABELS = {
  teleprompter_script: 'Teleprompter Script',
  story_summary: 'Story Summary',
  talking_points: 'Talking Points',
  lower_third_text: 'Lower Third Text',
  headline_suggestions: 'Headline Suggestions',
  image_prompt: 'Image Prompt',
  thumbnail_prompt: 'Thumbnail Prompt',
  visual_suggestions: 'Visual Suggestions',
  broll_suggestions: 'B-Roll Suggestions',
  social_caption: 'Social Caption',
  fact_check_notes: 'Fact Check Notes',
  estimated_runtime: 'Estimated Runtime'
};

export default function ResearchAssets() {
  const { config, packages, points, loading, refresh } = useResearchProduction();
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <FlaskConical className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  // Map packages to their source points
  const packagesWithPoints = packages.map(pkg => ({
    pkg,
    point: points.find(p => p.id === pkg.source_entity_id)
  })).filter(item => item.point);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Production Packages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-model synthesized packages generated from your approved research points</p>
      </div>

      {packagesWithPoints.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No packages generated yet. Approve Point Cards in the Point Manager and generate packages from them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {packagesWithPoints.map(({ pkg, point }) => {
            const isExpanded = expanded === pkg.id;
            return (
              <div key={pkg.id} className="glass-panel p-4">
                <div className="!flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm">{point.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {point.topic_title} · {pkg.generation_count > 1 ? `Regenerated ${pkg.generation_count}x` : 'Generated once'}
                    </p>
                  </div>
                  <div className="!flex items-center gap-2 shrink-0">
                    {pkg.estimated_runtime && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{pkg.estimated_runtime}</span>
                    )}
                    {pkg.is_edited ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Edited</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">AI-Generated</span>
                    )}
                  </div>
                </div>

                {pkg.generation_provider && (
                  <p className="text-xs text-muted-foreground mb-2">Models: {pkg.generation_provider}</p>
                )}

                {/* Quick preview of teleprompter script */}
                {pkg.teleprompter_script && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {isExpanded ? pkg.teleprompter_script : pkg.teleprompter_script.substring(0, 200) + '...'}
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {Object.entries(ASSET_LABELS).map(([key, label]) => {
                      const value = pkg[key];
                      if (!value) return null;
                      return (
                        <div key={key} className="p-3 rounded-lg bg-secondary/30">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                          <p className="text-sm whitespace-pre-line">{value}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="!flex items-center justify-end mt-3">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : pkg.id)}
                    className="text-xs text-primary hover:underline !flex items-center gap-0.5"
                  >
                    {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Expand Full Package</>}
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <PointMediaGenerator pkg={pkg} onMediaUpdate={refresh} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}