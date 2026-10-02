import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers3,
  Loader2,
  RefreshCw,
  Route,
  Sparkles,
  Timer,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { Button } from '@/components/ui/button';

const LEGACY_APPROVED = new Set([
  'approved',
  'bernas_pick',
  'selected',
  'in_production',
  'package_generated',
  'edited',
  'ready_for_export',
]);

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

function noteContent(note) {
  return String(note?.note || '').replace(/^\[[^\]]+\]\s*/i, '').trim();
}

function assemblyFromMetadata(config) {
  const meta = metadata(config?.build_metadata);
  if (meta.stage !== 'assembly_complete' || !Array.isArray(meta.assembly_segments)) return null;
  return {
    episode_direction: meta.episode_direction || '',
    opening_goal: meta.opening_goal || '',
    closing_goal: meta.closing_goal || '',
    assembly_notes: meta.assembly_notes || '',
    segments: meta.assembly_segments || [],
  };
}

export default function EpisodeAssembly() {
  const navigate = useNavigate();
  const { config, loading: configLoading, refresh } = useTalkProduction();
  const [articles, setArticles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [assembly, setAssembly] = useState(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const autoStarted = useRef(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Article.list('-created_date', 300),
      base44.entities.ProducerNote.list('-created_date', 500).catch(() => []),
    ])
      .then(([articleRows, noteRows]) => {
        setArticles(articleRows || []);
        setNotes(noteRows || []);
      })
      .catch(err => setError(err?.message || 'Could not load approved Podcast research.'))
      .finally(() => setLoadingSources(false));
  }, []);

  useEffect(() => {
    const existing = assemblyFromMetadata(config);
    if (existing) setAssembly(existing);
  }, [config?.id, config?.build_metadata]);

  const approvedIds = useMemo(() => {
    const meta = metadata(config?.build_metadata);
    if (Array.isArray(meta.podcast_approved_source_ids)) {
      return new Set(meta.podcast_approved_source_ids.map(String));
    }
    return new Set(
      articles
        .filter(article => LEGACY_APPROVED.has(String(article.status || '').toLowerCase()))
        .map(article => String(article.id)),
    );
  }, [config?.build_metadata, articles]);

  const approvedArticles = useMemo(() => {
    const notesByArticle = new Map();
    for (const note of notes) {
      const id = String(note?.article_id || '');
      if (!id) continue;
      if (!notesByArticle.has(id)) notesByArticle.set(id, []);
      notesByArticle.get(id).push(note);
    }

    return articles
      .filter(article => approvedIds.has(String(article.id)))
      .map(article => {
        const articleNotes = notesByArticle.get(String(article.id)) || [];
        const talkingPoints = articleNotes
          .filter(note => note.note_type === 'talking_point' || /^\[Talking Points\]/i.test(note.note || ''))
          .map(noteContent)
          .filter(Boolean)
          .join('\n\n');
        const factChecks = articleNotes
          .filter(note => note.note_type === 'fact_check' || /^\[Fact-Check Notes\]/i.test(note.note || ''))
          .map(noteContent)
          .filter(Boolean)
          .join('\n\n');
        const opposing = articleNotes
          .filter(note => /^\[Opposing Viewpoints\]/i.test(note.note || ''))
          .map(noteContent)
          .filter(Boolean)
          .join('\n\n');

        return {
          id: article.id,
          title: article.title,
          source_name: article.source_name,
          url: article.url,
          category: article.category,
          summary: article.summary,
          why_it_matters: article.why_it_matters,
          key_facts: article.key_facts,
          timeline: article.timeline,
          body_content: article.body_content,
          full_text_excerpt: article.full_text_excerpt,
          transcript: article.transcript,
          talking_points: talkingPoints,
          fact_check_notes: factChecks,
          opposing_viewpoints: opposing,
        };
      });
  }, [articles, notes, approvedIds]);

  const buildAssembly = async ({ force = false } = {}) => {
    if (!config?.id || !approvedArticles.length || building) return;
    if (!force && assembly) return;

    setBuilding(true);
    setError('');
    try {
      const response = await creapdApi.post('/production/core', {
        action: 'podcast_build_assembly',
        configuration_id: config.id,
        articles: approvedArticles,
      });

      const nextAssembly = response?.result?.assembly;
      if (!nextAssembly?.segments?.length) {
        throw new Error('CREAPD did not return an episode assembly plan.');
      }

      setAssembly(nextAssembly);
      await refresh();
    } catch (err) {
      console.error('Podcast assembly failed:', err);
      setError(
        err?.data?.diagnostic?.message ||
        err?.data?.message ||
        err?.message ||
        'CREAPD could not assemble the approved research.'
      );
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (configLoading || loadingSources || !config?.id || !approvedArticles.length || assembly || autoStarted.current) return;
    autoStarted.current = true;
    buildAssembly();
  }, [configLoading, loadingSources, config?.id, approvedArticles.length, assembly]);

  const segmentMinutes = useMemo(
    () => (assembly?.segments || []).reduce((sum, segment) => sum + Number(segment.estimated_minutes || 0), 0),
    [assembly],
  );

  if (configLoading || loadingSources) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-300" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden flex">
      <aside className="hidden lg:flex w-[300px] shrink-0 min-h-0 flex-col border-r border-white/[0.06] bg-black/15">
        <div className="shrink-0 border-b border-white/[0.06] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Approved Research</p>
          <h2 className="mt-1 text-sm font-semibold text-white">{approvedArticles.length} sources locked</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-white/40">
            These sources are now ingredients for the episode. Assembly decides how they work together.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {approvedArticles.map((article, index) => (
            <div key={article.id} className="border-b border-white/[0.04] p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-[9px] font-semibold text-emerald-200">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug text-white line-clamp-3">{article.title}</p>
                  <p className="mt-1 text-[9px] text-white/35">{article.source_name || 'Source'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 py-5 lg:px-7">
        <div className="mx-auto max-w-5xl space-y-5 pb-12">
          <header className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-fuchsia-300" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Episode Assembly</p>
                </div>
                <h1 className="mt-2 text-2xl font-bold text-white">Turn research into a show.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
                  CREAPD groups the approved sources into coherent podcast segments, decides what each segment needs to accomplish,
                  and prepares the blueprint Production will use to write the actual show.
                </p>
              </div>

              {assembly && !building && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-black/20 text-white/70"
                  onClick={() => buildAssembly({ force: true })}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reassemble
                </Button>
              )}
            </div>
          </header>

          {building && (
            <section className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-400/[0.05] p-8 text-center backdrop-blur-md">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-fuchsia-300" />
              <h2 className="mt-4 text-base font-semibold text-white">Assembling the episode…</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/45">
                CREAPD is comparing the approved sources, combining related material, calculating segment depth, and shaping the episode around
                {config?.show_format ? ` your ${config.show_format} format` : ' your Podcast Setup'}.
              </p>
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-5">
              <p className="text-sm text-red-100">{error}</p>
              <Button
                size="sm"
                className="mt-3 bg-white/10 text-white hover:bg-white/15"
                onClick={() => buildAssembly({ force: true })}
                disabled={building}
              >
                Try Assembly Again
              </Button>
            </section>
          )}

          {assembly && !building && (
            <>
              <section className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.05] p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                  <div className="flex-1">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Episode Direction</p>
                    <p className="mt-1 text-lg font-semibold leading-relaxed text-white">{assembly.episode_direction}</p>
                    {assembly.assembly_notes && (
                      <p className="mt-2 text-xs leading-relaxed text-white/45">{assembly.assembly_notes}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Route className="h-4 w-4 text-orange-300" />
                  <p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Opening Goal</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{assembly.opening_goal}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Timer className="h-4 w-4 text-fuchsia-300" />
                  <p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Editorial Plan</p>
                  <p className="mt-1 text-sm font-semibold text-white">~{Math.round(segmentMinutes)} minutes</p>
                  <p className="mt-1 text-xs text-white/45">{assembly.segments.length} substantive segments</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <Route className="h-4 w-4 rotate-180 text-orange-300" />
                  <p className="mt-2 text-[9px] uppercase tracking-wider text-white/35">Closing Goal</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{assembly.closing_goal}</p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Episode Blueprint</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">How the approved research becomes the show</h2>
                  </div>
                </div>

                {assembly.segments.map((segment, index) => {
                  const sourceTitles = approvedArticles
                    .filter(article => (segment.source_ids || []).map(String).includes(String(article.id)))
                    .map(article => article.title);

                  return (
                    <article key={`${segment.title}-${index}`} className="rounded-2xl border border-white/10 bg-black/38 p-5 backdrop-blur-md">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fuchsia-400/10 text-xs font-semibold text-fuchsia-200">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="text-base font-semibold text-white">{segment.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-white/55">{segment.purpose}</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-white/55">
                          ~{segment.estimated_minutes} min
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-fuchsia-300">Production Talking Material</p>
                          <div className="mt-2 space-y-1.5">
                            {(segment.key_points || []).map((point, pointIndex) => (
                              <div key={pointIndex} className="flex gap-2 text-xs leading-relaxed text-white/70">
                                <span className="text-fuchsia-300">•</span>
                                <span>{point}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-orange-300">Source Material</p>
                            <div className="mt-2 space-y-1">
                              {sourceTitles.map((title, sourceIndex) => (
                                <p key={sourceIndex} className="flex gap-2 text-[11px] leading-relaxed text-white/55">
                                  <FileText className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                                  <span>{title}</span>
                                </p>
                              ))}
                            </div>
                          </div>

                          {(segment.counterpoints || []).length > 0 && (
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Counterpoints to Preserve</p>
                              <p className="mt-1 text-xs leading-relaxed text-white/60">{segment.counterpoints.join(' · ')}</p>
                            </div>
                          )}

                          {segment.fact_check_notes && (
                            <div>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Fact-Check Guardrail</p>
                              <p className="mt-1 text-xs leading-relaxed text-white/60">{segment.fact_check_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {segment.transition_goal && (
                        <div className="mt-4 border-t border-white/[0.06] pt-3">
                          <p className="text-[9px] uppercase tracking-wider text-white/30">Transition Goal</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/55">{segment.transition_goal}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>

              <section className="sticky bottom-4 rounded-2xl border border-fuchsia-300/20 bg-[#120d1c]/95 p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Assembly complete.</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      Production can now turn this blueprint into the actual rundown, scripts, transitions, and studio assets.
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-fuchsia-600 text-white"
                    onClick={() => navigate('/podcast/production')}
                  >
                    Continue to Production
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </section>
            </>
          )}

          {!assembly && !building && !error && approvedArticles.length === 0 && (
            <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-white/25" />
              <h2 className="mt-3 text-base font-semibold text-white">No approved episode research yet</h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-white/45">
                Approve enough source material in Research before CREAPD assembles the episode.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => navigate('/podcast/research')}>
                Back to Research
              </Button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
