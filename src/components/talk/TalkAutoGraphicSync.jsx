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

function TalkAutoGraphicSyncLive({ configId }) {
  const syncedSegmentIdRef = useRef(null);
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
      if (cancelled || checkingRef.current || syncingRef.current) return;
      checkingRef.current = true;

      try {
        const { bridge, production } = await readState();
        if (cancelled) return;

        const cue = buildSegmentGraphicCue(production);
        const segmentId = cue?.segmentId || null;

        if (!automationEnabled() || !segmentId || !cue?.title) return;
        if (segmentId === syncedSegmentIdRef.current) return;
        if (!bridge?.connected || !bridge?.id) return;

        const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
          ? bridge.capabilities
          : {};
        if (capabilities.overlay_control !== true) return;

        // AUTO owns rundown graphic transitions. A producer can still put a Host,
        // Guest, or Custom graphic on-air during the current segment; CREAPD does
        // not fight that manual choice mid-segment. When the rundown advances,
        // however, AUTO restores the new segment/topic cue automatically.
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
          syncedSegmentIdRef.current = segmentId;
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
