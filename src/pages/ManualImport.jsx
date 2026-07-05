import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2, CheckCircle, AlertCircle, ArrowRight, FileInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ManualImport() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('importStory', { url });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileInput className="w-5 h-5 text-berna-purple" />
          Manual Story Import
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Paste any article URL — Producer fetches, analyzes, and creates a production-ready story</p>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="https://example.com/news/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9 bg-white/[0.03] border-white/[0.08] text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
          </div>
          <Button onClick={handleImport} disabled={loading || !url} className="bg-berna-purple hover:bg-berna-purple/90 text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Analyzing...</> : 'Analyze & Import'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Producer will fetch the article, extract key facts, generate talking points, and add it to your Story Queue.
        </p>
      </div>

      {error && (
        <div className="glass-panel p-4 border-red-500/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result?.article && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center gap-2 text-berna-emerald">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">Story imported successfully</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{result.article.title}</h2>
            {result.article.source_name && <p className="text-xs text-muted-foreground mt-1">Source: {result.article.source_name}</p>}
          </div>
          {result.article.summary && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Summary</p>
              <p className="text-sm text-white/80">{result.article.summary}</p>
            </div>
          )}
          {result.analysis?.key_facts && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Key Facts</p>
              <p className="text-sm text-white/80">{result.analysis.key_facts}</p>
            </div>
          )}
          {result.analysis?.why_it_matters && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Why It Matters</p>
              <p className="text-sm text-white/80">{result.analysis.why_it_matters}</p>
            </div>
          )}
          {result.analysis?.talking_points && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Talking Points</p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{result.analysis.talking_points}</p>
            </div>
          )}
          {result.analysis?.fact_check_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fact Check Notes</p>
              <p className="text-sm text-white/80">{result.analysis.fact_check_notes}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => navigate('/news/queue')} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
              View in Story Queue <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setResult(null); setUrl(''); }} className="border-white/10 text-white text-xs">
              Import Another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}