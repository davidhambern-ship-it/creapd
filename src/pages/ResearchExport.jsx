import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import PresentationViewer from '@/components/production/PresentationViewer';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { Loader2, FlaskConical, Download, Package, CheckCircle2, Layers, FileText, Archive, AlertCircle, Eye, Volume2, Clock3, ShieldCheck } from 'lucide-react';

function parsePayload(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function formatRuntime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function ResearchExport() {
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers, loading, refresh } = researchData;
  const navigate = useNavigate();
  const ownedPreview = shouldUseNeonAuth();
  const [assembling, setAssembling] = useState(false);
  const [packet, setPacket] = useState(null);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!config?.id) {
      setPacket(null);
      return;
    }

    if (ownedPreview) {
      const payload = parsePayload(config.source_payload);
      setPacket(payload.presentation_plan || null);
      return;
    }

    base44.entities.StoriesPresentation.filter({ production_profile: 'research' }, '-created_date', 10)
      .then(presentations => {
        const found = (presentations || []).find(p => {
          try {
            const meta = JSON.parse(p.presentation_metadata || '{}');
            return meta.configuration_id === config.id;
          } catch { return false; }
        });
        if (found) setPacket(found);
      })
      .catch(() => {});
  }, [config?.id, config?.source_payload, ownedPreview]);

  const handleAssemble = async () => {
    setAssembling(true);
    setError(null);
    try {
      if (ownedPreview) {
        const result = await creapdApi.post('/production/core', {
          action: 'assemble_research_presentation',
          configuration_id: config.id,
        });

        if (!result?.presentation) {
          throw new Error('Presentation Director returned no presentation plan.');
        }

        setPacket(result.presentation);
        await refresh();
        return;
      }

      let completed = false;
      let retries = 0;
      let result = null;
      while (!completed && retries < 5) {
        const res = await base44.functions.invoke('buildResearchPacket', {
          configuration_id: config.id,
          presentation_title: `${config.production_name} — Research Presentation`,
        });
        result = res.data;
        completed = res.data?.completed !== false;
        retries++;
      }
      if (result?.presentation) {
        setPacket(result.presentation);
      } else if (!completed) {
        setError('Assembly timed out after multiple attempts. Try again to continue from where it left off.');
      }
    } catch (err) {
      const msg = err?.data?.diagnostic?.message || err?.data?.message || err?.response?.data?.error || err?.message || 'Failed to assemble packet';
      if (!ownedPreview && (msg.includes('Cloudflare') || msg.includes('timeout') || msg.includes('overloaded'))) {
        setError('The server timed out during assembly. Click Reassemble to continue from where it left off — slides already processed are saved.');
      } else {
        setError(msg);
      }
    } finally {
      setAssembling(false);
    }
  };

  const handleJsonExport = () => {
    const exportData = {
      production_name: config.production_name,
      host_name: config.host_name,
      show_date: config.show_date,
      research_depth: config.research_depth,
      tone: config.tone,
      reading_style: config.reading_style,
      topics,
      points,
      packages,
      dossiers,
      presentation_plan: ownedPreview ? packet : undefined,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.production_name.replace(/\s+/g, '_')}_research_packet.json`;
    a.click();
    URL.revokeObjectURL(url);
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

  const approvedPackages = packages.filter(p => p.status === 'generated' || p.status === 'edited' || p.status === 'approved');
  const readyDossiers = (dossiers || []).filter(d => d.status === 'ready');
  const voiceReadyCount = approvedPackages.filter(pkg => Boolean(pkg.generated_audio_url)).length;
  const allVoiceReady = approvedPackages.length > 0 && voiceReadyCount === approvedPackages.length;

  const packetItems = [
    { label: 'Research Topics', count: topics.length, done: topics.length > 0, icon: Archive },
    { label: 'Research Points', count: points.length, done: points.length > 0, icon: FileText },
    { label: 'Approved Dossiers', count: readyDossiers.length, done: readyDossiers.length > 0, icon: CheckCircle2 },
    { label: 'Production Packages', count: approvedPackages.length, done: approvedPackages.length > 0, icon: Package },
    ...(ownedPreview ? [{ label: 'Kokoro Voiceovers', count: `${voiceReadyCount}/${approvedPackages.length}`, done: allVoiceReady, icon: Volume2 }] : []),
  ];

  const doneCount = packetItems.filter(i => i.done).length;
  const readinessPercent = Math.round((doneCount / packetItems.length) * 100);
  const canAssemble = approvedPackages.length > 0 && (!ownedPreview || allVoiceReady);

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <Package className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-heading font-bold">Assembly Office</h1>
              {ownedPreview && <span className="text-[9px] px-2 py-0.5 rounded-full border border-cyan-400/20 text-cyan-400">OWNED · PRESENTATION DIRECTOR</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ownedPreview
                ? 'Direct approved Research packages into a Kokoro-timed scene graph for preview, rendering, and final export.'
                : 'Assemble your Production Packet — StoriesPresentation + StorySlides from all approved assets'}
            </p>
          </div>
        </div>
      </div>

      {/* Readiness Meter */}
      <div className="px-4 md:px-6 pb-4">
        <div className="cc-glass-card p-4 cc-animate-fade-up cc-stagger-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Packet Readiness</span>
            <span className="text-sm font-bold" style={{ color: 'hsl(35 90% 60%)' }}>{readinessPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${readinessPercent}%`, background: 'linear-gradient(90deg, hsl(190 55% 45%), hsl(35 80% 55%))' }} />
          </div>
          {ownedPreview && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Every approved package needs its saved Kokoro WAV before Presentation Director can calculate the master timeline.
            </p>
          )}
        </div>
      </div>

      {/* Packet Items */}
      <div className={`px-4 md:px-6 pb-4 grid grid-cols-2 ${ownedPreview ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
        {packetItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`cc-metric-card cc-animate-scale-in cc-stagger-${Math.min(i + 1, 6)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: item.done ? 'hsl(152 60% 50%)' : 'hsl(190 60% 50% / 0.5)' }} />
                </div>
                {item.done && <CheckCircle2 className="w-4 h-4" style={{ color: 'hsl(152 60% 50%)' }} />}
              </div>
              <p className="text-xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: `${0.15 + i * 0.05}s` }}>{item.count}</p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>{item.label}</p>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 md:px-6 pb-4">
          <div className="cc-glass-card p-4" style={{ borderColor: 'hsl(0 50% 28% / 0.3)' }}>
            <div className="flex items-center gap-2" style={{ color: 'hsl(0 72% 60%)' }}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Assembled Packet Display */}
      {packet && (
        <div className="px-4 md:px-6 pb-4">
          <div className="cc-glass-card p-4 cc-animate-fade-up" style={{ borderColor: 'hsl(152 50% 28% / 0.3)' }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" style={{ color: 'hsl(152 60% 50%)' }} />
                <p className="text-sm font-medium">Production Packet Assembled</p>
              </div>
              {ownedPreview && packet.qa_result && (
                <span className="text-[10px] flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> QA {String(packet.qa_result).toUpperCase()} · {packet.confidence_score || 0}%
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4" style={{ color: 'hsl(190 70% 55%)' }} />
                <span className="font-medium">{packet.title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Stories: {packet.story_count || 0}</span>
                {ownedPreview && <span>Scenes: {packet.scene_count || packet.scenes?.length || 0}</span>}
                {ownedPreview && (
                  <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {formatRuntime(packet.total_runtime_seconds)}</span>
                )}
                <span>Status: {packet.status}</span>
                {packet.completed_at && <span>Assembled: {new Date(packet.completed_at).toLocaleString()}</span>}
              </div>
              {ownedPreview && packet.planner?.model && (
                <p className="text-[10px] text-muted-foreground/70">
                  Presentation Director: {packet.planner.model} · master timeline derived from saved Kokoro voiceovers
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 md:px-6 pb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleAssemble}
          disabled={assembling || !canAssemble}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, hsl(190 50% 18% / 0.4), hsl(190 40% 10% / 0.2))',
            border: '1px solid hsl(190 50% 28% / 0.5)',
            color: 'hsl(190 80% 55%)',
            boxShadow: '0 0 20px hsl(190 50% 25% / 0.1)',
          }}
        >
          {assembling
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {ownedPreview ? 'Presentation Director is building scenes...' : 'Directing slides & generating narration...'}</>
            : <><Package className="w-4 h-4 mr-2" /> {packet ? 'Reassemble Packet' : 'Assemble Production Packet'}</>
          }
        </button>

        {packet && (
          <>
            <button
              onClick={() => ownedPreview ? setShowPreview(true) : navigate(`/news/presentations/${packet.id}`)}
              disabled={ownedPreview && !(packet.scenes?.length > 0)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, hsl(152 50% 15% / 0.3), hsl(152 40% 8% / 0.15))',
                border: '1px solid hsl(152 50% 28% / 0.4)',
                color: 'hsl(152 60% 50%)',
              }}
            >
              <Eye className="w-4 h-4 mr-2" /> View Presentation
            </button>
            {!ownedPreview && (
              <button
                onClick={() => navigate(`/editor/${packet.id}`)}
                className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(270 50% 15% / 0.3), hsl(270 40% 8% / 0.15))',
                  border: '1px solid hsl(270 50% 28% / 0.4)',
                  color: 'hsl(270 80% 65%)',
                }}
              >
                <Layers className="w-4 h-4 mr-2" /> Open in Editor
              </button>
            )}
            <button
              onClick={handleJsonExport}
              className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'hsl(220 15% 14% / 0.3)',
                border: '1px solid hsl(220 15% 22% / 0.4)',
                color: 'hsl(0 0% 70%)',
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Export JSON
            </button>
          </>
        )}
      </div>

      {!canAssemble && (
        <div className="px-4 md:px-6 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            {ownedPreview && approvedPackages.length > 0 && !allVoiceReady
              ? `Generate the remaining ${approvedPackages.length - voiceReadyCount} Kokoro voiceover${approvedPackages.length - voiceReadyCount === 1 ? '' : 's'} in the Develop stage before assembly.`
              : 'Generate production packages in the Develop stage first to assemble a Production Packet.'}
          </p>
        </div>
      )}

      {showPreview && packet?.scenes?.length > 0 && (
        <PresentationViewer
          scenes={packet.scenes}
          segments={packet.segments || []}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}