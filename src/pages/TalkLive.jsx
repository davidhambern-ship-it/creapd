import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import { SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Flag,
  ListVideo,
  Loader2,
  Mic2,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  ScrollText,
  SkipForward,
  Square,
  WifiOff,
} from 'lucide-react';

function secondsBetween(start, end) {
  if (!start) return 0;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function findTopicForSegment(segment, topics) {
  if (!segment) return null;
  const haystack = `${segment.title || ''} ${segment.notes || ''}`.toLowerCase();
  return topics.find(topic => {
    const needle = String(topic.topic_name || '').trim().toLowerCase();
    return needle && haystack.includes(needle);
  }) || null;
}

function assetByType(assets, type) {
  return assets.find(asset => asset.asset_type === type && asset.content);
}

function topicAsset(assets, type, topicName) {
  if (!topicName) return null;
  const needle = String(topicName).trim().toLowerCase();
  return assets.find(asset => {
    if (asset.asset_type !== type || !asset.content) return false;
    return String(asset.associated_topic || '').trim().toLowerCase() === needle;
  }) || null;
}

export default function TalkLive() {
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('config_id') || undefined;
  const {
    config,
    topics,
    guests,
    segments,
    assets,
    packages,
    session,
    loading,
    error,
    refresh,
    source,
  } = useTalkProduction(configId);

  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [tick, setTick] = useState(Date.now());
  const [teleprompterSize, setTeleprompterSize] = useState(30);
  const [obsBridge, setObsBridge] = useState(undefined);
  const teleprompterRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadObsBridge = async () => {
      try {
        const result = await creapdApi.post('/production/core', { action: 'obs_bridge_get' });
        if (!cancelled) setObsBridge(result?.bridge || null);
      } catch {
        if (!cancelled) setObsBridge(null);
      }
    };
    loadObsBridge();
    const timer = window.setInterval(loadObsBridge, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const activeIndex = useMemo(
    () => segments.findIndex(segment => segment.id === session?.active_segment_id),
    [segments, session?.active_segment_id],
  );
  const firstIncompleteIndex = useMemo(() => {
    const index = segments.findIndex(segment => segment.runtime_status !== 'complete');
    return index >= 0 ? index : 0;
  }, [segments]);
  const currentIndex = activeIndex >= 0 ? activeIndex : firstIncompleteIndex;
  const currentSegment = session?.status === 'complete' ? null : (segments[currentIndex] || null);
  const nextSegment = currentSegment ? segments[currentIndex + 1] || null : null;
  const currentTopic = findTopicForSegment(currentSegment, topics);

  useEffect(() => {
    if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
  }, [currentSegment?.id]);

  const showElapsed = useMemo(() => {
    if (!session?.started_at) return 0;
    const end = session.status === 'complete'
      ? session.ended_at
      : session.status === 'paused'
        ? session.paused_at
        : new Date(tick).toISOString();
    return secondsBetween(session.started_at, end);
  }, [session?.started_at, session?.ended_at, session?.paused_at, session?.status, tick]);

  const segmentElapsed = useMemo(() => {
    if (!currentSegment?.actual_start_at) return 0;
    const end = currentSegment.actual_end_at
      || (session?.status === 'paused' ? session.paused_at : new Date(tick).toISOString());
    return secondsBetween(currentSegment.actual_start_at, end);
  }, [currentSegment?.actual_start_at, currentSegment?.actual_end_at, session?.paused_at, session?.status, tick]);

  const plannedSegmentSeconds = Number(currentSegment?.duration_seconds || 0);
  const segmentRemaining = plannedSegmentSeconds > 0
    ? Math.max(0, plannedSegmentSeconds - segmentElapsed)
    : 0;

  const hostIntro = assetByType(assets, 'host_intro');
  const hostOutro = assetByType(assets, 'host_outro');
  const hostScript = assetByType(assets, 'host_script');
  const currentTopicScript = topicAsset(assets, 'host_script', currentTopic?.topic_name);
  const confirmedGuests = guests.filter(guest => guest.status === 'confirmed');
  const isRunning = session?.status === 'live';
  const isPaused = session?.status === 'paused';
  const isComplete = session?.status === 'complete';
  const canStart = source === 'neon' && config?.status === 'ready' && segments.length > 0 && !isRunning && !isPaused && !isComplete;
  const obsConnected = Boolean(obsBridge?.connected);
  const obsOnline = Boolean(obsBridge?.online);
  const obsScene = obsBridge?.current_scene || null;

  const teleprompterText = useMemo(() => {
    if (!currentSegment) return 'The show is complete. Your live timing and clip markers are saved in CREAPD.';
    if (currentSegment.segment_type === 'intro') {
      if (hostIntro?.content) return hostIntro.content;
      if (hostScript?.content) return hostScript.content;
    }
    if (currentSegment.segment_type === 'outro' && hostOutro?.content) return hostOutro.content;
    if (currentTopicScript?.content) return currentTopicScript.content;
    if (currentTopic?.talking_points) return currentTopic.talking_points;
    if (currentSegment.notes) return currentSegment.notes;
    if (hostScript?.content) return hostScript.content;
    return 'No teleprompter copy was generated for this segment. Use the current segment title and rundown notes as your cue.';
  }, [currentSegment, hostIntro?.content, hostOutro?.content, currentTopicScript?.content, currentTopic?.talking_points, hostScript?.content]);

  const runAction = async (label, action) => {
    if (busy) return;
    setBusy(label);
    setActionError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD Live could not complete that action.',
      );
    } finally {
      setBusy('');
    }
  };

  const sendSessionEvent = async (eventType, segmentId = null, payload = {}) => {
    if (!session?.id) throw new Error('Talk session is not ready yet.');
    return creapdApi.post('/talk/production', {
      action: 'session_event',
      session_id: session.id,
      event_type: eventType,
      ...(segmentId ? { segment_id: segmentId } : {}),
      payload,
    });
  };

  const handleStart = () => runAction('start', async () => {
    const result = await creapdApi.post('/talk/production', {
      action: 'start_session',
      configuration_id: config.id,
    });
    const startedSession = result?.session;
    if (!startedSession?.id) throw new Error('CREAPD could not start the Talk session.');
    const firstSegment = segments[firstIncompleteIndex] || segments[0];
    if (firstSegment) {
      await creapdApi.post('/talk/production', {
        action: 'session_event',
        session_id: startedSession.id,
        event_type: 'segment_start',
        segment_id: firstSegment.id,
        payload: { source: 'creapd-live', segment_index: firstIncompleteIndex },
      });
    }
  });

  const handlePauseResume = () => runAction(isPaused ? 'resume' : 'pause', async () => {
    await sendSessionEvent(isPaused ? 'session_resume' : 'session_pause', currentSegment?.id || null, {
      source: 'creapd-live',
      show_elapsed_seconds: showElapsed,
      segment_elapsed_seconds: segmentElapsed,
    });
  });

  const handleNext = () => runAction('next', async () => {
    if (!currentSegment) throw new Error('No active rundown segment is available.');
    await sendSessionEvent('segment_end', currentSegment.id, {
      source: 'creapd-live',
      show_elapsed_seconds: showElapsed,
      segment_elapsed_seconds: segmentElapsed,
    });
    if (nextSegment) {
      await sendSessionEvent('transition', null, {
        source: 'creapd-live',
        from_segment_id: currentSegment.id,
        to_segment_id: nextSegment.id,
      });
      await sendSessionEvent('segment_start', nextSegment.id, {
        source: 'creapd-live',
        segment_index: currentIndex + 1,
      });
    }
  });

  const handleClip = () => runAction('clip', async () => {
    if (!currentSegment) throw new Error('Start a segment before marking a clip.');
    await sendSessionEvent('clip_marker', currentSegment.id, {
      source: 'creapd-live',
      label: 'Clip This Moment',
      show_elapsed_seconds: showElapsed,
      segment_elapsed_seconds: segmentElapsed,
    });
  });

  const handleEnd = () => runAction('end', async () => {
    if (currentSegment && currentSegment.runtime_status === 'live') {
      await sendSessionEvent('segment_end', currentSegment.id, {
        source: 'creapd-live',
        show_elapsed_seconds: showElapsed,
        segment_elapsed_seconds: segmentElapsed,
      });
    }
    await sendSessionEvent('session_end', null, {
      source: 'creapd-live',
      show_elapsed_seconds: showElapsed,
    });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Opening CREAPD Live…</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <Mic2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">CREAPD Live could not open this production</h1>
          <p className="text-sm text-muted-foreground mb-5">{error?.message || 'No Talk production was found.'}</p>
          <Button asChild><Link to="/talk/dashboard">Back to Talk Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  if (source !== 'neon') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold mb-2">CREAPD Live is available in the owned Preview build</h1>
          <p className="text-sm text-muted-foreground mb-5">This execution cockpit intentionally does not fall back to Base44.</p>
          <Button asChild><Link to="/talk/dashboard">Back to Talk Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090d] text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/88 backdrop-blur-xl">
        <div className="px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/talk/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Talk</Link>
            </Button>
            <div className="h-6 w-px bg-white/10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-red-300">CREAPD Live</span>
              </div>
              <h1 className="font-heading font-bold truncate">{config.production_name}</h1>
            </div>
          </div>

          <div id="talk-live-header-controls" className="flex flex-wrap items-center justify-end gap-1.5">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${
              isRunning ? 'border-red-500/40 bg-red-500/15 text-red-300' :
              isPaused ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' :
              isComplete ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' :
              'border-white/10 bg-white/5 text-muted-foreground'
            }`}>
              {isRunning ? '● ON AIR' : isPaused ? 'PAUSED' : isComplete ? 'SHOW ENDED' : 'READY'}
            </span>
            <div className="font-mono text-lg min-w-[72px] text-right px-1">{formatClock(showElapsed)}</div>

            {!isRunning && !isPaused && !isComplete && (
              <Button size="sm" className="h-8" onClick={handleStart} disabled={!canStart || Boolean(busy)}>
                {busy === 'start' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                Start
              </Button>
            )}

            {(isRunning || isPaused) && (
              <Button size="sm" variant="outline" className="h-8" onClick={handlePauseResume} disabled={Boolean(busy)}>
                {busy === 'pause' || busy === 'resume'
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : isPaused ? <Play className="w-3.5 h-3.5 mr-1.5" /> : <Pause className="w-3.5 h-3.5 mr-1.5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
            )}

            {(isRunning || isPaused) && currentSegment && (
              <Button size="sm" variant="outline" className="h-8" onClick={handleClip} disabled={Boolean(busy)}>
                {busy === 'clip' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Flag className="w-3.5 h-3.5 mr-1.5" />}
                Clip
              </Button>
            )}

            {(isRunning || isPaused) && currentSegment && nextSegment && (
              <Button size="sm" className="h-8" onClick={handleNext} disabled={Boolean(busy)}>
                {busy === 'next' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5 mr-1.5" />}
                Next
              </Button>
            )}

            {(isRunning || isPaused) && (
              <Button size="sm" variant="destructive" className="h-8" onClick={handleEnd} disabled={Boolean(busy)}>
                {busy === 'end' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Square className="w-3.5 h-3.5 mr-1.5" />}
                End
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
        {actionError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{actionError}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden min-h-[360px]">
            <div className="h-full min-h-[360px] bg-black/70 flex items-center justify-center relative">
              <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MonitorPlay className="w-4 h-4" /> PROGRAM MONITOR
              </div>
              <div id="talk-program-monitor-obs-control" className="absolute top-14 right-3 z-30" />
              <div className="text-center max-w-md px-6">
                <MonitorPlay className={`w-14 h-14 mx-auto mb-4 ${obsConnected ? 'text-emerald-300/60' : obsOnline ? 'text-amber-300/50' : 'text-white/20'}`} />
                <p className="font-medium">{obsConnected ? 'OBS control connected' : obsOnline ? 'OBS bridge online' : 'Broadcast picture comes next'}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {obsConnected
                    ? `CREAPD is receiving live OBS state${obsScene ? ` for “${obsScene}”` : ''}.`
                    : obsOnline
                      ? 'The local bridge is checking in to CREAPD, but OBS is not connected yet.'
                      : 'Connect OBS to let CREAPD read and control the live broadcast engine.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-white/[0.025] overflow-hidden min-h-[360px] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Teleprompter</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{currentTopic?.topic_name || currentSegment?.title || 'Current host copy'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setTeleprompterSize(size => Math.max(20, size - 4))} className="h-8 min-w-8 px-2 rounded-md border border-white/10 bg-white/5 text-sm hover:bg-white/10" aria-label="Decrease teleprompter text size">A−</button>
                <button type="button" onClick={() => setTeleprompterSize(size => Math.min(54, size + 4))} className="h-8 min-w-8 px-2 rounded-md border border-white/10 bg-white/5 text-sm hover:bg-white/10" aria-label="Increase teleprompter text size">A+</button>
              </div>
            </div>

            <div ref={teleprompterRef} className="flex-1 overflow-y-auto max-h-[520px] px-6 md:px-8 py-7 scroll-smooth">
              <div className="whitespace-pre-line font-medium leading-[1.55] tracking-[0.01em]" style={{ fontSize: `${teleprompterSize}px` }}>{teleprompterText}</div>
              {Array.isArray(currentTopic?.debate_questions) && currentTopic.debate_questions.length > 0 && (
                <div className="mt-10 pt-6 border-t border-white/10">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-4">Conversation prompts</p>
                  <div className="space-y-4 text-lg leading-relaxed text-white/80">
                    {currentTopic.debate_questions.slice(0, 3).map((question, index) => <p key={index}>{index + 1}. {question}</p>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)] gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">Current Segment</p>
                {currentSegment ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded bg-primary/15 text-primary">{SEGMENT_TYPE_LABELS[currentSegment.segment_type] || currentSegment.segment_type}</span>
                      <span className="text-xs text-muted-foreground">Segment {currentIndex + 1} of {segments.length}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-heading font-bold leading-tight">{currentSegment.title || 'Untitled Segment'}</h2>
                    {currentSegment.notes && <p className="text-sm md:text-base text-muted-foreground mt-3 whitespace-pre-line">{currentSegment.notes}</p>}
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl md:text-4xl font-heading font-bold">Show complete</h2>
                    <p className="text-muted-foreground mt-2">This live session has ended. Your clip markers and actual segment timing remain stored in CREAPD.</p>
                  </>
                )}
              </div>

              {currentSegment && (
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div className="rounded-xl bg-black/30 border border-white/10 p-3 text-center min-w-[110px]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Elapsed</p>
                    <p className="font-mono text-2xl mt-1">{formatClock(segmentElapsed)}</p>
                  </div>
                  <div className={`rounded-xl border p-3 text-center min-w-[110px] ${segmentRemaining === 0 && plannedSegmentSeconds > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-black/30 border-white/10'}`}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Planned Left</p>
                    <p className="font-mono text-2xl mt-1">{formatClock(segmentRemaining)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h3 className="font-heading font-semibold flex items-center gap-2 mb-3"><SkipForward className="w-4 h-4 text-primary" /> Up Next</h3>
            {nextSegment ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">Segment {currentIndex + 2} of {segments.length}</p>
                <h4 className="text-xl font-heading font-semibold">{nextSegment.title}</h4>
                <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                  <span>{SEGMENT_TYPE_LABELS[nextSegment.segment_type] || nextSegment.segment_type}</span><span>•</span><span>{formatClock(nextSegment.duration_seconds)}</span>
                </div>
                {nextSegment.notes && <p className="text-sm text-muted-foreground mt-3 line-clamp-4">{nextSegment.notes}</p>}
              </>
            ) : <div className="text-sm text-muted-foreground">{currentSegment ? 'This is the final rundown segment.' : 'No next segment.'}</div>}

            <div className="border-t border-white/10 mt-5 pt-4">
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Confirmed guests</span><span>{confirmedGuests.length}</span></div>
              <div className="flex items-center justify-between text-sm mt-2"><span className="text-muted-foreground">Production package</span><span className={packages.length ? 'text-emerald-300' : 'text-amber-300'}>{packages.length ? 'Ready' : 'Missing'}</span></div>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold flex items-center gap-2"><ListVideo className="w-4 h-4 text-primary" /> Run of Show</h3>
            <span className="text-xs text-muted-foreground">{segments.length} segments</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[38vh] overflow-y-auto pr-1">
            {segments.map((segment, index) => {
              const active = segment.id === session?.active_segment_id;
              const complete = segment.runtime_status === 'complete';
              return (
                <div key={segment.id} className={`rounded-lg px-3 py-2 border ${active ? 'border-primary/40 bg-primary/10' : 'border-white/[0.04] bg-white/[0.025]'}`}>
                  <div className="flex items-start gap-2">
                    <div className="pt-0.5">{complete ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : active ? <CircleDot className="w-4 h-4 text-red-400 animate-pulse" /> : <div className="w-4 h-4 rounded-full border border-white/20" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${active ? 'font-semibold' : ''}`}>{index + 1}. {segment.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                        <span>{SEGMENT_TYPE_LABELS[segment.segment_type] || segment.segment_type}</span><span>{formatClock(segment.duration_seconds)}</span>
                      </div>
                      {Number(segment.clip_marker_count || 0) > 0 && <p className="text-[11px] text-amber-300 mt-1">{segment.clip_marker_count} clip marker{Number(segment.clip_marker_count) === 1 ? '' : 's'}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
