import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import { creapdApi } from '@/api/creapdClient';

export default function TalkLiveRestartControl() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('config_id') || undefined;
  const { config, segments, session, source, loading } = useTalkProduction(configId);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');

  if (location.pathname !== '/talk/live') return null;
  if (loading || source !== 'neon' || !config || session?.status !== 'complete') return null;

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

  return (
    <div className="fixed top-20 right-5 md:right-7 z-[70] flex flex-col items-end gap-2">
      <div className="rounded-xl border border-emerald-500/25 bg-black/90 backdrop-blur-xl p-3 shadow-2xl max-w-sm">
        <div className="flex items-center gap-2 mb-2 text-emerald-300">
          <RotateCcw className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Run complete</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Start this production again for another rehearsal, recording, or broadcast. CREAPD will create a fresh run and restart at Segment 1.
        </p>
        <Button onClick={handleRestart} disabled={restarting} className="w-full">
          {restarting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting New Run…</>
          ) : (
            <><Play className="w-4 h-4 mr-2" /> Start New Run</>
          )}
        </Button>
        {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
      </div>
    </div>
  );
}
