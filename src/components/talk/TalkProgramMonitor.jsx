import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  CheckCircle2,
  Loader2,
  MonitorPlay,
  Move,
  RefreshCw,
  Square,
  Video,
} from 'lucide-react';
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

function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function alignmentMeta(alignment) {
  const value = Number(alignment || 0);
  const horizontal = (value & 4) ? 'left' : (value & 8) ? 'right' : 'center';
  const vertical = (value & 1) ? 'top' : (value & 2) ? 'bottom' : 'center';
  return { horizontal, vertical };
}

function anchorAdjustedPosition(transform) {
  const width = Math.max(1, numberOr(transform?.width, 1));
  const height = Math.max(1, numberOr(transform?.height, 1));
  let x = numberOr(transform?.position_x, 0);
  let y = numberOr(transform?.position_y, 0);
  const alignment = alignmentMeta(transform?.alignment);

  if (alignment.horizontal === 'center') x -= width / 2;
  else if (alignment.horizontal === 'right') x -= width;

  if (alignment.vertical === 'center') y -= height / 2;
  else if (alignment.vertical === 'bottom') y -= height;

  return { x, y, width, height, alignment };
}

function anchorPositionFromTopLeft(transform, left, top, width, height) {
  const alignment = alignmentMeta(transform?.alignment);
  let x = left;
  let y = top;

  if (alignment.horizontal === 'center') x += width / 2;
  else if (alignment.horizontal === 'right') x += width;

  if (alignment.vertical === 'center') y += height / 2;
  else if (alignment.vertical === 'bottom') y += height;

  return { x, y };
}

