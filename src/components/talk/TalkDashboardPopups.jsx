import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import { ASSET_TYPE_LABELS, SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import {
  ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDot,
  ClipboardList, Clock3, Download, ExternalLink, FileText, Image as ImageIcon,
  Mic2, PackageCheck, Radio, Search, ShieldCheck, Sparkles, UserCheck, Users,
  Volume2, XCircle
} from 'lucide-react';

function Frame({ children }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-fuchsia-300/15 bg-[#09050d]/96 shadow-[0_35px_110px_rgba(0,0,0,.58)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(168,85,247,.20),transparent_30%),radial-gradient(circle_at_92%_20%,rgba(249,115,22,.14),transparent_26%),linear-gradient(135deg,rgba(255,255,255,.02),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/75 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Panel({ title, eyebrow, icon: Icon, children, className = '' }) {
  return (
    <section className={`min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#100817]/78 shadow-[0_20px_60px_rgba(0,0,0,.24)] backdrop-blur-xl ${className}`}>
      {(title || eyebrow || Icon) && (
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
          {Icon && <Icon className="h-4 w-4 text-orange-300" />}
          <div className="min-w-0">
            {eyebrow && <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/45">{eyebrow}</p>}
            {title && <h3 className="truncate text-xs font-semibold text-white/85">{title}</h3>}
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function Empty({ icon: Icon, title, text }) {
  return (
    <Frame>
      <div className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10">
          <Icon className="h-7 w-7 text-fuchsia-200" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/48">{text}</p>
      </div>
    </Frame>
  );
}

function WorkspaceLink({ to, label = 'Open Full Workspace' }) {
  return (
    <Button asChild variant="outline" className="border-fuchsia-300/20 bg-fuchsia-300/5 text-fuchsia-100 hover:bg-fuchsia-300/10">
      <Link to={to}>
        {label}
        <ExternalLink className="ml-2 h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}

function formatSeconds(value) {
  const seconds = Math.max(0, Number(value || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function relevanceStyle(value) {
  const key = String(value || '').toLowerCase();
  if (key === 'high') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100';
  if (key === 'medium') return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  return 'border-white/10 bg-white/[0.04] text-white/55';
}

export function TalkResearchPopup({ research = [], onClose }) {
  const [selectedId, setSelectedId] = useState(research[0]?.id || null);
  const selected = research.find((item) => item.id === selectedId) || research[0] || null;

  if (!research.length) {
    return <Empty icon={Search} title="No Research Yet" text="Refresh this Talk production to generate background research for the discussion." />;
  }

  return (
    <Frame>
      <div className="border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Search className="h-4 w-4 text-orange-300" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Research Desk</span>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">{research.length} sources</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:h-[58vh] lg:grid-cols-[0.9fr_1.65fr] lg:p-4">
        <Panel title="Source Queue" eyebrow="Background material" icon={FileText}>
          <div className="space-y-2 lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
            {research.map((item, index) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${active
                    ? 'border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500/15 to-orange-400/8 shadow-[0_0_22px_rgba(217,70,239,.1)]'
                    : 'border-white/8 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.05]'}`}
                >
                  <div className="flex gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black/25 text-[10px] text-white/45">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold text-white/85">{item.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {item.relevance && <span className={`rounded-full border px-2 py-0.5 text-[9px] ${relevanceStyle(item.relevance)}`}>{item.relevance}</span>}
                        {item.category && <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] text-white/40">{item.category}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={selected?.title || 'Research Item'} eyebrow="Selected source" icon={ShieldCheck}>
          {selected && (
            <div className="lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
              <div className="flex flex-wrap items-center gap-2">
                {selected.relevance && <span className={`rounded-full border px-2.5 py-1 text-[10px] ${relevanceStyle(selected.relevance)}`}>{selected.relevance} relevance</span>}
                {selected.category && <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/5 px-2.5 py-1 text-[10px] text-fuchsia-100/65">{selected.category}</span>}
              </div>

              {(selected.source || selected.date) && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Source</p>
                  {selected.source && <p className="mt-1 break-words text-xs text-white/60">{selected.source}</p>}
                  {selected.date && <p className="mt-1 text-[10px] text-white/35">{selected.date}</p>}
                </div>
              )}

              <div className="mt-3 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.035] p-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100/50">Research Summary</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-white/68">{selected.summary || selected.content || selected.description || 'No summary available.'}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <WorkspaceLink to="/talk/research" />
                <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65">Back to Dashboard</button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Frame>
  );
}

export function TalkGuestChairPopup({ guests = [], source, refresh, onClose }) {
  const [selectedId, setSelectedId] = useState(guests[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const selected = guests.find((guest) => guest.id === selectedId) || guests[0] || null;
  const confirmed = guests.filter((guest) => guest.status === 'confirmed').length;

  const toggleConfirmed = async (guest) => {
    if (!guest?.id || busyId) return;
    const status = guest.status === 'confirmed' ? 'pending' : 'confirmed';
    setBusyId(guest.id);
    setError('');
    try {
      if (source === 'neon') {
        await creapdApi.post('/talk/production', {
          action: 'update_guest',
          guest_id: guest.id,
          patch: { status },
        });
      } else {
        await base44.entities.TalkGuest.update(guest.id, { status });
      }
      await refresh?.();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Could not update this guest.');
    } finally {
      setBusyId(null);
    }
  };

  if (!guests.length) {
    return (
      <Frame>
        <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-orange-300/20 bg-orange-400/10">
            <Users className="h-7 w-7 text-orange-200" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Guest Chair Is Empty</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/48">This production does not have a guest yet. Add or manage guests in the full Guest workspace.</p>
          <div className="mt-5"><WorkspaceLink to="/talk/guests" label="Manage Guests" /></div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Users className="h-4 w-4 text-orange-300" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Guest Chair</span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">{confirmed} confirmed</span>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">{guests.length} total</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:h-[58vh] lg:grid-cols-[0.9fr_1.35fr_0.72fr] lg:p-4">
        <Panel title="Guest List" eyebrow="Participants" icon={Users}>
          <div className="space-y-2 lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
            {guests.map((guest) => {
              const active = guest.id === selected?.id;
              return (
                <button key={guest.id} type="button" onClick={() => setSelectedId(guest.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? 'border-orange-300/35 bg-orange-400/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                  <div className="flex items-start gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-black/25">
                      <Mic2 className="h-3.5 w-3.5 text-fuchsia-200" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/85">{guest.guest_name}</p>
                      {guest.title_role && <p className="mt-0.5 truncate text-[10px] text-white/40">{guest.title_role}</p>}
                      <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] ${guest.status === 'confirmed' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100' : 'border-amber-300/20 bg-amber-300/8 text-amber-100'}`}>
                        {guest.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={selected?.guest_name || 'Guest'} eyebrow="Pre-interview card" icon={UserCheck}>
          {selected && (
            <div className="lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
              <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.035] p-4">
                <h2 className="text-xl font-bold text-white">{selected.guest_name}</h2>
                {selected.title_role && <p className="mt-1 text-xs text-orange-200/70">{selected.title_role}</p>}
                {selected.organization && <p className="mt-1 text-[10px] text-white/35">{selected.organization}</p>}
              </div>

              {selected.bio && (
                <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Bio</p>
                  <p className="text-sm leading-6 text-white/65">{selected.bio}</p>
                </div>
              )}

              {(selected.talking_points || selected.expertise) && (
                <div className="mt-3 rounded-2xl border border-orange-300/10 bg-orange-400/[0.035] p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-100/55">Talking Points</p>
                  {selected.expertise && <p className="mb-2 text-[10px] text-white/40">Expertise: {selected.expertise}</p>}
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/65">{selected.talking_points || 'No talking points added.'}</p>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Producer Controls" eyebrow="Guest status" icon={UserCheck}>
          {selected && (
            <div className="flex h-full flex-col">
              <button
                type="button"
                disabled={busyId === selected.id}
                onClick={() => toggleConfirmed(selected)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-45 ${selected.status === 'confirmed'
                  ? 'border-amber-300/20 bg-amber-300/8 text-amber-100 hover:bg-amber-300/14'
                  : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/18'}`}
              >
                {selected.status === 'confirmed' ? <CircleDot className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {selected.status === 'confirmed' ? 'Return to Pending' : 'Confirm Guest'}
              </button>

              {selected.guest_source === 'ai' && (
                <div className="mt-3 rounded-xl border border-fuchsia-300/15 bg-fuchsia-300/5 p-3 text-[10px] leading-4 text-fuchsia-100/60">
                  AI Suggested — this does not mean the guest has agreed to appear.
                </div>
              )}

              {error && <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/8 p-3 text-[10px] text-rose-100">{error}</div>}

              <div className="mt-auto space-y-2 pt-4">
                <WorkspaceLink to="/talk/guests" label="Manage Guest List" />
                <button type="button" onClick={onClose} className="w-full rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65">Back to Dashboard</button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Frame>
  );
}

export function TalkRundownPopup({ segments = [], source, refresh, onClose }) {
  const [selectedId, setSelectedId] = useState(segments[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const selected = segments.find((segment) => segment.id === selectedId) || segments[0] || null;
  const selectedIndex = selected ? segments.findIndex((segment) => segment.id === selected.id) : -1;
  const totalSeconds = segments.reduce((sum, segment) => sum + Number(segment.duration_seconds || 0), 0);
  const approved = segments.filter((segment) => segment.status === 'approved').length;

  const toggleApproved = async (segment) => {
    if (!segment?.id || busyId) return;
    const status = segment.status === 'approved' ? 'ready' : 'approved';
    setBusyId(segment.id);
    setError('');
    try {
      if (source === 'neon') {
        await creapdApi.post('/talk/production', {
          action: 'set_segment_status',
          segment_id: segment.id,
          status,
        });
      } else {
        await base44.entities.TalkSegment.update(segment.id, { status });
      }
      await refresh?.();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Could not update this segment.');
    } finally {
      setBusyId(null);
    }
  };

  if (!segments.length) {
    return <Empty icon={ClipboardList} title="No Rundown Yet" text="Refresh this Talk production to build the show timeline and segment order." />;
  }

  return (
    <Frame>
      <div className="border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="h-4 w-4 text-orange-300" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Run of Show</span>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">{segments.length} segments</span>
          <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] text-orange-100">{formatSeconds(totalSeconds)}</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:h-[58vh] lg:grid-cols-[1.05fr_1.5fr_0.7fr] lg:p-4">
        <Panel title="Timeline" eyebrow="Segment order" icon={Clock3}>
          <div className="space-y-1.5 lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
            {segments.map((segment, index) => {
              const active = segment.id === selected?.id;
              return (
                <button key={segment.id} type="button" onClick={() => setSelectedId(segment.id)} className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-fuchsia-300/40 bg-fuchsia-400/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0 font-mono text-[10px] text-orange-200/65">{segment.start_time || '--:--'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white/82">{segment.title}</p>
                      <p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-white/32">{SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}</p>
                    </div>
                    <span className="text-[9px] text-white/35">{formatSeconds(segment.duration_seconds)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title={selected?.title || 'Segment'} eyebrow={selected ? `Segment ${selectedIndex + 1} of ${segments.length}` : 'Selected segment'} icon={ClipboardList}>
          {selected && (
            <div className="lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-2.5 py-1 text-[10px] text-orange-100">{selected.start_time || '--:--'} → {selected.end_time || '--:--'}</span>
                <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">{formatSeconds(selected.duration_seconds)}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] ${selected.status === 'approved' ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>{selected.status || 'ready'}</span>
              </div>

              {(selected.notes || selected.description) && (
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Producer Notes</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/65">{selected.notes || selected.description}</p>
                </div>
              )}

              {selected.script && (
                <div className="mt-3 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.035] p-4">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-fuchsia-100/50">Script / Copy</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white/68">{selected.script}</p>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Rundown Controls" eyebrow="Review status" icon={CheckCircle2}>
          {selected && (
            <div className="flex h-full flex-col">
              <button
                type="button"
                disabled={busyId === selected.id}
                onClick={() => toggleApproved(selected)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-45 ${selected.status === 'approved'
                  ? 'border-amber-300/20 bg-amber-300/8 text-amber-100'
                  : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'}`}
              >
                <Check className="h-4 w-4" />
                {selected.status === 'approved' ? 'Return to Ready' : 'Approve Segment'}
              </button>

              <div className="mt-4">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Browse Timeline</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={selectedIndex <= 0} onClick={() => setSelectedId(segments[selectedIndex - 1]?.id)} className="flex items-center justify-center rounded-lg border border-white/10 bg-black/20 py-2 text-white/55 disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" disabled={selectedIndex >= segments.length - 1} onClick={() => setSelectedId(segments[selectedIndex + 1]?.id)} className="flex items-center justify-center rounded-lg border border-white/10 bg-black/20 py-2 text-white/55 disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>

              {error && <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/8 p-3 text-[10px] text-rose-100">{error}</div>}

              <div className="mt-auto pt-4">
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[9px] text-white/35"><span>Approved</span><span>{approved}/{segments.length}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-emerald-400" style={{ width: `${segments.length ? (approved / segments.length) * 100 : 0}%` }} /></div>
                </div>
                <WorkspaceLink to="/talk/rundown" />
                <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65">Back to Dashboard</button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Frame>
  );
}

export function TalkAssetsPopup({ assets = [], source, refresh, onClose }) {
  const groups = useMemo(() => assets.reduce((acc, asset) => {
    const key = asset.asset_type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {}), [assets]);
  const groupKeys = Object.keys(groups);
  const [groupKey, setGroupKey] = useState(groupKeys[0] || '');
  const [selectedId, setSelectedId] = useState(assets[0]?.id || null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const visibleGroup = groups[groupKey] || assets;
  const selected = visibleGroup.find((asset) => asset.id === selectedId) || visibleGroup[0] || assets[0] || null;
  const approved = assets.filter((asset) => asset.status === 'approved').length;

  const selectGroup = (key) => {
    setGroupKey(key);
    setSelectedId(groups[key]?.[0]?.id || null);
  };

  const toggleApproved = async (asset) => {
    if (!asset?.id || busyId) return;
    const status = asset.status === 'approved' ? 'ready' : 'approved';
    setBusyId(asset.id);
    setError('');
    try {
      if (source === 'neon') {
        await creapdApi.post('/talk/production', {
          action: 'set_asset_status',
          asset_id: asset.id,
          status,
        });
      } else {
        await base44.entities.TalkAsset.update(asset.id, { status });
      }
      await refresh?.();
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Could not update this asset.');
    } finally {
      setBusyId(null);
    }
  };

  if (!assets.length) {
    return <Empty icon={Sparkles} title="No AI Assets Yet" text="Refresh this Talk production to generate scripts, prompts, questions, graphics, and production notes." />;
  }

  const content = selected?.content || selected?.text || selected?.prompt || selected?.notes || '';
  const isImage = selected?.asset_type === 'ai_image' && /^https?:\/\//i.test(content);

  return (
    <Frame>
      <div className="border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-300" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-white/65">AI Asset Bay</span>
          <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2.5 py-1 text-[10px] text-fuchsia-100">{assets.length} assets</span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">{approved} approved</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:h-[58vh] lg:grid-cols-[0.8fr_1.6fr_0.7fr] lg:p-4">
        <Panel title="Asset Categories" eyebrow="Media prep" icon={PackageCheck}>
          <div className="space-y-2 lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
            {groupKeys.map((key) => (
              <button key={key} type="button" onClick={() => selectGroup(key)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${key === groupKey ? 'border-fuchsia-300/40 bg-fuchsia-400/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                <span className="truncate text-xs font-semibold text-white/78">{ASSET_TYPE_LABELS[key] || key}</span>
                <span className="rounded-full border border-white/8 bg-black/20 px-2 py-0.5 text-[9px] text-white/38">{groups[key].length}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={ASSET_TYPE_LABELS[selected?.asset_type] || selected?.asset_type || 'Asset'} eyebrow="Selected asset" icon={isImage ? ImageIcon : FileText}>
          <div className="grid gap-3 lg:grid-cols-[0.65fr_1.35fr]">
            <div className="space-y-2 lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
              {visibleGroup.map((asset) => (
                <button key={asset.id} type="button" onClick={() => setSelectedId(asset.id)} className={`w-full rounded-xl border p-3 text-left transition ${asset.id === selected?.id ? 'border-orange-300/35 bg-orange-400/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'}`}>
                  <p className="line-clamp-2 text-xs font-semibold text-white/80">{asset.title || ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type}</p>
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[9px] ${asset.status === 'approved' ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-white/40'}`}>{asset.status || 'ready'}</span>
                </button>
              ))}
            </div>

            {selected && (
              <div className="lg:max-h-[calc(58vh-70px)] lg:overflow-y-auto lg:pr-1">
                <div className="rounded-2xl border border-fuchsia-300/10 bg-fuchsia-400/[0.035] p-4">
                  <h2 className="text-lg font-bold text-white">{selected.title || ASSET_TYPE_LABELS[selected.asset_type] || selected.asset_type}</h2>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/32">{selected.asset_type}</p>
                </div>

                {isImage ? (
                  <a href={content} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    <img src={content} alt={selected.title || 'CREAPD generated visual'} className="max-h-72 w-full object-contain" loading="lazy" />
                  </a>
                ) : (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white/66">{content || 'No content available.'}</p>
                  </div>
                )}

                {selected.audio_url && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-orange-300/10 bg-orange-400/[0.035] p-3">
                    <Volume2 className="h-4 w-4 shrink-0 text-orange-300" />
                    <audio controls src={selected.audio_url} className="h-8 min-w-0 flex-1" />
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Asset Controls" eyebrow="Approval" icon={CheckCircle2}>
          {selected && (
            <div className="flex h-full flex-col">
              <button
                type="button"
                disabled={busyId === selected.id}
                onClick={() => toggleApproved(selected)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-45 ${selected.status === 'approved'
                  ? 'border-amber-300/20 bg-amber-300/8 text-amber-100'
                  : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'}`}
              >
                <Check className="h-4 w-4" />
                {selected.status === 'approved' ? 'Return to Review' : 'Approve Asset'}
              </button>

              {error && <div className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/8 p-3 text-[10px] text-rose-100">{error}</div>}

              <div className="mt-auto pt-4">
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[9px] text-white/35"><span>Approval Progress</span><span>{approved}/{assets.length}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-emerald-400" style={{ width: `${assets.length ? (approved / assets.length) * 100 : 0}%` }} /></div>
                </div>
                <WorkspaceLink to="/talk/assets" />
                <button type="button" onClick={onClose} className="mt-2 w-full rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65">Back to Dashboard</button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Frame>
  );
}

export function TalkFinishLaunchPopup({
  config,
  topics = [],
  research = [],
  guests = [],
  segments = [],
  assets = [],
  livePath,
  onClose,
}) {
  const approvedTopics = topics.filter((topic) => topic.status === 'approved').length;
  const confirmedGuests = guests.filter((guest) => guest.status === 'confirmed').length;
  const approvedAssets = assets.filter((asset) => asset.status === 'approved').length;
  const sections = [
    ['Configuration', 1, !!config?.production_name],
    ['Research', research.length, research.length > 0],
    ['Topics', topics.length, topics.length > 0],
    ['Guests', guests.length, true],
    ['Rundown', segments.length, segments.length > 0],
    ['AI Assets', assets.length, assets.length > 0],
  ];
  const readyCount = sections.filter(([, , ready]) => ready).length;
  const progress = Math.round((readyCount / sections.length) * 100);

  return (
    <Frame>
      <div className="border-b border-white/8 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Download className="h-4 w-4 text-orange-300" />
          <span className="mr-auto text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Final Desk</span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] text-emerald-100">{progress}% package ready</span>
        </div>
      </div>

      <div className="grid gap-3 p-3 lg:grid-cols-[1.25fr_0.85fr] lg:p-4">
        <Panel title="Production Package" eyebrow="Final checkpoint" icon={PackageCheck}>
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map(([label, count, ready]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border ${ready ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/8 text-amber-100'}`}>
                  {ready ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/78">{label}</p>
                  <p className="mt-0.5 text-[10px] text-white/35">{count} {count === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-fuchsia-300/10 bg-fuchsia-300/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">Topics Approved</p>
              <p className="mt-1 text-xl font-bold text-white">{approvedTopics}/{topics.length}</p>
            </div>
            <div className="rounded-xl border border-orange-300/10 bg-orange-300/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">Guests Confirmed</p>
              <p className="mt-1 text-xl font-bold text-white">{confirmedGuests}</p>
            </div>
            <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">Assets Approved</p>
              <p className="mt-1 text-xl font-bold text-white">{approvedAssets}/{assets.length}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Launch Controls" eyebrow="Ready for air" icon={Radio}>
          <div className="flex h-full flex-col">
            <div className="rounded-2xl border border-fuchsia-300/12 bg-gradient-to-br from-fuchsia-500/10 to-orange-400/5 p-4">
              <p className="text-sm font-semibold text-white">Take the show live</p>
              <p className="mt-2 text-xs leading-5 text-white/48">Enter the CREAPD Live cockpit with this production's rundown, host notes, and show controls.</p>
            </div>

            <div className="mt-3 space-y-2">
              {config?.status === 'ready' && segments.length > 0 ? (
                <Button asChild className="w-full border border-white/10 bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 text-white hover:brightness-110">
                  <Link to={livePath}><Radio className="mr-2 h-4 w-4" />Enter Studio</Link>
                </Button>
              ) : (
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-[10px] leading-4 text-amber-100/70">
                  The studio becomes available when the production is ready and a rundown exists.
                </div>
              )}

              <WorkspaceLink to="/talk/export" label="Open Export Center" />
            </div>

            <div className="mt-auto pt-4">
              <div className="mb-1 flex justify-between text-[9px] text-white/35"><span>Package Completion</span><span>{progress}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-fuchsia-500 to-emerald-400" style={{ width: `${progress}%` }} /></div>
              <button type="button" onClick={onClose} className="mt-3 w-full rounded-xl px-3 py-2 text-[10px] text-white/38 transition hover:bg-white/5 hover:text-white/65">Back to Dashboard</button>
            </div>
          </div>
        </Panel>
      </div>
    </Frame>
  );
}
