import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { creapdApi } from '@/api/creapdClient';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  FileText,
  FlaskConical,
  Loader2,
  Package,
  Send,
  Volume2,
} from 'lucide-react';

function packageLabel(pkg, points) {
  const point = (points || []).find(item => item.id === pkg.source_entity_id);
  return point?.title || pkg.title || 'Untitled Production Package';
}

export default function ResearchPresentationStudioHandoff({ researchData }) {
  const navigate = useNavigate();
  const { config, packages = [], points = [], loading, refresh } = researchData;
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState(null);

  const packageRows = useMemo(() => (
    packages
      .filter(pkg => ['generated', 'edited', 'approved'].includes(pkg.status))
      .map(pkg => ({
        pkg,
        title: packageLabel(pkg, points),
        approved: pkg.status === 'approved',
        hasVoice: Boolean(pkg.generated_audio_url),
        hasImage: Boolean(pkg.generated_image_url),
      }))
  ), [packages, points]);

  const approvedCount = packageRows.filter(row => row.approved).length;
  const voiceCount = packageRows.filter(row => row.hasVoice).length;
  const imageCount = packageRows.filter(row => row.hasImage).length;

  const sendToStudio = async (pkg) => {
    if (!pkg?.id || sendingId) return;
    setSendingId(pkg.id);
    setError(null);

    try {
      const result = await creapdApi.post('/production/core', {
        action: pkg.status === 'approved'
          ? 'handoff_package_to_presentation_studio'
          : 'approve_package_and_handoff',
        package_id: pkg.id,
      });

      const presentationId = result?.presentation?.id;
      if (!presentationId) {
        throw new Error('Presentation Studio did not return a project id.');
      }

      await refresh();
      navigate(`/editor/${presentationId}`);
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message ||
        err?.data?.message ||
        err?.message ||
        'Could not dispatch this package to the Presentation Studio.'
      );
    } finally {
      setSendingId(null);
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
          <p className="text-muted-foreground">No Research Studio production configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      <div className="px-4 md:px-6 pt-4 pb-4 cc-animate-fade-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(270 45% 15% / 0.35)', border: '1px solid hsl(270 45% 30% / 0.4)' }}>
            <Send className="w-5 h-5" style={{ color: 'hsl(270 80% 68%)' }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-heading font-bold">Presentation Studio Dispatch</h1>
              <span className="text-[9px] px-2 py-0.5 rounded-full border border-purple-400/20 text-purple-300">RESEARCH STUDIO → PRESENTATION STUDIO</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Research Studio work ends with the approved Production Package. CREAPD sends a snapshot of that package to the shared Presentation Studio, where the Presentation Director and Editor workers build the actual presentation.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="cc-metric-card">
          <p className="text-2xl font-bold font-mono" style={{ color: 'hsl(35 90% 60%)' }}>{packageRows.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Production Packages</p>
        </div>
        <div className="cc-metric-card">
          <p className="text-2xl font-bold font-mono" style={{ color: 'hsl(152 60% 50%)' }}>{approvedCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved</p>
        </div>
        <div className="cc-metric-card">
          <p className="text-2xl font-bold font-mono" style={{ color: 'hsl(190 80% 55%)' }}>{voiceCount}/{packageRows.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Voice Assets</p>
        </div>
        <div className="cc-metric-card">
          <p className="text-2xl font-bold font-mono" style={{ color: 'hsl(270 80% 68%)' }}>{imageCount}/{packageRows.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Story Images</p>
        </div>
      </div>

      {error && (
        <div className="px-4 md:px-6 pb-4">
          <div className="cc-glass-card p-4 flex items-start gap-2" style={{ borderColor: 'hsl(0 50% 28% / 0.35)', color: 'hsl(0 72% 62%)' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 pb-6">
        {packageRows.length === 0 ? (
          <div className="cc-glass-card p-8 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium">Nothing to dispatch yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Generate a Production Package in the Research Studio first.</p>
            <button
              onClick={() => navigate('/research/assets')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid hsl(190 45% 30% / 0.4)', color: 'hsl(190 75% 60%)' }}
            >
              Go to Production Packages <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {packageRows.map(({ pkg, title, approved, hasVoice, hasImage }) => {
              const isSending = sendingId === pkg.id;
              return (
                <div key={pkg.id} className="cc-glass-card p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0" style={{ color: 'hsl(190 70% 55%)' }} />
                        <h3 className="text-sm font-medium truncate">{title}</h3>
                        {approved ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'hsl(152 50% 15% / 0.25)', color: 'hsl(152 60% 50%)' }}>
                            <CheckCircle2 className="w-3 h-3" /> Approved
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'hsl(35 50% 15% / 0.25)', color: 'hsl(35 85% 60%)' }}>
                            Awaiting package approval
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> Voice {hasVoice ? 'ready' : 'not generated'}</span>
                        <span className="flex items-center gap-1"><Clapperboard className="w-3 h-3" /> Image {hasImage ? 'ready' : 'not generated'}</span>
                        <span>Package status: {pkg.status}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => sendToStudio(pkg)}
                      disabled={Boolean(sendingId)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, hsl(270 45% 18% / 0.45), hsl(190 40% 14% / 0.3))',
                        border: '1px solid hsl(270 55% 35% / 0.45)',
                        color: 'hsl(270 80% 72%)',
                      }}
                    >
                      {isSending ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...</>
                      ) : approved ? (
                        <><Clapperboard className="w-3.5 h-3.5" /> Open Presentation Studio <ArrowRight className="w-3.5 h-3.5" /></>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Approve & Send <ArrowRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
