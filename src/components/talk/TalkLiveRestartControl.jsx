import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { creapdApi } from '@/api/creapdClient';

export default function TalkLiveRestartControl() {
  const location = useLocation();
  if (location.pathname !== '/talk/live') return null;
  return <TalkLiveRestartInner />;
}

function TalkLiveRestartInner() {
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('config_id') || undefined;
  const { config, segments, session, source, loading } = useTalkProduction(configId);
  const [target, setTarget] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');

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

  if (loading || source !== 'neon' || !config || session?.status !== 'complete' || !target) return null;

  const handleRestart = async () => {
    if (restarting) return;
    setRestarting(true);
    setError('');

    try {
      const result = await creapdApi.post('/talk/production', {
        action: 'start_session',
        configuration_id: config.id,
      });
      const startedSession = result?.session;
      if (!startedSession?.id) throw new Error('CREAPD could not create a new show run.');

      const firstSegment = segments[0];
      if (firstSegment) {
        await creapdApi.post('/talk/production', {
          action: 'session_event',
          session_id: startedSession.id,
          event_type: 'segment_start',
          segment_id: firstSegment.id,
          payload: {
            source: 'creapd-live',
            segment_index: 0,
            new_run: true,
          },
        });
      }

      window.location.reload();
    } catch (err) {
      setError(
        err?.data?.diagnostic?.message
        || err?.data?.error
        || err?.message
        || 'CREAPD could not start a new run.',
      );
      setRestarting(false);
    }
  };

  return createPortal(
    <div className="relative flex items-center gap-1.5 pl-2 ml-1 border-l border-white/10" title={error || 'Start this production again as a fresh run'}>
      <Button
        size="sm"
        className="h-8 border border-emerald-400/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
        onClick={handleRestart}
        disabled={restarting}
      >
        {restarting ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting…</>
        ) : (
          <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start New Run</>
        )}
      </Button>
      {error && (
        <div className="absolute right-0 top-10 z-[120] w-72 rounded-lg border border-red-500/25 bg-[#12090b] px-3 py-2 text-xs text-red-200 shadow-xl">
          {error}
        </div>
      )}
    </div>,
    target,
  );
}
