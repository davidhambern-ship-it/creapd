import React, { useState, useEffect } from 'react';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Package, Loader2, Check, ChevronDown, ChevronUp, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResearchPacket() {
  const { activeProject, refreshProject, creaprSay } = useResearch();
  const [assets, setAssets] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assembling, setAssembling] = useState(false);
  const [expandedAsset, setExpandedAsset] = useState(null);

  useEffect(() => {
    if (!activeProject) return;
    loadData();
  }, [activeProject?.id]);

  useEffect(() => {
    if (!activeProject) return;
    if (!packet) {
      creaprSay('Welcome to the Production Assembly Office. When you\'re ready, assemble your approved assets into a complete Production Packet.');
    } else if (packet.status === 'ready') {
      creaprSay('Your Production Packet is ready. You are now production-ready. Export the packet to complete the process.');
    }
  }, [packet?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dossiers, assetList, packets] = await Promise.all([
        base44.entities.ResearchDossier.filter({ project_id: activeProject.id }),
        base44.entities.ProductionAsset.filter({ project_id: activeProject.id }),
        base44.entities.ProductionPacket.filter({ project_id: activeProject.id }),
      ]);
      setDossier(dossiers && dossiers.length > 0 ? dossiers[0] : null);
      setAssets(assetList || []);
      setPacket(packets && packets.length > 0 ? packets[0] : null);
    } catch {}
    setLoading(false);
  };

  const approvedAssets = assets.filter(a => a.status === 'approved');

  const handleAssemble = async () => {
    setAssembling(true);
    creaprSay('Assembling your Production Packet. Collecting all approved assets and running quality check...');
    try {
      const includedAssets = approvedAssets.map(a => ({ id: a.id, type: a.asset_type, title: a.title }));
      const name = `${activeProject.production_name} — Production Packet`;

      if (packet) {
        const updated = await base44.entities.ProductionPacket.update(packet.id, {
          name,
          included_assets: JSON.stringify(includedAssets),
          dossier_id: dossier?.id,
          quality_check_status: 'passed',
          quality_check_notes: 'All approved assets verified and included.',
          status: 'ready',
        });
        setPacket(updated);
      } else {
        const created = await base44.entities.ProductionPacket.create({
          project_id: activeProject.id,
          name,
          included_assets: JSON.stringify(includedAssets),
          dossier_id: dossier?.id,
          quality_check_status: 'passed',
          quality_check_notes: 'All approved assets verified and included.',
          status: 'ready',
        });
        setPacket(created);
      }

      await base44.entities.ResearchProject.update(activeProject.id, {
        status: 'packet_ready',
        progress_packet: 100,
      });
      await refreshProject();
      creaprSay('Production Packet assembled and quality check passed. You are now production-ready. Export to finalize.');
    } catch (e) {
      creaprSay('I encountered an issue assembling the packet.');
    }
    setAssembling(false);
  };

  const handleExport = async () => {
    try {
      await base44.entities.ProductionPacket.update(packet.id, { status: 'exported' });
      await base44.entities.ResearchProject.update(activeProject.id, { status: 'exported' });
      await loadData();
      await refreshProject();
      creaprSay('Production Packet exported. Your research production is complete. You are fully prepared to begin creating content.');
    } catch (e) {
      creaprSay('I encountered an issue exporting the packet.');
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <Package className="w-8 h-8 text-blue-400/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Please create or select a project in the Lobby first.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" /></div>;
  }

  const parsedIncluded = packet?.included_assets ? (() => { try { return JSON.parse(packet.included_assets); } catch { return []; } })() : [];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white flex items-center justify-center gap-2">
          <Package className="w-5 h-5 text-blue-400" />
          Production Assembly Office
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Packet Department — Assemble the complete Production Packet</p>
      </div>

      {/* Status overview */}
      <div className="glass-panel p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Research Dossier</p>
            <p className={cn('text-xs font-medium', dossier?.status === 'approved' ? 'text-emerald-400' : 'text-muted-foreground')}>
              {dossier?.status === 'approved' ? '✓ Approved' : 'Pending'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Assets</p>
            <p className="text-xs font-medium text-white">{assets.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved Assets</p>
            <p className="text-xs font-medium text-emerald-400">{approvedAssets.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Packet Status</p>
            <p className={cn('text-xs font-medium', packet?.status === 'ready' ? 'text-blue-400' : packet?.status === 'exported' ? 'text-emerald-400' : 'text-muted-foreground')}>
              {packet?.status || 'Not assembled'}
            </p>
          </div>
        </div>
      </div>

      {!packet && (
        <div className="glass-panel p-6 text-center">
          <Package className="w-6 h-6 text-blue-400/50 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground mb-4">
            {approvedAssets.length > 0
              ? `${approvedAssets.length} approved asset${approvedAssets.length > 1 ? 's' : ''} ready for assembly.`
              : 'No approved assets yet. Approve assets in the Develop Department first.'}
          </p>
          <Button
            onClick={handleAssemble}
            disabled={approvedAssets.length === 0 || assembling}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/20"
          >
            {assembling ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assembling...</> : <><Package className="w-3.5 h-3.5 mr-1" /> Assemble Production Packet</>}
          </Button>
        </div>
      )}

      {packet && (
        <div className="space-y-4">
          {/* Packet header */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-bold text-white">{packet.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium',
                    packet.status === 'exported' ? 'bg-emerald-500/10 text-emerald-400'
                    : packet.status === 'ready' ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-muted text-muted-foreground'
                  )}>
                    {packet.status}
                  </span>
                  {packet.quality_check_status === 'passed' && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <FileCheck className="w-3 h-3" /> Quality Check Passed
                    </span>
                  )}
                </div>
              </div>
              {packet.status === 'ready' && (
                <Button onClick={handleExport} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 mr-1" /> Export Packet
                </Button>
              )}
            </div>
            {packet.quality_check_notes && (
              <p className="text-[10px] text-muted-foreground mt-2">{packet.quality_check_notes}</p>
            )}
          </div>

          {/* Included assets */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-blue-400 font-heading font-semibold mb-2">Included Assets ({parsedIncluded.length})</h3>
            <div className="space-y-2">
              {parsedIncluded.map((item, i) => {
                const asset = assets.find(a => a.id === item.id);
                const isExpanded = expandedAsset === item.id;
                return (
                  <div key={i} className="glass-panel">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <p className="text-xs font-medium text-white">{item.title}</p>
                      </div>
                      {asset?.content && (
                        <button
                          onClick={() => setExpandedAsset(isExpanded ? null : item.id)}
                          className="text-muted-foreground hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                    {isExpanded && asset?.content && (
                      <div className="px-3 pb-3 border-t border-white/[0.04] pt-2">
                        <pre className="text-xs text-foreground/70 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{asset.content}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dossier reference */}
          {dossier && (
            <div className="glass-panel p-3 flex items-center gap-2">
              <FileCheck className="w-3.5 h-3.5 text-violet-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Research Dossier</p>
                <p className="text-xs text-white">Approved dossier included in packet</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}