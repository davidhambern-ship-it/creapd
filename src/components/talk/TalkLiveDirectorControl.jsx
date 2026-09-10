import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clapperboard,
  Eraser,
  Layers3,
  Loader2,
  MapPin,
  MessageSquareText,
  Save,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

const POSITIONS = [
  { key: 'top_left', label: 'Top Left' },
  { key: 'top_center', label: 'Top Center' },
  { key: 'top_right', label: 'Top Right' },
  { key: 'bottom_left', label: 'Bottom Left' },
  { key: 'bottom_center', label: 'Bottom Center' },
  { key: 'bottom_right', label: 'Bottom Right' },
];

function clean(value) {
  return String(value ?? '').trim();
}

function cleanError(err, fallback) {
  return err?.data?.diagnostic?.message
    || err?.data?.error
    || err?.message
    || fallback;
}

function parseLowerThirdAsset(asset) {
  if (!asset?.content) return null;
  const raw = clean(asset.content);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        title: clean(parsed.title || parsed.name || parsed.headline),
        subtitle: clean(parsed.subtitle || parsed.role || parsed.context),
        label: clean(parsed.label || parsed.eyebrow),
        kind: clean(parsed.kind).toLowerCase(),
      };
    }
  } catch {
    // Older/manual assets may be line-separated text.
  }

  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return {
    title: lines[0].replace(/^title\s*:\s*/i, '').trim(),
    subtitle: (lines[1] || '').replace(/^(subtitle|role)\s*:\s*/i, '').trim(),
    label: (lines[2] || '').replace(/^(label|eyebrow)\s*:\s*/i, '').trim(),
    kind: '',
  };
}

function lowerThirdAssets(production) {
  return (Array.isArray(production?.assets) ? production.assets : [])
    .filter(asset => asset?.asset_type === 'lower_third' && asset?.status !== 'rejected');
}

function buildHostPreset(production) {
  const configuration = production?.configuration || {};
  const productionName = clean(configuration.production_name) || 'Talk Show';
  const hostName = clean(configuration.host_name) || productionName;
  const fallback = {
    title: hostName,
    subtitle: clean(configuration.host_name) ? `Host · ${productionName}` : clean(configuration.show_format),
    label: clean(configuration.station_name) || 'CREAPD LIVE',
  };
  const asset = lowerThirdAssets(production).find(candidate => {
    const parsed = parseLowerThirdAsset(candidate);
    return parsed?.kind === 'host'
      || clean(candidate?.title).toLowerCase().includes(hostName.toLowerCase());
  });
  const parsed = parseLowerThirdAsset(asset);
  return {
    title: parsed?.title || fallback.title,
    subtitle: parsed?.subtitle || fallback.subtitle,
    label: parsed?.label || fallback.label,
    source: parsed?.title ? 'Production asset' : 'Show setup',
    kind: 'host',
  };
}

function buildGuestPreset(guest, production) {
  const name = clean(guest?.guest_name) || 'Guest';
  const role = clean(guest?.title_role);
  const organization = clean(guest?.organization);
  const productionName = clean(production?.configuration?.production_name) || 'Talk Show';
  const fallbackSubtitle = [role, organization].filter(Boolean).join(' · ') || productionName;
  const asset = lowerThirdAssets(production).find(candidate => {
    const parsed = parseLowerThirdAsset(candidate);
    const candidateTitle = clean(candidate?.title).toLowerCase();
    return (parsed?.kind === 'guest' && parsed?.title?.toLowerCase() === name.toLowerCase())
      || candidateTitle.includes(name.toLowerCase());
  });
  const parsed = parseLowerThirdAsset(asset);
  return {
    title: parsed?.title || name,
    subtitle: parsed?.subtitle || fallbackSubtitle,
    label: parsed?.label || 'GUEST',
    source: parsed?.title ? 'Production asset' : 'Guest profile',
    kind: 'guest',
    guestId: guest?.id || name,
  };
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
        source: 'Rundown cue',
        kind: 'topic',
        segmentId: segment.id,
      }
    : {
        title: clean(segment.title) || productionName,
        subtitle: productionName,
        label: 'UP NOW',
        source: 'Rundown cue',
        kind: 'segment',
        segmentId: segment.id,
      };
}

