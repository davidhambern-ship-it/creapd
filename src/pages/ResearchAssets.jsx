import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import PointMediaGenerator from '@/components/research/PointMediaGenerator';
import SpecialistInsights from '@/components/research/SpecialistInsights';
import { Switch } from '@/components/ui/switch';
import { Loader2, FlaskConical, Sparkles, AlertCircle, ChevronDown, ChevronUp, Package, CheckCircle2, Brain } from 'lucide-react';

const ASSET_LABELS = {
  lower_third_text: 'Lower Third Text',
  headline_suggestions: 'Headline Suggestions',
  estimated_runtime: 'Estimated Runtime'
};

const MEDIA_CENTER_FIELDS = {
  teleprompter_script: 'Teleprompter Script',
  talking_points: 'Talking Points',
  image_prompt: 'Image Prompt',
  thumbnail_prompt: 'Thumbnail Prompt',
  visual_suggestions: 'Visual Suggestions',
  broll_suggestions: 'B-Roll Suggestions',
  social_caption: 'Social Caption',
  fact_check_notes: 'Fact Check Notes'
};

export default function ResearchAssets() {
  const researchData = useResearchProduction();
  const { config, packages, points, topics, dossiers, loading, refresh } = researchData;
  const [expanded, setExpanded] = useState(null);
  const [showSpecialistInsights, setShowSpecialistInsights] = useState(false);

  const getDossierForPackage = (pkg) => {
    const point = points.find(p => p.id === pkg.source_entity_id);
    if (!point) return null;
    const topic = topics.find(t => t.id === point.topic_id);
    if (!topic || !topic.dossier_id) return null;
    return dossiers.find(d => d.id === topic.dossier_id) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center cc-animate-fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <FlaskConical className="w-8 h-8" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
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

  const approvedCount = points.filter(p => p.status === 'approved' || p.status === 'used').length;

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-heading font-bold">Production Packages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Multi-model synthesized packages generated from your approved research points</p>
          </div>
        </div>

        {/* Specialist Insights Toggle */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg cc-glass-card">
          <Brain className="w-4 h-4" style={{ color: 'hsl(270 80% 60%)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium">Specialist Insights</p>
            <p className="text-xs text-muted-foreground">Show debate potential, competing perspectives, gray areas & claim confidence</p>
          </div>
          <Switch
            checked={showSpecialistInsights}
            onCheckedChange={setShowSpecialistInsights}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 md:px-6 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="cc-metric-card cc-animate-scale-in cc-stagger-1">
          <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: '0.15s' }}>{packagesWithPoints.length}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>PACKAGES</p>
          <p className="text-xs text-muted-foreground/60">synthesized outputs</p>
        </div>
        <div className="cc-metric-card cc-animate-scale-in cc-stagger-2">
          <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: '0.2s' }}>{approvedCount}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>APPROVED POINTS</p>
          <p className="text-xs text-muted-foreground/60">source material</p>
        </div>
        <div className="cc-metric-card cc-animate-scale-in cc-stagger-3 col-span-2 md:col-span-1">
          <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: '0.25s' }}>{packages.filter(p => p.is_edited).length}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>EDITED</p>
          <p className="text-xs text-muted-foreground/60">manually refined</p>
        </div>
      </div>

      {/* Package Cards */}
      <div className="px-4 md:px-6 pb-6">
        {packagesWithPoints.length === 0 ? (
          <div className="cc-glass-card p-8 text-center cc-animate-fade-up">
            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No packages generated yet. Approve Point Cards in the Point Manager and generate packages from them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {packagesWithPoints.map(({ pkg, point }, pIdx) => {
              const isExpanded = expanded === pkg.id;
              return (
                <div key={pkg.id} className={`cc-glass-card p-4 cc-animate-fade-up cc-stagger-${Math.min((pIdx % 6) + 1, 6)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm">{point.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {point.topic_title} · {pkg.generation_count > 1 ? `Regenerated ${pkg.generation_count}x` : 'Generated once'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pkg.estimated_runtime && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(190 40% 12% / 0.3)', color: 'hsl(190 70% 55%)' }}>{pkg.estimated_runtime}</span>
                      )}
                      {pkg.is_edited ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(35 60% 15% / 0.2)', color: 'hsl(35 90% 60%)' }}>Edited</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(152 50% 15% / 0.2)', color: 'hsl(152 60% 50%)' }}>AI-Generated</span>
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
                          <div key={key} className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-sm whitespace-pre-line">{value}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-end mt-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : pkg.id)}
                      className="text-xs hover:underline flex items-center gap-0.5"
                      style={{ color: 'hsl(190 80% 55%)' }}
                    >
                      {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Expand Full Package</>}
                    </button>
                  </div>

                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(190 20% 18% / 0.3)' }}>
                    <PointMediaGenerator pkg={pkg} point={point} onMediaUpdate={refresh} />
                  </div>

                  {showSpecialistInsights && (() => {
                    const dossier = getDossierForPackage(pkg);
                    return <SpecialistInsights dossier={dossier} />;
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}