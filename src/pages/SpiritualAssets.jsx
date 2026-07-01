import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, Save, FileText, CheckCircle2 } from 'lucide-react';
import { ASSET_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function SpiritualAssets() {
  const { config, assets, loading, refresh } = useSpiritualProduction();
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No AI assets generated yet. Refresh your production to generate assets.</p>
          <Button asChild><Link to="/spiritual/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const handleSave = async (assetId) => {
    setSaving(true);
    try {
      await base44.entities.SpiritualAsset.update(assetId, { content: editContent, status: 'needs_review' });
      setEditingId(null);
      await refresh();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleApprove = async (assetId) => {
    try {
      await base44.entities.SpiritualAsset.update(assetId, { status: 'approved' });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const groupedAssets = assets.reduce((acc, asset) => {
    const type = asset.asset_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {});

  const assetTypeColors = {
    title_slide: 'bg-primary/20 text-primary',
    scripture_slide: 'bg-berna-emerald/20 text-berna-emerald',
    social_graphic: 'bg-accent/20 text-accent',
    prayer_guide: 'bg-purple-500/20 text-purple-400',
    speaker_notes: 'bg-blue-500/20 text-blue-400',
    discussion_guide: 'bg-berna-orange/20 text-berna-orange',
    production_notes: 'bg-muted text-muted-foreground'
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold mb-1">AI Assets</h1>
          <p className="text-sm text-muted-foreground">{assets.length} assets · {assets.filter(a => a.status === 'approved').length} approved</p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([type, typeAssets]) => (
            <div key={type}>
              <h3 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                {ASSET_TYPE_LABELS[type] || type} ({typeAssets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeAssets.map(asset => (
                  <div key={asset.id} className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-heading font-semibold">{asset.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${assetTypeColors[asset.asset_type] || 'bg-muted text-muted-foreground'}`}>
                        {asset.status}
                      </span>
                    </div>

                    {editingId === asset.id ? (
                      <div className="space-y-2">
                        <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(asset.id)} disabled={saving}>
                            <Save className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3">{asset.content}</p>
                    )}

                    {asset.scripture_reference && (
                      <div className="mb-2 p-2 rounded-lg bg-secondary/30">
                        <p className="text-xs font-medium text-primary">{asset.scripture_reference}</p>
                        {asset.translation && <p className="text-xs text-muted-foreground">{asset.translation}</p>}
                      </div>
                    )}
                    {asset.citation && (
                      <div className="flex items-start gap-2 mb-3">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{asset.citation}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editingId === asset.id ? setEditingId(null) : (setEditingId(asset.id), setEditContent(asset.content || ''))}>
                        {editingId === asset.id ? 'Cancel' : 'Edit'}
                      </Button>
                      {asset.status !== 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(asset.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}