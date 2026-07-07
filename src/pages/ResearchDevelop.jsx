import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ASSET_TYPES } from '@/lib/researchConstants';
import { cn } from '@/lib/utils';

export default function ResearchDevelop() {
  const { activeProject, refreshProject, creaprSay } = useResearch();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [expandedAsset, setExpandedAsset] = useState(null);

  useEffect(() => {
    if (!activeProject) return;
    loadData();
  }, [activeProject?.id]);

  useEffect(() => {
    if (!activeProject) return;
    if (!dossier || dossier.status !== 'approved') {
      creaprSay('Welcome to the Creative Development Studio. An approved Research Dossier is required before generating production assets. Please approve your dossier in the Dossier Department first.');
    } else {
      creaprSay('Welcome to the Creative Development Studio. Select the production assets you\'d like me to generate from your approved dossier.');
    }
  }, [dossier?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dossiers, assetList] = await Promise.all([
        base44.entities.ResearchDossier.filter({ project_id: activeProject.id }),
        base44.entities.ProductionAsset.filter({ project_id: activeProject.id }),
      ]);
      setDossier(dossiers && dossiers.length > 0 ? dossiers[0] : null);
      setAssets(assetList || []);
    } catch {}
    setLoading(false);
  };

  const toggleType = (key) => {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleGenerate = async () => {
    if (selectedTypes.length === 0) return;
    setGenerating(true);
    creaprSay(`Generating ${selectedTypes.length} production asset${selectedTypes.length > 1 ? 's' : ''} from your approved dossier...`);
    try {
      await base44.functions.invoke('generateResearchAssets', {
        project_id: activeProject.id,
        asset_types: selectedTypes,
      });
      await loadData();
      await refreshProject();
      setSelectedTypes([]);
      creaprSay('Production assets generated. Review them below and approve the ones you\'d like included in your Production Packet.');
    } catch (e) {
      creaprSay('I encountered an issue generating assets. Please ensure your dossier is approved.');
    }
    setGenerating(false);
  };

  const handleApproveAsset = async (asset) => {
    try {
      await base44.entities.ProductionAsset.update(asset.id, { status: 'approved' });
      await loadData();
    } catch {}
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <Wand2 className="w-8 h-8 text-pink-400/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Please create or select a project in the Lobby first.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-pink-400 animate-spin mx-auto" /></div>;
  }

  const dossierApproved = dossier && dossier.status === 'approved';

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white flex items-center justify-center gap-2">
          <Wand2 className="w-5 h-5 text-pink-400" />
          Creative Development Studio
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Develop Department — Transform the dossier into production assets</p>
      </div>

      {!dossierApproved ? (
        <div className="glass-panel p-8 text-center">
          <Wand2 className="w-6 h-6 text-pink-400/50 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground mb-4">An approved Research Dossier is required before generating production assets.</p>
          <Button onClick={() => navigate('/research/dossier')} variant="outline" size="sm">
            Go to Dossier Department <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      ) : (
        <>
          {/* Asset type selection */}
          <div className="glass-panel p-4">
            <h3 className="text-xs uppercase tracking-wider text-pink-400 font-heading font-semibold mb-3">Select Assets to Generate</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {ASSET_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type.key);
                const existing = assets.find(a => a.asset_type === type.key);
                return (
                  <button
                    key={type.key}
                    onClick={() => toggleType(type.key)}
                    className={cn(
                      'p-2 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'bg-pink-500/15 border-pink-500/30'
                        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15'
                    )}
                  >
                    <p className="text-xs font-medium text-white">{type.label}</p>
                    {existing && (
                      <span className={cn('text-[9px] mt-0.5 inline-block', existing.status === 'approved' ? 'text-emerald-400' : 'text-pink-400')}>
                        {existing.status}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selectedTypes.length} selected</span>
              <Button
                onClick={handleGenerate}
                disabled={selectedTypes.length === 0 || generating}
                className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/20"
              >
                {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate Assets</>}
              </Button>
            </div>
          </div>

          {/* Generated assets */}
          {assets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-heading font-semibold">Generated Assets ({assets.length})</h3>
              {assets.map((asset) => (
                <div key={asset.id} className="glass-panel">
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                        asset.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                        : asset.status === 'generating' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-pink-500/10 text-pink-400'
                      )}>
                        {asset.status}
                      </span>
                      <p className="text-sm font-medium text-white">{asset.title}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {asset.status !== 'approved' && (
                        <Button onClick={() => handleApproveAsset(asset)} size="sm" variant="ghost" className="text-xs text-emerald-400 hover:text-emerald-300 h-7">
                          <Check className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      <button
                        onClick={() => setExpandedAsset(expandedAsset === asset.id ? null : asset.id)}
                        className="text-muted-foreground hover:text-white p-1"
                      >
                        {expandedAsset === asset.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {expandedAsset === asset.id && (
                    <div className="px-3 pb-3 border-t border-white/[0.04] pt-2">
                      <pre className="text-xs text-foreground/70 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{asset.content}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {assets.length > 0 && (
            <div className="flex justify-center">
              <Button
                onClick={() => navigate('/research/packet')}
                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20"
              >
                Proceed to Packet <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}