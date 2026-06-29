import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  FileText, Copy, RefreshCw, Archive, CheckCircle,
  Star, ChevronDown, ChevronUp, ExternalLink, Clock, Mic,
  BarChart3, MessageSquare, Camera, Megaphone, BookOpen, TrendingUp, Compass, Layers, Zap, CalendarDays, Settings, Loader2, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BriefStoryCard from '@/components/brief/BriefStoryCard';
import EditableSection from '@/components/brief/EditableSection';
import BriefApprovalBar from '@/components/brief/BriefApprovalBar';
import StatusBadge from '@/components/shared/StatusBadge';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import { logActivity } from '@/lib/activityUtils';

const BRIEFING_TYPES = [
  { value: 'daily', label: 'Daily Briefing', icon: FileText, desc: 'The day\u2019s most important stories' },
  { value: 'breaking_news', label: 'Breaking News', icon: Zap, desc: 'Real-time developing stories' },
  { value: 'weekly_planning', label: 'Weekly Planning', icon: CalendarDays, desc: 'Forward-looking upcoming events' },
  { value: 'custom', label: 'Custom Briefing', icon: Settings, desc: 'Custom criteria and filters' },
];

const BRIEF_SECTIONS = [
  { field: 'monologue', label: 'Opening Monologue (60–90 sec)', icon: Mic, highlight: false },
  { field: 'poll', label: 'Chat Poll of the Day', icon: MessageSquare, highlight: false },
  { field: 'graphic_stat', label: 'Graphic-Worthy Statistic', icon: BarChart3, highlight: true },
  { field: 'broll', label: 'Suggested B-Roll Ideas', icon: Camera, highlight: false },
  { field: 'cta', label: 'Call to Action', icon: Megaphone, highlight: true },
  { field: 'conversation_starters', label: 'Conversation Starters', icon: MessageSquare, highlight: false },
  { field: 'fact_check', label: 'Fact-Check Notes', icon: CheckCircle, highlight: false },
  { field: 'tomorrow_watch', label: 'Tomorrow Watch', icon: Clock, highlight: false },
];

function StorySection({ icon: Icon, title, children, highlight, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`glass-panel overflow-hidden ${highlight ? 'glow-orange border-berna-orange/20' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors ${highlight ? 'bg-gradient-to-r from-berna-orange/5 to-berna-purple/5' : ''}`}
      >
        <Icon className={`w-4 h-4 ${highlight ? 'text-berna-orange' : 'text-berna-purple'} flex-shrink-0`} />
        <h3 className="text-sm font-semibold text-white flex-1">{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/[0.04]">{children}</div>}
    </div>
  );
}

