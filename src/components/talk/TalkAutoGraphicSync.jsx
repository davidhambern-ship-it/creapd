import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { creapdApi } from '@/api/creapdClient';

function clean(value) {
  return String(value ?? '').trim();
}

function findTopicForSegment(segment, topics) {
  if (!segment) return null;
  const haystack = `${clean(segment.title)} ${clean(segment.notes)}`.toLowerCase();
  return (Array.isArray(topics) ? topics : []).find(topic => {
    const topicName = clean(topic?.topic_name).toLowerCase();
    return topicName && haystack.includes(topicName);
  }) || null;
}

function activeSegmentFor(production) {
  const segments = Array.isArray(production?.segments) ? production.segments : [];
  const session = production?.session || null;
  if (session?.status === 'complete') return null;

  if (session?.active_segment_id) {
    const active = segments.find(segment => segment.id === session.active_segment_id);
    if (active) return active;
  }

  return segments.find(segment => segment.runtime_status !== 'complete') || segments[0] || null;
}

function buildSegmentGraphicCue(production) {
  const segment = activeSegmentFor(production);
  if (!segment) return null;

  const topic = findTopicForSegment(segment, production?.topics || []);
  const productionName = clean(production?.configuration?.production_name) || 'Talk Show';

  return topic
    ? {
        title: clean(topic.topic_name),
        subtitle: clean(segment.title) || productionName,
        label: 'CURRENT TOPIC',
        segmentId: segment.id,
      }
    : {
        title: clean(segment.title) || productionName,
        subtitle: productionName,
        label: 'UP NOW',
        segmentId: segment.id,
      };
}

function sameGraphic(left, right) {
  if (!left || !right) return false;
  return clean(left.title) === clean(right.title)
    && clean(left.subtitle) === clean(right.subtitle)
    && clean(left.label).toUpperCase() === clean(right.label).toUpperCase();
}

function TalkAutoGraphicSyncLive({ configId }) {
  const previousSegmentIdRef = useRef(null);
  const previousCueRef = useRef(null);
  const checkingRef = useRef(false);
  const syncingRef = useRef(false);

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

    const readState = async () => {
      const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
      const [bridgeResult, production] = await Promise.all([
        creapdApi.post('/production/core', { action: 'obs_bridge_get' }),
        creapdApi.get(`/production/core?studio=talk${suffix}`),
      ]);
      return {
        bridge: bridgeResult?.bridge || null,
        production: production || null,
      };
    };

    const check = async () => {
      if (cancelled || checkingRef.current) return;
      checkingRef.current = true;

      try {
        const { bridge, production } = await readState();
        if (cancelled) return;

        const cue = buildSegmentGraphicCue(production);
        const segmentId = cue?.segmentId || null;
        const previousSegmentId = previousSegmentIdRef.current;
        const previousCue = previousCueRef.current;

        if (previousSegmentId === null) {
          previousSegmentIdRef.current = segmentId;
          previousCueRef.current = cue;
          return;
        }

        if (!segmentId || segmentId === previousSegmentId) {
          previousCueRef.current = cue;
          return;
        }

        // Lock onto the new rundown segment immediately so repeated polls cannot
        // queue the same graphic update while the local bridge is still working.
        previousSegmentIdRef.current = segmentId;
        previousCueRef.current = cue;

        if (!automationEnabled() || syncingRef.current || !cue?.title) return;
        if (!bridge?.connected || !bridge?.id) return;

        const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
          ? bridge.capabilities
          : {};
        if (capabilities.overlay_control !== true || capabilities.overlay_visible !== true) return;

        const liveGraphic = {
          title: capabilities.overlay_title,
          subtitle: capabilities.overlay_subtitle,
          label: capabilities.overlay_label,
        };

        // Only replace an overlay that is still exactly the previous segment cue.
        // Host, guest, or manually edited custom graphics remain producer-owned.
        if (!sameGraphic(liveGraphic, previousCue)) return;

        syncingRef.current = true;
        try {
          await creapdApi.post('/production/core', {
            action: 'obs_command_enqueue',
            bridge_id: bridge.id,
            command_type: 'show_lower_third',
            payload: {
              title: cue.title,
              subtitle: cue.subtitle,
              label: cue.label,
              position: clean(capabilities.overlay_position) || 'bottom_left',
            },
          });
        } finally {
          window.setTimeout(() => {
            syncingRef.current = false;
          }, 1400);
        }
      } catch (error) {
        console.error('CREAPD automatic graphic sync failed', error);
      } finally {
        checkingRef.current = false;
      }
    };

    check();
    const timer = window.setInterval(check, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [configId]);

  return null;
}

export default function TalkAutoGraphicSync() {
  const location = useLocation();
  if (location.pathname !== '/talk/live') return null;
  const configId = new URLSearchParams(location.search).get('config_id') || '';
  return <TalkAutoGraphicSyncLive configId={configId} />;
}
