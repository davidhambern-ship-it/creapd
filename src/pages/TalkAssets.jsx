import React, { useState } from 'react';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import TalkProducerGuide from '@/components/talk/TalkProducerGuide';
import { ASSET_TYPE_LABELS } from '@/lib/talkConstants';
import { Loader2, Mic2, Sparkles, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';

export default function TalkAssets() {
  const { config, assets, loading, refresh, source } = useTalkProduction();
  const [expanded, setExpanded] = useState(null);

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

  const toggleApproved = async (asset) => {
    const newStatus = asset.status === 'approved' ? 'ready' : 'approved';
    if (source === 'neon') {
      await creapdApi.post('/talk/production', {
        action: 'set_asset_status',
        asset_id: asset.id,
        status: newStatus,
      });
    } else {
      await base44.entities.TalkAsset.update(asset.id, { status: newStatus });
    }
    refresh();
  };

  const grouped = assets.reduce((acc, asset) => {
    const type = asset.asset_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});
  const approvedCount = assets.filter(asset => asset.status === 'approved').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Assets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI-generated host scripts, talking points, prompts, images, and production notes</p>
      </div>

      <TalkProducerGuide
        currentStep="assets"
        title="Review the material CREAPD prepared for the people running the show"
        instructions={[
          'Open the important assets and read them as if you were about to go on air. Check scripts, questions, prompts, images, and production notes for tone and usefulness.',
          'Approve the assets you are comfortable using. You do not need to approve optional promotional material you do not plan to use.',
          'When the production material is ready, move to Export for the final package check.',
        ]}
        readyText={`${approvedCount} of ${assets.length} asset${assets.length === 1 ? '' : 's'} approved`}
        nextPath="/talk/export"
        nextLabel="Final Package & Export"
        nextDescription="Export is the last checkpoint before you take the production package out of Talk Studio."
        note="Approval means ready for use. Unapproved assets remain available for review and do not have to block the rest of the show."
      />

      {assets.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No AI assets generated yet. Refresh your production to generate assets.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="glass-panel p-4">
              <h3 className="font-heading font-semibold text-sm mb-3 !flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {ASSET_TYPE_LABELS[type] || type}
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </h3>
              <div className="space-y-2">
                {items.map(asset => {
                  const isExpanded = expanded === asset.id;
                  const content = asset.content || '';
                  const isImage = asset.asset_type === 'ai_image' && /^https?:\/\//i.test(content);
                  const isLong = !isImage && content.length > 200;
                  const mediaType = asset?.source_payload?.media_type || null;
                  return (
                    <div key={asset.id} className="p-3 rounded-lg bg-secondary/30">
                      <div className="!flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-sm font-medium">{asset.title}</p>
                          {isImage && mediaType && (
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{mediaType}</p>
                          )}
                        </div>
                        <div className="!flex items-center gap-1 shrink-0">
                          {isLong && (
                            <button
                              onClick={() => setExpanded(isExpanded ? null : asset.id)}
                              className="text-xs text-primary hover:underline !flex items-center gap-0.5"
                            >
                              {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                            </button>
                          )}
                          <button
                            onClick={() => toggleApproved(asset)}
                            className={`text-xs px-2 py-0.5 rounded-md transition-colors !flex items-center gap-1 ${
                              asset.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/20 text-primary'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {asset.status === 'approved' ? 'Approved' : 'Approve'}
                          </button>
                        </div>
                      </div>

                      {isImage ? (
                        <a href={content} target="_blank" rel="noreferrer" className="block mt-3">
                          <img
                            src={content}
                            alt={asset.title || 'CREAPD generated visual'}
                            className="w-full max-w-3xl rounded-xl border border-white/10 object-cover bg-black/20"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {isExpanded || !isLong ? content : content.substring(0, 200) + '...'}
                        </p>
                      )}

                      {asset.audio_url && (
                        <div className="mt-2 !flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                          <Volume2 className="w-4 h-4 text-primary shrink-0" />
                          <audio controls src={asset.audio_url} className="h-8 flex-1 min-w-0" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
