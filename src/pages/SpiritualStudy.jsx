import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ResearchSearchBar from '@/components/study/ResearchSearchBar';
import SessionCard from '@/components/study/SessionCard';
import { Loader2, GraduationCap, Pin, Clock, BookOpen, Sparkles } from 'lucide-react';
import { safeJsonParse } from '@/lib/studyConstants';

export default function SpiritualStudy() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [faithSettings, setFaithSettings] = useState(null);
  const [faithSettingsLoaded, setFaithSettingsLoaded] = useState(false);
  const autoRunTriggered = useRef(false);

  const loadSessions = useCallback(async () => {
    const [all, pinned] = await Promise.all([
      base44.entities.ResearchSession.list('-created_date', 50),
      base44.entities.ResearchSession.filter({ is_pinned: true }, '-created_date', 10)
    ]);
    setSessions(all || []);
    setLoading(false);
  }, []);

  const loadFaithSettings = useCallback(async () => {
    try {
      const configs = await base44.entities.SpiritualProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        const c = configs[0];
        setFaithSettings({
          faith_tradition: c.faith_tradition,
          branch_denomination: c.branch_denomination,
          sacred_texts: c.sacred_texts,
          research_sources: c.research_sources
        });
      }
    } catch {}
    setFaithSettingsLoaded(true);
  }, []);

  useEffect(() => {
    loadSessions();
    loadFaithSettings();
  }, [loadSessions, loadFaithSettings]);

  // Auto-run research when arriving from a Related Study click, Dashboard topic, or Research item
  useEffect(() => {
    if (autoRunTriggered.current || !faithSettingsLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');
    const autoRun = params.get('autoRun') === 'true';
    const sourceSession = params.get('sourceSession');
    const researchItemId = params.get('researchItem');

    if (autoRun && query) {
      autoRunTriggered.current = true;
      handleSearch(query, sourceSession);
    } else if (autoRun && researchItemId) {
      autoRunTriggered.current = true;
      handleStartStudyFromResearch(researchItemId);
    }
  }, [faithSettingsLoaded]);

  const handleStartStudyFromResearch = async (researchItemId) => {
    setResearching(true);
    try {
      const item = await base44.entities.SpiritualResearchItem.get(researchItemId);
      if (!item) { setResearching(false); return; }

      const question = item.title;
      const notebookContent = `**Research Source:** ${item.title}\nSource: ${item.source || 'N/A'}\nAuthor: ${item.author || 'N/A'}\nCitation: ${item.citation || 'N/A'}\nSummary: ${item.summary || ''}\nURL: ${item.source_url || 'N/A'}\n\n---`;

      const sessionData = {
        title: question.length > 60 ? question.substring(0, 60) + '...' : question,
        research_question: question,
        status: 'researching',
        faith_tradition: faithSettings?.faith_tradition || 'Christianity',
        branch_denomination: faithSettings?.branch_denomination || 'No Preference',
        sacred_texts: faithSettings?.sacred_texts || JSON.stringify([]),
        research_sources: faithSettings?.research_sources || JSON.stringify([]),
        notebook_content: notebookContent
      };

      const session = await base44.entities.ResearchSession.create(sessionData);
      await base44.entities.SpiritualResearchItem.update(researchItemId, { added_to_study: true });
      base44.functions.invoke('conductResearch', { session_id: session.id }).catch(() => {});
      navigate(`/spiritual/study/${session.id}`);
    } catch (err) {
      setResearching(false);
    }
  };

  const handleSearch = async (question, sourceSessionId) => {
    setResearching(true);
    try {
      const sessionData = {
        title: question.length > 60 ? question.substring(0, 60) + '...' : question,
        research_question: question,
        status: 'researching',
        faith_tradition: faithSettings?.faith_tradition || 'Christianity',
        branch_denomination: faithSettings?.branch_denomination || 'No Preference',
        sacred_texts: faithSettings?.sacred_texts || JSON.stringify([]),
        research_sources: faithSettings?.research_sources || JSON.stringify([])
      };
      if (sourceSessionId) sessionData.source_session_id = sourceSessionId;

      const session = await base44.entities.ResearchSession.create(sessionData);
      base44.functions.invoke('conductResearch', { session_id: session.id, source_session_id: sourceSessionId }).catch(() => {});
      navigate(`/spiritual/study/${session.id}`);
    } catch (err) {
      setResearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pinned = sessions.filter(s => s.is_pinned && !s.is_archived);
  const recent = sessions.filter(s => !s.is_archived).slice(0, 12);
  const recentQuestions = sessions.filter(s => !s.is_archived).slice(0, 6);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">Study Workspace</h1>
              <p className="text-sm text-muted-foreground">Producer's Research Engine</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <ResearchSearchBar onSearch={handleSearch} disabled={researching} />
          {researching && (
            <p className="text-sm text-primary mt-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Starting research...
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {['What did Yeshua preach?', 'Compare Calvinism and Arminianism', 'What does Agape mean?', 'History of Baptism', 'Explain the Kingdom of God'].map(q => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                disabled={researching}
                className="px-3 py-1.5 rounded-lg text-xs bg-secondary/30 border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {pinned.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Pin className="w-4 h-4 text-accent" /> Pinned Research
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pinned.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          </section>
        )}

        {recent.length > 0 ? (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4" /> Recent Research
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          </section>
        ) : (
          <div className="glass-panel p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-2">Begin Your First Study</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ask any spiritual research question. Producer will determine the study type, search approved sources, and build a permanent research project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}