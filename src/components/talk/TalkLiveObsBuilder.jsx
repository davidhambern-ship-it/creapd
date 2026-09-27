import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function cleanError(err, fallback) {
  return err?.data?.diagnostic?.message || err?.data?.error || err?.message || fallback;
}

export default function TalkLiveObsBuilder({
  bridge, connected, currentScene, scenes, enqueue, loadState, busy, setBusy, setError, setNotice,
}) {
  const [newSceneName, setNewSceneName] = useState('');
  const [sourceType, setSourceType] = useState('image');
  const [sourceName, setSourceName] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [sourceLoop, setSourceLoop] = useState(false);
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [transform, setTransform] = useState({ x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0 });

  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : {};
  const supportsSourceControl = capabilities.source_control === true;
  const sceneSources = useMemo(() => Array.isArray(capabilities.scene_sources) ? capabilities.scene_sources : [], [capabilities.scene_sources]);

  const refreshSoon = () => {
    window.setTimeout(loadState, 1200);
    window.setTimeout(loadState, 6000);
  };

  const createScene = async () => {
    const name = newSceneName.trim();
    if (!name || !connected || busy) return;
    setBusy('create-scene'); setError(''); setNotice('');
    try {
      await enqueue('create_scene', { scene_name: name });
      setNotice('Creating OBS scene: ' + name);
      setNewSceneName('');
      refreshSoon();
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not create the OBS scene.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1400);
    }
  };

  const createSource = async () => {
    const name = sourceName.trim();
    if (!name || !currentScene || !connected || busy) return;
    const payload = { scene_name: currentScene, source_name: name, source_type: sourceType };
    if (sourceType === 'text') payload.text = sourceValue;
    else if (sourceType === 'browser') payload.url = sourceValue;
    else if (sourceType === 'camera' || sourceType === 'audio_input') payload.device_id = sourceValue;
    else if (sourceType === 'display_capture') payload.monitor = Number(sourceValue || 0);
    else if (sourceType === 'window_capture') payload.window = sourceValue;
    else { payload.path = sourceValue; payload.loop = sourceLoop; }
    setBusy('create-source'); setError(''); setNotice('');
    try {
      await enqueue('create_source', payload);
      setNotice('Adding ' + name + ' to ' + currentScene + '.');
      setSourceName(''); setSourceValue('');
      refreshSoon();
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not add the OBS source.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1400);
    }
  };

  const sourceCommand = async (commandType, source, extra = {}) => {
    if (!source?.name || !connected || busy) return;
    setBusy('source-' + source.name); setError(''); setNotice('');
    try {
      await enqueue(commandType, { scene_name: currentScene, source_name: source.name, ...extra });
      setNotice('OBS source update queued: ' + source.name);
      refreshSoon();
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not update the OBS source.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1400);
    }
  };

  const applyTransform = async () => {
    const source = sceneSources.find(item => item.name === selectedSourceName);
    if (!source) return;
    const numeric = Object.fromEntries(Object.entries(transform).map(([key, value]) => [key, Number(value || 0)]));
    await sourceCommand('set_source_transform', source, numeric);
  };

  if (!connected) return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
      <p className="font-semibold text-amber-200">Connect OBS first.</p>
      <p className="text-muted-foreground mt-1">OBS Builder works through your local CREAPD bridge.</p>
    </div>
  );

  if (!supportsSourceControl) return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
      <p className="font-semibold text-amber-200">Bridge update required.</p>
      <p className="text-muted-foreground mt-1">The Director panel is ready, but the bridge currently running on this computer predates scene/source editing. Download the latest bridge and restart it once.</p>
      <a href="/creapd-obs-bridge.ps1" download className="mt-3 inline-flex h-8 items-center rounded-md border border-amber-400/25 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/15">Download Updated Bridge</a>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div><p className="text-xs font-semibold">Create Scene</p><p className="text-[11px] text-muted-foreground mt-0.5">Creates the scene in OBS and takes it to Program so you can build it immediately.</p></div>
          <span className="text-[10px] text-cyan-300">{scenes.length} scenes</span>
        </div>
        <div className="flex gap-2">
          <input value={newSceneName} onChange={e => setNewSceneName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createScene(); }} placeholder="Scene name" className="min-w-0 flex-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50" />
          <Button onClick={createScene} disabled={!newSceneName.trim() || Boolean(busy)}><Plus className="w-4 h-4 mr-2" />Create</Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-3"><p className="text-xs font-semibold">Add Source</p><p className="text-[11px] text-muted-foreground mt-0.5">Target scene: <span className="text-white">{currentScene || 'No Program scene'}</span></p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select value={sourceType} onChange={e => { setSourceType(e.target.value); setSourceValue(''); }} className="h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white">
            <option value="image">Image</option><option value="media">Video / Media</option><option value="text">Text</option><option value="browser">Browser / Web</option><option value="camera">Camera</option><option value="audio_input">Audio Input</option><option value="display_capture">Display Capture</option><option value="window_capture">Window Capture</option>
          </select>
          <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="Source name" className="h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-emerald-400/50" />
        </div>
        <div className="mt-2">
          {sourceType === 'text' ? <textarea value={sourceValue} onChange={e => setSourceValue(e.target.value)} rows={3} placeholder="Text to show in OBS" className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50" /> :
            <input value={sourceValue} onChange={e => setSourceValue(e.target.value)} placeholder={sourceType === 'browser' ? 'https://…' : (sourceType === 'image' || sourceType === 'media') ? 'Local file path or https URL' : sourceType === 'display_capture' ? 'Monitor index (usually 0)' : sourceType === 'window_capture' ? 'OBS window identifier' : 'Device ID (optional)'} className="w-full h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-emerald-400/50" />}
        </div>
        {sourceType === 'media' && <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={sourceLoop} onChange={e => setSourceLoop(e.target.checked)} /> Loop media</label>}
        <div className="flex justify-end mt-3"><Button onClick={createSource} disabled={!sourceName.trim() || (((sourceType === 'image' || sourceType === 'media' || sourceType === 'text' || sourceType === 'browser')) && !sourceValue.trim()) || Boolean(busy)}><Plus className="w-4 h-4 mr-2" />Add to Scene</Button></div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-end justify-between gap-3 mb-2"><div><p className="text-xs font-semibold">Current Scene Sources</p><p className="text-[11px] text-muted-foreground mt-0.5">Visibility and layer order update OBS directly.</p></div><span className="text-[10px] text-muted-foreground">{sceneSources.length} sources</span></div>
        {sceneSources.length ? <div className="space-y-2 max-h-56 overflow-y-auto pr-1">{sceneSources.slice().sort((a,b) => Number(b.index || 0) - Number(a.index || 0)).map(source => (
          <div key={source.id || source.name} className={'rounded-lg border p-2.5 flex items-center gap-2 ' + (selectedSourceName === source.name ? 'border-emerald-400/35 bg-emerald-500/[0.07]' : 'border-white/10 bg-white/[0.025]')}>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedSourceName(source.name)}><p className="text-sm font-medium truncate">{source.name}</p><p className="text-[10px] text-muted-foreground truncate">{source.kind || source.source_type || 'OBS source'} · layer {source.index}</p></button>
            <button type="button" title={source.enabled ? 'Hide source' : 'Show source'} className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" onClick={() => sourceCommand('set_source_visibility', source, { visible: !source.enabled })}>{source.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
            <button type="button" title="Move layer up" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" onClick={() => sourceCommand('move_source_up', source)}><ArrowUp className="w-3.5 h-3.5" /></button>
            <button type="button" title="Move layer down" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" onClick={() => sourceCommand('move_source_down', source)}><ArrowDown className="w-3.5 h-3.5" /></button>
            <button type="button" title="Remove from scene" className="h-8 w-8 rounded-md border border-red-500/20 bg-red-500/5 text-red-200 grid place-items-center hover:bg-red-500/10" onClick={() => sourceCommand('remove_source', source)}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}</div> : <p className="text-xs text-muted-foreground">No sources reported for the current scene yet.</p>}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-2 mb-3"><SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" /><div><p className="text-xs font-semibold">Source Inspector</p><p className="text-[11px] text-muted-foreground">Position, scale, rotation, and crop.</p></div></div>
        <select value={selectedSourceName} onChange={e => setSelectedSourceName(e.target.value)} className="w-full h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white"><option value="">Choose a source</option>{sceneSources.map(source => <option key={source.id || source.name} value={source.name}>{source.name}</option>)}</select>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
          {[["x","X"],["y","Y"],["scale_x","Scale X"],["scale_y","Scale Y"],["rotation","Rotate"]].map(([key,label]) => <label key={key} className="text-[10px] text-muted-foreground">{label}<input type="number" step={key.startsWith('scale') ? '0.05' : '1'} value={transform[key]} onChange={e => setTransform(v => ({ ...v, [key]: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-white/10 bg-black/60 px-2 text-xs text-white" /></label>)}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[["crop_left","Crop L"],["crop_top","Crop T"],["crop_right","Crop R"],["crop_bottom","Crop B"]].map(([key,label]) => <label key={key} className="text-[10px] text-muted-foreground">{label}<input type="number" min="0" step="1" value={transform[key]} onChange={e => setTransform(v => ({ ...v, [key]: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-white/10 bg-black/60 px-2 text-xs text-white" /></label>)}
        </div>
        <div className="flex justify-end mt-3"><Button onClick={applyTransform} disabled={!selectedSourceName || Boolean(busy)}><SlidersHorizontal className="w-4 h-4 mr-2" />Apply Transform</Button></div>
      </div>
    </div>
  );
}