import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, Loader2, MonitorPlay, RefreshCw, Square, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

const SAVED_DEVICE_KEY = 'creapd.obsProgramDeviceId';

function findProgramMonitorTarget() {
  const labels = Array.from(document.querySelectorAll('div'));
  const label = labels.find(node => node.textContent?.trim() === 'PROGRAM MONITOR');
  return label?.parentElement || null;
}

function isObsVirtualCamera(device) {
  return /obs.*virtual|virtual.*obs/i.test(String(device?.label || ''));
}

function mediaErrorMessage(error) {
  const name = String(error?.name || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Chrome blocked camera access. Allow camera permission for CREAPD, then try again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'OBS Virtual Camera is installed but its video feed is not available. In OBS, click Start Virtual Camera, then retry.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No usable video device was found. Start OBS Virtual Camera, then retry.';
  }
  return error?.message || 'CREAPD could not open the local OBS program feed.';
}

function TalkProgramMonitorLive() {
  const [target, setTarget] = useState(null);
  const [bridge, setBridge] = useState(undefined);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
    try { return window.localStorage.getItem(SAVED_DEVICE_KEY) || ''; } catch { return ''; }
  });
  const [previewState, setPreviewState] = useState('idle');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let observer;

    const locate = () => {
      const next = findProgramMonitorTarget();
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
      const result = await creapdApi.post('/production/core', { action: 'obs_bridge_get' });
      setBridge(result?.bridge || null);
    } catch {
      setBridge(null);
    }
  }, []);

  useEffect(() => {
    loadBridge();
    const timer = window.setInterval(loadBridge, 2500);
    return () => window.clearInterval(timer);
  }, [loadBridge]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const all = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = all.filter(device => device.kind === 'videoinput');
    setDevices(videoDevices);
    return videoDevices;
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return undefined;
    const handleDeviceChange = () => { refreshDevices().catch(() => {}); };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [refreshDevices]);

  const openDevice = useCallback(async deviceId => {
    stopStream();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    });

    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    const actualDeviceId = track?.getSettings?.().deviceId || deviceId || '';
    if (actualDeviceId) {
      setSelectedDeviceId(actualDeviceId);
      try { window.localStorage.setItem(SAVED_DEVICE_KEY, actualDeviceId); } catch {}
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
    setPreviewState('live');
    setError('');
    await refreshDevices();
  }, [refreshDevices, stopStream]);

  const startPreview = useCallback(async requestedDeviceId => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not expose local camera devices to CREAPD. Use current Chrome or Edge over HTTPS.');
      setPreviewState('error');
      return;
    }

    setPreviewState('requesting');
    setError('');

    try {
      let videoDevices = await refreshDevices();
      let device = requestedDeviceId
        ? videoDevices.find(item => item.deviceId === requestedDeviceId)
        : null;

      if (!device && selectedDeviceId) {
        device = videoDevices.find(item => item.deviceId === selectedDeviceId) || null;
      }
      if (!device) device = videoDevices.find(isObsVirtualCamera) || null;

      const labelsAvailable = videoDevices.some(item => item.label);
      if (!device && !labelsAvailable) {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        permissionStream.getTracks().forEach(track => track.stop());
        videoDevices = await refreshDevices();
        device = videoDevices.find(isObsVirtualCamera) || null;
      }

      if (!device) {
        setPreviewState('error');
        setError('OBS Virtual Camera was not found. In OBS click Start Virtual Camera, then press Retry Feed. You can also choose a video device below.');
        return;
      }

      await openDevice(device.deviceId);
    } catch (err) {
      setPreviewState('error');
      setError(mediaErrorMessage(err));
      await refreshDevices().catch(() => {});
    }
  }, [openDevice, refreshDevices, selectedDeviceId]);

  const stopPreview = () => {
    stopStream();
    setPreviewState('idle');
    setError('');
  };

  const obsConnected = Boolean(bridge?.connected);
  const obsScene = bridge?.current_scene || null;
  const selectedDevice = useMemo(
    () => devices.find(device => device.deviceId === selectedDeviceId) || null,
    [devices, selectedDeviceId],
  );

  if (!target) return null;

  return createPortal(
    <div className="absolute inset-0 z-10 bg-black flex flex-col">
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 text-xs text-white/70 rounded-md bg-black/55 border border-white/10 px-2.5 py-1.5 backdrop-blur-sm">
        <MonitorPlay className="w-4 h-4" />
        <span>PROGRAM MONITOR</span>
      </div>

      {previewState === 'live' ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 text-[11px] text-emerald-200 rounded-md bg-black/65 border border-emerald-500/25 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            LOCAL PROGRAM FEED
          </div>
          <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-md bg-black/65 border border-white/10 px-2.5 py-1.5 text-[11px] text-white/75 backdrop-blur-sm">
              {selectedDevice?.label || 'OBS Virtual Camera'}{obsScene ? ` · ${obsScene}` : ''}
            </div>
            <Button size="sm" variant="outline" onClick={stopPreview} className="bg-black/65 backdrop-blur-sm">
              <Square className="w-3.5 h-3.5 mr-1.5" /> Close Feed
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center px-6 py-14">
          <div className="w-full max-w-md text-center">
            {previewState === 'requesting' ? (
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            ) : obsConnected ? (
              <Video className="w-12 h-12 text-emerald-300/70 mx-auto mb-4" />
            ) : (
              <Camera className="w-12 h-12 text-white/25 mx-auto mb-4" />
            )}

            <p className="font-semibold">
              {previewState === 'requesting'
                ? 'Opening local OBS program feed…'
                : obsConnected
                  ? 'OBS control is connected — bring its picture into CREAPD'
                  : 'Connect OBS before opening the program picture'}
            </p>
            <p className="text-sm text-white/50 mt-2">
              CREAPD reads OBS Virtual Camera directly on this computer. Video is not uploaded to Vercel or Neon, and monitor audio stays muted to prevent echo.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 text-left">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => startPreview()}
                disabled={!obsConnected || previewState === 'requesting'}
              >
                {previewState === 'requesting'
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : previewState === 'error'
                    ? <RefreshCw className="w-4 h-4 mr-2" />
                    : <MonitorPlay className="w-4 h-4 mr-2" />}
                {previewState === 'error' ? 'Retry Feed' : 'Open Program Feed'}
              </Button>
            </div>

            {devices.length > 0 && previewState === 'error' && (
              <div className="mt-4 text-left">
                <label className="text-[10px] uppercase tracking-wider text-white/45">Video device</label>
                <select
                  value={selectedDeviceId}
                  onChange={event => {
                    const value = event.target.value;
                    setSelectedDeviceId(value);
                    if (value) startPreview(value);
                  }}
                  className="mt-1 w-full h-9 rounded-md border border-white/10 bg-black/60 px-2.5 text-xs text-white"
                >
                  <option value="">Choose a camera…</option>
                  {devices.map((device, index) => (
                    <option key={device.deviceId || index} value={device.deviceId}>
                      {device.label || `Video device ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
              {obsConnected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : null}
              {bridge === undefined
                ? 'Checking OBS bridge…'
                : obsConnected
                  ? `OBS connected${obsScene ? ` · ${obsScene}` : ''}`
                  : 'OBS control is not connected'}
            </div>
          </div>
        </div>
      )}
    </div>,
    target,
  );
}

export default function TalkProgramMonitor() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkProgramMonitorLive />;
}
