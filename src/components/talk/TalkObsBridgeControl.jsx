import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Radio,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creapdApi } from '@/api/creapdClient';

function statusMeta(bridge) {
  if (bridge?.connected) {
    return {
      label: bridge.current_scene ? `OBS Connected · ${bridge.current_scene}` : 'OBS Connected',
      className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200',
      dot: 'bg-emerald-400',
    };
  }
  if (bridge?.online) {
    return {
      label: 'Bridge Online · OBS Waiting',
      className: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
      dot: 'bg-amber-400',
    };
  }
  return {
    label: bridge ? 'OBS Bridge Offline' : 'Connect OBS',
    className: 'border-white/15 bg-black/85 text-white/80',
    dot: 'bg-white/30',
  };
}

function TalkObsBridgeControlLive() {
  const [bridge, setBridge] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pairToken, setPairToken] = useState('');
  const [selectedScene, setSelectedScene] = useState('');
  const [pendingScene, setPendingScene] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadBridge = useCallback(async () => {
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'obs_bridge_get',
      });
      const next = result?.bridge || null;
      setBridge(next);
      if (next?.current_scene) {
        setSelectedScene(current => current || next.current_scene);
      }
      if (pendingScene && next?.current_scene === pendingScene) {
        setPendingScene('');
      }
      setError('');
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD could not read the OBS bridge.',
      );
    } finally {
      setLoading(false);
    }
  }, [pendingScene]);

  useEffect(() => {
    loadBridge();
    const timer = window.setInterval(loadBridge, 2500);
    return () => window.clearInterval(timer);
  }, [loadBridge]);

  useEffect(() => {
    if (!selectedScene && bridge?.current_scene) {
      setSelectedScene(bridge.current_scene);
    }
  }, [bridge?.current_scene, selectedScene]);

  const pairBridge = async () => {
    if (busy) return;
    setBusy('pair');
    setError('');
    setCopied(false);
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'obs_bridge_create',
        name: 'CREAPD Live OBS',
      });
      setBridge(result?.bridge || null);
      setPairToken(result?.bridge_token || '');
      setPanelOpen(true);
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD could not create an OBS bridge token.',
      );
    } finally {
      setBusy('');
    }
  };

  const copyToken = async () => {
    if (!pairToken) return;
    try {
      await navigator.clipboard.writeText(pairToken);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Select the token and copy it manually.');
    }
  };

  const enqueue = async (commandType, payload = {}) => {
    if (!bridge?.id) throw new Error('Pair the OBS bridge first.');
    return creapdApi.post('/production/core', {
      action: 'obs_command_enqueue',
      bridge_id: bridge.id,
      command_type: commandType,
      payload,
    });
  };

  const takeScene = async () => {
    if (!selectedScene || busy) return;
    setBusy('scene');
    setError('');
    try {
      await enqueue('set_scene', { scene_name: selectedScene });
      setPendingScene(selectedScene);
      window.setTimeout(loadBridge, 1400);
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD could not queue the OBS scene change.',
      );
    } finally {
      setBusy('');
    }
  };

  const refreshObs = async () => {
    if (busy) return;
    setBusy('refresh');
    setError('');
    try {
      await enqueue('refresh_state');
      window.setTimeout(loadBridge, 1400);
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD could not refresh OBS state.',
      );
    } finally {
      window.setTimeout(() => setBusy(''), 600);
    }
  };

  const meta = statusMeta(bridge);
  const scenes = Array.isArray(bridge?.scenes) ? bridge.scenes : [];

  return (
    <div className="fixed right-4 md:right-6 bottom-24 z-[85] flex flex-col items-end gap-2 pointer-events-none">
      {panelOpen && (
        <div className="pointer-events-auto w-[min(430px,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#090b10]/95 backdrop-blur-xl shadow-2xl">
          <div className="sticky top-0 bg-[#090b10]/95 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              <div>
                <p className="font-heading font-semibold">OBS Control</p>
                <p className="text-[11px] text-muted-foreground">CREAPD Local Automation Bridge</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center hover:bg-white/10"
              aria-label="Close OBS control"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {bridge?.connected ? (
              <>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">OBS is under CREAPD control</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>Current scene: <span className="text-white">{bridge.current_scene || 'Unknown'}</span></p>
                    {bridge.obs_studio_version && <p>OBS Studio: {bridge.obs_studio_version}</p>}
                    {bridge.obs_websocket_version && <p>WebSocket: {bridge.obs_websocket_version}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Program Scene</label>
                  <div className="flex gap-2 mt-2">
                    <select
                      value={selectedScene}
                      onChange={event => setSelectedScene(event.target.value)}
                      className="min-w-0 flex-1 h-10 rounded-md border border-white/10 bg-black/60 px-3 text-sm text-white"
                    >
                      {scenes.length === 0 && <option value="">No scenes reported</option>}
                      {scenes.map(scene => <option key={scene} value={scene}>{scene}</option>)}
                    </select>
                    <Button onClick={takeScene} disabled={!selectedScene || Boolean(busy)}>
                      {busy === 'scene' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Take
                    </Button>
                  </div>
                  {pendingScene && bridge.current_scene !== pendingScene && (
                    <p className="text-xs text-amber-300 mt-2">Scene change queued: {pendingScene}</p>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={refreshObs} disabled={Boolean(busy)}>
                  {busy === 'refresh' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Refresh OBS Scenes
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                  <p className="text-sm font-semibold">Connect OBS without exposing it to the internet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The local bridge talks to OBS on this computer, then checks in to CREAPD over normal HTTPS.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">1</span>
                    <p><span className="font-medium">Open OBS → Tools → WebSocket Server Settings.</span><br /><span className="text-xs text-muted-foreground">Enable the server, keep authentication on, and note the password. Default port is 4455.</span></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">2</span>
                    <p><span className="font-medium">Download and run the CREAPD OBS Bridge.</span><br /><span className="text-xs text-muted-foreground">It is a PowerShell bridge for this Preview test; no Node install is required.</span></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">3</span>
                    <p><span className="font-medium">Paste the Bridge Token when prompted.</span><br /><span className="text-xs text-muted-foreground">Then enter the OBS WebSocket password. CREAPD should turn green within a few seconds.</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <a href="/creapd-obs-bridge.ps1" download>
                      <Download className="w-4 h-4 mr-2" /> Download Bridge
                    </a>
                  </Button>
                  <Button onClick={pairBridge} disabled={Boolean(busy)}>
                    {busy === 'pair' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {bridge ? 'Generate New Token' : 'Generate Bridge Token'}
                  </Button>
                </div>

                {pairToken && (
                  <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Bridge Token · shown once</p>
                      <button
                        type="button"
                        onClick={copyToken}
                        className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
                      >
                        <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <code className="block text-xs break-all select-all text-white/90">{pairToken}</code>
                    <p className="text-[11px] text-muted-foreground mt-2">Keep this token private. Generating another token immediately invalidates this one.</p>
                  </div>
                )}

                {bridge?.online && !bridge?.connected && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="text-amber-200 font-medium">The CREAPD bridge is running, but OBS is not connected.</p>
                      <p className="text-muted-foreground mt-1">{bridge.last_error || 'Check that OBS is open, WebSocket Server is enabled, and the password is correct.'}</p>
                    </div>
                  </div>
                )}
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

      <button
        type="button"
        onClick={() => setPanelOpen(open => !open)}
        className={`pointer-events-auto h-10 px-3 rounded-full border backdrop-blur-xl shadow-xl flex items-center gap-2 text-xs font-semibold ${meta.className}`}
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className={`h-2 w-2 rounded-full ${meta.dot}`} />}
        {loading ? 'Checking OBS…' : meta.label}
      </button>
    </div>
  );
}

export default function TalkObsBridgeControl() {
  const location = useLocation();
  if (location.pathname !== '/talk/live') return null;
  return <TalkObsBridgeControlLive />;
}
