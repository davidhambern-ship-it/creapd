import React from 'react';
import { Sparkles, Loader2, Clock, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CategoryBadge from '@/components/shared/CategoryBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';

export default function OverviewStage({ article, pkg, config, selectedDomain, contentDomains, handleGenerateAll, generatingAll, mediaStep }) {
  const domainLabel = contentDomains.find(d => d.domain_key === selectedDomain)?.display_name || selectedDomain;
  const statusLabel = pkg?.status ? pkg.status.replace(/_/g, ' ') : 'Not Generated';

  return (
    <div className="space-y-3">
      <div className="glass-panel p-4">
        <h2 className="text-base font-bold text-white leading-snug mb-2">{article.title}</h2>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {article.category && <CategoryBadge category={article.category} />}
          <OpportunityScore score={article.opportunity_score} />
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="text-white truncate ml-2 max-w-[60%] text-right">{article.source_name || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Runtime</span><span className="text-berna-emerald flex items-center gap-0.5">{pkg?.estimated_runtime ? <><Clock className="w-3 h-3" />{pkg.estimated_runtime}</> : '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-white capitalize">{statusLabel}</span></div>
        </div>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Cpu className="w-3.5 h-3.5 text-berna-purple" />
          <span className="text-xs font-semibold text-white">Generation Settings</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-muted-foreground block text-[10px]">Domain</span><span className="text-white">{domainLabel}</span></div>
          <div><span className="text-muted-foreground block text-[10px]">Tone</span><span className="text-white capitalize">{config.tone?.replace(/_/g, ' ')}</span></div>
          <div><span className="text-muted-foreground block text-[10px]">Style</span><span className="text-white capitalize">{config.reading_style?.replace(/_/g, ' ')}</span></div>
          <div><span className="text-muted-foreground block text-[10px]">Audience</span><span className="text-white">{config.audience}</span></div>
          <div><span className="text-muted-foreground block text-[10px]">Runtime</span><span className="text-white">{config.target_runtime}</span></div>
        </div>
      </div>

      <Button className="w-full bg-berna-purple hover:bg-berna-purple/90 text-white h-11" onClick={handleGenerateAll} disabled={generatingAll}>
        {generatingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        {generatingAll
          ? (mediaStep === 'voiceover' ? 'Generating Voice...'
            : mediaStep === 'thumbnail' ? 'Generating Thumbnail...'
            : mediaStep === 'story_image' ? 'Generating Image...'
            : mediaStep === 'video' ? 'Generating Video...'
            : 'Generating...')
          : pkg ? 'Regenerate Full Package' : 'Generate Full Package'}
      </Button>
    </div>
  );
}