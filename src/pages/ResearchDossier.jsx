import React, { useState } from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import CreaprFocusBar from '@/components/creapr/CreaprFocusBar';
import { base44 } from '@/api/base44Client';
import {
  Loader2, FlaskConical, FileText, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, Clock, Users, Building2, BarChart3, ShieldCheck, Brain, Target
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function ResearchDossier() {
  const researchData = useResearchProduction();
  const { config, topics, points, dossiers, loading, refresh } = researchData;
  const [expanded, setExpanded] = useState(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md text-center cc-animate-fade-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <FlaskConical className="w-8 h-8" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  // Link dossiers to their topics
  const dossiersWithTopics = dossiers.map(d => ({
    dossier: d,
    topic: topics.find(t => t.id === d.topic_id),
  }));

  const readyCount = dossiers.filter(d => d.status === 'ready').length;
  const researchingCount = dossiers.filter(d => d.status === 'researching').length;
  const avgConfidence = dossiers.length > 0
    ? Math.round(dossiers.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / dossiers.length)
    : 0;

  const stats = [
    { label: 'TOTAL DOSSIERS', value: dossiers.length, icon: FileText },
    { label: 'READY', value: readyCount, icon: CheckCircle2 },
    { label: 'RESEARCHING', value: researchingCount, icon: Loader2 },
    { label: 'AVG CONFIDENCE', value: `${avgConfidence}%`, icon: BarChart3 },
  ];

  const handleApprove = async (dossier) => {
    await base44.entities.ResearchDossier.update(dossier.id, { status: 'ready' });
    refresh();
  };

  return (
    <div className="h-full overflow-y-auto">
      <CreaprFocusBar researchData={researchData} />

      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-3 cc-animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <FileText className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-bold">Briefing Room</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Structured research dossiers — transform raw research into approved knowledge</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-4 md:px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`cc-metric-card cc-animate-scale-in cc-stagger-${Math.min(i + 1, 6)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: 'hsl(190 60% 50% / 0.6)' }} />
                </div>
                {s.label === 'RESEARCHING' && s.value > 0 && (
                  <span className="status-dot status-dot-active" />
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: `${0.15 + i * 0.05}s` }}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Dossier Cards */}
      <div className="px-4 md:px-6 pb-6">
        {dossiersWithTopics.length === 0 ? (
          <div className="cc-glass-card p-8 text-center cc-animate-fade-up">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No dossiers yet. Run research on topics to generate dossiers.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dossiersWithTopics.map(({ dossier, topic }, dIdx) => {
              const isExpanded = expanded === dossier.id;
              const keyFacts = safeParse(dossier.key_facts, []);
              const keyPeople = safeParse(dossier.key_people, []);
              const keyOrgs = safeParse(dossier.key_organizations, []);
              const timeline = safeParse(dossier.timeline, []);
              const sources = safeParse(dossier.sources, []);
              const counterArgs = safeParse(dossier.counter_arguments, []);
              const dataStats = safeParse(dossier.data_and_statistics, []);
              const coverageAngles = safeParse(dossier.coverage_angles, []);

              return (
                <div key={dossier.id} className={`cc-glass-card cc-animate-fade-up cc-stagger-${Math.min((dIdx % 6) + 1, 6)}`}>
                  {/* Card Header */}
                  <div className="p-4 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={
                          dossier.status === 'ready'
                            ? { background: 'hsl(152 50% 15% / 0.3)', color: 'hsl(152 60% 50%)' }
                            : dossier.status === 'researching'
                              ? { background: 'hsl(35 60% 15% / 0.3)', color: 'hsl(35 90% 60%)' }
                              : { background: 'hsl(0 50% 15% / 0.3)', color: 'hsl(0 72% 60%)' }
                        }>
                          {dossier.status}
                        </span>
                        {topic && (
                          <span className="text-xs text-muted-foreground">Topic: {topic.title}</span>
                        )}
                      </div>
                      <h3 className="font-medium text-sm">{dossier.research_query}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {dossier.confidence_score > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
                            <div className="h-full rounded-full" style={{ width: `${dossier.confidence_score}%`, background: 'linear-gradient(90deg, hsl(190 55% 45%), hsl(152 60% 50%))' }} />
                          </div>
                          <span className="text-xs font-mono" style={{ color: 'hsl(35 90% 60%)' }}>{dossier.confidence_score}%</span>
                        </div>
                      )}
                      <button
                        onClick={() => setExpanded(isExpanded ? null : dossier.id)}
                        className="text-xs hover:underline flex items-center gap-0.5"
                        style={{ color: 'hsl(190 80% 55%)' }}
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Expand</>}
                      </button>
                    </div>
                  </div>

                  {/* Quick Preview */}
                  {dossier.executive_summary && (
                    <div className="px-4 pb-3">
                      <p className="text-sm text-muted-foreground">
                        {isExpanded ? dossier.executive_summary : dossier.executive_summary.substring(0, 250) + '...'}
                      </p>
                    </div>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {/* Context & Background */}
                      {dossier.context_and_background && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(190 40% 12% / 0.15)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(190 70% 55%)' }}>Context & Background</p>
                          <p className="text-sm">{dossier.context_and_background}</p>
                        </div>
                      )}

                      {/* Key Facts */}
                      {keyFacts.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Facts</p>
                          <ul className="space-y-1">
                            {keyFacts.map((f, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'hsl(152 60% 50%)' }} />
                                <span>{typeof f === 'string' ? f : f.fact} {typeof f === 'object' && f.source && <span className="text-xs text-muted-foreground">({f.source})</span>}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Key People & Organizations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {keyPeople.length > 0 && (
                          <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(190 70% 55%)' }}>
                              <Users className="w-3 h-3" /> Key People
                            </p>
                            <ul className="space-y-1">
                              {keyPeople.map((p, i) => (
                                <li key={i} className="text-sm">
                                  <span className="font-medium">{typeof p === 'string' ? p : p.name}</span>
                                  {typeof p === 'object' && p.role && <span className="text-xs text-muted-foreground"> — {p.role}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {keyOrgs.length > 0 && (
                          <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(190 70% 55%)' }}>
                              <Building2 className="w-3 h-3" /> Key Organizations
                            </p>
                            <ul className="space-y-1">
                              {keyOrgs.map((o, i) => (
                                <li key={i} className="text-sm">
                                  <span className="font-medium">{typeof o === 'string' ? o : o.name}</span>
                                  {typeof o === 'object' && o.role && <span className="text-xs text-muted-foreground"> — {o.role}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Timeline */}
                      {timeline.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(35 90% 60%)' }}>
                            <Clock className="w-3 h-3" /> Timeline
                          </p>
                          <div className="space-y-2">
                            {timeline.map((t, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'hsl(35 90% 60%)' }} />
                                <div>
                                  <span className="font-medium">{typeof t === 'string' ? t : t.date}</span>
                                  {typeof t === 'object' && t.event && <span className="text-muted-foreground"> — {t.event}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Counter Arguments */}
                      {counterArgs.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(270 30% 12% / 0.15)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(270 80% 70%)' }}>
                            <Brain className="w-3 h-3" /> Counter Arguments
                          </p>
                          <ul className="space-y-1">
                            {counterArgs.map((c, i) => (
                              <li key={i} className="text-sm">{typeof c === 'string' ? c : c.viewpoint || c.argument}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Data & Statistics */}
                      {dataStats.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(190 70% 55%)' }}>
                            <BarChart3 className="w-3 h-3" /> Data & Statistics
                          </p>
                          <ul className="space-y-1">
                            {dataStats.map((d, i) => (
                              <li key={i} className="text-sm">{typeof d === 'string' ? d : d.statistic || d.value}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Coverage Angles */}
                      {coverageAngles.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(152 40% 12% / 0.15)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(152 60% 50%)' }}>
                            <Target className="w-3 h-3" /> Coverage Angles
                          </p>
                          <ul className="space-y-1">
                            {coverageAngles.map((c, i) => (
                              <li key={i} className="text-sm">{typeof c === 'string' ? c : c.angle}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sources */}
                      {sources.length > 0 && (
                        <div className="p-3 rounded-lg" style={{ background: 'hsl(220 15% 12% / 0.3)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'hsl(190 70% 55%)' }}>
                            <ShieldCheck className="w-3 h-3" /> Sources
                          </p>
                          <ul className="space-y-1">
                            {sources.map((s, i) => (
                              <li key={i} className="text-xs text-muted-foreground">
                                <span className="text-foreground/80">{typeof s === 'string' ? s : s.name}</span>
                                {typeof s === 'object' && s.source_type && <span> — {s.source_type}</span>}
                                {typeof s === 'object' && s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline ml-1" style={{ color: 'hsl(190 80% 55%)' }}>↗</a>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Approve button */}
                      {dossier.status !== 'ready' && (
                        <button
                          onClick={() => handleApprove(dossier)}
                          className="w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                          style={{ background: 'hsl(152 50% 15% / 0.2)', border: '1px solid hsl(152 50% 28% / 0.3)', color: 'hsl(152 60% 50%)' }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve Dossier
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}