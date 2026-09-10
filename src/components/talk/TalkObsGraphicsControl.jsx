import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function parseLowerThirdAsset(asset) {
  if (!asset?.content) return null;
  const raw = String(asset.content).trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        title: String(parsed.title || parsed.name || parsed.headline || '').trim(),
        subtitle: String(parsed.subtitle || parsed.role || parsed.context || '').trim(),
        label: String(parsed.label || parsed.eyebrow || '').trim(),
      };
    }
  } catch {
    // Existing/manual assets may be stored as simple line-separated text.
  }

  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return null;
  return {
    title: lines[0].replace(/^title\s*:\s*/i, '').trim(),
    subtitle: (lines[1] || '').replace(/^(subtitle|role)\s*:\s*/i, '').trim(),
    label: (lines[2] || '').replace(/^(label|eyebrow)\s*:\s*/i, '').trim(),
  };
}

function buildFallbackSeed(configuration) {
  const productionName = String(configuration?.production_name || '').trim();
  const hostName = String(configuration?.host_name || '').trim();
  const stationName = String(configuration?.station_name || '').trim();
  const title = hostName || productionName;
  const subtitle = hostName && productionName
    ? `Host · ${productionName}`
    : String(configuration?.show_format || '').trim();

  return {
    title,
    subtitle,
    label: stationName || 'CREAPD LIVE',
    source: title ? 'show setup' : 'manual',
  };
}

function TalkObsGraphicsControlLive() {
  const [target, setTarget] = useState(null);
  const [bridge, setBridge] = useState(undefined);
  const [panelOpen, setPanelOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('CREAPD LIVE');
  const [copySource, setCopySource] = useState('loading');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const seededRef = useRef(false);

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

  useEffect(() => {
    let cancelled = false;

    const seedLowerThird = async () => {
      if (seededRef.current) return;
      try {
        const configId = new URLSearchParams(window.location.search).get('config_id');
        const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
        const data = await creapdApi.get(`/production/core?studio=talk${suffix}`);
        if (cancelled || seededRef.current) return;

        const assets = Array.isArray(data?.assets) ? data.assets : [];
        const generatedAsset = assets.find(asset => asset.asset_type === 'lower_third' && asset.status !== 'rejected');
        const generated = parseLowerThirdAsset(generatedAsset);
        const fallback = buildFallbackSeed(data?.configuration || {});
        const seed = generated?.title
          ? {
              title: generated.title,
              subtitle: generated.subtitle || fallback.subtitle,
              label: generated.label || fallback.label,
              source: 'AI Assets',
            }
          : fallback;

        setTitle(seed.title || '');
        setSubtitle(seed.subtitle || '');
        setLabel(seed.label || 'CREAPD LIVE');
        setCopySource(seed.source || 'manual');
        seededRef.current = true;
      } catch {
        if (!cancelled) {
          setCopySource('manual');
          seededRef.current = true;
        }
      }
    };

    seedLowerThird();
    return () => { cancelled = true; };
  }, []);

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
  const sourceText = copySource === 'AI Assets'
    ? 'Loaded from AI Assets — edit anything before taking it live.'
    : copySource === 'show setup'
      ? 'No saved lower-third asset existed, so CREAPD built this from your show setup. Edit anything before taking it live.'
      : copySource === 'loading'
        ? 'Loading this production’s lower-third copy…'
        : 'Enter the lower-third copy you want to send to OBS.';

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
        <div className="fixed top-[70px] right-4 md:right-6 z-[100] w-[min(440px,calc(100vw-2rem))] max-h-[calc(100vh-86px)] overflow-y-auto rounded-2xl border border-white/10 bg-[#090b10]/95 backdrop-blur-xl shadow-2xl text-left">
          <div className="sticky top-0 z-10 px-4 py-3 border-b border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex items-center justify-between gap-3">
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
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium">Lower Third Graphic</p>
                    {copySource !== 'loading' && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {copySource === 'AI Assets' ? 'Generated' : copySource === 'show setup' ? 'Show setup' : 'Manual'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{sourceText}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    The first time you click Show, CREAPD creates the transparent <span className="text-white">CREAPD Overlay</span> Browser Source in OBS automatically.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-violet-200">Lower Third — Main Line</label>
                    <input
                      value={title}
                      onChange={event => { setTitle(event.target.value); setCopySource('manual'); }}
                      maxLength={120}
                      placeholder="Name, headline, or topic"
                      className="mt-1.5 h-10 w-full rounded-md border border-violet-400/25 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/60"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">This is the primary lower-third text that will appear on air.</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Second Line / Role</label>
                    <input
                      value={subtitle}
                      onChange={event => { setSubtitle(event.target.value); setCopySource('manual'); }}
                      maxLength={180}
                      placeholder="Role, organization, or context"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Eyebrow Label</label>
                    <input
                      value={label}
                      onChange={event => { setLabel(event.target.value); setCopySource('manual'); }}
                      maxLength={40}
                      placeholder="CREAPD LIVE"
                      className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-black/55 px-3 text-sm text-white outline-none focus:border-violet-400/50"
                    />
                  </div>
                </div>

                <div className="rounded-xl overflow-hidden border border-white/10 bg-[#080910] p-4">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-violet-300">On-air preview</p>
                  <div className="mt-2 flex items-stretch max-w-full">
                    <div className="w-1.5 rounded-l-md bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                    <div className="min-w-0 rounded-r-md border border-l-0 border-white/10 bg-white/[0.06] px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-violet-200">{label.trim() || 'CREAPD LIVE'}</p>
                      <p className="font-semibold truncate mt-0.5">{title.trim() || 'Enter lower-third copy above'}</p>
                      {subtitle.trim() && <p className="text-xs text-muted-foreground truncate">{subtitle.trim()}</p>}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 border-t border-white/10 bg-[#090b10]/95 backdrop-blur-xl flex flex-wrap justify-end gap-2">
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
