import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { DOSSIER_SECTIONS } from '@/lib/researchConstants';

function parseJsonField(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function renderSection(value, isJson) {
  if (!value) return <p className="text-xs text-muted-foreground/50">Not yet generated</p>;
  if (isJson) {
    const parsed = parseJsonField(value);
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return <p className="text-xs text-muted-foreground/50">No data</p>;
    return (
      <div className="space-y-1.5">
        {parsed.map((item, i) => (
          <div key={i} className="text-xs text-foreground/80">
            {typeof item === 'string' ? `• ${item}` : (
              <span>• {item.fact || item.name || item.figure || item.date || item.title || JSON.stringify(item)}{item.context || item.role || item.description ? ` — ${item.context || item.role || item.description}` : ''}</span>
            )}
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-foreground/80 whitespace-pre-wrap">{value}</p>;
}

export default function ResearchDossier() {
  const { activeProject, refreshProject, creaprSay } = useResearch();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    loadDossier();
  }, [activeProject?.id]);

  const loadDossier = async () => {
    setLoading(true);
    try {
      const dossiers = await base44.entities.ResearchDossier.filter({ project_id: activeProject.id });
      setDossier(dossiers && dossiers.length > 0 ? dossiers[0] : null);
    } catch { setDossier(null); }
    setLoading(false);
  };

  const handleBuild = async () => {
    setBuilding(true);
    creaprSay('Building your Research Dossier. I\'ll structure all findings into an executive briefing format...');
    try {
      await base44.functions.invoke('buildResearchDossier', { project_id: activeProject.id });
      await loadDossier();
      await refreshProject();
      creaprSay('Dossier drafted. Review each section below. When satisfied, approve the dossier to unlock the Develop Department.');
    } catch (e) {
      creaprSay('I encountered an issue building the dossier. Please ensure research has been conducted first.');
    }
    setBuilding(false);
  };

  const handleApprove = async () => {
    try {
      await base44.entities.ResearchDossier.update(dossier.id, { status: 'approved' });
      await base44.entities.ResearchProject.update(activeProject.id, {
        progress_dossier: 100,
        status: 'developing',
      });
      await loadDossier();
      await refreshProject();
      creaprSay('Dossier approved. The Develop Department is now unlocked. Proceed there to generate production assets.');
    } catch (e) {
      creaprSay('I encountered an issue approving the dossier.');
    }
  };

  const handleRebuild = async () => {
    setBuilding(true);
    creaprSay('Rebuilding the dossier with fresh analysis...');
    try {
      await base44.functions.invoke('buildResearchDossier', { project_id: activeProject.id });
      await loadDossier();
      creaprSay('Dossier rebuilt. Review the updated sections.');
    } catch (e) {
      creaprSay('I encountered an issue rebuilding the dossier.');
    }
    setBuilding(false);
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-8 h-8 text-violet-400/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Please create or select a project in the Lobby first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-6 h-6 text-violet-400 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white flex items-center justify-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          Executive Briefing Room
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Dossier Department — Transform raw research into structured knowledge</p>
      </div>

      {!dossier && !building && (
        <div className="glass-panel p-8 text-center">
          <FileText className="w-6 h-6 text-violet-400/50 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground mb-4">No dossier has been created yet. Build one from your research findings.</p>
          <Button
            onClick={handleBuild}
            disabled={activeProject.progress_research === 0}
            className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/20"
          >
            <FileText className="w-3.5 h-3.5 mr-1" /> Build Research Dossier
          </Button>
          {activeProject.progress_research === 0 && (
            <p className="text-[10px] text-muted-foreground mt-2">Conduct research first in the Research Department.</p>
          )}
        </div>
      )}

      {building && (
        <div className="glass-panel p-8 text-center">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">CREAPr is structuring your research into a comprehensive dossier...</p>
        </div>
      )}

      {dossier && !building && (
        <div className="space-y-4">
          {/* Confidence score */}
          <div className="glass-panel p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={dossier.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400' + ' text-[10px] px-2 py-0.5 rounded-full font-medium'}>
                {dossier.status}
              </span>
              {dossier.confidence_score > 0 && (
                <span className="text-xs text-muted-foreground">Confidence: <span className="text-white font-medium">{dossier.confidence_score}%</span></span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {dossier.status !== 'approved' && (
                <Button onClick={handleRebuild} size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white">
                  <RefreshCw className="w-3 h-3 mr-1" /> Rebuild
                </Button>
              )}
            </div>
          </div>

          {/* Dossier sections */}
          {DOSSIER_SECTIONS.map((section) => (
            <div key={section.key} className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-violet-400 font-heading font-semibold mb-2">{section.label}</h3>
              {renderSection(dossier[section.key], section.isJson)}
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {dossier.status !== 'approved' ? (
              <Button
                onClick={handleApprove}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Approve Dossier
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/research/develop')}
                className="bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 border border-pink-500/20"
              >
                Proceed to Develop <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}