export default function TodaysBrief() {
  const [briefing, setBriefing] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [directionOpen, setDirectionOpen] = useState(false);
  const [briefingType, setBriefingType] = useState('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approvedSections, setApprovedSections] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeFilter = briefingType === 'daily' ? {} : { briefing_type: briefingType };
      const briefs = await base44.entities.Briefing.filter(typeFilter, '-created_date', 1);
      const brief = briefs[0] || null;
      setBriefing(brief);

      if (brief?.approved_sections) {
        try { setApprovedSections(JSON.parse(brief.approved_sections)); } catch (e) { setApprovedSections({}); }
      } else {
        setApprovedSections({});
      }

      if (brief?.article_ids) {
        let ids = [];
        try { ids = JSON.parse(brief.article_ids); } catch (e) {}
        if (ids.length > 0) {
          const allArticles = await base44.entities.Article.list('-created_date', 200);
          const briefingArticles = allArticles.filter(a => ids.includes(a.id));
          briefingArticles.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
          setArticles(briefingArticles);
        } else {
          setArticles([]);
        }
      } else {
        setArticles([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await base44.functions.invoke('generateBriefing', {});
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, [briefingType]);

  // Story approval handlers
  const handleApproveStory = async (id) => {
    await base44.entities.Article.update(id, { status: 'approved' });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    const article = articles.find(a => a.id === id);
    logActivity('approve', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Approved from brief' });
  };

  const handleRejectStory = async (id) => {
    await base44.entities.Article.update(id, { status: 'rejected', rejection_reason: 'Rejected from brief' });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    const article = articles.find(a => a.id === id);
    logActivity('reject', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Rejected from brief' });
  };

  const handleSetBernasPick = async (id) => {
    await base44.entities.Article.update(id, { status: 'bernas_pick' });
    if (briefing) {
      await base44.entities.Briefing.update(briefing.id, { berna_pick_id: id });
    }
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status: 'bernas_pick' } : a));
    setBriefing(prev => prev ? { ...prev, berna_pick_id: id } : prev);
    const article = articles.find(a => a.id === id);
    logActivity('approve', { entity_type: 'Article', entity_id: id, entity_name: article?.title || '', details: 'Set as Berna\'s Pick from brief' });
  };

  // Section edit/approve handlers
  const handleSaveSection = async (field, content) => {
    if (!briefing) return;
    await base44.entities.Briefing.update(briefing.id, { [field]: content });
    setBriefing(prev => ({ ...prev, [field]: content }));
    logActivity('update', { entity_type: 'Briefing', entity_id: briefing.id, entity_name: briefing.title || '', details: `Edited section: ${field}` });
  };

  const handleApproveSection = async (field, isApproved) => {
    if (!briefing) return;
    const newApproved = { ...approvedSections, [field]: isApproved };
    setApprovedSections(newApproved);
    await base44.entities.Briefing.update(briefing.id, { approved_sections: JSON.stringify(newApproved) });
  };

  // Approve all stories + all sections, then send to production
  const handleApproveAll = async () => {
    if (!briefing) return;

    // Approve all non-approved, non-rejected stories
    const toApprove = articles.filter(a => a.status !== 'approved' && a.status !== 'bernas_pick' && a.status !== 'rejected');
    if (toApprove.length > 0) {
      await base44.entities.Article.bulkUpdate(toApprove.map(a => ({ id: a.id, status: 'approved' })));
      setArticles(prev => prev.map(a =>
        a.status !== 'approved' && a.status !== 'bernas_pick' && a.status !== 'rejected'
          ? { ...a, status: 'approved' }
          : a
      ));
      logActivity('approve', { entity_type: 'Article', entity_id: briefing.id, entity_name: briefing.title || '', details: `Approved ${toApprove.length} stories from brief (Approve All)` });
    }

    // Approve all active sections
    const allApproved = {};
    activeSections.forEach(s => { allApproved[s.field] = true; });
    setApprovedSections(allApproved);
    await base44.entities.Briefing.update(briefing.id, { approved_sections: JSON.stringify(allApproved) });

    // Navigate to production
    window.location.href = '/production';
  };

  // Copy full brief
  const handleCopyBrief = () => {
    if (!briefing) return;
    const lines = [
      briefing.title || 'Daily Brief',
      `Theme: ${briefing.theme || ''} | Energy: ${briefing.energy || ''}`,
      '',
      '--- STORIES ---',
      ...articles.map(a => `• ${a.title} (${a.source_name || ''})`),
      '',
      '--- MONOLOGUE ---',
      briefing.monologue || '',
      '',
      '--- POLL ---',
      briefing.poll || '',
      '',
      '--- CTA ---',
      briefing.cta || '',
      '',
      '--- B-ROLL ---',
      briefing.broll || '',
      '',
      '--- CONVERSATION STARTERS ---',
      briefing.conversation_starters || '',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <FileText className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Couldn't load the brief</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        </div>
        <Button size="sm" onClick={loadData} className="bg-berna-purple hover:bg-berna-purple/90 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  const bernasPick = articles.find(a => a.id === briefing?.berna_pick_id);
  const otherArticles = articles.filter(a => a.id !== briefing?.berna_pick_id);

  // Approval counts
  const approvedStoryCount = articles.filter(a => a.status === 'approved' || a.status === 'bernas_pick').length;
  const activeSections = BRIEF_SECTIONS.filter(s => briefing?.[s.field]);
  const approvedSectionCount = activeSections.filter(s => approvedSections[s.field]).length;

  // Group articles by section
  const sectionMap = {
    ai_business: { title: 'AI Win of the Day', icon: BarChart3 },
    manufacturing: { title: 'Made in America', icon: Star },
    state_economy: { title: 'State Spotlight', icon: Star },
    small_business: { title: 'Small Business Success', icon: Star },
    hiring: { title: 'Trade & Hiring Report', icon: Star },
    skilled_trades: { title: 'Trade & Hiring Report', icon: Star },
    food_agriculture: { title: 'Food & Agriculture', icon: Star },
    creator_economy: { title: 'Creator Economy', icon: Star },
    science: { title: 'Science & Innovation', icon: Star },
    technology: { title: 'Science & Innovation', icon: Star },
  };

  const grouped = {};
  otherArticles.forEach(a => {
    const sec = sectionMap[a.category]?.title || 'General';
    if (!grouped[sec]) grouped[sec] = [];
    grouped[sec].push(a);
  });

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={briefingType} onValueChange={(v) => { setBriefingType(v); }}>
          <SelectTrigger className="w-44 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/10">
            {BRIEFING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={handleGenerate} disabled={generating}>
          {generating ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3 mr-1" />Generate Brief</>}
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]" onClick={handleCopyBrief}>
          <Copy className="w-3 h-3 mr-1" />
          Copy Brief
        </Button>
        <Button variant="outline" size="sm" className="border-berna-orange/20 text-berna-orange text-xs hover:bg-berna-orange/10" onClick={() => setDirectionOpen(true)}>
          <Compass className="w-3 h-3 mr-1" />
          Change Direction
        </Button>
        {briefing && <StatusBadge status={briefing.status} />}
      </div>

      {/* Approval Progress Bar */}
      {briefing && articles.length > 0 && (
        <BriefApprovalBar
          totalStories={articles.length}
          approvedStories={approvedStoryCount}
          totalSections={activeSections.length}
          approvedSections={approvedSectionCount}
          onApproveAll={handleApproveAll}
        />
      )}

      {/* Cover Page */}
      <div className="glass-panel glow-purple p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-berna-purple/10 to-transparent rounded-full -mr-12 -mt-12" />
        <div className="relative space-y-4">
          <p className="text-[10px] text-berna-purple uppercase tracking-[0.2em] font-semibold">TexasNomad Network · Producer Brief</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Good Morning, Berna.</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Theme</p>
              <p className="text-sm text-white font-medium mt-1">{briefing?.theme || 'American Innovation'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Energy</p>
              <p className="text-sm text-white font-medium mt-1">{briefing?.energy || 'Optimistic'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Read Time</p>
              <p className="text-sm text-white font-medium mt-1">{briefing?.estimated_read_time || '12 min'}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground uppercase">Stories</p>
              <p className="text-sm text-white font-medium mt-1">{articles.length}</p>
            </div>
          </div>

          {briefing?.mission && (
            <div className="p-3 rounded-lg bg-berna-purple/5 border border-berna-purple/10">
              <p className="text-[10px] text-berna-purple uppercase tracking-wider mb-1">Today's Mission</p>
              <p className="text-xs text-white/80">{briefing.mission}</p>
            </div>
          )}
        </div>
      </div>

      {/* Berna's Pick */}
      {bernasPick && (
        <StorySection icon={Star} title="Berna's Pick" highlight defaultOpen>
          <BriefStoryCard
            article={bernasPick}
            isBernasPick
            onApprove={handleApproveStory}
            onReject={handleRejectStory}
            onSetBernasPick={handleSetBernasPick}
          />
        </StorySection>
      )}

      {/* Top Story */}
      {otherArticles[0] && (
        <StorySection icon={TrendingUp} title="Top Story of the Day" defaultOpen>
          <BriefStoryCard
            article={otherArticles[0]}
            onApprove={handleApproveStory}
            onReject={handleRejectStory}
            onSetBernasPick={handleSetBernasPick}
          />
        </StorySection>
      )}

      {/* Category sections */}
      {Object.entries(grouped).slice(1).map(([section, sectionArticles]) => (
        <StorySection key={section} icon={sectionMap[sectionArticles[0]?.category]?.icon || Star} title={section}>
          {sectionArticles.map(a => (
            <BriefStoryCard
              key={a.id}
              article={a}
              onApprove={handleApproveStory}
              onReject={handleRejectStory}
              onSetBernasPick={handleSetBernasPick}
            />
          ))}
        </StorySection>
      ))}

      {/* Editable Brief Sections */}
      {activeSections.map(sec => (
        <EditableSection
          key={sec.field}
          icon={sec.icon}
          title={sec.label}
          content={briefing?.[sec.field]}
          field={sec.field}
          isApproved={!!approvedSections[sec.field]}
          onSave={handleSaveSection}
          onApprove={handleApproveSection}
          highlight={sec.highlight}
          defaultOpen={sec.field === 'monologue'}
        />
      ))}

      {/* Source Library */}
      <StorySection icon={BookOpen} title="Source Library">
        <div className="mt-3 space-y-2">
          {articles.map(a => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate">{a.title}</p>
                <p className="text-[10px] text-muted-foreground">{a.source_name || a.publication}</p>
              </div>
              {a.url && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-berna-purple hover:text-berna-purple/80 flex-shrink-0 ml-2">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </StorySection>

      {/* Empty state */}
      {!briefing && articles.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No Brief Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">The morning brief hasn't been generated yet.</p>
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="bg-berna-purple hover:bg-berna-purple/90 text-white">
            {generating ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3 mr-1" />Generate Today's Brief</>}
          </Button>
        </div>
      )}

      <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
    </div>
  );
}