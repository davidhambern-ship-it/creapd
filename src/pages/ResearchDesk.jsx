import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { useTalkProduction } from '@/hooks/useTalkProduction';
import {
  Search as SearchIcon,
  ExternalLink,
  Send,
  FileText,
  MessageSquare,
  Clock,
  ChevronRight,
  Loader2,
  RotateCcw,
  Scale,
  CheckSquare,
  Film,
  Sparkles,
  BookOpenText,
  CheckCircle2,
  CirclePlus,
  CircleMinus,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import { assessPodcastMaterialSufficiency } from '@/lib/podcastMaterialSufficiency';

const RESEARCH_ACTIONS = [
  { key: 'story', label: 'Full story', icon: BookOpenText },
  { key: 'summary', label: 'Summarize this story', icon: FileText },
  { key: 'talking_points', label: 'Generate talking points', icon: MessageSquare },
  { key: 'opposing_viewpoints', label: 'Find opposing viewpoints', icon: Scale },
  { key: 'fact_check', label: 'Fact-check key claims', icon: CheckSquare },
  { key: 'broll', label: 'Suggest B-roll ideas', icon: Film },
];

const VIEW_TITLES = {
  story: 'Full Story',
  summary: 'Producer Summary',
  talking_points: 'Talking Points',
  opposing_viewpoints: 'Opposing Viewpoints',
  fact_check: 'Fact-Check Notes',
  broll: 'B-Roll & Visual Ideas',
  custom: 'Echo Analysis',
};

const NOTE_TYPES = {
  talking_points: 'talking_point',
  fact_check: 'fact_check',
  broll: 'broll_idea',
  summary: 'echo_note',
  opposing_viewpoints: 'echo_note',
  custom: 'echo_note',
};

function safeArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }
}

