import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import { creapdApi } from '@/api/creapdClient';
import { Button } from '@/components/ui/button';
import { Loader2, Mic2, Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function TalkResearch() {
  const [searchParams] = useSearchParams();
  const configurationId = searchParams.get('config_id') || undefined;
  const { config, research, loading, refresh } = useTalkProduction(configurationId);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const autoStartedRef = useRef(false);

  const buildResearch = async () => {
    if (!config?.id || building) return;
    setBuilding(true);
    setBuildError('');
    try {
      await creapdApi.post('/production/core', {
        action: 'talk_build_research',
        configuration_id: config.id,
      });
      await refresh();
    } catch (error) {
      setBuildError(
        error?.data?.diagnostic?.message ||
        error?.data?.message ||
        error?.message ||
        'CREAPD could not build the Podcast research.'
      );
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (loading || !config?.id || research.length || building || autoStartedRef.current) return;
    autoStartedRef.current = true;
    buildResearch();
  }, [loading, config?.id, research.length]);

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

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Research
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Background research for your discussion topics</p>
      </div>

      <TalkProducerGuide
        currentStep="research"
        title="Review the research before you lock your discussion topics"
        instructions={[
          'Scan the summaries and sources so you understand what CREAPD found.',
          'Watch for weak, mixed, or questionable information that may need extra attention.',
          'When the research looks usable, move to Topics and decide what actually belongs in the show.',
        ]}
        readyText={`${research.length} research item${research.length === 1 ? '' : 's'} available for review`}
        nextPath={config?.id ? `/podcast/review?config_id=${encodeURIComponent(config.id)}` : '/podcast/review'}
        nextLabel="Review Discussion Topics"
        nextDescription="Research informs the show; Topics is where you decide what CREAPD should actually use."
      />

      {research.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          {building ? (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-foreground font-medium">CREAPD is researching this episode…</p>
              <p className="text-sm text-muted-foreground mt-1">Verifying sources, counter-perspectives, and discussion material.</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">{buildError || 'No research items are available yet.'}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={buildResearch}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Build Podcast Research
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {research.map(item => (
            <div key={item.id} className="glass-panel p-4 space-y-2">
              <div className="!flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm">{item.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  item.relevance === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                  item.relevance === 'medium' ? 'bg-primary/15 text-primary' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {item.relevance}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.source} · {item.date}</p>
              <p className="text-sm text-muted-foreground">{item.summary}</p>
              {item.category && (
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-secondary">{item.category}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
