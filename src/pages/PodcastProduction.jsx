import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mic2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { creapdApi } from '@/api/creapdClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { Button } from '@/components/ui/button';
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
  const autoStarted = useRef(false);

  const meta = useMemo(() => metadata(config?.build_metadata), [config?.build_metadata]);
  const assemblyReady =
    meta.stage === 'assembly_complete' ||
    Boolean(meta.episode_direction && Array.isArray(meta.assembly_segments) && meta.assembly_segments.length);

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
  const hostAssets = assets.filter(asset => asset.asset_type === 'host_script');
  const productionAssets = assets.filter(asset => asset.asset_type !== 'host_script');

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
          <h1 className="mt-3 text-lg font-semibold text-white">Episode Assembly comes first.</h1>
          <p className="mt-2 text-sm text-white/45">
            Production needs the assembled episode blueprint before it can write scripts, build the rundown, and prepare Studio assets.
          </p>
          <Button className="mt-4" onClick={() => navigate('/podcast/assembly')}>Open Assembly</Button>
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
                ['Host Scripts', hostAssets.length],
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
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-fuchsia-300" />
                    <h2 className="text-sm font-semibold text-white">Host Material</h2>
                  </div>
                  <div className="mt-3 space-y-2">
                    {hostAssets.length ? hostAssets.map(asset => (
                      <div key={asset.id} className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                        <p className="text-xs font-semibold text-white/80">{asset.title}</p>
                        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[11px] leading-relaxed text-white/45">{asset.content}</p>
                      </div>
                    )) : (
                      <p className="text-xs text-white/40">Host scripts are being prepared.</p>
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
    </div>
  );
}
