import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Lightbulb,
  ListFilter,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== 'string') return [];

  return value
    .split(/\n|•|\r/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean);
}

function statusMeta(status) {
  if (status === 'approved') {
    return {
      label: 'Approved',
      classes: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
    };
  }

  if (status === 'removed') {
    return {
      label: 'Rejected',
      classes: 'border-rose-400/35 bg-rose-400/10 text-rose-200',
    };
  }

  return {
    label: 'Needs Review',
    classes: 'border-amber-300/35 bg-amber-300/10 text-amber-100',
  };
}

function GlassSection({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#100817]/78 shadow-[0_20px_60px_rgba(0,0,0,.28)] backdrop-blur-xl ${className}`}>
      <div className="border-b border-white/8 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/60">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function TalkDiscussionTopicsPopup({
  topics = [],
  source,
  refresh,
  onClose,
}) {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(topics[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const approvedCount = topics.filter((topic) => topic.status === 'approved').length;
  const rejectedCount = topics.filter((topic) => topic.status === 'removed').length;
  const reviewCount = Math.max(0, topics.length - approvedCount - rejectedCount);

  const filteredTopics = useMemo(() => {
    if (filter === 'approved') return topics.filter((topic) => topic.status === 'approved');
    if (filter === 'rejected') return topics.filter((topic) => topic.status === 'removed');
    if (filter === 'review') return topics.filter((topic) => !['approved', 'removed'].includes(topic.status));
    return topics;
  }, [filter, topics]);

  useEffect(() => {
    if (!filteredTopics.length) {
      setSelectedId(null);
      return;
    }

    if (!filteredTopics.some((topic) => topic.id === selectedId)) {
      setSelectedId(filteredTopics[0].id);
    }
  }, [filteredTopics, selectedId]);

  const selectedTopic =
    filteredTopics.find((topic) => topic.id === selectedId) ||
    topics.find((topic) => topic.id === selectedId) ||
    filteredTopics[0] ||
    topics[0] ||
    null;

  const selectedIndex = selectedTopic
    ? filteredTopics.findIndex((topic) => topic.id === selectedTopic.id)
    : -1;

  const updateTopicStatus = async (topic, status) => {
    if (!topic?.id || busyId) return;

    setBusyId(topic.id);
    setActionError('');
    try {
      if (source === 'neon') {
        await creapdApi.post('/talk/production', {
          action: 'set_topic_status',
          topic_id: topic.id,
          status,
        });
      } else {
        await base44.entities.TalkTopic.update(topic.id, { status });
      }

      await refresh?.();
    } catch (error) {
      console.error('Talk topic status update failed:', error);
      setActionError(error?.data?.error || error?.message || 'Could not update this topic.');
    } finally {
      setBusyId(null);
    }
  };

  const moveSelection = (direction) => {
    if (!filteredTopics.length || selectedIndex < 0) return;
    const next = Math.min(
      filteredTopics.length - 1,
      Math.max(0, selectedIndex + direction),
    );
    setSelectedId(filteredTopics[next].id);
  };

  if (!topics.length) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-300/20 bg-[#0b0610] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,.22),transparent_34%),radial-gradient(circle_at_80%_100%,rgba(249,115,22,.18),transparent_32%)]" />
        <div className="relative mx-auto flex max-w-lg flex-col items-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 shadow-[0_0_40px_rgba(217,70,239,.15)]">
            <Lightbulb className="h-7 w-7 text-fuchsia-200" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Discussion Topics Yet</h3>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Refresh this Talk production to generate a topic queue, talking points, and debate questions.
          </p>
        </div>
      </div>
    );
  }

  const summary =
    selectedTopic?.generated_summary ||
    selectedTopic?.summary ||
    selectedTopic?.description ||
    '';

  const talkingPoints = normalizeList(selectedTopic?.talking_points);
  const counterPerspectives = normalizeList(selectedTopic?.counter_perspectives);
  const debateQuestions = normalizeList(selectedTopic?.debate_questions);
  const selectedStatus = statusMeta(selectedTopic?.status);
  const confidence = Number(selectedTopic?.confidence_score || 0);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-fuchsia-300/15 bg-[#09050d]/96 shadow-[0_35px_110px_rgba(0,0,0,.6)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(168,85,247,.22),transparent_30%),radial-gradient(circle_at_92%_20%,rgba(249,115,22,.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.025),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/80 to-transparent" />

      <div className="relative border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex items-center gap-2">
            <ListFilter className="h-4 w-4 text-orange-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
              Producer Topic Board
            </span>
          </div>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">
            Generated {topics.length}
          </span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">
            Approved {approvedCount}
          </span>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] text-amber-100">
            Review {reviewCount}
          </span>
        </div>
      </div>

      <div className="relative grid gap-3 p-3 lg:h-[58vh] lg:grid-cols-[0.92fr_1.7fr_0.82fr] lg:p-4">
        <GlassSection title="Topic Queue" className="min-h-0 overflow-hidden">
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-black/25 p-1">
            {[
              ['all', 'All'],
              ['review', 'Review'],
              ['approved', 'Approved'],
              ['rejected', 'Rejected'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${filter === value
                  ? 'bg-gradient-to-r from-fuchsia-500/35 to-orange-400/25 text-white shadow-[0_0_18px_rgba(217,70,239,.12)]'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/75'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2 lg:max-h-[calc(58vh-112px)] lg:overflow-y-auto lg:pr-1">
            {filteredTopics.map((topic, index) => {
              const meta = statusMeta(topic.status);
              const selected = topic.id === selectedTopic?.id;
              const topicSummary = topic.generated_summary || topic.summary || topic.description || '';

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedId(topic.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${selected
                    ? 'border-fuchsia-300/45 bg-gradient-to-br from-fuchsia-500/18 via-purple-500/8 to-orange-400/8 shadow-[0_0_24px_rgba(217,70,239,.12)]'
                    : 'border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]'}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${selected
                      ? 'border-fuchsia-300/45 bg-fuchsia-400/15 text-fuchsia-100'
                      : 'border-white/10 bg-black/25 text-white/45'}`}>
                      {String(topics.indexOf(topic) + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white/90">{topic.topic_name}</p>
                      {topicSummary && (
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/42">
                          {topicSummary}
                        </p>
                      )}
                      <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {!filteredTopics.length && (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-white/35">
                No topics match this filter.
              </div>
            )}
          </div>
        </GlassSection>

        <GlassSection title="Selected Topic" className="min-h-0 overflow-hidden">
          {selectedTopic && (
            <div className="lg:max-h-[calc(58vh-66px)] lg:overflow-y-auto lg:pr-1">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.18em] text-fuchsia-200/50">
                      TOPIC {String(topics.indexOf(selectedTopic) + 1).padStart(2, '0')}
                    </span>
                    {selectedTopic.suggested_placement && (
                      <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2 py-0.5 text-[9px] text-orange-100">
                        {selectedTopic.suggested_placement}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1 text-xl font-bold leading-tight text-white">
                    {selectedTopic.topic_name}
                  </h2>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${selectedStatus.classes}`}>
                  {selectedStatus.label}
                </span>
              </div>

              {summary && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/22 p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Summary</p>
                  <p className="text-sm leading-6 text-white/68">{summary}</p>
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.045] p-4">
                  <p className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100/55">
                    <Lightbulb className="h-3.5 w-3.5 text-orange-300" />
                    Talking Points
                  </p>
                  {talkingPoints.length ? (
                    <ul className="space-y-2">
                      {talkingPoints.map((item, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-5 text-white/70">
                          <CircleDot className="mt-1 h-3 w-3 shrink-0 text-orange-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/35">No talking points were generated for this topic.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-orange-300/10 bg-orange-400/[0.035] p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-100/55">
                    Follow-Up / Debate Questions
                  </p>
                  {debateQuestions.length ? (
                    <ul className="space-y-2">
                      {debateQuestions.map((item, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-5 text-white/70">
                          <span className="font-semibold text-orange-300">?</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/35">No follow-up questions were generated.</p>
                  )}
                </div>
              </div>

              {counterPerspectives.length > 0 && (
                <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.025] p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-100/50">
                    Counter-Perspectives
                  </p>
                  <ul className="space-y-2">
                    {counterPerspectives.map((item, index) => (
                      <li key={index} className="flex gap-2 text-xs leading-5 text-white/65">
                        <span className="text-cyan-300">↳</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedTopic.verification_notes || selectedTopic.sources || selectedTopic.verification_status) && (
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      Source / Confidence
                    </p>
                    {selectedTopic.verification_status && (
                      <span className="ml-auto rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] capitalize text-white/55">
                        {selectedTopic.verification_status}
                      </span>
                    )}
                    {confidence > 0 && (
                      <span className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2 py-0.5 text-[9px] text-emerald-200/75">
                        {Math.round(confidence)}% confidence
                      </span>
                    )}
                  </div>
                  {selectedTopic.verification_notes && (
                    <p className="text-xs leading-5 text-white/55">{selectedTopic.verification_notes}</p>
                  )}
                  {selectedTopic.sources && (
                    <p className="mt-2 break-words text-[10px] leading-4 text-white/35">
                      <span className="font-semibold text-white/50">Sources:</span> {selectedTopic.sources}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassSection>

        <GlassSection title="Producer Controls" className="min-h-0 overflow-hidden">
          {selectedTopic && (
            <div className="flex h-full flex-col">
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={busyId === selectedTopic.id}
                  onClick={() => updateTopicStatus(selectedTopic, 'approved')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/18 disabled:opacity-45"
                >
                  <Check className="h-4 w-4" />
                  Approve Topic
                </button>

                <button
                  type="button"
                  disabled={busyId === selectedTopic.id}
                  onClick={() => updateTopicStatus(selectedTopic, 'removed')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/8 px-3 py-2.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-400/15 disabled:opacity-45"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Topic
                </button>

                <button
                  type="button"
                  disabled={busyId === selectedTopic.id}
                  onClick={() => updateTopicStatus(selectedTopic, 'ready')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.07] disabled:opacity-45"
                >
                  <CircleDot className="h-4 w-4 text-amber-300" />
                  Keep for Review
                </button>
              </div>

              <div className="my-4 border-t border-white/8" />

              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Browse Queue</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => moveSelection(-1)}
                    disabled={selectedIndex <= 0}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[10px] text-white/55 transition hover:bg-white/5 hover:text-white disabled:opacity-25"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSelection(1)}
                    disabled={selectedIndex < 0 || selectedIndex >= filteredTopics.length - 1}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-[10px] text-white/55 transition hover:bg-white/5 hover:text-white disabled:opacity-25"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/8 p-2.5 text-[10px] leading-4 text-rose-100">
                  {actionError}
                </div>
              )}

              <div className="mt-auto pt-4">
                <Button asChild variant="outline" className="w-full border-fuchsia-300/20 bg-fuchsia-300/5 text-fuchsia-100 hover:bg-fuchsia-300/10">
                  <Link to="/talk/topics">
                    Open Full Workspace
                    <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 w-full rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </GlassSection>
      </div>

      <div className="relative flex flex-wrap items-center gap-3 border-t border-white/8 bg-black/20 px-4 py-3 md:px-5">
        <div className="min-w-[180px] flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/42">
            <span>{approvedCount} of {topics.length} approved</span>
            <span>{topics.length ? Math.round((approvedCount / topics.length) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${topics.length ? (approvedCount / topics.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="text-[10px] text-white/30">
          {reviewCount} awaiting review · {rejectedCount} rejected
        </span>
      </div>
    </div>
  );
}
