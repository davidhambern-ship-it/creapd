import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, Loader2, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

function findShowControlTarget() {
  const labels = Array.from(document.querySelectorAll('p'));
  const label = labels.find(node => node.textContent?.trim() === 'Show Control');
  return label?.closest('section') || null;
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
      const next = findShowControlTarget();
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

  return createPortal(
    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">OBS Recording</span>
          {recordingActive ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${
              recordingPaused
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                : 'border-red-500/35 bg-red-500/10 text-red-200'
            }`}>
              <span className={`h-2 w-2 rounded-full ${recordingPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
              {recordingPaused ? 'RECORDING PAUSED' : 'REC'}
              {recordingTimecode ? ` · ${recordingTimecode}` : ''}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {bridge === undefined
                ? 'Checking OBS…'
                : !connected
                  ? 'Connect OBS to record'
                  : supportsRecording
                    ? 'Ready to record'
                    : 'Bridge update required'}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Recording is performed by OBS on this computer. CREAPD only sends the control command and reads recording status.
        </p>
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {!recordingActive ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => runRecordingCommand('start-recording', 'start_recording')}
            disabled={!connected || !supportsRecording || Boolean(busy)}
          >
            {busy === 'start-recording'
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Circle className="w-4 h-4 mr-2 fill-current" />}
            Start Recording
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runRecordingCommand(
                recordingPaused ? 'resume-recording' : 'pause-recording',
                recordingPaused ? 'resume_recording' : 'pause_recording',
              )}
              disabled={!connected || !supportsRecording || Boolean(busy)}
            >
              {busy === 'pause-recording' || busy === 'resume-recording'
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : recordingPaused
                  ? <Play className="w-4 h-4 mr-2" />
                  : <Pause className="w-4 h-4 mr-2" />}
              {recordingPaused ? 'Resume Recording' : 'Pause Recording'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runRecordingCommand('stop-recording', 'stop_recording')}
              disabled={!connected || !supportsRecording || Boolean(busy)}
            >
              {busy === 'stop-recording'
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Square className="w-4 h-4 mr-2 fill-current" />}
              Stop Recording
            </Button>
          </>
        )}
      </div>
    </div>,
    target,
  );
}

export default function TalkObsRecordingControl() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkObsRecordingControlLive />;
}
