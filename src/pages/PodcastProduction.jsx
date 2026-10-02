import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Loader2,
  Mic2,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { creapdApi } from '@/api/creapdClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ASSET_TYPE_LABELS } from '@/lib/talkConstants';

function metadata(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function secondsLabel(value) {
  const total = Math.max(0, Number(value || 0));
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  if (!seconds) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const SCRIPT_ASSET_TYPES = new Set([
  'host_script',
  'cohost_script',
  'host_intro',
  'host_outro',
  'guest_intro',
]);

function scriptWordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

export default function PodcastProduction() {
  const navigate = useNavigate();
  const {
    config,
    topics = [],
    research = [],
    guests = [],
    segments = [],
    assets = [],
    session,
    loading,
    refresh,
  } = useTalkProduction();

  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [selectedScript, setSelectedScript] = useState(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regeneratingAssetId, setRegeneratingAssetId] = useState('');
  const [scriptError, setScriptError] = useState('');
  const autoStarted = useRef(false);

  const meta = useMemo(() => metadata(config?.build_metadata), [config?.build_metadata]);
  const assemblyReady = Boolean(
    meta.assembly_approved_at &&
    meta.episode_direction &&
    Array.isArray(meta.assembly_segments) &&
    meta.assembly_segments.length
  );

  const buildProduction = async ({ force = false } = {}) => {
    if (!config?.id || building) return;
    if (!force && segments.length && assets.length) return;

    setBuilding(true);
    setError('');
    try {
      await creapdApi.post('/production/core', {
        action: 'talk_build_production',
        configuration_id: config.id,
      });
      await refresh();
    } catch (err) {
      console.error('Podcast production build failed:', err);
      setError(
        err?.data?.diagnostic?.message ||
        err?.data?.message ||
        err?.message ||
        'CREAPD could not build the Podcast production package.'
      );
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (loading || !config?.id || !assemblyReady || segments.length || assets.length || autoStarted.current) return;
    autoStarted.current = true;
    buildProduction();
  }, [loading, config?.id, assemblyReady, segments.length, assets.length]);

  const totalSegmentSeconds = segments.reduce((sum, segment) => sum + Number(segment.duration_seconds || 0), 0);
  const scriptAssets = assets.filter(asset => SCRIPT_ASSET_TYPES.has(asset.asset_type));
  const hostAssets = assets.filter(asset => asset.asset_type === 'host_script');
  const productionAssets = assets.filter(asset => !SCRIPT_ASSET_TYPES.has(asset.asset_type));

  const openScript = asset => {
    setSelectedScript(asset);
    setRegenInstruction('');
    setScriptError('');
  };

  const regenerateScript = async asset => {
    if (!config?.id || !asset?.id || regeneratingAssetId) return;

    setRegeneratingAssetId(asset.id);
    setScriptError('');
    try {
      const response = await creapdApi.post('/production/core', {
        action: 'podcast_regenerate_script',
        configuration_id: config.id,
        asset_id: asset.id,
        instruction: regenInstruction.trim(),
      });

      const updatedAsset = response?.result?.asset;
      if (!updatedAsset?.id) {
        throw new Error('CREAPD did not return the regenerated script.');
      }

      setSelectedScript(updatedAsset);
      setRegenInstruction('');
      await refresh();
    } catch (err) {
      console.error('Podcast script regeneration failed:', err);
      setScriptError(
        err?.data?.diagnostic?.message ||
        err?.data?.message ||
        err?.message ||
        'CREAPD could not regenerate this script.'
      );
    } finally {
      setRegeneratingAssetId('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
      </div>
    );
  }

  if (!config?.id) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold text-white">Podcast Setup is required first.</h1>
          <Button className="mt-4" onClick={() => navigate('/podcast/setup')}>Open Setup</Button>
        </div>
      </div>
    );
  }

  if (!assemblyReady && !segments.length) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-lg">
          <ClipboardList className="mx-auto h-9 w-9 text-white/30" />
          <h1 className="mt-3 text-lg font-semibold text-white">Approve Episode Assembly first.</h1>
          <p className="mt-2 text-sm text-white/45">
            Production only starts after you review and approve the episode structure. Assembly decides what the show is; Production writes the material needed to perform it.
          </p>
          <Button className="mt-4" onClick={() => navigate('/podcast/assembly')}>Review Assembly</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 py-5 lg:px-7">
      <div className="mx-auto max-w-6xl space-y-5 pb-12">
        <header className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Episode Production</p>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white">{config.production_name || 'Podcast Episode'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
                Assembly decided what the episode is. Production is now writing the actual material needed to perform it:
                rundown, host scripts, questions, transitions, intros, outros, and Studio assets.
              </p>
            </div>

            {(segments.length > 0 || assets.length > 0) && !building && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-black/20 text-white/70"
                onClick={() => buildProduction({ force: true })}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Rebuild Production
              </Button>
            )}
          </div>
        </header>

        {building && (
          <section className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.05] p-10 text-center backdrop-blur-md">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-fuchsia-300" />
            <h2 className="mt-4 text-base font-semibold text-white">Producing the episode…</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/45">
              CREAPD is following the Assembly blueprint and your Podcast Setup to write the rundown, scripts, transitions,
              questions, and production assets.
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-5">
            <p className="text-sm text-red-100">{error}</p>
            <Button
              size="sm"
              className="mt-3 bg-white/10 text-white hover:bg-white/15"
              onClick={() => buildProduction({ force: true })}
              disabled={building}
            >
              Try Production Again
            </Button>
          </section>
        )}

        {!building && segments.length > 0 && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Segments', segments.length],
                ['Runtime', secondsLabel(totalSegmentSeconds)],
                ['Spoken Scripts', scriptAssets.length],
                ['Assets', assets.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[9px] uppercase tracking-wider text-white/35">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Show Rundown</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">The episode CREAPD built</h2>
                </div>

                {segments.map((segment, index) => (
                  <article key={segment.id || index} className="rounded-xl border border-white/10 bg-black/35 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-400/10 text-xs font-semibold text-orange-200">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">{segment.title}</h3>
                          <span className="text-[10px] text-white/35">{secondsLabel(segment.duration_seconds)}</span>
                        </div>
                        {segment.notes && <p className="mt-2 text-xs leading-relaxed text-white/55">{segment.notes}</p>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4">
                <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-fuchsia-300" />
                      <div>
                        <h2 className="text-sm font-semibold text-white">Scripts & Spoken Material</h2>
                        <p className="mt-0.5 text-[10px] text-white/35">Open any script to read it in full or regenerate only that script.</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-white/30">{scriptAssets.length} items</span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {scriptAssets.length ? scriptAssets.map(asset => {
                      const regenerating = regeneratingAssetId === asset.id;
                      return (
                        <div key={asset.id} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white/80">{asset.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-white/30">
                                <span>{scriptWordCount(asset.content)} words</span>
                                {asset.associated_topic && <span>· {asset.associated_topic}</span>}
                              </div>
                            </div>
                            <span className="rounded-full border border-white/[0.06] px-2 py-0.5 text-[8px] uppercase tracking-wider text-white/30">
                              {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[11px] leading-relaxed text-white/45">{asset.content}</p>

                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 border-white/10 bg-black/20 text-[10px] text-white/65"
                              onClick={() => openScript(asset)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View Full Script
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 flex-1 border-fuchsia-300/15 bg-fuchsia-400/[0.05] px-2.5 text-[10px] text-fuchsia-200"
                              onClick={() => {
                                openScript(asset);
                              }}
                              disabled={regenerating}
                            >
                              {regenerating ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <WandSparkles className="mr-1 h-3 w-3" />
                              )}
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-xs text-white/40">Scripts are being prepared.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-300" />
                    <h2 className="text-sm font-semibold text-white">Production Assets</h2>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {productionAssets.slice(0, 12).map(asset => (
                      <div key={asset.id} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                        <p className="mt-1 text-[10px] leading-snug text-white/65">
                          {ASSET_TYPE_LABELS[asset.asset_type] || asset.title || asset.asset_type}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-fuchsia-300/20 bg-[#120d1c]/95 p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <Mic2 className="h-5 w-5 text-fuchsia-300" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">Studio package ready.</p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {session?.status === 'ready' ? 'The Studio session has been prepared.' : 'CREAPD has built the production material.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white"
                    onClick={() => navigate(`/podcast/studio?config_id=${encodeURIComponent(config.id)}`)}
                  >
                    Open Podcast Studio
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </section>
              </div>
            </section>
          </>
        )}

        {!building && !error && !segments.length && (
          <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-white/25" />
            <p className="mt-3 text-sm text-white/50">Production is ready to build from the Assembly blueprint.</p>
            <Button className="mt-4" onClick={() => buildProduction({ force: true })}>Build Episode Production</Button>
          </section>
        )}
      </div>

      <Dialog
        open={Boolean(selectedScript)}
        onOpenChange={open => {
          if (!open && !regeneratingAssetId) {
            setSelectedScript(null);
            setRegenInstruction('');
            setScriptError('');
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-white/10 bg-[#0d0b14] p-0 text-white">
          {selectedScript && (
            <>
              <DialogHeader className="border-b border-white/[0.07] px-5 py-4 pr-12">
                <DialogTitle className="text-base text-white">{selectedScript.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
                  <span>{scriptWordCount(selectedScript.content)} words</span>
                  <span>{ASSET_TYPE_LABELS[selectedScript.asset_type] || selectedScript.asset_type?.replace(/_/g, ' ')}</span>
                  {selectedScript.associated_topic && <span>Topic: {selectedScript.associated_topic}</span>}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <div className="rounded-xl border border-white/[0.07] bg-black/30 p-4">
                  <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Full Script</p>
                  <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/80">
                    {selectedScript.content}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center gap-2">
                    <WandSparkles className="h-4 w-4 text-orange-300" />
                    <div>
                      <p className="text-xs font-semibold text-white">Regenerate this script only</p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        The Assembly structure and the rest of the episode stay unchanged.
                      </p>
                    </div>
                  </div>

                  <Textarea
                    value={regenInstruction}
                    onChange={event => setRegenInstruction(event.target.value)}
                    placeholder="Optional: tell CREAPD what should change — e.g. make it more conversational, tighten the opening, add more energy, preserve a specific point..."
                    className="mt-3 min-h-24 resize-y border-white/10 bg-black/30 text-sm text-white"
                    disabled={regeneratingAssetId === selectedScript.id}
                  />

                  {scriptError && (
                    <div className="mt-3 rounded-lg border border-red-400/20 bg-red-500/[0.06] p-3 text-xs text-red-100">
                      {scriptError}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="border-t border-white/[0.07] bg-black/20 px-5 py-4">
                <Button
                  variant="outline"
                  className="border-white/10 bg-black/20 text-white/65"
                  onClick={() => setSelectedScript(null)}
                  disabled={regeneratingAssetId === selectedScript.id}
                >
                  Close
                </Button>
                <Button
                  className="bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white"
                  onClick={() => regenerateScript(selectedScript)}
                  disabled={regeneratingAssetId === selectedScript.id}
                >
                  {regeneratingAssetId === selectedScript.id ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <WandSparkles className="mr-1.5 h-4 w-4" />
                  )}
                  {regeneratingAssetId === selectedScript.id ? 'Regenerating…' : 'Regenerate Script'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