function plainArticleText(value) {
  const text = String(value || '');
  if (!text) return '';
  if (typeof window !== 'undefined' && /<[^>]+>/.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc.body?.textContent?.replace(/\n{3,}/g, '\n\n').trim() || text;
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function articleBody(article) {
  if (!article) return '';
  return plainArticleText(
    article.body_content ||
    article.transcript ||
    article.full_text_excerpt ||
    '',
  );
}

function normalizedText(value) {
  return plainArticleText(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasRealFullSource(article) {
  if (!article) return false;
  const body = articleBody(article);
  if (body.length < 600 || body.split(/\s+/).filter(Boolean).length < 120) return false;

  const summary = normalizedText(article.summary);
  const normalizedBody = normalizedText(body);
  if (summary && normalizedBody === summary) return false;
  if (summary && normalizedBody.length <= summary.length * 1.35 && normalizedBody.includes(summary)) return false;

  return true;
}

function detailRows(article) {
  return [
    ['Why it matters', article.why_it_matters],
    ['Key facts', article.key_facts],
    ['Timeline', article.timeline],
    ['State / Region', article.state || article.geographic_relevance],
    ['Industry', article.industry],
    ['Companies', article.companies],
    ['People', article.people],
    ['Tags', article.tags],
  ].filter(([, value]) => Boolean(String(value || '').trim()));
}

function scoreValue(value) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

function buildMetadata(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

export default function ResearchDesk() {
  const navigate = useNavigate();
  const { config: podcastConfig } = useTalkProduction();
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [echoPrompt, setEchoPrompt] = useState('');
  const [analysisCache, setAnalysisCache] = useState({});
  const [activeView, setActiveView] = useState('story');
  const [viewLoading, setViewLoading] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullTextLoading, setFullTextLoading] = useState(false);
  const [fullTextError, setFullTextError] = useState('');
  const [episodeApprovedIds, setEpisodeApprovedIds] = useState(() => new Set());
  const [approvalInitialized, setApprovalInitialized] = useState(false);

  useEffect(() => {
    base44.entities.Article.filter({}, '-opportunity_score', 100)
      .then(arts => {
        setArticles(arts || []);
        if (arts?.length) setSelected(arts[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!podcastConfig?.id || !articles.length || approvalInitialized) return;

    const meta = buildMetadata(podcastConfig.build_metadata);
    if (Array.isArray(meta.podcast_approved_source_ids)) {
      setEpisodeApprovedIds(new Set(meta.podcast_approved_source_ids.map(String)));
    } else {
      const legacyApproved = articles
        .filter(article =>
          ['approved', 'bernas_pick', 'selected', 'in_production', 'package_generated', 'edited', 'ready_for_export']
            .includes(String(article.status || '').toLowerCase())
        )
        .map(article => String(article.id));
      setEpisodeApprovedIds(new Set(legacyApproved));
    }
    setApprovalInitialized(true);
  }, [podcastConfig?.id, podcastConfig?.build_metadata, articles, approvalInitialized]);

  useEffect(() => {
    setActiveView('story');
    setEchoPrompt('');
    setAnalysisError('');
    setFullTextError('');

    if (!selected) {
      setNotes([]);
      return;
    }

    base44.entities.ProducerNote.filter({ article_id: selected.id }, '-created_date', 50)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selected?.id]);

  const fetchFullSource = async (article = selected, force = false) => {
    if (!article?.id || !article?.url) return;
    if (!force && hasRealFullSource(article)) return;

    const articleId = article.id;
    setFullTextLoading(true);
    setFullTextError('');

    try {
      const result = await creapdApi.post('/production/core', {
        action: 'podcast_fetch_source_article',
        url: article.url,
        title: article.title,
        source_name: article.source_name,
      });

      const bodyContent = String(result?.body_content || '').trim();
      if (!bodyContent) throw new Error('The source did not return readable full article text.');

      const patch = {
        body_content: bodyContent,
        body_fetched_at: result?.fetched_at || new Date().toISOString(),
      };

      setArticles(prev => prev.map(item =>
        item.id === articleId ? { ...item, ...patch } : item
      ));
      setSelected(prev =>
        prev?.id === articleId ? { ...prev, ...patch } : prev
      );

      try {
        await base44.entities.Article.update(articleId, patch);
      } catch (persistError) {
        console.warn('Full article loaded but could not be cached to Article:', persistError);
      }
    } catch (error) {
      console.error('Full source fetch failed:', error);
      if (selected?.id === articleId || article.id === articleId) {
        setFullTextError(
          error?.data?.diagnostic?.message ||
          error?.data?.message ||
          error?.message ||
          'CREAPD could not retrieve the full article from this source.'
        );
      }
    } finally {
      setFullTextLoading(false);
    }
  };

  useEffect(() => {
    if (!selected?.id || !selected?.url || hasRealFullSource(selected)) return;
    fetchFullSource(selected, false);
  }, [selected?.id]);

  const filteredArticles = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return articles;
    return articles.filter(article =>
      article.title?.toLowerCase().includes(needle) ||
      article.source_name?.toLowerCase().includes(needle) ||
      article.category?.toLowerCase().includes(needle)
    );
  }, [articles, searchTerm]);

  const selectedCache = selected ? analysisCache[selected.id] || {} : {};
  const generatedContent = activeView === 'story' ? '' : selectedCache[activeView] || '';
  const fullText = articleBody(selected);

  const showContext = useMemo(() => ({
    production_name: podcastConfig?.production_name || '',
    show_name: podcastConfig?.station_name || '',
    show_description: podcastConfig?.show_description || '',
    show_format: podcastConfig?.show_format || '',
    show_tone: podcastConfig?.show_tone || '',
    total_show_runtime: podcastConfig?.total_show_runtime || '',
    topics: safeArray(podcastConfig?.topics),
    research_sources: safeArray(podcastConfig?.research_sources),
    guest_details: podcastConfig?.guest_details || '',
  }), [podcastConfig]);

  const materialAssessment = useMemo(() => {
    const enriched = articles.map(article => ({
      ...article,
      episode_approved: approvalInitialized
        ? episodeApprovedIds.has(String(article.id))
        : undefined,
      talking_points: analysisCache[article.id]?.talking_points || '',
      opposing_viewpoints: analysisCache[article.id]?.opposing_viewpoints || '',
      fact_check_notes: analysisCache[article.id]?.fact_check || '',
      broll_suggestions: analysisCache[article.id]?.broll || '',
    }));
    return assessPodcastMaterialSufficiency(podcastConfig || {}, enriched);
  }, [podcastConfig, articles, analysisCache, approvalInitialized, episodeApprovedIds]);

  useEffect(() => {
    if (loading || !podcastConfig?.id) return;

    const key = `creapd:podcast:${podcastConfig.id}:research-ready-assembly-forwarded`;

    if (materialAssessment.state !== 'ready') {
      sessionStorage.removeItem(key);
      return;
    }

    if (sessionStorage.getItem(key) === '1') return;

    sessionStorage.setItem(key, '1');
    navigate('/podcast/assembly', {
      replace: true,
      state: {
        autoAdvancedFromResearch: true,
        materialAssessment,
      },
    });
  }, [
    loading,
    podcastConfig?.id,
    materialAssessment.state,
    materialAssessment.approved_material_minutes,
    materialAssessment.research_target_minutes,
    navigate,
  ]);

  const selectedIsApproved = selected
    ? (
        approvalInitialized
          ? episodeApprovedIds.has(String(selected.id))
          : ['approved', 'bernas_pick', 'selected', 'in_production', 'package_generated', 'edited', 'ready_for_export']
              .includes(String(selected.status || '').toLowerCase())
      )
    : false;

  const toggleEpisodeApproval = async () => {
    if (!selected) return;

    const approving = !selectedIsApproved;
    const nextStatus = approving ? 'approved' : 'pending';
    await base44.entities.Article.update(selected.id, { status: nextStatus });

    let nextApprovedIds = new Set(episodeApprovedIds);
    if (approving) nextApprovedIds.add(String(selected.id));
    else nextApprovedIds.delete(String(selected.id));

    if (podcastConfig?.id) {
      try {
        const result = await creapdApi.post('/production/core', {
          action: 'podcast_set_source_approval',
          configuration_id: podcastConfig.id,
          article_id: selected.id,
          approved: approving,
        });

        if (Array.isArray(result?.result?.approved_source_ids)) {
          nextApprovedIds = new Set(result.result.approved_source_ids.map(String));
        }
      } catch (error) {
        console.warn('Could not persist episode-scoped source approval:', error);
      }
    }

    setEpisodeApprovedIds(nextApprovedIds);
    setApprovalInitialized(true);

    const nextArticles = articles.map(article =>
      article.id === selected.id ? { ...article, status: nextStatus } : article
    );

    setArticles(nextArticles);
    setSelected(prev => prev ? { ...prev, status: nextStatus } : prev);

    const nextAssessment = assessPodcastMaterialSufficiency(
      podcastConfig || {},
      nextArticles.map(article => ({
        ...article,
        episode_approved: nextApprovedIds.has(String(article.id)),
        talking_points: analysisCache[article.id]?.talking_points || '',
        opposing_viewpoints: analysisCache[article.id]?.opposing_viewpoints || '',
        fact_check_notes: analysisCache[article.id]?.fact_check || '',
        broll_suggestions: analysisCache[article.id]?.broll || '',
      })),
    );

    if (
      approving &&
      materialAssessment.state !== 'ready' &&
      nextAssessment.state === 'ready'
    ) {
      if (podcastConfig?.id) {
        sessionStorage.setItem(
          `creapd:podcast:${podcastConfig.id}:research-ready-assembly-forwarded`,
          '1',
        );
      }

      navigate('/podcast/assembly', {
        state: {
          autoAdvancedFromResearch: true,
          materialAssessment: nextAssessment,
        },
      });
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    const note = await base44.entities.ProducerNote.create({
      article_id: selected.id,
      note: newNote.trim(),
      note_type: 'general',
    });
    setNotes(prev => [note, ...prev]);
    setNewNote('');
  };

  const saveGeneratedResearch = async (mode, content) => {
    if (!selected || !content) return;
    const noteType = NOTE_TYPES[mode] || 'echo_note';
    try {
      const note = await base44.entities.ProducerNote.create({
        article_id: selected.id,
        note: `[${VIEW_TITLES[mode] || 'Echo Analysis'}]\n${content}`,
        note_type: noteType,
      });
      setNotes(prev => [note, ...prev]);
    } catch (error) {
      console.warn('Could not save generated research note:', error);
    }
  };

  const runResearchAction = async (mode, customPrompt = '') => {
    if (!selected) return;

    if (mode === 'story') {
      setActiveView('story');
      setAnalysisError('');
      return;
    }

    setActiveView(mode);
    setAnalysisError('');

    if (analysisCache[selected.id]?.[mode] && mode !== 'custom') return;

    setViewLoading(mode);
    try {
      const result = await creapdApi.post('/production/core', {
        action: 'podcast_research_assist',
        mode,
        prompt: customPrompt,
        show: showContext,
        article: {
          title: selected.title,
          source_name: selected.source_name,
          publication: selected.publication,
          author: selected.author,
          published_at: selected.published_at,
          summary: selected.summary,
          full_text_excerpt: selected.full_text_excerpt,
          body_content: selected.body_content,
          transcript: selected.transcript,
          category: selected.category,
          why_it_matters: selected.why_it_matters,
          key_facts: selected.key_facts,
          timeline: selected.timeline,
        },
      });

      const content = String(result?.content || '').trim();
      if (!content) throw new Error('Echo returned no research content.');

      setAnalysisCache(prev => ({
        ...prev,
        [selected.id]: {
          ...(prev[selected.id] || {}),
          [mode]: content,
        },
      }));

      await saveGeneratedResearch(mode, content);
    } catch (error) {
      console.error('Podcast research assist failed:', error);
      setAnalysisError(
        error?.data?.diagnostic?.message ||
        error?.data?.error ||
        error?.message ||
        'CREAPD could not generate this research view.'
      );
    } finally {
      setViewLoading('');
    }
  };

  const askEcho = async () => {
    const prompt = echoPrompt.trim();
    if (!prompt || !selected) return;
    setEchoPrompt('');
    await runResearchAction('custom', prompt);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden flex flex-col lg:flex-row">
      {/* Left rail: source material. This pane scrolls independently. */}
      <aside className="lg:w-[310px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex min-h-0 max-h-56 lg:max-h-none lg:h-full flex-col bg-black/10">
        <div className="shrink-0 p-3 border-b border-white/[0.06] bg-black/15 backdrop-blur-sm">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search research..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="pl-8 bg-black/25 border-white/[0.08] text-white text-xs h-8"
            />
          </div>
          <p className="mt-2 text-[10px] text-white/35">
            {filteredArticles.length} research item{filteredArticles.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {filteredArticles.map(article => (
            <button
              key={article.id}
              type="button"
              onClick={() => setSelected(article)}
              className={`w-full text-left p-3 border-b border-white/[0.04] transition-colors ${
                selected?.id === article.id
                  ? 'bg-fuchsia-400/[0.08] border-l-2 border-l-fuchsia-400'
                  : 'hover:bg-white/[0.035]'
              }`}
            >
              <p className="text-xs text-white font-medium leading-snug line-clamp-3">{article.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <OpportunityScore score={article.opportunity_score} />
                <StatusBadge status={article.status} />
                {article.category && <span className="text-[9px] text-orange-300/70">{article.category.replace(/_/g, ' ')}</span>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Center: selected source or generated research view. This pane also scrolls independently. */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 lg:px-6 lg:py-5">
        {selected ? (
          <div className="mx-auto max-w-4xl space-y-5 pb-12">
            <section className={`rounded-2xl border p-4 backdrop-blur-md ${
              materialAssessment.state === 'ready'
                ? 'border-emerald-300/20 bg-emerald-500/[0.07]'
                : materialAssessment.state === 'almost_ready'
                  ? 'border-amber-300/20 bg-amber-500/[0.06]'
                  : 'border-fuchsia-300/15 bg-black/38'
            }`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">Episode Material</p>
                  <div className="mt-1 flex items-center gap-2">
                    {materialAssessment.state === 'ready' && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                    <h2 className="text-sm font-semibold text-white">
                      {materialAssessment.approved_material_minutes} / {materialAssessment.research_target_minutes} min approved
                    </h2>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50">{materialAssessment.message}</p>
                </div>

                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-lg font-mono font-semibold text-white">{materialAssessment.approved_item_count}</p>
                    <p className="text-[9px] uppercase tracking-wide text-white/30">Approved</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-semibold text-white">~{materialAssessment.recommended_item_count}</p>
                    <p className="text-[9px] uppercase tracking-wide text-white/30">Est. Needed</p>
                  </div>
                  <div>
                    <p className="text-lg font-mono font-semibold text-white">{materialAssessment.editorial_runtime_minutes}</p>
                    <p className="text-[9px] uppercase tracking-wide text-white/30">Show Content</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    materialAssessment.state === 'ready'
                      ? 'bg-emerald-300'
                      : materialAssessment.state === 'almost_ready'
                        ? 'bg-amber-300'
                        : 'bg-fuchsia-400'
                  }`}
                  style={{ width: `${materialAssessment.progress_percent}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/35">
                <span>{materialAssessment.show_format} · {materialAssessment.total_runtime_minutes}-minute show</span>
                {materialAssessment.recommended_additional_items > 0 ? (
                  <span>
                    CREAPD recommends about {materialAssessment.recommended_additional_items} more strong source{materialAssessment.recommended_additional_items === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="text-emerald-200/80">Material target reached · ready for episode assembly</span>
                )}
              </div>
            </section>

            <header className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={selected.status} />
                {selected.category && <CategoryBadge category={selected.category} />}
                {activeView !== 'story' && (
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200">
                    {VIEW_TITLES[activeView]}
                  </span>
                )}
              </div>

              <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight">{selected.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                {selected.source_name && <span>{selected.source_name}</span>}
                {selected.author && <span>by {selected.author}</span>}
                {selected.published_at && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(selected.published_at).toLocaleDateString()}
                  </span>
                )}
                {selected.estimated_reading_time && <span>{selected.estimated_reading_time}</span>}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedIsApproved ? 'outline' : 'default'}
                  className={`h-8 text-xs ${
                    selectedIsApproved
                      ? 'border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-200 hover:bg-emerald-400/[0.12]'
                      : 'bg-fuchsia-500/25 text-fuchsia-100 hover:bg-fuchsia-500/35'
                  }`}
                  onClick={toggleEpisodeApproval}
                >
                  {selectedIsApproved ? (
                    <><CircleMinus className="w-3 h-3 mr-1" />Remove from Episode</>
                  ) : (
                    <><CirclePlus className="w-3 h-3 mr-1" />Approve for Episode</>
                  )}
                </Button>

                {selected.url && (
                  <a href={selected.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="h-8 border-white/10 text-fuchsia-200 text-xs bg-black/20">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Original Source
                    </Button>
                  </a>
                )}
                {activeView !== 'story' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-white/10 text-white/75 text-xs bg-black/20"
                    onClick={() => runResearchAction('story')}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Back to Full Story
                  </Button>
                )}
              </div>
            </header>

            {activeView === 'story' ? (
              <>
                <section className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    ['Opportunity', selected.opportunity_score],
                    ['Freshness', selected.freshness_score],
                    ['Credibility', selected.credibility_score ?? selected.source_quality_score],
                    ['Usefulness', selected.usefulness_score],
                    ['Duplicate', selected.duplicate_score],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-black/35 p-3 text-center backdrop-blur-sm">
                      <p className="text-lg font-bold font-mono text-white">{scoreValue(value)}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </section>

                {selected.summary && (
                  <section className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
                    <h2 className="text-[10px] font-semibold text-fuchsia-300 uppercase tracking-[0.18em] mb-2">Source Summary</h2>
                    <p className="text-sm text-white/75 leading-relaxed">{selected.summary}</p>
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-black/42 p-4 lg:p-5 backdrop-blur-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-300">Full Source Material</p>
                      <h2 className="mt-1 text-base font-semibold text-white">Article / Transcript</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.body_fetched_at && hasRealFullSource(selected) && (
                        <span className="text-[9px] text-white/30">
                          fetched {new Date(selected.body_fetched_at).toLocaleDateString()}
                        </span>
                      )}
                      {selected.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 border-white/10 bg-black/20 px-2 text-[10px] text-white/65"
                          onClick={() => fetchFullSource(selected, true)}
                          disabled={fullTextLoading}
                        >
                          <RefreshCw className={`mr-1 h-3 w-3 ${fullTextLoading ? 'animate-spin' : ''}`} />
                          {fullTextLoading ? 'Fetching…' : 'Refresh Full Article'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {fullTextLoading && !hasRealFullSource(selected) ? (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-fuchsia-300/10 bg-fuchsia-400/[0.04] text-center">
                      <Loader2 className="h-7 w-7 animate-spin text-fuchsia-300" />
                      <p className="mt-3 text-sm text-white/60">Pulling the full article directly from the source…</p>
                      <p className="mt-1 text-xs text-white/35">CREAPD will cache the real source text when it is available.</p>
                    </div>
                  ) : hasRealFullSource(selected) ? (
                    <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/82">
                      {fullText}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
                      <FileText className="mx-auto h-7 w-7 text-white/25" />
                      <p className="mt-2 text-sm text-white/60">
                        {fullTextError || 'The full article has not been retrieved from this source yet.'}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        CREAPD will not label the RSS summary as the full article.
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        {selected.url && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 bg-fuchsia-500/20 text-fuchsia-100 hover:bg-fuchsia-500/30"
                              onClick={() => fetchFullSource(selected, true)}
                              disabled={fullTextLoading}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Try Full Article Again
                            </Button>
                            <a href={selected.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="h-8 border-white/10 text-white/65">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Open Source
                              </Button>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {detailRows(selected).length > 0 && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailRows(selected).map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-sm">
                        <p className="text-[9px] text-white/35 uppercase tracking-wider mb-1">{label}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{String(value)}</p>
                      </div>
                    ))}
                  </section>
                )}

                <section className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
                  <h2 className="text-[10px] font-semibold text-fuchsia-300 uppercase tracking-[0.18em] mb-3">Producer Notes</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={event => setNewNote(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && addNote()}
                      className="bg-black/25 border-white/[0.08] text-white text-xs h-9"
                    />
                    <Button size="sm" onClick={addNote} className="h-9 bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {notes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {notes.slice(0, 12).map((note, index) => (
                        <div
                          key={note.id || index}
                          className={`rounded-lg border p-2.5 text-xs leading-relaxed ${
                            note.note_type === 'general'
                              ? 'border-white/[0.05] bg-white/[0.025] text-white/65'
                              : 'border-fuchsia-300/10 bg-fuchsia-400/[0.05] text-white/70'
                          }`}
                        >
                          {note.note_type !== 'general' && (
                            <span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-fuchsia-300">
                              {note.note_type.replace(/_/g, ' ')} ·
                            </span>
                          )}
                          <span className="whitespace-pre-wrap">{note.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <section className="min-h-[420px] rounded-2xl border border-fuchsia-300/15 bg-black/45 p-5 lg:p-6 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-fuchsia-300" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                    {VIEW_TITLES[activeView]}
                  </p>
                </div>

                {viewLoading === activeView ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-fuchsia-300" />
                    <p className="mt-3 text-sm text-white/55">Echo is working from this source and your Podcast Setup…</p>
                  </div>
                ) : analysisError ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-4">
                    <p className="text-sm text-red-100">{analysisError}</p>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/82">
                    {generatedContent || 'Choose a research action from the right panel.'}
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            Select research material from the left.
          </div>
        )}
      </main>

      {/* Right rail: research lenses. Clicking one swaps the center pane. */}
      <aside className="hidden xl:flex w-[330px] shrink-0 h-full min-h-0 flex-col border-l border-white/[0.06] bg-black/10">
        <div className="shrink-0 p-4 border-b border-white/[0.06] bg-black/15 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-berna-emerald pulse-glow" />
            <h3 className="text-sm font-semibold text-white">Echo</h3>
          </div>
          <p className="text-[10px] text-white/40">
            Research Assistant · informed by {podcastConfig?.production_name || 'Podcast Setup'}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
          {RESEARCH_ACTIONS.map(action => {
            const Icon = action.icon;
            const active = activeView === action.key;
            const loadingAction = viewLoading === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => runResearchAction(action.key)}
                disabled={!selected || loadingAction}
                className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-xs transition-colors ${
                  active
                    ? 'border-fuchsia-300/30 bg-fuchsia-400/10 text-white'
                    : 'border-white/[0.05] bg-black/20 text-white/55 hover:border-white/12 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {loadingAction ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-fuchsia-300" />
                ) : (
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-fuchsia-300' : 'text-orange-300/75'}`} />
                )}
                <span className="flex-1">{action.label}</span>
                <ChevronRight className="h-3 w-3 text-white/25" />
              </button>
            );
          })}
        </div>

        <div className="shrink-0 p-3 border-t border-white/[0.06] bg-black/20">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">Ask something else</p>
          <Textarea
            placeholder="Ask Echo about this source..."
            value={echoPrompt}
            onChange={event => setEchoPrompt(event.target.value)}
            className="bg-black/25 border-white/[0.08] text-white text-xs min-h-20 resize-none"
          />
          <Button
            size="sm"
            onClick={askEcho}
            disabled={viewLoading === 'custom' || !echoPrompt.trim() || !selected}
            className="w-full mt-2 bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30 text-xs"
          >
            {viewLoading === 'custom' ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Send className="w-3 h-3 mr-1" />
            )}
            Ask Echo
          </Button>
        </div>
      </aside>
    </div>
  );
}