function previewAnchor(position) {
  const base = { position: 'absolute' };
  if (position.includes('top')) base.top = '10px';
  else base.bottom = '10px';
  if (position.includes('left')) base.left = '10px';
  else if (position.includes('right')) base.right = '10px';
  else {
    base.left = '50%';
    base.transform = 'translateX(-50%)';
  }
  return base;
}

function TalkLiveDirectorControlLive() {
  const configId = useMemo(
    () => new URLSearchParams(window.location.search).get('config_id') || '',
    [],
  );
  const autoTakeKey = `creapd.obsAutoTake.${configId || 'talk'}`;

  const [target, setTarget] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState('graphics');
  const [bridge, setBridge] = useState(null);
  const [production, setProduction] = useState(null);
  const [mappings, setMappings] = useState({});
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('CREAPD LIVE');
  const [position, setPosition] = useState('bottom_left');
  const [mode, setMode] = useState('host');
  const [copySource, setCopySource] = useState('loading');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [manualScene, setManualScene] = useState('');
  const [busy, setBusy] = useState('');
  const [pendingScene, setPendingScene] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [autoTake, setAutoTake] = useState(() => {
    try { return window.localStorage.getItem(autoTakeKey) === 'true'; } catch { return false; }
  });

  const dirtyRef = useRef(new Set());
  const seededRef = useRef(false);
  const previousSegmentIdRef = useRef(null);
  const autoTakeInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let observer;
    const locate = () => {
      const next = document.getElementById('talk-live-header-controls');
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
      if (nextBridge?.current_scene && !manualScene) setManualScene(nextBridge.current_scene);
      if (pendingScene && nextBridge?.current_scene === pendingScene) setPendingScene('');
      setError('');
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not refresh Director Controls.'));
    }
  }, [configId, manualScene, pendingScene]);

  useEffect(() => {
    loadState();
    const timer = window.setInterval(loadState, 1500);
    return () => window.clearInterval(timer);
  }, [loadState]);

  const segments = Array.isArray(production?.segments) ? production.segments : [];
  const currentSegment = useMemo(() => activeSegmentFor(production), [production]);
  const currentCue = clean(currentSegment?.obs_scene);
  const segmentGraphicCue = useMemo(() => buildSegmentGraphicCue(production), [production]);
  const scenes = Array.isArray(bridge?.scenes) ? bridge.scenes : [];
  const currentScene = clean(bridge?.current_scene);
  const connected = Boolean(bridge?.connected);
  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : {};
  const supportsOverlay = capabilities.overlay_control === true;
  const supportsPosition = capabilities.overlay_position_control === true;
  const overlayVisible = Boolean(capabilities.overlay_visible);
  const liveTitle = clean(capabilities.overlay_title);
  const liveSubtitle = clean(capabilities.overlay_subtitle);
  const liveLabel = clean(capabilities.overlay_label);
  const livePosition = clean(capabilities.overlay_position) || 'bottom_left';
  const cueReady = Boolean(currentCue && connected);
  const cueIsProgram = Boolean(currentCue && currentScene === currentCue);
  const dirtyCount = dirtyRef.current.size;
  const hostPreset = useMemo(() => buildHostPreset(production), [production]);
  const guestPresets = useMemo(
    () => (Array.isArray(production?.guests) ? production.guests : [])
      .filter(guest => clean(guest?.guest_name))
      .map(guest => buildGuestPreset(guest, production)),
    [production],
  );

  const applyPreset = useCallback((preset, nextMode = null) => {
    if (!preset?.title) return;
    setTitle(preset.title);
    setSubtitle(preset.subtitle || '');
    setLabel(preset.label || 'CREAPD LIVE');
    setCopySource(preset.source || 'Production data');
    if (nextMode) setMode(nextMode);
    if (preset.kind === 'guest') setSelectedGuestId(preset.guestId || '');
  }, []);

  useEffect(() => {
    if (seededRef.current || !production?.configuration) return;
    applyPreset(hostPreset, 'host');
    seededRef.current = true;
  }, [applyPreset, hostPreset, production?.configuration]);

  const enqueue = useCallback(async (commandType, payload = {}) => {
    if (!bridge?.id) throw new Error('Connect the CREAPD OBS bridge first.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload,
    });
  }, [bridge?.id]);

  const takeScene = async sceneName => {
    if (!sceneName || !connected || busy) return;
    setBusy('scene');
    setError('');
    setNotice('');
    try {
      await enqueue('set_scene', { scene_name: sceneName });
      setPendingScene(sceneName);
      setNotice(`Scene queued: ${sceneName}`);
      window.setTimeout(loadState, 700);
      window.setTimeout(loadState, 1600);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not take the OBS scene.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1200);
    }
  };

  const showLowerThird = async () => {
    if (!title.trim() || busy) return;
    setBusy('graphic');
    setError('');
    setNotice('');
    try {
      await enqueue('show_lower_third', {
        title: title.trim(),
        subtitle: subtitle.trim(),
        label: label.trim() || 'CREAPD LIVE',
        position,
      });
      setNotice(overlayVisible ? 'Graphic update queued.' : 'Graphic queued for Program.');
      window.setTimeout(loadState, 700);
      window.setTimeout(loadState, 1700);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not show the lower third in OBS.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1800);
    }
  };

  const clearOverlay = async () => {
    if (busy) return;
    setBusy('clear');
    setError('');
    try {
      await enqueue('clear_overlay');
      setNotice('Graphic clear queued.');
      window.setTimeout(loadState, 700);
      window.setTimeout(loadState, 1700);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not clear the OBS overlay.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1800);
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
      ? 'Automation armed: timed rundown advance + mapped-scene Auto Take.'
      : 'Automation off: rundown and scene changes stay manual.');
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
    enqueue('set_scene', { scene_name: currentCue })
      .then(() => {
        setPendingScene(currentCue);
        window.setTimeout(loadState, 700);
        window.setTimeout(loadState, 1600);
      })
      .catch(err => setError(cleanError(err, 'Auto Take could not switch the OBS scene.')))
      .finally(() => {
        window.setTimeout(() => { autoTakeInFlightRef.current = false; }, 1200);
      });
  }, [autoTake, connected, currentCue, currentScene, currentSegment?.id, enqueue, loadState]);

  const chooseMode = nextMode => {
    setMode(nextMode);
    if (nextMode === 'host') applyPreset(hostPreset, 'host');
    else if (nextMode === 'topic' && segmentGraphicCue) applyPreset(segmentGraphicCue, 'topic');
    else if (nextMode === 'custom') setCopySource('Manual');
  };

  const chooseGuest = preset => {
    applyPreset(preset, 'guests');
    setSelectedGuestId(preset.guestId || '');
  };

  if (!target) return null;

  return createPortal(
    <>
      <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10">
        <Button
          size="sm"
          variant="outline"
          className={`h-8 px-2.5 ${overlayVisible || (cueReady && !cueIsProgram) ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100' : ''}`}
          onClick={() => setPanelOpen(open => !open)}
          title="Open unified CREAPD director controls"
        >
          <Clapperboard className="w-3.5 h-3.5 mr-1.5" />
          Director
          {autoTake && <span className="ml-1 text-[9px] text-emerald-300">AUTO</span>}
        </Button>
        {cueReady && !cueIsProgram && (
          <Button size="sm" className="h-8 px-2.5" onClick={() => takeScene(currentCue)} disabled={Boolean(busy)}>
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Take Cue
          </Button>
        )}
      </div>

      {panelOpen && (
        <div className="fixed top-[76px] right-4 md:right-6 z-[105] w-[min(760px,calc(100vw-2rem))] max-h-[calc(100vh-92px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#090b10]/97 backdrop-blur-xl shadow-2xl text-left">
          <div className="sticky top-0 z-20 bg-[#090b10]/97 border-b border-white/10">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clapperboard className="w-4 h-4 text-cyan-300" />
                  <p className="font-heading font-semibold">Director Controls</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">One live state for rundown, graphics, scenes, and OBS Program</p>
              </div>
              <button type="button" onClick={() => setPanelOpen(false)} className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" aria-label="Close director controls">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.15em] text-cyan-300">Current Segment</p>
                <p className="text-sm font-semibold truncate mt-0.5">{currentSegment?.title || 'No active segment'}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-1">Scene: {currentCue || 'not mapped'} · Program: {currentScene || 'unknown'}</p>
              </div>
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.15em] text-violet-300">Segment Graphic Cue</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{segmentGraphicCue?.title || 'No graphic cue'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{segmentGraphicCue?.subtitle || 'Current rundown data'}</p>
                  </div>
                  {segmentGraphicCue?.title && <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => { applyPreset(segmentGraphicCue, 'topic'); setTab('graphics'); }}>Load</Button>}
                </div>
              </div>
            </div>

            <div className="px-4 flex gap-2 border-t border-white/10 pt-2 pb-2">
              <button type="button" onClick={() => setTab('graphics')} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${tab === 'graphics' ? 'border-violet-400/40 bg-violet-500/12 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground'}`}>
                <Layers3 className="w-3.5 h-3.5 inline mr-1.5" /> Graphics
              </button>
              <button type="button" onClick={() => setTab('scenes')} className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${tab === 'scenes' ? 'border-cyan-400/40 bg-cyan-500/12 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground'}`}>
                <Clapperboard className="w-3.5 h-3.5 inline mr-1.5" /> Scenes & Automation
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {tab === 'graphics' && (
              <>
                {!connected || !supportsOverlay ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
                    <p className="font-semibold text-amber-200">{!connected ? 'Connect OBS first.' : 'Bridge update required.'}</p>
                    <p className="text-muted-foreground mt-1">CREAPD needs the graphics-capable local bridge before it can control the overlay.</p>
                  </div>
                ) : (
                  <>
                    {overlayVisible && (
                      <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-[0.15em] text-violet-300">Currently on Program</p>
                          <p className="font-semibold truncate mt-1">{liveTitle || 'Lower third'}</p>
                          {liveSubtitle && <p className="text-xs text-muted-foreground truncate">{liveSubtitle}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{liveLabel || 'CREAPD LIVE'} · {POSITIONS.find(item => item.key === livePosition)?.label || livePosition}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}>
                          {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5 mr-1.5" />} Clear
                        </Button>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Graphic Source</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[['host', User, 'Host'], ['guests', Users, 'Guests'], ['topic', MessageSquareText, 'Topic'], ['custom', Layers3, 'Custom']].map(([key, Icon, text]) => (
                          <button type="button" key={key} onClick={() => chooseMode(key)} className={`rounded-lg border px-2 py-2 text-xs ${mode === key ? 'border-violet-400/45 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'}`}>
                            <Icon className="w-3.5 h-3.5 mx-auto mb-1" />{text}
                          </button>
                        ))}
                      </div>
                    </div>

                    {mode === 'guests' && (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Choose Guest</p>
                        {guestPresets.length ? (
                          <div className="grid gap-2 max-h-36 overflow-y-auto pr-1">
                            {guestPresets.map(preset => (
                              <button type="button" key={preset.guestId} onClick={() => chooseGuest(preset)} className={`rounded-lg border p-2.5 text-left ${selectedGuestId === preset.guestId ? 'border-violet-400/45 bg-violet-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                                <p className="text-sm font-medium truncate">{preset.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{preset.subtitle}</p>
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-xs text-muted-foreground">No named guests are stored for this production yet.</p>}
                      </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium">Prepared Graphic</p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{copySource}</span>
                      </div>
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.14em] text-violet-200">Lower Third — Main Line</label>
                          <input value={title} onChange={event => { setTitle(event.target.value); setMode('custom'); setCopySource('Manual'); }} maxLength={120} placeholder="Name, headline, or topic" className="mt-1.5 h-10 w-full rounded-md border border-violet-400/25 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/60" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Second Line / Role</label>
                          <input value={subtitle} onChange={event => { setSubtitle(event.target.value); setMode('custom'); setCopySource('Manual'); }} maxLength={180} placeholder="Role, organization, or context" className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eyebrow Label</label>
                          <input value={label} onChange={event => { setLabel(event.target.value); setMode('custom'); setCopySource('Manual'); }} maxLength={40} placeholder="CREAPD LIVE" className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2"><MapPin className="w-3.5 h-3.5 text-violet-300" /><p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Position</p></div>
                      <div className="grid grid-cols-3 gap-2">
                        {POSITIONS.map(item => (
                          <button type="button" key={item.key} disabled={!supportsPosition} onClick={() => setPosition(item.key)} className={`rounded-lg border px-2 py-2 text-[11px] ${position === item.key ? 'border-violet-400/50 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground'} disabled:opacity-40`}>{item.label}</button>
                        ))}
                      </div>
                    </div>

                    <div className="relative h-32 overflow-hidden rounded-xl border border-white/10 bg-[#080910]">
                      <div className="absolute left-3 top-2 text-[9px] uppercase tracking-[0.16em] text-violet-300">On-air position preview</div>
                      <div style={previewAnchor(position)} className="max-w-[72%] flex items-stretch">
                        <div className="w-1.5 rounded-l-md bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                        <div className="min-w-0 rounded-r-md border border-l-0 border-white/10 bg-[#191622] px-3 py-2">
                          <p className="text-[8px] uppercase tracking-[0.16em] text-violet-200 truncate">{label.trim() || 'CREAPD LIVE'}</p>
                          <p className="text-xs font-semibold truncate mt-0.5">{title.trim() || 'Enter graphic copy'}</p>
                          {subtitle.trim() && <p className="text-[9px] text-muted-foreground truncate">{subtitle.trim()}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {overlayVisible && <Button variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}><Eraser className="w-4 h-4 mr-2" />Clear Graphic</Button>}
                      <Button onClick={showLowerThird} disabled={!title.trim() || Boolean(busy)}>{busy === 'graphic' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers3 className="w-4 h-4 mr-2" />}{overlayVisible ? 'Update Graphic' : 'Show Graphic'}</Button>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'scenes' && (
              <>
                <div className={`rounded-xl border p-3 ${cueIsProgram ? 'border-emerald-500/25 bg-emerald-500/[0.07]' : currentCue ? 'border-cyan-500/25 bg-cyan-500/[0.07]' : 'border-white/10 bg-white/[0.03]'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current Segment Scene</p>
                      <p className="font-semibold mt-1">{currentSegment?.title || 'No active segment'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Cued: {currentCue || 'Not mapped'} · Program: {currentScene || 'Unknown'}</p>
                    </div>
                    {cueReady && !cueIsProgram && <Button size="sm" onClick={() => takeScene(currentCue)} disabled={Boolean(busy)}><Zap className="w-3.5 h-3.5 mr-1.5" />Take Cued Scene</Button>}
                    {cueIsProgram && <span className="inline-flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> Cue is live</span>}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold">Timed Run + Auto Take</p>
                    <p className="text-[11px] text-muted-foreground mt-1">When armed, CREAPD advances timed segments and takes the next segment’s mapped OBS scene. Final End Show stays manual.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input type="checkbox" className="sr-only peer" checked={autoTake} onChange={event => toggleAutoTake(event.target.checked)} />
                    <span className="w-10 h-5 rounded-full bg-white/15 peer-checked:bg-cyan-500/70 transition-colors" />
                    <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Manual Program Scene</p>
                  <div className="flex gap-2">
                    <select value={manualScene} onChange={event => setManualScene(event.target.value)} disabled={!connected} className="min-w-0 flex-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white">
                      {scenes.length === 0 && <option value="">No scenes reported</option>}
                      {scenes.map(scene => <option key={scene} value={scene}>{scene}</option>)}
                    </select>
                    <Button onClick={() => takeScene(manualScene)} disabled={!manualScene || !connected || Boolean(busy)}>Take</Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between gap-3 mb-2">
                    <div>
                      <p className="text-xs font-semibold">Rundown Scene Map</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Every mapping is stored on the Talk rundown segment.</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{segments.length} segments</span>
                  </div>
                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                    {segments.map((segment, index) => {
                      const isCurrent = segment.id === currentSegment?.id;
                      return (
                        <div key={segment.id} className={`rounded-lg border p-2.5 ${isCurrent ? 'border-cyan-500/30 bg-cyan-500/[0.06]' : 'border-white/10 bg-white/[0.025]'}`}>
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Segment {index + 1}{isCurrent ? ' · CURRENT' : ''}</p>
                              <p className="text-sm font-medium truncate mt-0.5">{segment.title || `Segment ${index + 1}`}</p>
                            </div>
                            <select value={mappings[segment.id] ?? segment.obs_scene ?? ''} onChange={event => changeMapping(segment.id, event.target.value)} disabled={!connected || Boolean(busy)} className="w-[190px] max-w-[44%] h-9 rounded-md border border-white/10 bg-black/60 px-2.5 text-xs text-white">
                              <option value="">No mapping</option>
                              {scenes.map(scene => <option key={scene} value={scene}>{scene}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">{dirtyCount ? `${dirtyCount} unsaved mapping${dirtyCount === 1 ? '' : 's'}` : 'Scene map is synced with the current rundown.'}</p>
                  <Button onClick={saveMappings} disabled={!dirtyCount || Boolean(busy)}>{busy === 'save' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Scene Map</Button>
                </div>
              </>
            )}

            {notice && <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">{notice}</div>}
            {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
          </div>
        </div>
      )}
    </>,
    target,
  );
}

export default function TalkLiveDirectorControl() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkLiveDirectorControlLive />;
}
