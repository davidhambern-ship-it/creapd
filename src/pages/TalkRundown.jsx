import React from 'react';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import { formatRuntime, SEGMENT_TYPE_LABELS } from '@/lib/talkConstants';
import { Loader2, Mic2, ClipboardList, AlertCircle, Clock } from 'lucide-react';

export default function TalkRundown() {
  const { config, segments, loading } = useTalkProduction();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <Mic2 className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const totalSeconds = segments.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const targetSeconds = Number(config.total_show_runtime || 0) * 60;
  const runtimeDelta = targetSeconds ? Math.abs(totalSeconds - targetSeconds) : 0;
  const runtimeLooksClose = !targetSeconds || runtimeDelta <= 300;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Show Rundown
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Structured show timeline with segments and timings</p>
      </div>

      <TalkProducerGuide
        currentStep="rundown"
        title="Make sure CREAPD's show flow matches the production you want to run"
        instructions={[
          'Read the rundown from top to bottom and make sure the segment order feels natural.',
          'Check timing, sponsor breaks, transitions, intros, and outros against the runtime you configured.',
          'If the structure looks right, move to AI Assets and review the scripts, prompts, and production material CREAPD created for this rundown.',
        ]}
        readyText={segments.length ? `${segments.length} segments · ${formatRuntime(totalSeconds)} generated${runtimeLooksClose ? ' · runtime is close to target' : ' · review runtime against your target'}` : 'No rundown is available yet'}
        nextPath="/talk/assets"
        nextLabel="Review AI Assets"
        nextDescription="Assets are the host scripts, prompts, social copy, and production notes tied to this show."
        note="If the rundown needs a major structural change, go back to Show Setup, adjust the production configuration, and rebuild rather than trying to force a bad plan forward."
      />

      {segments.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No rundown generated yet. Refresh your production to generate the rundown.</p>
        </div>
      ) : (
        <>
          <div className="glass-panel p-4 !flex items-center gap-4 text-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Total Segments:</span>
            <span className="font-medium">{segments.length}</span>
            <span className="text-muted-foreground ml-4">Total Runtime:</span>
            <span className="font-medium">{formatRuntime(totalSeconds)}</span>
            {targetSeconds > 0 && (
              <>
                <span className="text-muted-foreground ml-4">Target:</span>
                <span className={runtimeLooksClose ? 'font-medium text-emerald-400' : 'font-medium text-amber-400'}>{formatRuntime(targetSeconds)}</span>
              </>
            )}
          </div>

          <div className="glass-panel p-4 space-y-1">
            {segments.map((item, i) => (
              <div key={item.id} className="!flex items-center gap-3 py-2 px-2 rounded hover:bg-white/5 border-b border-white/[0.03] last:border-0">
                <span className="text-xs text-muted-foreground w-10 text-right">{i + 1}.</span>
                <span className="text-xs font-mono text-muted-foreground w-14">{item.start_time || '--:--'}</span>
                <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${SEGMENT_TYPE_LABELS[item.segment_type] ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {SEGMENT_TYPE_LABELS[item.segment_type] || item.segment_type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.notes && <p className="text-xs text-muted-foreground truncate">{item.notes}</p>}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatRuntime(item.duration_seconds)}</span>
                <span className="text-xs font-mono text-muted-foreground shrink-0">{item.end_time || '--:--'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
