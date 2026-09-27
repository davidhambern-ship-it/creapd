import React, { useEffect, useMemo, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

function cleanError(err, fallback) {
  return err?.data?.diagnostic?.message || err?.data?.error || err?.message || fallback;
}

function fileStem(filename) {
  return String(filename || '').replace(/\.[^.]+$/, '').trim();
}

export default function TalkLiveObsBuilder({
  bridge, connected, currentScene, scenes, enqueue, loadState, busy, setBusy, setError, setNotice,
}) {
  const [newSceneName, setNewSceneName] = useState('');
  const [sourceType, setSourceType] = useState('image');
  const [sourceName, setSourceName] = useState('');
  const [sourceValue, setSourceValue] = useState('');
  const [sourceLoop, setSourceLoop] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [sourcePreview, setSourcePreview] = useState('');
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale_x: 1,
    scale_y: 1,
    rotation: 0,
    crop_left: 0,
    crop_top: 0,
    crop_right: 0,
    crop_bottom: 0,
  });

  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : {};
  const supportsSourceControl = capabilities.source_control === true;
  const sceneSources = useMemo(
    () => Array.isArray(capabilities.scene_sources) ? capabilities.scene_sources : [],
    [capabilities.scene_sources],
  );
  const isUploadSource = sourceType === 'image' || sourceType === 'media';

  useEffect(() => {
    if (!sourceFile) {
      setSourcePreview('');
      return undefined;
    }
    const preview = URL.createObjectURL(sourceFile);
    setSourcePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [sourceFile]);

  const refreshSoon = () => {
    window.setTimeout(loadState, 1200);
    window.setTimeout(loadState, 6000);
  };

  const resetSourceDraft = () => {
    setSourceName('');
    setSourceValue('');
    setSourceFile(null);
    setSourcePreview('');
    setSourceLoop(false);
  };

  const createScene = async () => {
    const name = newSceneName.trim();
    if (!name || !connected || busy) return;
    setBusy('create-scene');
    setError('');
    setNotice('');
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

  const uploadDirectorMedia = async file => {
    const authorization = await creapdApi.post('/production/obs-upload', {
      action: 'authorize',
      filename: file.name,
      content_type: file.type,
      byte_size: file.size,
    });

    if (!authorization?.upload_ticket || !authorization?.pathname) {
      throw new Error('CREAPD could not authorize the OBS media upload.');
    }

    const uploaded = await upload(authorization.pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/creapd/production/obs-upload',
      clientPayload: JSON.stringify({ ticket: authorization.upload_ticket }),
      contentType: file.type,
      multipart: file.size > 8 * 1024 * 1024,
    });

    if (!uploaded?.url) {
      throw new Error('The media upload completed without a usable URL.');
    }

    return uploaded.url;
  };

  const createSource = async () => {
    const name = sourceName.trim();
    if (!name || !currentScene || !connected || busy) return;
    if (isUploadSource && !sourceFile) return;

    setBusy('create-source');
    setError('');
    setNotice('');

    try {
      const payload = {
        scene_name: currentScene,
        source_name: name,
        source_type: sourceType,
      };

      if (sourceType === 'image' || sourceType === 'media') {
        setNotice('Uploading ' + sourceFile.name + '…');
        payload.path = await uploadDirectorMedia(sourceFile);
        if (sourceType === 'media') payload.loop = sourceLoop;
      } else if (sourceType === 'text') {
        payload.text = sourceValue;
      } else if (sourceType === 'browser') {
        payload.url = sourceValue;
      } else if (sourceType === 'camera' || sourceType === 'audio_input') {
        payload.device_id = sourceValue;
      } else if (sourceType === 'display_capture') {
        payload.monitor = Number(sourceValue || 0);
      } else if (sourceType === 'window_capture') {
        payload.window = sourceValue;
      }

      setNotice('Upload complete. Adding ' + name + ' to ' + currentScene + '…');
      await enqueue('create_source', payload);
      resetSourceDraft();
      setNotice('Adding ' + name + ' to ' + currentScene + '.');
      refreshSoon();
    } catch (err) {
      setError(cleanError(err, 'CREAPD could not add the OBS source.'));
    } finally {
      window.setTimeout(() => setBusy(''), 1400);
    }
  };

  const sourceCommand = async (commandType, source, extra = {}) => {
    if (!source?.name || !connected || busy) return;
    setBusy('source-' + source.name);
    setError('');
    setNotice('');
    try {
      await enqueue(commandType, {
        scene_name: currentScene,
        source_name: source.name,
        ...extra,
      });
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
    const numeric = Object.fromEntries(
      Object.entries(transform).map(([key, value]) => [key, Number(value || 0)]),
    );
    await sourceCommand('set_source_transform', source, numeric);
  };

  const chooseFile = event => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;

    const imageSelected = sourceType === 'image' && file.type.startsWith('image/');
    const videoSelected = sourceType === 'media' && file.type.startsWith('video/');
    if (!imageSelected && !videoSelected) {
      setError(sourceType === 'image' ? 'Choose an image file.' : 'Choose a video file.');
      return;
    }

    setError('');
    setSourceFile(file);
    if (!sourceName.trim()) setSourceName(fileStem(file.name));
  };

  if (!connected) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
        <p className="font-semibold text-amber-200">Connect OBS first.</p>
        <p className="text-muted-foreground mt-1">OBS Builder works through your local CREAPD bridge.</p>
      </div>
    );
  }

  if (!supportsSourceControl) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 text-xs">
        <p className="font-semibold text-amber-200">Bridge update required.</p>
        <p className="text-muted-foreground mt-1">The Director panel is ready, but the bridge currently running on this computer predates scene/source editing. Download the latest bridge and restart it once.</p>
        <a href="/creapd-obs-bridge.ps1" download className="mt-3 inline-flex h-8 items-center rounded-md border border-amber-400/25 bg-amber-500/10 px-3 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/15">Download Updated Bridge</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <p className="text-xs font-semibold">Create Scene</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Creates the scene in OBS and takes it to Program so you can build it immediately.</p>
          </div>
          <span className="text-[10px] text-cyan-300">{scenes.length} scenes</span>
        </div>
        <div className="flex gap-2">
          <input
            value={newSceneName}
            onChange={event => setNewSceneName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') createScene(); }}
            placeholder="Scene name"
            className="min-w-0 flex-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-cyan-400/50"
          />
          <Button onClick={createScene} disabled={!newSceneName.trim() || Boolean(busy)}>
            <Plus className="w-4 h-4 mr-2" />Create
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="mb-3">
          <p className="text-xs font-semibold">Add Source</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Target scene: <span className="text-white">{currentScene || 'No Program scene'}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <select
            value={sourceType}
            onChange={event => {
              setSourceType(event.target.value);
              setSourceValue('');
              setSourceFile(null);
              setSourcePreview('');
            }}
            className="h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white"
          >
            <option value="image">Image</option>
            <option value="media">Video / Media</option>
            <option value="text">Text</option>
            <option value="browser">Browser / Web</option>
            <option value="camera">Camera</option>
            <option value="audio_input">Audio Input</option>
            <option value="display_capture">Display Capture</option>
            <option value="window_capture">Window Capture</option>
          </select>
          <input
            value={sourceName}
            onChange={event => setSourceName(event.target.value)}
            placeholder="Source name"
            className="h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-emerald-400/50"
          />
        </div>

        {isUploadSource ? (
          <div className="mt-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3">
            {sourcePreview && (
              <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-black/50">
                {sourceType === 'image' ? (
                  <img src={sourcePreview} alt="Selected source preview" className="mx-auto max-h-44 w-auto object-contain" />
                ) : (
                  <video src={sourcePreview} controls className="mx-auto max-h-44 w-full object-contain" />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15">
                {sourceType === 'image' ? <ImageIcon className="w-4 h-4 mr-2" /> : <Film className="w-4 h-4 mr-2" />}
                {sourceFile ? 'Choose Different ' : 'Choose '}
                {sourceType === 'image' ? 'Image' : 'Video'}
                <input
                  type="file"
                  accept={sourceType === 'image' ? 'image/*' : 'video/*'}
                  onChange={chooseFile}
                  className="sr-only"
                />
              </label>

              {sourceFile ? (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{sourceFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(sourceFile.size / (1024 * 1024)).toFixed(1)} MB · uploads through CREAPD when added</p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Pick the file from your computer. No path or URL needed.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {sourceType === 'text' ? (
              <textarea
                value={sourceValue}
                onChange={event => setSourceValue(event.target.value)}
                rows={3}
                placeholder="Text to show in OBS"
                className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
              />
            ) : (
              <input
                value={sourceValue}
                onChange={event => setSourceValue(event.target.value)}
                placeholder={
                  sourceType === 'browser'
                    ? 'https://…'
                    : sourceType === 'display_capture'
                      ? 'Monitor index (usually 0)'
                      : sourceType === 'window_capture'
                        ? 'OBS window identifier'
                        : 'Device ID (optional)'
                }
                className="w-full h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-emerald-400/50"
              />
            )}
          </div>
        )}

        {sourceType === 'media' && (
          <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={sourceLoop} onChange={event => setSourceLoop(event.target.checked)} />
            Loop media
          </label>
        )}

        <div className="flex justify-end mt-3">
          <Button
            onClick={createSource}
            disabled={
              !sourceName.trim()
              || (isUploadSource && !sourceFile)
              || ((sourceType === 'text' || sourceType === 'browser') && !sourceValue.trim())
              || Boolean(busy)
            }
          >
            {busy === 'create-source' ? <Upload className="w-4 h-4 mr-2 animate-pulse" /> : <Plus className="w-4 h-4 mr-2" />}
            {busy === 'create-source' ? 'Uploading / Adding…' : 'Add to Scene'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            <p className="text-xs font-semibold">Current Scene Sources</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Visibility and layer order update OBS directly.</p>
          </div>
          <span className="text-[10px] text-muted-foreground">{sceneSources.length} sources</span>
        </div>

        {sceneSources.length ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sceneSources
              .slice()
              .sort((left, right) => Number(right.index || 0) - Number(left.index || 0))
              .map(source => (
                <div
                  key={source.id || source.name}
                  className={'rounded-lg border p-2.5 flex items-center gap-2 ' + (selectedSourceName === source.name ? 'border-emerald-400/35 bg-emerald-500/[0.07]' : 'border-white/10 bg-white/[0.025]')}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedSourceName(source.name)}>
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{source.kind || source.source_type || 'OBS source'} · layer {source.index}</p>
                  </button>
                  <button
                    type="button"
                    title={source.enabled ? 'Hide source' : 'Show source'}
                    className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10"
                    onClick={() => sourceCommand('set_source_visibility', source, { visible: !source.enabled })}
                  >
                    {source.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button type="button" title="Move layer up" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" onClick={() => sourceCommand('move_source_up', source)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" title="Move layer down" className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10" onClick={() => sourceCommand('move_source_down', source)}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" title="Remove from scene" className="h-8 w-8 rounded-md border border-red-500/20 bg-red-500/5 text-red-200 grid place-items-center hover:bg-red-500/10" onClick={() => sourceCommand('remove_source', source)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No sources reported for the current scene yet.</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-300" />
          <div>
            <p className="text-xs font-semibold">Source Inspector</p>
            <p className="text-[11px] text-muted-foreground">Position, scale, rotation, and crop.</p>
          </div>
        </div>

        <select value={selectedSourceName} onChange={event => setSelectedSourceName(event.target.value)} className="w-full h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white">
          <option value="">Choose a source</option>
          {sceneSources.map(source => <option key={source.id || source.name} value={source.name}>{source.name}</option>)}
        </select>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
          {[['x', 'X'], ['y', 'Y'], ['scale_x', 'Scale X'], ['scale_y', 'Scale Y'], ['rotation', 'Rotate']].map(([key, label]) => (
            <label key={key} className="text-[10px] text-muted-foreground">
              {label}
              <input
                type="number"
                step={key.startsWith('scale') ? '0.05' : '1'}
                value={transform[key]}
                onChange={event => setTransform(value => ({ ...value, [key]: event.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-white/10 bg-black/60 px-2 text-xs text-white"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mt-2">
          {[['crop_left', 'Crop L'], ['crop_top', 'Crop T'], ['crop_right', 'Crop R'], ['crop_bottom', 'Crop B']].map(([key, label]) => (
            <label key={key} className="text-[10px] text-muted-foreground">
              {label}
              <input
                type="number"
                min="0"
                step="1"
                value={transform[key]}
                onChange={event => setTransform(value => ({ ...value, [key]: event.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-white/10 bg-black/60 px-2 text-xs text-white"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-3">
          <Button onClick={applyTransform} disabled={!selectedSourceName || Boolean(busy)}>
            <SlidersHorizontal className="w-4 h-4 mr-2" />Apply Transform
          </Button>
        </div>
      </div>
    </div>
  );
}
