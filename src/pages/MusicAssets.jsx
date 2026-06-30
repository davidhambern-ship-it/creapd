import React, { useState } from 'react';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/musicConstants';

export default function MusicAssets() {
  const { config, assets, loading, refresh } = useMusicProduction();
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const handleSave = async (asset) => {
    await base44.entities.MusicAsset.update(asset.id, { content: editContent, status: 'approved' });
    setEditingId(null);
    refresh();
  };

  const handleRegenerate = async () => {
    if (!config?.id) return;
    setRegenerating(true);
    try {
      await base44.functions.invoke('buildMusicProduction', { configuration_id: config.id });
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  // Group assets by type
  const grouped = assets.reduce((acc, asset) => {
    if (!acc[asset.asset_type]) acc[asset.asset_type] = [];
    acc[asset.asset_type].push(asset);
    return acc;
  }, {});

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-primary" /> AI Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">{config?.production_name || 'Music Production'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Regenerate All
        </Button>
      </div>

      {assets.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, typeAssets]) => (
            <div key={type}>
              <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {ASSET_TYPE_LABELS[type] || type} ({typeAssets.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeAssets.map(asset => (
                  <div key={asset.id} className="glass-panel p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">{asset.title}</h3>
                      {asset.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    {editingId === asset.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={6}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(asset)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4 mb-2">{asset.content}</p>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(asset.id); setEditContent(asset.content || ''); }}>
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No AI assets have been generated yet. Generate selected assets now.</p>
          <Button onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Generate Assets
          </Button>
        </div>
      )}
    </div>
  );
}