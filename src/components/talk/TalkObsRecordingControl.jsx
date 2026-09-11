import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Loader2, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

function findHeaderControlTarget() {
  const header = document.querySelector('header');
  if (!header) return null;

  const statuses = new Set(['● ON AIR', 'PAUSED', 'SHOW ENDED', 'READY']);
  const status = Array.from(header.querySelectorAll('span'))
    .find(node => statuses.has(node.textContent?.trim()));

  return status?.parentElement || null;
}

function cleanError(err, fallback) {
  return err?.data?.diagnostic?.message
    || err?.data?.error
    || err?.message
    || fallback;
}

function TalkObsRecordingControlLive() {
  const [target, setTarget] = useState(null);
  const [bridge, setBridge] = useState(undefined);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let observer;

    const locate = () => {
      const next = findHeaderControlTarget();
      if (!cancelled && next) {
        setTarget(next);
        return true;
      }
      return false;
    };

    if (!locate()) {
      observer = new MutationObserver(() => {
        if (locate()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  const loadBridge = useCallback(async () => {
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'obs_bridge_get',
      });
      setBridge(result?.bridge || null);
    } catch {
      setBridge(null);
    }
  }, []);

  useEffect(() => {
    loadBridge();
    const timer = window.setInterval(loadBridge, 1500);
    return () => window.clearInterval(timer);
  }, [loadBridge]);

  const enqueue = useCallback(async commandType => {
    if (!bridge?.id) throw new Error('Connect the CREAPD OBS bridge before controlling recording.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload: {},
    });
  }, [bridge?.id]);

  const runRecordingCommand = async (label, commandType) => {
    if (busy) return;
    setBusy(label);
    setError('');
    try {
      await enqueue(commandType);
      window.setTimeout(loadBridge, 700);
      window.setTimeout(loadBridge, 1600);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not send the recording command to OBS.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1800);
    }
  };

  if (!target) return null;

  const connected = Boolean(bridge?.connected);
  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
    ? bridge.capabilities
    : {};
  const recordingActive = Boolean(capabilities.recording_active);
  const recordingPaused = Boolean(capabilities.recording_paused);
  const recordingTimecode = String(capabilities.recording_timecode || '').trim();
  const supportsRecording = capabilities.recording_control === true;

  const stateLabel = bridge === undefined
    ? 'OBS…'
    : !connected
      ? 'REC unavailable'
      : !supportsRecording
        ? 'Bridge update required'
        : recordingActive
          ? recordingPaused
            ? 'REC paused'
            : 'REC'
          : 'REC ready';

  return createPortal(
    <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10" title={error || 'OBS recording controls'}>
      <span className={`hidden 2xl:inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${
        error
          ? 'border-red-500/40 bg-red-500/10 text-red-200'
          : recordingActive
            ? recordingPaused
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              : 'border-red-500/35 bg-red-500/10 text-red-200'
            : 'border-white/10 bg-white/5 text-muted-foreground'
      }`}>
        {recordingActive && (
          <span className={`h-2 w-2 rounded-full ${recordingPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
        )}
        {error ? 'REC ERROR' : stateLabel}
        {!error && recordingActive && recordingTimecode ? ` · ${recordingTimecode}` : ''}
      </span>

      {!recordingActive ? (
        <Button
          size="sm"
          variant="destructive"
          className="h-8 px-2.5"
          onClick={() => runRecordingCommand('start-recording', 'start_recording')}
          disabled={!connected || !supportsRecording || Boolean(busy)}
          title={!connected ? 'Connect OBS to record' : !supportsRecording ? 'Restart with the updated CREAPD OBS Bridge' : 'Start OBS recording'}
        >
          {busy === 'start-recording'
            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            : <Circle className="w-3.5 h-3.5 mr-1.5 fill-current" />}
          Record
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            onClick={() => runRecordingCommand(
              recordingPaused ? 'resume-recording' : 'pause-recording',
              recordingPaused ? 'resume_recording' : 'pause_recording',
            )}
            disabled={!connected || !supportsRecording || Boolean(busy)}
          >
            {busy === 'pause-recording' || busy === 'resume-recording'
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : recordingPaused
                ? <Play className="w-3.5 h-3.5 mr-1.5" />
                : <Pause className="w-3.5 h-3.5 mr-1.5" />}
            {recordingPaused ? 'Resume REC' : 'Pause REC'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-2.5"
            onClick={() => runRecordingCommand('stop-recording', 'stop_recording')}
            disabled={!connected || !supportsRecording || Boolean(busy)}
          >
            {busy === 'stop-recording'
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />}
            Stop REC
          </Button>
        </>
      )}
    </div>,
    target,
  );
}

export default function TalkObsRecordingControl() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkObsRecordingControlLive />;
}
