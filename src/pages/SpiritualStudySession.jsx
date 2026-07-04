import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import FindingsSection from '@/components/study/FindingsSection';
import WordStudyCard from '@/components/study/WordStudyCard';
import ResearchProgress from '@/components/study/ResearchProgress';
import ResearchNotebook from '@/components/study/ResearchNotebook';
import ResearchAssistant from '@/components/study/ResearchAssistant';
import RelatedStudyCard from '@/components/study/RelatedStudyCard';
import ProductionIdeaCard from '@/components/study/ProductionIdeaCard';
import { STUDY_TYPE_LABELS, safeJsonParse, mapProductionType, mapAudience, mapTone, mapRuntime } from '@/lib/studyConstants';
import { DEFAULT_AI_AUTOMATION } from '@/lib/spiritualConstants';
import CreateMessageButton from '@/components/message/CreateMessageButton';
import {
  ArrowLeft, Loader2, BookOpen, Languages, Landmark, GitCompare,
  Users, FileText, Clock, Lightbulb, MessageSquare, Sparkles,
  Pin, Archive, Download, BookPlus, PenTool
} from 'lucide-react';

export default function SpiritualStudySession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildingIdea, setBuildingIdea] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    loadSession();

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const s = await base44.entities.ResearchSession.get(sessionId);
      setSession(s);
      setLoading(false);

      if (s.status === 'researching') {
        pollRef.current = setInterval(async () => {
          try {
            const updated = await base44.entities.ResearchSession.get(sessionId);
            setSession(updated);
            if (updated.status !== 'researching') {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch {}
        }, 10000);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleSaveNotebook = async (content) => {
    await base44.entities.ResearchSession.update(sessionId, { notebook_content: content });
  };

  const togglePin = async () => {
    await base44.entities.ResearchSession.update(sessionId, { is_pinned: !session.is_pinned });
    setSession({ ...session, is_pinned: !session.is_pinned });
  };

  const toggleArchive = async () => {
    await base44.entities.ResearchSession.update(sessionId, { is_archived: !session.is_archived });
    setSession({ ...session, is_archived: !session.is_archived });
  };

  const handleBuildProduction = async (idea) => {
    setBuildingIdea(true);
    try {
      const configData = {
        production_name: idea.title,
        production_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        live_or_recorded: 'live',
        faith_tradition: session.faith_tradition || 'Christianity',
        branch_denomination: session.branch_denomination || 'No Preference',
        production_type: mapProductionType(idea.production_type),
        audience: mapAudience(idea.suggested_audience),
        speaker_tone: mapTone(idea.suggested_tone),
        target_runtime: mapRuntime(idea.suggested_runtime),
        production_description: idea.description || '',
        sacred_texts: session.sacred_texts || JSON.stringify([]),
        research_sources: session.research_sources || JSON.stringify([]),
        study_topics: JSON.stringify([session.research_question]),
        ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
        source_research_session_id: session.id,
        current_events_enabled: true,
        multiple_perspectives: true,
        status: 'building',
        is_default: true
      };

      const savedConfig = await base44.entities.SpiritualProductionConfiguration.create(configData);
      await base44.auth.updateMe({
        default_production_type: 'spiritual',
        default_production_config_id: savedConfig.id
      });

      base44.functions.invoke('buildSpiritualProduction', {
        configuration_id: savedConfig.id,
        research_session_id: session.id
      }).catch(() => {});

      navigate('/spiritual/dashboard');
    } catch (err) {
      setBuildingIdea(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Research session not found.</p>
          <Link to="/spiritual/study" className="text-primary hover:underline">Back to Study Workspace</Link>
        </div>
      </div>
    );
  }

  if (session.status === 'researching') {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/spiritual/study" className="inline-flex items-center gap-1 text-sm text-berna-orange hover:text-berna-orange/80 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Study Workspace
          </Link>
          <ResearchProgress session={session} />
        </div>
      </div>
    );
  }

  const words = safeJsonParse(session.original_language_analysis, []);
  const timeline = safeJsonParse(session.timeline_events, []);
  const comparisons = safeJsonParse(session.comparative_analysis, []);
  const perspectives = safeJsonParse(session.multiple_perspectives, []);
  const related = safeJsonParse(session.related_studies, []);
  const sources = safeJsonParse(session.sources_used, []);
  const questions = safeJsonParse(session.discussion_questions, []);
  const ideas = safeJsonParse(session.production_ideas, []);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/spiritual/study" className="inline-flex items-center gap-1 text-sm text-berna-orange hover:text-berna-orange/80 mb-4">
          <ArrowLeft className="w-4 h-4" /> Study Workspace
        </Link>

        <div className="glass-panel p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium">
                  {STUDY_TYPE_LABELS[session.study_type] || 'Custom Research'}
                </span>
                {session.faith_tradition && (
                  <span className="text-xs text-muted-foreground">{session.faith_tradition}</span>
                )}
              </div>
              <h1 className="text-xl font-heading font-bold mb-1">{session.title}</h1>
              <p className="text-sm text-muted-foreground">{session.research_question}</p>
              {session.source_session_id && (
                <Link
                  to={`/spiritual/study/${session.source_session_id}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  <ArrowLeft className="w-3 h-3" /> Spawned from original study
                </Link>
              )}
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <CreateMessageButton
                context={{
                  title: session.title,
                  research_session_id: session.id,
                  faith_tradition: session.faith_tradition,
                  branch_denomination: session.branch_denomination,
                  sacred_texts: session.sacred_texts,
                  study_topics: JSON.stringify([session.research_question]),
                }}
                size="sm"
              />
              <button onClick={togglePin} className={`p-2 rounded-lg border transition-colors ${session.is_pinned ? 'bg-accent/15 text-accent border-accent/30' : 'border-border hover:bg-secondary/30'}`}>
                <Pin className="w-4 h-4" />
              </button>
              <button onClick={toggleArchive} className={`p-2 rounded-lg border transition-colors ${session.is_archived ? 'bg-secondary text-foreground border-border' : 'border-border hover:bg-secondary/30'}`}>
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {session.status === 'failed' && (
          <div className="glass-panel p-6 mb-4 border-destructive/30">
            <p className="text-sm text-destructive mb-2">Research failed to complete.</p>
            <p className="text-xs text-muted-foreground">The research session encountered an error. You can try asking the question again from the Study Workspace.</p>
          </div>
        )}

        {session.status === 'ready' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                {session.research_summary && (
                  <FindingsSection title="Research Summary" icon={FileText}>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{session.research_summary}</p>
                  </FindingsSection>
                )}

                {session.primary_source_analysis && (
                  <FindingsSection title="Primary Source Analysis" icon={BookOpen}>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{session.primary_source_analysis}</p>
                  </FindingsSection>
                )}

                {words.length > 0 && (
                  <FindingsSection title="Original Language Analysis" icon={Languages}>
                    {words.map((w, i) => <WordStudyCard key={i} word={w} />)}
                  </FindingsSection>
                )}

                {session.historical_development && (
                  <FindingsSection title="Historical Development" icon={Landmark}>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{session.historical_development}</p>
                  </FindingsSection>
                )}

                {timeline.length > 0 && (
                  <FindingsSection title="Timeline" icon={Clock} defaultOpen={false}>
                    <div className="space-y-3">
                      {timeline.map((e, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-24 shrink-0 text-xs font-medium text-primary pt-0.5">{e.date}</div>
                          <div>
                            <p className="text-sm font-medium">{e.event}</p>
                            <p className="text-xs text-muted-foreground">{e.significance}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FindingsSection>
                )}

                {comparisons.length > 0 && (
                  <FindingsSection title="Comparative Analysis" icon={GitCompare} defaultOpen={false}>
                    {comparisons.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg bg-secondary/30">
                        <h4 className="text-sm font-semibold mb-2">{c.subject_a} vs {c.subject_b}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 pr-4 text-muted-foreground">Aspect</th>
                                <th className="text-left py-2 pr-4 text-muted-foreground">{c.subject_a}</th>
                                <th className="text-left py-2 text-muted-foreground">{c.subject_b}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(c.points || []).map((p, j) => (
                                <tr key={j} className="border-b border-border/50">
                                  <td className="py-2 pr-4 font-medium">{p.aspect}</td>
                                  <td className="py-2 pr-4">{p.subject_a_view}</td>
                                  <td className="py-2">{p.subject_b_view}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </FindingsSection>
                )}

                {perspectives.length > 0 && (
                  <FindingsSection title="Multiple Perspectives" icon={Users} defaultOpen={false}>
                    {perspectives.map((p, i) => (
                      <div key={i} className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                        <h4 className="text-sm font-semibold mb-1">{p.perspective}</h4>
                        <p className="text-sm text-foreground/90 mb-1">{p.summary}</p>
                        {p.supporting_sources && <p className="text-xs text-muted-foreground">Sources: {p.supporting_sources}</p>}
                        {p.references && <p className="text-xs text-muted-foreground">References: {p.references}</p>}
                      </div>
                    ))}
                  </FindingsSection>
                )}

                {questions.length > 0 && (
                  <FindingsSection title="Discussion Questions" icon={MessageSquare} defaultOpen={false}>
                    <ul className="space-y-2">
                      {questions.map((q, i) => <li key={i} className="text-sm text-foreground/90 flex gap-2"><span className="text-primary">{i + 1}.</span> {q}</li>)}
                    </ul>
                  </FindingsSection>
                )}

                {sources.length > 0 && (
                  <FindingsSection title="Sources & Citations" icon={FileText} defaultOpen={false}>
                    <div className="space-y-2">
                      {sources.map((s, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-secondary/20">
                          <span className="font-medium text-foreground">{s.name}</span>
                          <span className="text-muted-foreground ml-2">({s.source_type})</span>
                          {s.citation && <p className="text-muted-foreground mt-1">{s.citation}</p>}
                        </div>
                      ))}
                    </div>
                  </FindingsSection>
                )}
              </div>

              <div className="lg:col-span-1 space-y-4">
                <ResearchAssistant session={session} />

                {ideas.length > 0 && (
                  <FindingsSection title="Production Ideas" icon={Sparkles} defaultOpen={true}>
                    <div className="space-y-2">
                      {ideas.map((idea, i) => (
                        <ProductionIdeaCard
                          key={i}
                          idea={idea}
                          onBuild={handleBuildProduction}
                          isBuilding={buildingIdea}
                        />
                      ))}
                    </div>
                  </FindingsSection>
                )}

                {related.length > 0 && (
                  <FindingsSection title="Related Studies" icon={Lightbulb} defaultOpen={true}>
                    <div className="space-y-2">
                      {related.map((r, i) => (
                        <RelatedStudyCard
                          key={i}
                          study={r}
                          sourceSessionId={session.id}
                        />
                      ))}
                    </div>
                  </FindingsSection>
                )}
              </div>
            </div>

            <div className="mt-4">
              <ResearchNotebook session={session} onSave={handleSaveNotebook} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}