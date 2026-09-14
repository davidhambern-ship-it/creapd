import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clapperboard, Loader2, Save, X, Zap } from 'lucide-react';
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

function TalkObsSceneCueControlLive() {
  const configId = useMemo(
    () => new URLSearchParams(window.location.search).get('config_id') || '',
    [],
  );
  const autoTakeKey = `creapd.obsAutoTake.${configId || 'talk'}`;

  const [target, setTarget] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bridge, setBridge] = useState(null);
  const [production, setProduction] = useState(null);
  const [mappings, setMappings] = useState({});
  const [busy, setBusy] = useState('');
  const [pendingScene, setPendingScene] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [autoTake, setAutoTake] = useState(() => {
    try { return window.localStorage.getItem(autoTakeKey) === 'true'; } catch { return false; }
  });
  const dirtyRef = useRef(new Set());
  const previousSegmentIdRef = useRef(null);
  const autoTakeInFlightRef = useRef(false);

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

    locate();
    observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  const loadState = useCallback(async () => {
    try {
      const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
      const [bridgeResult, talkResult] = await Promise.all([
        creapdApi.post('/production/core', { action: 'obs_bridge_get' }),
        creapdApi.get(`/production/core?studio=talk${suffix}`),
      ]);

      const nextBridge = bridgeResult?.bridge || null;
      const nextProduction = talkResult || null;
      setBridge(nextBridge);
      setProduction(nextProduction);
      setMappings(current => {
        const next = { ...current };
        for (const segment of nextProduction?.segments || []) {
          if (!dirtyRef.current.has(segment.id)) next[segment.id] = segment.obs_scene || '';
        }
        return next;
      });
      if (pendingScene && nextBridge?.current_scene === pendingScene) setPendingScene('');
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not load the OBS scene cues.'));
    }
  }, [configId, pendingScene]);

  useEffect(() => {
    loadState();
    const timer = window.setInterval(loadState, 1800);
    return () => window.clearInterval(timer);
  }, [loadState]);

  const segments = Array.isArray(production?.segments) ? production.segments : [];
  const currentSegment = useMemo(() => activeSegmentFor(production), [production]);
  const currentCue = String(currentSegment?.obs_scene || '').trim();
  const scenes = Array.isArray(bridge?.scenes) ? bridge.scenes : [];
  const currentScene = String(bridge?.current_scene || '').trim();
  const connected = Boolean(bridge?.connected);
  const cueReady = Boolean(currentCue && connected);
  const cueIsProgram = Boolean(currentCue && currentScene === currentCue);
  const dirtyCount = dirtyRef.current.size;

  const enqueueScene = useCallback(async sceneName => {
    if (!bridge?.id) throw new Error('Connect OBS before taking a cued scene.');
    if (!sceneName) throw new Error('This segment does not have an OBS scene mapped yet.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: 'set_scene',
      payload: { scene_name: sceneName },
    });
  }, [bridge?.id]);

  const takeCue = async () => {
    if (!cueReady || busy) return;
    setBusy('take');
    setError('');
    setNotice('');
    try {
      await enqueueScene(currentCue);
      setPendingScene(currentCue);
      setNotice(`Scene queued: ${currentCue}`);
      window.setTimeout(loadState, 700);
      window.setTimeout(loadState, 1600);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not take the cued OBS scene.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1200);
    }
  };

  const changeMapping = (segmentId, value) => {
    dirtyRef.current.add(segmentId);
    setMappings(current => ({ ...current, [segmentId]: value }));
    setNotice('');
  };

  const saveMappings = async () => {
    const dirtyIds = Array.from(dirtyRef.current);
    if (!dirtyIds.length || busy) return;
    setBusy('save');
    setError('');
    setNotice('');
    try {
      for (const segmentId of dirtyIds) {
        await creapdApi.post('/production/core', {
          action: 'obs_segment_scene_save',
          configuration_id: configId || production?.configuration?.id,
          segment_id: segmentId,
          scene_name: mappings[segmentId] || null,
        });
      }
      dirtyRef.current.clear();
      setNotice(`${dirtyIds.length} scene mapping${dirtyIds.length === 1 ? '' : 's'} saved.`);
      await loadState();
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not save the rundown scene map.'));
    } finally {
      setBusy('');
    }
  };

  const toggleAutoTake = value => {
    setAutoTake(value);
    previousSegmentIdRef.current = currentSegment?.id || null;
    try { window.localStorage.setItem(autoTakeKey, String(value)); } catch {}
    setNotice(value
      ? 'Auto Take armed. CREAPD will switch to the mapped scene on the next segment change.'
      : 'Auto Take is off. Segment changes only cue scenes.');
  };

  useEffect(() => {
    const segmentId = currentSegment?.id || null;
    const previousId = previousSegmentIdRef.current;

    if (previousId === null) {
      previousSegmentIdRef.current = segmentId;
      return;
    }
    if (!segmentId || segmentId === previousId) return;

    previousSegmentIdRef.current = segmentId;
    if (!autoTake || !connected || !currentCue || currentCue === currentScene || autoTakeInFlightRef.current) return;

    autoTakeInFlightRef.current = true;
    setNotice(`Auto Take queued: ${currentCue}`);
    enqueueScene(currentCue)
      .then(() => {
        setPendingScene(currentCue);
        window.setTimeout(loadState, 700);
        window.setTimeout(loadState, 1600);
      })
      .catch(err => setError(cleanError(err, 'Auto Take could not switch the OBS scene.')))
      .finally(() => {
        window.setTimeout(() => { autoTakeInFlightRef.current = false; }, 1200);
      });
  }, [autoTake, connected, currentCue, currentScene, currentSegment?.id, enqueueScene, loadState]);

  if (!target) return null;

  return createPortal(
    <>
      <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10">
        <Button
          size="sm"
          variant="outline"
          className={`h-8 px-2.5 ${cueReady && !cueIsProgram ? 'border-amber-400/35 bg-amber-500/10 text-amber-100' : cueIsProgram ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100' : ''}`}
          onClick={() => setPanelOpen(open => !open)}
          title="Open segment-to-OBS scene cues"
        >
          <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
          {currentCue ? `Cue: ${currentCue}` : 'Scene Cue'}
        </Button>
        {cueReady && !cueIsProgram && (
          <Button size="sm" className="h-8 px-2.5" onClick={takeCue} disabled={Boolean(busy)}>
            {busy === 'take' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            Take Cue
          </Button>
        )}
      </div>

      {panelOpen && (
        <div className="fixed top-[70px] right-4 md:right-6 z-[102] w-[min(560px,calc(100vw-2rem))] max-h-[calc(100vh-86px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#090b10]/95 backdrop-blur-xl shadow-2xl text-left">
          <div className="sticky top-0 z-10 px-4 py-3 border-b border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-cyan-300" />
                <p className="font-heading font-semibold">Rundown Scene Cues</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Map Talk segments to real OBS Program scenes</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10"
              aria-label="Close scene cues"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className={`rounded-xl border p-3 ${cueIsProgram ? 'border-emerald-500/25 bg-emerald-500/[0.07]' : currentCue ? 'border-amber-500/25 bg-amber-500/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current segment cue</p>
              <p className="font-semibold mt-1">{currentSegment?.title || 'No active segment'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1">
                  Cued: <span className="text-white">{currentCue || 'Not mapped'}</span>
                </span>
                <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1">
                  Program: <span className="text-white">{currentScene || 'Unknown'}</span>
                </span>
                {cueIsProgram && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> Cue is live</span>}
              </div>
              {cueReady && !cueIsProgram && (
                <Button className="mt-3" size="sm" onClick={takeCue} disabled={Boolean(busy)}>
                  {busy === 'take' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                  Take Cued Scene
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold">Auto Take on segment change</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  OFF by default. When armed, CREAPD takes the mapped scene only when you move to a different rundown segment.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoTake}
                  onChange={event => toggleAutoTake(event.target.checked)}
                />
                <span className="w-10 h-5 rounded-full bg-white/15 peer-checked:bg-cyan-500/70 transition-colors" />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </label>
            </div>

            {!connected && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs text-amber-100">
                Connect the CREAPD OBS bridge to load the live OBS scene list and take cues. Existing mappings remain stored in the rundown.
              </div>
            )}

            <div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-semibold">Rundown Scene Map</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Choose which OBS scene belongs to each segment. “No mapping” leaves that segment manual.</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{segments.length} segments</span>
              </div>

              <div className="space-y-2">
                {segments.map((segment, index) => {
                  const isCurrent = segment.id === currentSegment?.id;
                  return (
                    <div key={segment.id} className={`rounded-lg border p-2.5 ${isCurrent ? 'border-cyan-500/30 bg-cyan-500/[0.06]' : 'border-white/10 bg-white/[0.025]'}`}>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Segment {index + 1}{isCurrent ? ' · CURRENT' : ''}</p>
                          <p className="text-sm font-medium truncate mt-0.5">{segment.title || `Segment ${index + 1}`}</p>
                        </div>
                        <select
                          value={mappings[segment.id] ?? segment.obs_scene ?? ''}
                          onChange={event => changeMapping(segment.id, event.target.value)}
                          disabled={!connected || Boolean(busy)}
                          className="w-[190px] max-w-[44%] h-9 rounded-md border border-white/10 bg-black/60 px-2.5 text-xs text-white"
                        >
                          <option value="">No mapping</option>
                          {scenes.map(scene => <option key={scene} value={scene}>{scene}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
                {!segments.length && <p className="text-xs text-muted-foreground py-3">No rundown segments are available yet.</p>}
              </div>
            </div>

            {notice && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">{notice}</div>}
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}

            <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 border-t border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                {dirtyCount ? `${dirtyCount} unsaved mapping${dirtyCount === 1 ? '' : 's'}` : 'Mappings are stored with the Talk rundown.'}
              </p>
              <Button onClick={saveMappings} disabled={!dirtyCount || Boolean(busy)}>
                {busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Scene Map
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    target,
  );
}

export default function TalkObsSceneCueControl() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkObsSceneCueControlLive />;
}
