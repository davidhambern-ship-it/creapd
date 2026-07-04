import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Filter, Video, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContentIntelligenceControls({ articles, onRefresh }) {
  const [fetching, setFetching] = useState(false);
  const [sifting, setSifting] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const videoCount = articles.filter(a => a.content_type === 'video').length;
  const textCount = articles.filter(a => a.content_type === 'text').length;
  const unknownCount = articles.filter(a => !a.content_type || a.content_type === 'unknown').length;
  const pendingVideoCount = articles.filter(a => a.content_type === 'video' && (!a.transcription_status || a.transcription_status === 'pending')).length;

  const handleFetch = async () => {
    setFetching(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('fetchStories', { manual: true });
      setLastResult({ action: 'fetch', ...res.data });
      if (onRefresh) await onRefresh();
    } catch (e) {
      setLastResult({ action: 'fetch', error: e.message });
    } finally {
      setFetching(false);
    }
  };

  const handleSift = async () => {
    setSifting(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('siftArticles', { manual: true });
      setLastResult({ action: 'sift', ...res.data });
      if (onRefresh) await onRefresh();
    } catch (e) {
      setLastResult({ action: 'sift', error: e.message });
    } finally {
      setSifting(false);
    }
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    setLastResult(null);
    try {
      const res = await base44.functions.invoke('processVideoArticle', { manual: true });
      setLastResult({ action: 'transcribe', ...res.data });
      if (onRefresh) await onRefresh();
    } catch (e) {
      setLastResult({ action: 'transcribe', error: e.message });
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="glass-panel p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleFetch} disabled={fetching}
          className="border-berna-purple/30 text-berna-purple hover:bg-berna-purple/10 text-xs h-8">
          {fetching ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
          Fetch Stories
        </Button>
        <Button size="sm" variant="outline" onClick={handleSift} disabled={sifting || unknownCount === 0}
          className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10 text-xs h-8">
          {sifting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Filter className="w-3 h-3 mr-1" />}
          Sift Content
          {unknownCount > 0 && <span className="ml-1 text-[9px] bg-white/10 px-1 rounded">{unknownCount}</span>}
        </Button>
        <Button size="sm" variant="outline" onClick={handleTranscribe} disabled={transcribing || pendingVideoCount === 0}
          className="border-berna-orange/30 text-berna-orange hover:bg-berna-orange/10 text-xs h-8">
          {transcribing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Video className="w-3 h-3 mr-1" />}
          Transcribe Videos
          {pendingVideoCount > 0 && <span className="ml-1 text-[9px] bg-white/10 px-1 rounded">{pendingVideoCount}</span>}
        </Button>
      </div>

      <div className="flex items-center gap-3 ml-auto text-[10px]">
        <span className="text-berna-orange flex items-center gap-1">
          <Video className="w-2.5 h-2.5" />{videoCount} video
        </span>
        <span className="text-blue-400 flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />{textCount} text
        </span>
        {unknownCount > 0 && <span className="text-muted-foreground">{unknownCount} unclassified</span>}
      </div>

      {lastResult && (
        <div className="w-full text-[10px] text-muted-foreground border-t border-white/[0.04] pt-2 mt-1">
          {lastResult.error ? (
            <span className="text-red-400">Error: {lastResult.error}</span>
          ) : lastResult.skipped ? (
            <span className="text-yellow-400">Automation skipped: {lastResult.reason}</span>
          ) : lastResult.action === 'fetch' ? (
            <span>Fetched {lastResult.articles_pulled || 0} articles · {lastResult.articles_created || 0} new · {lastResult.duplicates_removed || 0} duplicates</span>
          ) : lastResult.action === 'sift' ? (
            <span>Classified {lastResult.classified || 0} articles · {lastResult.video_count || 0} video · {lastResult.text_count || 0} text</span>
          ) : lastResult.action === 'transcribe' ? (
            <span>Processed {lastResult.processed || 0} videos · {lastResult.transcribed || 0} transcribed · {lastResult.summarized || 0} summarized</span>
          ) : null}
        </div>
      )}
    </div>
  );
}