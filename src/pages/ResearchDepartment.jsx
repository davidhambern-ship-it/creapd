import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResearch } from '@/context/ResearchContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ArrowRight, FileText } from 'lucide-react';

export default function ResearchDepartment() {
  const { activeProject, refreshProject, creaprSay } = useResearch();
  const navigate = useNavigate();
  const [researching, setResearching] = useState(false);
  const [findings, setFindings] = useState(null);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    if (!activeProject) return;
    loadTopics();
    if (activeProject.progress_research > 0) {
      creaprSay('Welcome to the Research Archives. Your research is in progress. Review the findings below.');
    } else if (activeProject.research_question) {
      creaprSay(`Welcome to the Research Archives. Ready to conduct deep research on: "${activeProject.research_question}". Click "Conduct Research" to begin.`);
    } else {
      creaprSay('Welcome to the Research Archives. Please define a research topic in the Topics Department first.');
    }
  }, [activeProject?.id]);

  const loadTopics = async () => {
    try {
      const t = await base44.entities.ResearchTopic.filter({ project_id: activeProject.id });
      setTopics(t || []);
    } catch { setTopics([]); }
  };

  const handleResearch = async () => {
    if (!activeProject?.research_question) {
      creaprSay('Please define a research topic in the Topics Department first.');
      return;
    }
    setResearching(true);
    creaprSay('Initiating deep research. I\'ll search multiple sources and compile findings. This may take a moment...');
    try {
      const res = await base44.functions.invoke('conductResearch', {
        project_id: activeProject.id,
        research_question: activeProject.research_question,
        key_questions: topics.flatMap(t => {
          try { return JSON.parse(t.key_questions || '[]'); } catch { return []; }
        }),
      });
      setFindings(res.data?.research);
      creaprSay('Research complete. I\'ve compiled findings, timeline, key people, statistics, and sources. Review them below, then proceed to the Dossier Department to structure everything.');
      await refreshProject();
    } catch (e) {
      creaprSay('I encountered an issue during research. Please try again.');
    }
    setResearching(false);
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center">
        <Search className="w-8 h-8 text-emerald-400/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Please create or select a project in the Lobby first.</p>
      </div>
    );
  }

  const research = findings || (activeProject.progress_research > 0 ? { summary: 'Research has been conducted. Proceed to the Dossier Department.' } : null);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl lg:text-2xl font-heading font-bold text-white flex items-center justify-center gap-2">
          <Search className="w-5 h-5 text-emerald-400" />
          Research Archives
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Research Department — Acquire knowledge through deep research</p>
      </div>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Research Question</p>
            <p className="text-sm text-white font-medium">{activeProject.research_question || 'No topic defined'}</p>
          </div>
          <Button
            onClick={handleResearch}
            disabled={researching || !activeProject.research_question}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20"
          >
            {researching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Researching...</> : <><Search className="w-3.5 h-3.5" /> Conduct Research</>}
          </Button>
        </div>
      </div>

      {researching && (
        <div className="glass-panel p-8 text-center">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">CREAPr is conducting deep research across multiple sources...</p>
        </div>
      )}

      {research && !researching && (
        <div className="space-y-4">
          {research.summary && (
            <div className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-heading font-semibold mb-2">Summary</h3>
              <p className="text-sm text-foreground/90">{research.summary}</p>
            </div>
          )}

          {research.findings && research.findings.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-heading font-semibold mb-2">Key Findings</h3>
              <div className="space-y-2">
                {research.findings.slice(0, 8).map((f, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-foreground/90">• {f.fact}</p>
                    {f.context && <p className="text-muted-foreground ml-3">{f.context}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {research.timeline && research.timeline.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-heading font-semibold mb-2">Timeline</h3>
              <div className="space-y-1">
                {research.timeline.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-emerald-400/70 font-mono flex-shrink-0">{t.date}</span>
                    <span className="text-foreground/80">{t.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {research.key_people && research.key_people.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-heading font-semibold mb-2">Important People</h3>
              <div className="grid grid-cols-2 gap-2">
                {research.key_people.slice(0, 6).map((p, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-muted-foreground">{p.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {research.sources && research.sources.length > 0 && (
            <div className="glass-panel p-4">
              <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-heading font-semibold mb-2">Sources</h3>
              <div className="space-y-1">
                {research.sources.slice(0, 6).map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">• {typeof s === 'string' ? s : s.title || JSON.stringify(s)}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/research/dossier')}
              className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/20"
            >
              Proceed to Dossier <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {!research && !researching && (
        <div className="glass-panel p-8 text-center">
          <FileText className="w-6 h-6 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">No research conducted yet. Click "Conduct Research" to begin.</p>
        </div>
      )}
    </div>
  );
}