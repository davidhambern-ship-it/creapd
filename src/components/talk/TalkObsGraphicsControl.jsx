import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eraser,
  Layers3,
  Loader2,
  MapPin,
  MessageSquareText,
  User,
  Users,
  X,
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

function findHeaderControlTarget() {
  const header = document.querySelector('header');
  if (!header) return null;

  const statuses = new Set(['● ON AIR', 'PAUSED', 'SHOW ENDED', 'READY']);
  const status = Array.from(header.querySelectorAll('span'))
    .find(node => statuses.has(node.textContent?.trim()));

  return status?.parentElement || null;
}

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
    // Older/manual assets can be simple line-separated text.
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

function activeLowerThirdAssets(production) {
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

  const asset = activeLowerThirdAssets(production).find(candidate => {
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

  const asset = activeLowerThirdAssets(production).find(candidate => {
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

function getCurrentSegment(production) {
  const segments = Array.isArray(production?.segments) ? production.segments : [];
  if (!segments.length) return null;
  const activeId = production?.session?.active_segment_id;
  return segments.find(segment => segment.id === activeId)
    || segments.find(segment => segment.runtime_status !== 'complete')
    || segments[0];
}

function buildSegmentCue(production) {
  const segment = getCurrentSegment(production);
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

function TalkObsGraphicsControlLive() {
  const [target, setTarget] = useState(null);
  const [bridge, setBridge] = useState(undefined);
  const [production, setProduction] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('CREAPD LIVE');
  const [position, setPosition] = useState('bottom_left');
  const [mode, setMode] = useState('host');
  const [copySource, setCopySource] = useState('loading');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [cueChanged, setCueChanged] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const seededRef = useRef(false);
  const segmentRef = useRef('');

  const configId = useMemo(
    () => new URLSearchParams(window.location.search).get('config_id') || '',
    [],
  );

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

  const loadProduction = useCallback(async () => {
    try {
      const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
      const data = await creapdApi.get(`/production/core?studio=talk${suffix}`);
      setProduction(data || null);
    } catch {
      // Keep the last good production snapshot while Live continues running.
    }
  }, [configId]);

  useEffect(() => {
    loadBridge();
    const timer = window.setInterval(loadBridge, 1500);
    return () => window.clearInterval(timer);
  }, [loadBridge]);

  useEffect(() => {
    loadProduction();
    const timer = window.setInterval(loadProduction, 2500);
    return () => window.clearInterval(timer);
  }, [loadProduction]);

  const hostPreset = useMemo(() => buildHostPreset(production), [production]);
  const guestPresets = useMemo(
    () => (Array.isArray(production?.guests) ? production.guests : [])
      .filter(guest => clean(guest?.guest_name))
      .map(guest => buildGuestPreset(guest, production)),
    [production],
  );
  const segmentCue = useMemo(() => buildSegmentCue(production), [production]);

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

  useEffect(() => {
    const nextSegmentId = segmentCue?.segmentId || '';
    if (!nextSegmentId) return;
    if (!segmentRef.current) {
      segmentRef.current = nextSegmentId;
      return;
    }
    if (segmentRef.current !== nextSegmentId) {
      segmentRef.current = nextSegmentId;
      setCueChanged(true);
    }
  }, [segmentCue?.segmentId]);

  const enqueue = useCallback(async (commandType, payload = {}) => {
    if (!bridge?.id) throw new Error('Connect the CREAPD OBS bridge before controlling graphics.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload,
    });
  }, [bridge?.id]);

  const showLowerThird = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle || busy) return;
    setBusy('show');
    setError('');
    try {
      await enqueue('show_lower_third', {
        title: cleanTitle,
        subtitle: subtitle.trim(),
        label: label.trim() || 'CREAPD LIVE',
        position,
      });
      window.setTimeout(loadBridge, 700);
      window.setTimeout(loadBridge, 1700);
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
      window.setTimeout(loadBridge, 700);
      window.setTimeout(loadBridge, 1700);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not clear the OBS overlay.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1800);
    }
  };

  const chooseMode = nextMode => {
    setMode(nextMode);
    setCueChanged(false);
    if (nextMode === 'host') {
      applyPreset(hostPreset, 'host');
    } else if (nextMode === 'topic' && segmentCue) {
      applyPreset(segmentCue, 'topic');
    } else if (nextMode === 'custom') {
      setCopySource('Manual');
    }
  };

  const chooseGuest = preset => {
    applyPreset(preset, 'guests');
    setSelectedGuestId(preset.guestId || '');
    setCueChanged(false);
  };

  const loadCue = () => {
    if (!segmentCue) return;
    applyPreset(segmentCue, 'topic');
    setCueChanged(false);
  };

  if (!target) return null;

  const connected = Boolean(bridge?.connected);
  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
    ? bridge.capabilities
    : {};
  const supportsOverlay = capabilities.overlay_control === true;
  const supportsPosition = capabilities.overlay_position_control === true;
  const overlayVisible = Boolean(capabilities.overlay_visible);
  const liveTitle = clean(capabilities.overlay_title);
  const liveSubtitle = clean(capabilities.overlay_subtitle);
  const liveLabel = clean(capabilities.overlay_label);
  const livePosition = clean(capabilities.overlay_position) || 'bottom_left';
  const showName = clean(production?.configuration?.production_name) || 'this production';

  return createPortal(
    <>
      <div className="flex items-center pl-2 ml-1 border-l border-white/10">
        <Button
          size="sm"
          variant="outline"
          className={`h-8 px-2.5 ${overlayVisible ? 'border-violet-400/40 bg-violet-500/15 text-violet-100' : ''}`}
          onClick={() => setPanelOpen(open => !open)}
          title={!connected ? 'Connect OBS to control graphics' : !supportsOverlay ? 'Restart with the updated CREAPD OBS Bridge' : 'Open live graphics'}
        >
          <Layers3 className="w-3.5 h-3.5 mr-1.5" />
          {overlayVisible ? 'Graphics ON' : 'Graphics'}
        </Button>
      </div>

      {panelOpen && (
        <div className="fixed top-[70px] right-4 md:right-6 z-[100] w-[min(540px,calc(100vw-2rem))] max-h-[calc(100vh-86px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#090b10]/95 backdrop-blur-xl shadow-2xl text-left">
          <div className="sticky top-0 z-20 px-4 py-3 border-b border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="w-4 h-4 text-violet-300" />
                <p className="font-heading font-semibold">Live Graphics</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{showName} · producer-controlled graphics desk</p>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10"
              aria-label="Close live graphics"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {!connected || !supportsOverlay ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
                <p className="font-semibold text-amber-200">
                  {!connected ? 'Connect OBS first.' : 'Bridge update required.'}
                </p>
                <p className="text-muted-foreground mt-1">
                  {!connected
                    ? 'CREAPD needs the local OBS bridge online before it can control broadcast graphics.'
                    : 'Download and restart the newest CREAPD OBS Bridge once to use this graphics layer.'}
                </p>
              </div>
            ) : (
              <>
                {overlayVisible && (
                  <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-violet-300">Currently on program</p>
                        <p className="font-semibold truncate mt-1">{liveTitle || 'Lower third'}</p>
                        {liveSubtitle && <p className="text-xs text-muted-foreground truncate">{liveSubtitle}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {liveLabel || 'CREAPD LIVE'} · {POSITIONS.find(item => item.key === livePosition)?.label || livePosition}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}>
                        {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5 mr-1.5" />}
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                {segmentCue && (
                  <div className={`rounded-xl border p-3 ${cueChanged ? 'border-cyan-400/35 bg-cyan-500/[0.08]' : 'border-white/10 bg-black/30'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageSquareText className="w-3.5 h-3.5 text-cyan-300" />
                          <p className="text-[10px] uppercase tracking-[0.15em] text-cyan-200">Rundown Cue{cueChanged ? ' · New Segment' : ''}</p>
                        </div>
                        <p className="text-sm font-semibold truncate mt-1">{segmentCue.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{segmentCue.subtitle}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={loadCue}>Load Cue</Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Segment changes only prepare a cue. CREAPD will never put it on-air until you press Show/Update.
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Graphic Source</p>
                  <div className="grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => chooseMode('host')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'host' ? 'border-violet-400/45 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'}`}>
                      <User className="w-3.5 h-3.5 mx-auto mb-1" />Host
                    </button>
                    <button type="button" onClick={() => chooseMode('guests')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'guests' ? 'border-violet-400/45 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'}`}>
                      <Users className="w-3.5 h-3.5 mx-auto mb-1" />Guests
                    </button>
                    <button type="button" onClick={() => chooseMode('topic')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'topic' ? 'border-violet-400/45 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'}`}>
                      <MessageSquareText className="w-3.5 h-3.5 mx-auto mb-1" />Topic
                    </button>
                    <button type="button" onClick={() => chooseMode('custom')} className={`rounded-lg border px-2 py-2 text-xs ${mode === 'custom' ? 'border-violet-400/45 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'}`}>
                      <Layers3 className="w-3.5 h-3.5 mx-auto mb-1" />Custom
                    </button>
                  </div>
                </div>

                {mode === 'guests' && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Choose Guest</p>
                    {guestPresets.length ? (
                      <div className="grid gap-2 max-h-36 overflow-y-auto pr-1">
                        {guestPresets.map(preset => (
                          <button
                            type="button"
                            key={preset.guestId}
                            onClick={() => chooseGuest(preset)}
                            className={`rounded-lg border p-2.5 text-left ${selectedGuestId === preset.guestId ? 'border-violet-400/45 bg-violet-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                          >
                            <p className="text-sm font-medium truncate">{preset.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{preset.subtitle}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No named guests are stored for this production yet.</p>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">Prepared Graphic</p>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                      {copySource}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Presets only fill the controls. You can edit every field before taking it live.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-violet-200">Lower Third — Main Line</label>
                    <input
                      value={title}
                      onChange={event => { setTitle(event.target.value); setMode('custom'); setCopySource('Manual'); }}
                      maxLength={120}
                      placeholder="Name, headline, or topic"
                      className="mt-1.5 h-10 w-full rounded-md border border-violet-400/25 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Second Line / Role</label>
                    <input
                      value={subtitle}
                      onChange={event => { setSubtitle(event.target.value); setMode('custom'); setCopySource('Manual'); }}
                      maxLength={180}
                      placeholder="Role, organization, or context"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eyebrow Label</label>
                    <input
                      value={label}
                      onChange={event => { setLabel(event.target.value); setMode('custom'); setCopySource('Manual'); }}
                      maxLength={40}
                      placeholder="CREAPD LIVE"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-violet-300" />
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Position</p>
                    </div>
                    {!supportsPosition && <span className="text-[10px] text-amber-300">Bridge update required</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(item => (
                      <button
                        type="button"
                        key={item.key}
                        disabled={!supportsPosition}
                        onClick={() => setPosition(item.key)}
                        className={`rounded-lg border px-2 py-2 text-[11px] transition ${position === item.key ? 'border-violet-400/50 bg-violet-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]'} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {!supportsPosition && (
                    <p className="text-[10px] text-muted-foreground mt-2">The current bridge can still show graphics at Bottom Left. Restart with the newest bridge to move them from CREAPD.</p>
                  )}
                </div>

                <div className="relative h-36 overflow-hidden rounded-xl border border-white/10 bg-[#080910]">
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

                <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 border-t border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">Nothing changes on-air until you press Show/Update.</p>
                  <div className="flex flex-wrap justify-end gap-2">
                    {overlayVisible && (
                      <Button variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}>
                        {busy === 'clear' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
                        Clear Graphic
                      </Button>
                    )}
                    <Button onClick={showLowerThird} disabled={!title.trim() || Boolean(busy)}>
                      {busy === 'show' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers3 className="w-4 h-4 mr-2" />}
                      {overlayVisible ? 'Update Graphic' : 'Show Graphic'}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>,
    target,
  );
}

export default function TalkObsGraphicsControl() {
  if (window.location.pathname !== '/talk/live') return null;
  return <TalkObsGraphicsControlLive />;
}