function transformOrigin(transform) {
  const alignment = alignmentMeta(transform?.alignment);
  const horizontal = alignment.horizontal === 'left' ? '0%' : alignment.horizontal === 'right' ? '100%' : '50%';
  const vertical = alignment.vertical === 'top' ? '0%' : alignment.vertical === 'bottom' ? '100%' : '50%';
  return `${horizontal} ${vertical}`;
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
  const [layoutError, setLayoutError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [draftTransforms, setDraftTransforms] = useState({});
  const [monitorRevision, setMonitorRevision] = useState(0);
  const videoRef = useRef(null);
  const editorRef = useRef(null);
  const streamRef = useRef(null);
  const dragRef = useRef(null);

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
    const timer = window.setInterval(loadBridge, editMode ? 900 : 2500);
    return () => window.clearInterval(timer);
  }, [editMode, loadBridge]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    if (previewState !== 'live') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.play().catch(err => {
      console.warn('[CREAPD Live] Program Monitor autoplay was blocked:', err);
    });
  }, [previewState]);

  useEffect(() => {
    const update = () => setMonitorRevision(value => value + 1);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

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
    setEditMode(false);
  };

  const obsConnected = Boolean(bridge?.connected);
  const obsScene = bridge?.current_scene || null;
  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : {};
  const directLayoutSupported = capabilities.direct_layout_editor === true;
  const sceneSources = useMemo(
    () => Array.isArray(capabilities.scene_sources) ? capabilities.scene_sources : [],
    [capabilities.scene_sources],
  );
  const visualSources = useMemo(
    () => sceneSources
      .filter(source => source?.enabled && source?.transform && numberOr(source?.transform?.width) > 0 && numberOr(source?.transform?.height) > 0)
      .filter(source => !/audio/i.test(String(source?.kind || '')))
      .sort((left, right) => numberOr(left.index) - numberOr(right.index)),
    [sceneSources],
  );
  const selectedDevice = useMemo(
    () => devices.find(device => device.deviceId === selectedDeviceId) || null,
    [devices, selectedDeviceId],
  );

  const enqueue = useCallback(async (commandType, payload = {}) => {
    if (!bridge?.id) throw new Error('Connect the CREAPD OBS bridge first.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload,
    });
  }, [bridge?.id]);

  const setLayoutEditing = async enabled => {
    if (!directLayoutSupported) return;
    setEditMode(enabled);
    setLayoutError('');
    if (!enabled) {
      setSelectedSourceName('');
      setDraftTransforms({});
    }
    try {
      await enqueue('set_direct_edit_mode', { enabled });
      window.setTimeout(loadBridge, 800);
      window.setTimeout(loadBridge, 1800);
    } catch (err) {
      setLayoutError(err?.message || 'CREAPD could not change layout edit mode.');
      setEditMode(false);
    }
  };

  useEffect(() => () => {
    if (editMode && bridge?.id) {
      creapdApi.post('/production/core', {
        action: 'obs_command_enqueue',
        bridge_id: bridge.id,
        command_type: 'set_direct_edit_mode',
        payload: { enabled: false },
      }).catch(() => {});
    }
  }, [bridge?.id, editMode]);

  const programGeometry = useCallback(() => {
    const editor = editorRef.current;
    const video = videoRef.current;
    if (!editor || !video) return null;

    const rect = editor.getBoundingClientRect();
    const canvasWidth = Math.max(1, numberOr(capabilities.canvas_width, video.videoWidth || 1920));
    const canvasHeight = Math.max(1, numberOr(capabilities.canvas_height, video.videoHeight || 1080));
    const sourceRatio = canvasWidth / canvasHeight;
    const boxRatio = rect.width / Math.max(1, rect.height);

    let width;
    let height;
    let left;
    let top;

    if (boxRatio > sourceRatio) {
      height = rect.height;
      width = height * sourceRatio;
      left = (rect.width - width) / 2;
      top = 0;
    } else {
      width = rect.width;
      height = width / sourceRatio;
      left = 0;
      top = (rect.height - height) / 2;
    }

    return {
      rect,
      canvasWidth,
      canvasHeight,
      left,
      top,
      width,
      height,
      scaleX: width / canvasWidth,
      scaleY: height / canvasHeight,
    };
  }, [capabilities.canvas_height, capabilities.canvas_width, monitorRevision]);

  const sourceDisplayBox = useCallback(source => {
    const geometry = programGeometry();
    if (!geometry || !source?.transform) return null;

    const draft = draftTransforms[source.name] || {};
    const transform = {
      ...source.transform,
      ...draft,
    };
    const adjusted = anchorAdjustedPosition(transform);

    return {
      geometry,
      transform,
      left: geometry.left + adjusted.x * geometry.scaleX,
      top: geometry.top + adjusted.y * geometry.scaleY,
      width: Math.max(8, adjusted.width * geometry.scaleX),
      height: Math.max(8, adjusted.height * geometry.scaleY),
    };
  }, [draftTransforms, programGeometry]);

  const queueTransform = useCallback(async (source, patch) => {
    if (!source?.name) return;
    await enqueue('set_source_transform', {
      scene_name: obsScene,
      source_name: source.name,
      ...patch,
    });
  }, [enqueue, obsScene]);

  const beginDrag = (event, source, mode = 'move') => {
    if (!editMode || !source?.transform) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedSourceName(source.name);

    const box = sourceDisplayBox(source);
    if (!box) return;
    const adjusted = anchorAdjustedPosition(box.transform);

    dragRef.current = {
      pointerId: event.pointerId,
      source,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: adjusted.x,
      startTop: adjusted.y,
      startWidth: adjusted.width,
      startHeight: adjusted.height,
      startScaleX: numberOr(box.transform.scale_x, 1),
      startScaleY: numberOr(box.transform.scale_y, 1),
      lastQueuedAt: 0,
    };
  };

  const updateDrag = event => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const geometry = programGeometry();
    if (!geometry) return;

    const dx = (event.clientX - drag.startClientX) / geometry.scaleX;
    const dy = (event.clientY - drag.startClientY) / geometry.scaleY;
    const source = drag.source;

    if (drag.mode === 'resize') {
      const factorX = Math.max(0.05, (drag.startWidth + dx) / Math.max(1, drag.startWidth));
      const factorY = Math.max(0.05, (drag.startHeight + dy) / Math.max(1, drag.startHeight));
      const factor = Math.max(0.05, Math.max(factorX, factorY));
      const scaleX = drag.startScaleX * factor;
      const scaleY = drag.startScaleY * factor;
      setDraftTransforms(current => ({
        ...current,
        [source.name]: {
          ...(current[source.name] || {}),
          scale_x: scaleX,
          scale_y: scaleY,
          width: drag.startWidth * factor,
          height: drag.startHeight * factor,
        },
      }));
      return;
    }

    const nextLeft = drag.startLeft + dx;
    const nextTop = drag.startTop + dy;
    const anchor = anchorPositionFromTopLeft(source.transform, nextLeft, nextTop, drag.startWidth, drag.startHeight);

    setDraftTransforms(current => ({
      ...current,
      [source.name]: {
        ...(current[source.name] || {}),
        position_x: anchor.x,
        position_y: anchor.y,
      },
    }));

    const now = performance.now();
    if (capabilities.direct_edit_mode === true && now - drag.lastQueuedAt >= 500) {
      drag.lastQueuedAt = now;
      queueTransform(source, { x: anchor.x, y: anchor.y }).catch(() => {});
    }
  };

  const endDrag = async event => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;

    const draft = draftTransforms[drag.source.name];
    if (!draft) return;

    try {
      if (drag.mode === 'resize') {
        await queueTransform(drag.source, {
          scale_x: numberOr(draft.scale_x, drag.startScaleX),
          scale_y: numberOr(draft.scale_y, drag.startScaleY),
        });
      } else {
        await queueTransform(drag.source, {
          x: numberOr(draft.position_x, drag.source.transform.position_x),
          y: numberOr(draft.position_y, drag.source.transform.position_y),
        });
      }
      window.setTimeout(loadBridge, 700);
      window.setTimeout(loadBridge, 1600);
      window.setTimeout(() => {
        setDraftTransforms(current => {
          const next = { ...current };
          delete next[drag.source.name];
          return next;
        });
      }, 2600);
    } catch (err) {
      setLayoutError(err?.message || 'CREAPD could not update the source placement.');
    }
  };

  if (!target) return null;

  return createPortal(
    <div className="absolute inset-0 z-10 bg-black flex flex-col">
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 text-xs text-white/70 rounded-md bg-black/55 border border-white/10 px-2.5 py-1.5 backdrop-blur-sm">
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
            onLoadedMetadata={() => setMonitorRevision(value => value + 1)}
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />

          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            {directLayoutSupported ? (
              <button
                type="button"
                onClick={() => setLayoutEditing(!editMode)}
                className={`h-8 rounded-md border px-2.5 text-[11px] font-semibold backdrop-blur-sm flex items-center gap-1.5 ${editMode ? 'border-cyan-400/45 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-black/65 text-white/75'}`}
              >
                <Move className="w-3.5 h-3.5" />
                {editMode ? 'Done Editing' : 'Edit Layout'}
              </button>
            ) : (
              <a
                href="/creapd-obs-bridge.ps1"
                download
                className="h-8 rounded-md border border-amber-400/30 bg-black/70 px-2.5 text-[11px] font-semibold text-amber-100 backdrop-blur-sm flex items-center"
              >
                Update Bridge for Drag Editing
              </a>
            )}
            <div className="flex items-center gap-2 text-[11px] text-emerald-200 rounded-md bg-black/65 border border-emerald-500/25 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              LOCAL PROGRAM FEED
            </div>
          </div>

          {editMode && (
            <div
              ref={editorRef}
              className="absolute inset-0 z-20 touch-none select-none"
              onPointerMove={updateDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={event => {
                if (event.target === event.currentTarget) setSelectedSourceName('');
              }}
            >
              {visualSources.map(source => {
                const box = sourceDisplayBox(source);
                if (!box) return null;
                const selected = selectedSourceName === source.name;
                return (
                  <div
                    key={source.id || source.name}
                    role="button"
                    tabIndex={0}
                    title={source.name}
                    onPointerDown={event => beginDrag(event, source, 'move')}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedSourceName(source.name);
                    }}
                    style={{
                      position: 'absolute',
                      left: box.left,
                      top: box.top,
                      width: box.width,
                      height: box.height,
                      transform: `rotate(${numberOr(box.transform.rotation, 0)}deg)`,
                      transformOrigin: transformOrigin(box.transform),
                      zIndex: 100 + numberOr(source.index),
                    }}
                    className={`cursor-move border-2 ${selected ? 'border-cyan-300 bg-cyan-400/[0.06]' : 'border-white/30 hover:border-white/60'}`}
                  >
                    <div className={`absolute -top-7 left-0 max-w-[220px] truncate rounded px-2 py-1 text-[10px] font-semibold ${selected ? 'bg-cyan-400 text-black' : 'bg-black/80 text-white'}`}>
                      {source.name}
                    </div>
                    {selected && (
                      <button
                        type="button"
                        aria-label={'Resize ' + source.name}
                        title="Drag to resize"
                        onPointerDown={event => beginDrag(event, source, 'resize')}
                        className="absolute -bottom-2.5 -right-2.5 h-5 w-5 rounded-sm border-2 border-black bg-cyan-300 cursor-nwse-resize"
                      />
                    )}
                  </div>
                );
              })}

              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-lg border border-cyan-400/25 bg-black/75 px-3 py-2 text-[11px] text-white/80 backdrop-blur-sm pointer-events-none">
                Click a source, drag it where you want it, or drag the corner to resize.
              </div>
            </div>
          )}

          {layoutError && (
            <div className="absolute top-14 right-3 z-30 max-w-sm rounded-lg border border-red-500/25 bg-black/80 px-3 py-2 text-[11px] text-red-100 backdrop-blur-sm">
              {layoutError}
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2">
            <div className="rounded-md bg-black/65 border border-white/10 px-2.5 py-1.5 text-[11px] text-white/75 backdrop-blur-sm">
              {selectedDevice?.label || 'OBS Virtual Camera'}{obsScene ? ` · ${obsScene}` : ''}
              {editMode && selectedSourceName ? ` · Editing: ${selectedSourceName}` : ''}
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
  const path = window.location.pathname;
  if (path !== '/talk/live' && path !== '/music/live') return null;
  return <TalkProgramMonitorLive />;
}
