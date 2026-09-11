import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { creapdApi } from '@/api/creapdClient';

function secondsSince(value) {
  if (!value) return 0;
  const started = new Date(value).getTime();
  if (!Number.isFinite(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 1000));
}

function TalkAutoRundownAdvanceLive({ configId }) {
  const checkingRef = useRef(false);
  const advancingRef = useRef(false);
  const handledSegmentRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const autoTakeKey = `creapd.obsAutoTake.${configId || 'talk'}`;

    const automationEnabled = () => {
      try {
        return window.localStorage.getItem(autoTakeKey) === 'true';
      } catch {
        return false;
      }
    };

    const readProduction = async ({ fresh = false } = {}) => {
      const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
      const path = `/production/core?studio=talk${suffix}`;
      return fresh ? creapdApi.getFresh(path) : creapdApi.get(path);
    };

    const sendEvent = async (sessionId, eventType, segmentId = null, payload = {}) => {
      return creapdApi.post('/production/core', {
        action: 'talk_session_event',
        session_id: sessionId,
        event_type: eventType,
        ...(segmentId ? { segment_id: segmentId } : {}),
        payload,
      });
    };

    const startWaitingSegment = async (production) => {
      const session = production?.session || null;
      const segments = Array.isArray(production?.segments) ? production.segments : [];
      if (!session?.id || session.status !== 'live' || session.active_segment_id || advancingRef.current) return false;

      const nextIndex = segments.findIndex(segment => segment.runtime_status !== 'complete');
      if (nextIndex < 0) return false;
      const nextSegment = segments[nextIndex];
      if (!nextSegment || nextSegment.runtime_status === 'live') return false;

      // Only recover a segment after the show has actually begun. This avoids
      // stealing the normal Start Show flow while still repairing the brief
      // between-segment state if a request is interrupted.
      const hasCompletedBefore = nextIndex > 0 && segments.slice(0, nextIndex).every(segment => segment.runtime_status === 'complete');
      if (!hasCompletedBefore) return false;

      advancingRef.current = true;
      try {
        await sendEvent(session.id, 'segment_start', nextSegment.id, {
          source: 'creapd-live-auto',
          reason: 'recover_waiting_segment',
          segment_index: nextIndex,
        });
        return true;
      } finally {
        advancingRef.current = false;
      }
    };

    const check = async () => {
      if (cancelled || checkingRef.current || !automationEnabled()) return;
      checkingRef.current = true;

      try {
        // Normal checks share the CREAPD Live read cache with Director,
        // graphics automation, and the Live page. Elapsed time still advances
        // locally from actual_start_at, so a cached snapshot does not make the
        // segment timer less precise.
        const production = await readProduction();
        if (cancelled) return;

        const session = production?.session || null;
        const segments = Array.isArray(production?.segments) ? production.segments : [];
        if (!session?.id || session.status !== 'live' || !segments.length) {
          handledSegmentRef.current = null;
          return;
        }

        if (!session.active_segment_id) {
          await startWaitingSegment(production);
          return;
        }

        const currentIndex = segments.findIndex(segment => segment.id === session.active_segment_id);
        if (currentIndex < 0) return;

        const currentSegment = segments[currentIndex];
        const nextSegment = segments[currentIndex + 1] || null;
        if (handledSegmentRef.current && handledSegmentRef.current !== currentSegment.id) {
          handledSegmentRef.current = null;
        }

        // The final segment intentionally does not auto-end the whole show.
        // The producer still owns the explicit End Show decision.
        if (!nextSegment) return;

        const plannedSeconds = Number(currentSegment.duration_seconds || 0);
        if (!Number.isFinite(plannedSeconds) || plannedSeconds <= 0 || !currentSegment.actual_start_at) return;
        if (secondsSince(currentSegment.actual_start_at) < plannedSeconds) return;
        if (advancingRef.current || handledSegmentRef.current === currentSegment.id) return;

        handledSegmentRef.current = currentSegment.id;
        advancingRef.current = true;

        try {
          // Bypass the shared polling cache immediately before mutating state so
          // a manual Next Segment click at the same moment cannot double-advance
          // the rundown even though routine Live reads are now coalesced.
          const latest = await readProduction({ fresh: true });
          const latestSession = latest?.session || null;
          if (
            latestSession?.status !== 'live'
            || latestSession?.active_segment_id !== currentSegment.id
          ) {
            return;
          }

          await sendEvent(session.id, 'transition', null, {
            source: 'creapd-live-auto',
            reason: 'planned_duration_elapsed',
            from_segment_id: currentSegment.id,
            to_segment_id: nextSegment.id,
          });
          await sendEvent(session.id, 'segment_end', currentSegment.id, {
            source: 'creapd-live-auto',
            reason: 'planned_duration_elapsed',
            segment_elapsed_seconds: secondsSince(currentSegment.actual_start_at),
          });
          await sendEvent(session.id, 'segment_start', nextSegment.id, {
            source: 'creapd-live-auto',
            reason: 'planned_duration_elapsed',
            segment_index: currentIndex + 1,
          });
        } catch (error) {
          // Allow the next polling cycle to retry. If segment_end succeeded but
          // segment_start did not, the recovery path above starts the waiting
          // first-incomplete segment instead of leaving the show stranded.
          handledSegmentRef.current = null;
          console.error('CREAPD automatic rundown advance failed', error);
        } finally {
          advancingRef.current = false;
        }
      } catch (error) {
        console.error('CREAPD automatic rundown check failed', error);
      } finally {
        checkingRef.current = false;
      }
    };

    check();
    const timer = window.setInterval(check, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [configId]);

  return null;
}

export default function TalkAutoRundownAdvance() {
  const location = useLocation();
  if (location.pathname !== '/talk/live') return null;
  const configId = new URLSearchParams(location.search).get('config_id') || '';
  return <TalkAutoRundownAdvanceLive configId={configId} />;
}
