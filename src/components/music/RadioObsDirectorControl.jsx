import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eraser,
  Layers3,
  Loader2,
  Radio,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';
import TalkLiveObsBuilder from '@/components/talk/TalkLiveObsBuilder';

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

function segmentLabel(segment) {
  return clean(segment?.segment_type)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase()) || 'Segment';
}

export default function RadioObsDirectorControl({
  config,
  currentSegment,
  activeTrack,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('graphics');
  const [bridge, setBridge] = useState(undefined);
  const [manualScene, setManualScene] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('CREAPD RADIO');
  const [position, setPosition] = useState('bottom_left');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadState = useCallback(async () => {
    try {
      const result = await creapdApi.post('/production/core', { action: 'obs_bridge_get' });
      const next = result?.bridge || null;
      setBridge(next);
      if (next?.current_scene) setManualScene(current => current || next.current_scene);
      setError('');
    } catch {
      setBridge(null);
    }
  }, []);

  useEffect(() => {
    loadState();
    const timer = window.setInterval(loadState, open ? 1000 : 1800);
    return () => window.clearInterval(timer);
  }, [loadState, open]);

  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
    ? bridge.capabilities
    : {};
  const connected = Boolean(bridge?.connected);
  const scenes = Array.isArray(bridge?.scenes) ? bridge.scenes : [];
  const currentScene = bridge?.current_scene || '';
  const overlayVisible = Boolean(capabilities.overlay_visible);
  const supportsOverlay = capabilities.overlay_control === true;
  const supportsPosition = capabilities.overlay_position_control === true;

  useEffect(() => {
    if (supportsPosition && capabilities.overlay_position) {
      setPosition(capabilities.overlay_position);
    }
  }, [capabilities.overlay_position, supportsPosition]);

  const enqueue = useCallback(async (commandType, payload = {}) => {
    if (!bridge?.id) throw new Error('Connect the CREAPD OBS Bridge first.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload,
    });
  }, [bridge?.id]);

  const hostPreset = useMemo(() => ({
    title: clean(config?.host_name) || clean(config?.production_name) || 'Radio Host',
    subtitle: clean(config?.host_name) && clean(config?.production_name)
      ? `Host · ${clean(config.production_name)}`
      : clean(config?.station_name) || '',
    label: clean(config?.station_name) || 'CREAPD RADIO',
  }), [config?.host_name, config?.production_name, config?.station_name]);

  const trackPreset = useMemo(() => ({
    title: clean(activeTrack?.song_title) || 'Now Playing',
    subtitle: clean(activeTrack?.artist),
    label: 'NOW PLAYING',
  }), [activeTrack?.artist, activeTrack?.song_title]);

  const segmentPreset = useMemo(() => ({
    title: clean(currentSegment?.title) || clean(config?.production_name) || 'Radio Segment',
    subtitle: clean(config?.production_name),
    label: currentSegment ? segmentLabel(currentSegment).toUpperCase() : 'ON AIR',
  }), [config?.production_name, currentSegment]);

  const applyPreset = preset => {
    setTitle(preset.title || '');
    setSubtitle(preset.subtitle || '');
    setLabel(preset.label || 'CREAPD RADIO');
  };

  const takeScene = async () => {
    if (!manualScene || busy) return;
    setBusy('scene');
    setError('');
    setNotice('');
    try {
      await enqueue('set_scene', { scene_name: manualScene });
      setNotice(`OBS Program changed to ${manualScene}.`);
      window.setTimeout(loadState, 250);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not change the OBS scene.'));
    } finally {
      setBusy('');
    }
  };

  const showGraphic = async () => {
    if (!title.trim() || busy) return;
    setBusy('graphic');
    setError('');
    setNotice('');
    try {
      await enqueue('show_lower_third', {
        title: title.trim(),
        subtitle: subtitle.trim(),
        label: label.trim() || 'CREAPD RADIO',
        position,
      });
      setNotice('Radio graphic is live in OBS.');
      window.setTimeout(loadState, 250);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not show the Radio graphic.'));
    } finally {
      setBusy('');
    }
  };

  const clearGraphic = async () => {
    if (busy) return;
    setBusy('clear');
    setError('');
    setNotice('');
    try {
      await enqueue('clear_overlay');
      setNotice('Radio graphic cleared.');
      window.setTimeout(loadState, 250);
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not clear the Radio graphic.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 border-fuchsia-400/25 bg-fuchsia-500/[0.06] px-2.5 text-fuchsia-100 hover:bg-fuchsia-500/10"
        onClick={() => setOpen(value => !value)}
        title="Open Radio OBS Director"
      >
        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
        <span className="hidden xl:inline">OBS Director</span>
        <span className="xl:hidden">OBS</span>
      </Button>

      {open && (
        <div className="fixed right-4 top-[76px] z-[120] w-[min(680px,calc(100vw-2rem))] max-h-[calc(100vh-92px)] overflow-y-auto rounded-2xl border border-fuchsia-400/20 bg-[#080910]/97 text-left shadow-2xl backdrop-blur-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#080910]/97 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-fuchsia-300" />
              <div>
                <p className="font-heading text-sm font-semibold text-white">Radio OBS Director</p>
                <p className="text-[10px] text-white/35">
                  {connected ? `Connected · ${currentScene || 'OBS Program'}` : 'Connect OBS from the Program Monitor'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10"
              aria-label="Close Radio OBS Director"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-white/[0.07] px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {[
                ['graphics', 'Graphics'],
                ['scenes', 'Scenes'],
                ['sources', 'Sources'],
              ].map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`h-8 rounded-lg border px-3 text-[11px] font-semibold transition ${tab === key
                    ? 'border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100'
                    : 'border-white/10 bg-white/[0.025] text-white/45 hover:text-white'}`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4">
            {!connected && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
                OBS control is not connected. Use the OBS button inside the Program Monitor to connect the CREAPD bridge.
              </div>
            )}

            {tab === 'graphics' && (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => applyPreset(hostPreset)}
                    className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/[0.05] p-3 text-left hover:bg-fuchsia-500/[0.09]"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-fuchsia-300">Host</p>
                    <p className="mt-1 truncate text-xs font-semibold text-white">{hostPreset.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/35">{hostPreset.subtitle || 'Host lower third'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(trackPreset)}
                    disabled={!activeTrack}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] p-3 text-left hover:bg-cyan-500/[0.09] disabled:opacity-35"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-300">Now Playing</p>
                    <p className="mt-1 truncate text-xs font-semibold text-white">{trackPreset.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/35">{trackPreset.subtitle || 'Track graphic'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(segmentPreset)}
                    disabled={!currentSegment}
                    className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-3 text-left hover:bg-amber-500/[0.09] disabled:opacity-35"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-300">Current Segment</p>
                    <p className="mt-1 truncate text-xs font-semibold text-white">{segmentPreset.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-white/35">{segmentPreset.label}</p>
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    placeholder="Main line"
                    className="h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-fuchsia-400/45"
                  />
                  <input
                    value={subtitle}
                    onChange={event => setSubtitle(event.target.value)}
                    placeholder="Second line / artist / context"
                    className="h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-fuchsia-400/45"
                  />
                  <input
                    value={label}
                    onChange={event => setLabel(event.target.value)}
                    placeholder="Label"
                    className="h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-fuchsia-400/45"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Graphic Position</p>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITIONS.map(item => (
                      <button
                        key={item.key}
                        type="button"
                        disabled={!supportsPosition}
                        onClick={() => setPosition(item.key)}
                        className={`rounded-lg border px-2 py-2 text-[10px] ${position === item.key
                          ? 'border-fuchsia-400/45 bg-fuchsia-500/10 text-white'
                          : 'border-white/10 bg-white/[0.025] text-white/45'} disabled:opacity-35`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {overlayVisible && (
                    <Button variant="outline" onClick={clearGraphic} disabled={!connected || Boolean(busy)}>
                      {busy === 'clear' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-4 w-4" />}
                      Clear
                    </Button>
                  )}
                  <Button onClick={showGraphic} disabled={!connected || !supportsOverlay || !title.trim() || Boolean(busy)}>
                    {busy === 'graphic' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers3 className="mr-2 h-4 w-4" />}
                    {overlayVisible ? 'Update Graphic' : 'Take Graphic'}
                  </Button>
                </div>
              </>
            )}

            {tab === 'scenes' && (
              <>
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">OBS Program Scene</p>
                      <p className="mt-0.5 text-[10px] text-white/35">Current: {currentScene || 'Unknown'}</p>
                    </div>
                    {connected && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={manualScene}
                      onChange={event => setManualScene(event.target.value)}
                      disabled={!connected}
                      className="min-w-0 flex-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white"
                    >
                      {scenes.length === 0 && <option value="">No scenes reported</option>}
                      {scenes.map(scene => <option key={scene} value={scene}>{scene}</option>)}
                    </select>
                    <Button onClick={takeScene} disabled={!manualScene || !connected || Boolean(busy)}>
                      {busy === 'scene' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Take
                    </Button>
                  </div>
                </div>
              </>
            )}

            {tab === 'sources' && (
              <TalkLiveObsBuilder
                bridge={bridge}
                connected={connected}
                currentScene={currentScene}
                scenes={scenes}
                enqueue={enqueue}
                loadState={loadState}
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                setNotice={setNotice}
              />
            )}

            {notice && (
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] px-3 py-2 text-xs text-cyan-100">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                {notice}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
