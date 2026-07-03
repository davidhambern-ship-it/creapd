import React, { useState } from 'react';
import { CheckSquare, CheckCircle2, ExternalLink, BookMarked } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssetEditor from '@/components/production/AssetEditor';

export default function FactCheckStage({ article, pkg, assetDefs, edits, handleAssetChange, handleRegenerate, generating, handleSaveAll, saving, hasEdits }) {
  const [marked, setMarked] = useState(false);
  const factAsset = assetDefs.find(a => a.key === 'fact_check_notes');

  const handleMarkComplete = async () => {
    if (hasEdits) await handleSaveAll();
    setMarked(true);
  };

  return (
    <div className="space-y-3">
      {factAsset && (
        <AssetEditor
          assetKey="fact_check_notes"
          label="Fact Check Notes"
          icon={factAsset.icon}
          value={pkg?.fact_check_notes || ''}
          onChange={handleAssetChange}
          onRegenerate={handleRegenerate}
          generating={generating}
        />
      )}

      <div className="glass-panel overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
          <BookMarked className="w-3.5 h-3.5 text-berna-purple" />
          <span className="text-xs font-semibold text-white">Source References</span>
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex gap-2 text-xs"><span className="text-muted-foreground w-24 flex-shrink-0">Source</span><span className="text-white">{article.source_name || '—'}</span></div>
          <div className="flex gap-2 text-xs"><span className="text-muted-foreground w-24 flex-shrink-0">Publication</span><span className="text-white">{article.publication || '—'}</span></div>
          <div className="flex gap-2 text-xs"><span className="text-muted-foreground w-24 flex-shrink-0">Date</span><span className="text-white">{article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span></div>
          <div className="flex gap-2 text-xs"><span className="text-muted-foreground w-24 flex-shrink-0">Link</span>{article.url ? <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-berna-purple hover:underline truncate flex items-center gap-1"><ExternalLink className="w-3 h-3 flex-shrink-0" />{article.url}</a> : <span className="text-white">—</span>}</div>
          {article.additional_sources && <div className="flex gap-2 text-xs"><span className="text-muted-foreground w-24 flex-shrink-0">Additional</span><span className="text-white whitespace-pre-wrap">{article.additional_sources}</span></div>}
        </div>
      </div>

      <Button className="w-full h-9" variant={marked ? 'outline' : 'default'} onClick={handleMarkComplete} disabled={marked || saving}>
        {marked
          ? <><CheckCircle2 className="w-4 h-4 mr-2 text-berna-emerald" />Fact Check Complete</>
          : <><CheckSquare className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Mark Fact Check Complete'}</>}
      </Button>
      {hasEdits && !marked && <p className="text-[10px] text-berna-orange text-center">Unsaved edits — will save before marking complete.</p>}
    </div>
  );
}