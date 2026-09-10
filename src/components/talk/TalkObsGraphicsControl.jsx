import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eraser, Layers3, Loader2, X } from 'lucide-react';
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

function TalkObsGraphicsControlLive() {
  const [target, setTarget] = useState(null);
  const [bridge, setBridge] = useState(undefined);
  const [panelOpen, setPanelOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('CREAPD LIVE');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadBridge();
    const timer = window.setInterval(loadBridge, 1500);
    return () => window.clearInterval(timer);
  }, [loadBridge]);

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

  if (!target) return null;

  const connected = Boolean(bridge?.connected);
  const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object'
    ? bridge.capabilities
    : {};
  const supportsOverlay = capabilities.overlay_control === true;
  const overlayVisible = Boolean(capabilities.overlay_visible);
  const liveTitle = String(capabilities.overlay_title || '').trim();
  const liveSubtitle = String(capabilities.overlay_subtitle || '').trim();
  const liveLabel = String(capabilities.overlay_label || '').trim();

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
        <div className="fixed top-[70px] right-4 md:right-6 z-[100] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#090b10]/95 backdrop-blur-xl shadow-2xl overflow-hidden text-left">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="w-4 h-4 text-violet-300" />
                <p className="font-heading font-semibold">Live Graphics</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">CREAPD → local OBS Browser Source</p>
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
                    : 'Download and restart the newest CREAPD OBS Bridge once. It adds local Browser Source graphics support.'}
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
                        {liveLabel && <p className="text-[10px] text-muted-foreground mt-1">{liveLabel}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}>
                        {busy === 'clear' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5 mr-1.5" />}
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="text-xs font-medium">Lower Third</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    The first time you click Show, CREAPD will create a transparent Browser Source named <span className="text-white">CREAPD Overlay</span> in OBS automatically. You do not need to add the source yourself.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Name / Headline</label>
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      maxLength={120}
                      placeholder="TexasNomad"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Role / Subtitle</label>
                    <input
                      value={subtitle}
                      onChange={event => setSubtitle(event.target.value)}
                      maxLength={180}
                      placeholder="Host · We Are America"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eyebrow Label</label>
                    <input
                      value={label}
                      onChange={event => setLabel(event.target.value)}
                      maxLength={40}
                      placeholder="CREAPD LIVE"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#080910] p-4">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-violet-300">Preview</p>
                  <div className="mt-2 flex items-stretch max-w-full">
                    <div className="w-1.5 rounded-l-md bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                    <div className="min-w-0 rounded-r-md border border-l-0 border-white/10 bg-white/[0.06] px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-violet-200">{label.trim() || 'CREAPD LIVE'}</p>
                      <p className="font-semibold truncate mt-0.5">{title.trim() || 'Your lower-third title'}</p>
                      {(subtitle.trim() || !title.trim()) && <p className="text-xs text-muted-foreground truncate">{subtitle.trim() || 'Role, context, or subtitle'}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  {overlayVisible && (
                    <Button variant="outline" onClick={clearOverlay} disabled={Boolean(busy)}>
                      {busy === 'clear' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eraser className="w-4 h-4 mr-2" />}
                      Clear Graphic
                    </Button>
                  )}
                  <Button onClick={showLowerThird} disabled={!title.trim() || Boolean(busy)}>
                    {busy === 'show' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Layers3 className="w-4 h-4 mr-2" />}
                    {overlayVisible ? 'Update Lower Third' : 'Show Lower Third'}
                  </Button>
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
