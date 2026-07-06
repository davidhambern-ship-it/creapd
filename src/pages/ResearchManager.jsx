import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { POINT_TYPE_LABELS, POINT_TYPE_COLORS } from '@/lib/researchConstants';
import {
  Loader2, FlaskConical, Layers, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Sparkles, AlertCircle, Filter, Package
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All Points' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'used', label: 'Used' }
];

export default function ResearchManager() {
  const { config, topics, points, packages, loading, refresh } = useResearchProduction();
  const [searchParams] = useSearchParams();
  const topicFilter = searchParams.get('topic_id');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [approving, setApproving] = useState(null);

  const filteredPoints = useMemo(() => {
    let result = points;
    if (topicFilter) result = result.filter(p => p.topic_id === topicFilter);
    if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all') result = result.filter(p => p.point_type === typeFilter);
    return result;
  }, [points, topicFilter, statusFilter, typeFilter]);

  const pointTypes = [...new Set(points.map(p => p.point_type))];

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
          <FlaskConical className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (point, newStatus) => {
    if (newStatus !== 'approved') {
      await base44.entities.ResearchPoint.update(point.id, { status: newStatus });
      refresh();
      return;
    }

    setApproving(point.id);
    try {
      const keyFacts = safeParse(point.key_facts, []);
      const factsText = keyFacts.length > 0
        ? keyFacts.map((f, i) => `${i + 1}. ${f.fact} (Source: ${f.source || 'N/A'})`).join('\n')
        : 'No key facts available.';

      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a broadcast news producer and fact-checker.\n\nFULL STORY:\n${point.content || ''}\n\nKEY FACTS TO VERIFY:\n${factsText}\n\nBased on the Full Story above, write:\n1. A Teleprompter Script — a broadcast-ready teleprompter script that a host can read on air. Include natural pauses, clear transitions, and a conversational yet professional tone. This is what goes on the teleprompter.\n2. A Story Summary — a detailed broadcast-ready narration script that a host can read on air. Make it engaging, clear, and comprehensive.\n3. Talking Points — review the Key Facts listed above. For each fact, verify it against the Full Story and your knowledge. Provide your fact-checking findings — note which facts are confirmed, which are questionable, and any corrections needed.\n\nReturn your response as JSON with three fields:\n- teleprompter_script: the broadcast-ready teleprompter script\n- story_summary: the detailed broadcast-ready story summary\n- talking_points: your fact-check findings for each key fact`,
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            teleprompter_script: { type: 'string' },
            story_summary: { type: 'string' },
            talking_points: { type: 'string' }
          }
        }
      });

      const teleprompterScript = llmResult?.teleprompter_script || '';
      const storySummary = llmResult?.story_summary || '';
      const talkingPoints = llmResult?.talking_points || '';

      const pkgFields = {
        teleprompter_script: teleprompterScript,
        story_summary: storySummary,
        talking_points: talkingPoints,
        status: 'generated',
        generation_provider: 'gemini_3_flash'
      };

      let pkg = null;
      if (point.package_id) {
        pkg = await base44.entities.ProductionPackage.update(point.package_id, pkgFields);
      } else {
        pkg = await base44.entities.ProductionPackage.create({
          ...pkgFields,
          source_entity_type: 'ResearchPoint',
          source_entity_id: point.id,
          configuration_id: point.configuration_id,
          production_profile: 'news',
          generation_count: 1
        });
      }

      await base44.entities.ResearchPoint.update(point.id, {
        status: 'approved',
        package_id: pkg.id
      });
    } catch (err) {
      console.error('Approval generation failed:', err);
      await base44.entities.ResearchPoint.update(point.id, { status: 'approved' });
    } finally {
      setApproving(null);
    }
    refresh();
  };

  const handleGeneratePackage = async (point) => {
    setGenerating(point.id);
    try {
      const preferredModels = safeParse(config.preferred_models, ['gemini_3_flash', 'gpt_5_mini', 'claude_sonnet_4_6']);
      await base44.functions.invoke('buildResearchProduction', {
        research_point_id: point.id,
        tone: config.tone,
        reading_style: config.reading_style,
        audience: config.target_audience,
        target_runtime: `${config.total_show_runtime} Minutes`,
        preferred_models: preferredModels
      });
      refresh();
    } catch (err) {
      console.error('Package generation failed:', err);
    } finally {
      setGenerating(null);
    }
  };

  const selectedTopic = topicFilter ? topics.find(t => t.id === topicFilter) : null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Point Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedTopic
            ? `Points for: ${selectedTopic.title}`
            : 'Review, approve, and generate packages from research Point Cards'
          }
        </p>
      </div>

      {/* Filters */}
      <div className="!flex flex-wrap items-center gap-2">
        <div className="!flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Status:</span>
        </div>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
              statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
        {pointTypes.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground ml-2">Type:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-md ${typeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
            {pointTypes.map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-2.5 py-1 rounded-md ${typeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {POINT_TYPE_LABELS[type] || type}
              </button>
            ))}
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{filteredPoints.length} points</span>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Layers className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {points.length === 0
              ? 'No Point Cards yet. Run research on a topic to extract points.'
              : 'No points match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPoints.map(point => {
            const isExpanded = expanded === point.id;
            const keyFacts = safeParse(point.key_facts, []);
            const sources = safeParse(point.sources, []);
            const content = point.content || '';
            const isLong = content.length > 300;
            return (
              <div key={point.id} className="glass-panel p-4">
                <div className="!flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="!flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${POINT_TYPE_COLORS[point.point_type] || 'bg-muted text-muted-foreground'}`}>
                        {POINT_TYPE_LABELS[point.point_type] || point.point_type}
                      </span>
                      {point.priority_score > 0 && (
                        <span className="text-xs text-muted-foreground">Score: {point.priority_score?.toFixed(1)}</span>
                      )}
                      {point.suggested_segment && (
                        <span className="text-xs text-muted-foreground">{point.suggested_segment}</span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm">{point.title}</h3>
                    {point.topic_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">Topic: {point.topic_title}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    point.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    point.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                    point.status === 'used' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {point.status}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {isExpanded || !isLong ? content : content.substring(0, 300) + '...'}
                </p>

                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {point.significance && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Why It Matters</p>
                        <p className="text-sm">{point.significance}</p>
                      </div>
                    )}
                    {point.suggested_angle && (
                      <div className="p-3 rounded-lg bg-primary/5">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Suggested Angle</p>
                        <p className="text-sm">{point.suggested_angle}</p>
                      </div>
                    )}
                    {keyFacts.length > 0 && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Facts</p>
                        <ul className="space-y-1">
                          {keyFacts.map((f, i) => (
                            <li key={i} className="text-sm !flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                              <span>{f.fact} <span className="text-xs text-muted-foreground">({f.source})</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sources.length > 0 && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
                        <ul className="space-y-1">
                          {sources.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">
                              <span className="text-foreground/80">{s.name}</span> — {s.source_type}
                              {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">↗</a>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="!flex items-center justify-between mt-3">
                  <div className="!flex items-center gap-1">
                    {isLong && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : point.id)}
                        className="text-xs text-primary hover:underline !flex items-center gap-0.5"
                      >
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                      </button>
                    )}
                  </div>
                  <div className="!flex items-center gap-2">
                    {point.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(point, 'approved')}
                          disabled={approving === point.id}
                          className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors !flex items-center gap-1 disabled:opacity-50"
                        >
                          {approving === point.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                            : <><CheckCircle2 className="w-3 h-3" /> Approve</>}
                        </button>
                        <button
                          onClick={() => handleStatusChange(point, 'rejected')}
                          className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors !flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </>
                    )}
                    {point.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(point, 'pending')}
                          className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Unapprove
                        </button>
                        <Button
                          size="sm"
                          onClick={() => handleGeneratePackage(point)}
                          disabled={generating === point.id}
                        >
                          {generating === point.id
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            : <><Sparkles className="w-3 h-3 mr-1" /> Generate Package</>
                          }
                        </Button>
                      </>
                    )}
                    {point.status === 'used' && point.package_id && (
                      <span className="text-xs !flex items-center gap-1 text-blue-400">
                        <Package className="w-3 h-3" /> Package Ready
                      </span>
                    )}
                    {point.status === 'rejected' && (
                      <button
                        onClick={() => handleStatusChange(point, 'pending')}
                        className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>

                {approving === point.id && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 !flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    <p className="text-sm text-emerald-400">Sending to Gemini for Story Summary & Fact Check...</p>
                  </div>
                )}

                {generating === point.id && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/10 !flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-sm text-primary">Running multi-model synthesis (3 models → Chief Editor)...</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}