import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import PointMediaGenerator from '@/components/research/PointMediaGenerator';
import SpecialistInsights from '@/components/research/SpecialistInsights';
import { Switch } from '@/components/ui/switch';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import {
  Loader2, FlaskConical, Sparkles, AlertCircle, ChevronDown, ChevronUp,
  Package, CheckCircle2, Brain, ArrowRight, Clapperboard
} from 'lucide-react';

const ASSET_LABELS = {
  lower_third_text: 'Lower Third Text',
  headline_suggestions: 'Headline Suggestions',
  estimated_runtime: 'Estimated Runtime'
};

export default function ResearchAssets() {
  const researchData = useResearchProduction();
  const { config, packages, points, topics, dossiers, loading, refresh } = researchData;
  const navigate = useNavigate();
  const ownedPreview = shouldUseNeonAuth();
  const [expanded, setExpanded] = useState(null);
  const [showSpecialistInsights, setShowSpecialistInsights] = useState(false);
  const [handoffPackageId, setHandoffPackageId] = useState(null);
  const [handoffError, setHandoffError] = useState(null);

  const getDossierForPackage = (pkg) => {
    const point = points.find(p => p.id === pkg.source_entity_id);
    if (!point) return null;
    const topic = topics.find(t => t.id === point.topic_id);
    if (!topic || !topic.dossier_id) return null;
    return dossiers.find(d => d.id === topic.dossier_id) || null;
  };

  const handlePresentationStudioHandoff = async (pkg) => {
    if (!pkg?.id || handoffPackageId) return;
    setHandoffPackageId(pkg.id);
    setHandoffError(null);

    try {
      const action = pkg.status === 'approved'
        ? 'handoff_package_to_presentation_studio'
        : 'approve_package_and_handoff';

      const result = await creapdApi.post('/production/core', {
        action,
        package_id: pkg.id,
      });

      const presentationId = result?.presentation?.id;
      if (!presentationId) {
        throw new Error('Presentation Studio did not return a presentation project.');
      }

      await refresh();
      navigate(`/editor/${presentationId}`);
    } catch (err) {
      const message =
        err?.data?.diagnostic?.message ||
        err?.data?.message ||
        err?.message ||
        'Could not send this package to the Presentation Studio.';
      setHandoffError({ packageId: pkg.id, message });
    } finally {
      setHandoffPackageId(null);
    }
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

  const packagesWithPoints = packages.map(pkg => ({
    pkg,
    point: points.find(p => p.id === pkg.source_entity_id)
  })).filter(item => item.point);

  const approvedCount = points.filter(p => p.status === 'approved' || p.status === 'used').length;
  const approvedPackageCount = packages.filter(p => p.status === 'approved').length;

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      <div className="px-4 md:px-6 pt-4 pb-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-heading font-bold">Production Packages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Research Studio workers build the package here. Once you approve it, CREAPD sends a snapshot to the Presentation Studio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 p-3 rounded-lg cc-glass-card">
          <Brain className="w-4 h-4" style={{ color: 'hsl(270 80% 60%)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium">Specialist Insights</p>
            <p className="text-xs text-muted-foreground">Show debate potential, competing perspectives, gray areas & claim confidence</p>
          </div>
          <Switch checked={showSpecialistInsights} onCheckedChange={setShowSpecialistInsights} />
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <div className="cc-metric-card cc-animate-scale-in cc-stagger-3">
          <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: '0.25s' }}>{packages.filter(p => p.is_edited).length}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>EDITED</p>
          <p className="text-xs text-muted-foreground/60">manually refined</p>
        </div>
        <div className="cc-metric-card cc-animate-scale-in cc-stagger-4">
          <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: '0.3s' }}>{approvedPackageCount}</p>
          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>APPROVED PACKAGES</p>
          <p className="text-xs text-muted-foreground/60">ready for Presentation Studio</p>
        </div>
      </div>

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
              const isHandingOff = handoffPackageId === pkg.id;
              const isApproved = pkg.status === 'approved';
              const packageError = handoffError?.packageId === pkg.id ? handoffError.message : null;

              return (
                <div key={pkg.id} className={`cc-glass-card p-4 cc-animate-fade-up cc-stagger-${Math.min((pIdx % 6) + 1, 6)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm">{point.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {point.topic_title} · {pkg.generation_count > 1 ? `Regenerated ${pkg.generation_count}x` : 'Generated once'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {pkg.estimated_runtime && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(190 40% 12% / 0.3)', color: 'hsl(190 70% 55%)' }}>{pkg.estimated_runtime}</span>
                      )}
                      {isApproved ? (
                        <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'hsl(152 50% 15% / 0.25)', color: 'hsl(152 60% 50%)' }}>
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      ) : pkg.is_edited ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(35 60% 15% / 0.2)', color: 'hsl(35 90% 60%)' }}>Edited</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(152 50% 15% / 0.2)', color: 'hsl(152 60% 50%)' }}>AI-Generated</span>
                      )}
                    </div>
                  </div>

                  {pkg.generation_provider && (
                    <p className="text-xs text-muted-foreground mb-2">Models: {pkg.generation_provider}</p>
                  )}

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

                  {ownedPreview && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid hsl(270 25% 22% / 0.35)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Clapperboard className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(270 80% 65%)' }} />
                          <div>
                            <p className="text-xs font-semibold">Presentation Studio Handoff</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {isApproved
                                ? 'This package is approved. Open or resume its Presentation Studio project.'
                                : 'Approve this package and CREAPD will send an immutable snapshot to the Presentation Studio.'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePresentationStudioHandoff(pkg)}
                          disabled={isHandingOff || Boolean(handoffPackageId && !isHandingOff)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, hsl(270 45% 18% / 0.45), hsl(190 40% 14% / 0.3))',
                            border: '1px solid hsl(270 55% 35% / 0.45)',
                            color: 'hsl(270 80% 72%)',
                          }}
                        >
                          {isHandingOff ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                          ) : isApproved ? (
                            <><Clapperboard className="w-3.5 h-3.5" /> Open in Presentation Studio <ArrowRight className="w-3.5 h-3.5" /></>
                          ) : (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Approve & Send <ArrowRight className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </div>
                      {packageError && (
                        <div className="mt-3 flex items-start gap-2 text-xs" style={{ color: 'hsl(0 72% 60%)' }}>
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{packageError}</span>
                        </div>
                      )}
                    </div>
                  )}

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
