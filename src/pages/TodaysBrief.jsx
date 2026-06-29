import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  FileText, Copy, RefreshCw, Archive, CheckCircle, Edit,
  Star, ChevronDown, ChevronUp, ExternalLink, Clock, Mic,
  BarChart3, MessageSquare, Camera, Megaphone, BookOpen, TrendingUp, Compass, Layers, Zap, CalendarDays, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import OpportunityScore from '@/components/shared/OpportunityScore';
import CategoryBadge from '@/components/shared/CategoryBadge';
import StatusBadge from '@/components/shared/StatusBadge';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';

const BRIEFING_TYPES = [
  { value: 'daily', label: 'Daily Briefing', icon: FileText, desc: 'The day\u2019s most important stories' },
  { value: 'breaking_news', label: 'Breaking News', icon: Zap, desc: 'Real-time developing stories' },
  { value: 'weekly_planning', label: 'Weekly Planning', icon: CalendarDays, desc: 'Forward-looking upcoming events' },
  { value: 'custom', label: 'Custom Briefing', icon: Settings, desc: 'Custom criteria and filters' },
];

function BriefSection({ icon: Icon, title, children, highlight, defaultOpen = false }) {
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

function StoryCard({ article, isBernasPick }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`mt-3 p-4 rounded-lg border ${isBernasPick ? 'bg-gradient-to-r from-berna-orange/5 to-berna-purple/5 border-berna-orange/20' : 'bg-white/[0.02] border-white/[0.06]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {isBernasPick && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
              <span className="text-[10px] text-berna-orange font-semibold uppercase tracking-wider">Berna's Pick</span>
            </div>
          )}
          <Link to={`/story/${article.id}`}>
            <h4 className="text-sm font-semibold text-white leading-snug hover:text-berna-purple transition-colors">{article.title}</h4>
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {article.category && <CategoryBadge category={article.category} />}
            <OpportunityScore score={article.opportunity_score} />
            <span className="text-[10px] text-muted-foreground font-mono">{article.source_name || article.publication}</span>
            {article.geographic_relevance && <span className="text-[10px] text-muted-foreground">{article.geographic_relevance}</span>}
          </div>
        </div>
      </div>
      {article.summary && (
        <p className="text-xs text-white/70 mt-3 leading-relaxed">{article.summary}</p>
      )}
      <div className="flex items-center gap-3 mt-2">
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-berna-purple hover:underline">
          {expanded ? 'Show less' : 'Show details'}
        </button>
        <Link to={`/story/${article.id}`} className="text-[10px] text-berna-emerald hover:underline">
          View full story →
        </Link>
      </div>
      {expanded && (
        <div className="mt-3 space-y-3 text-xs">
          {article.full_text_excerpt && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Why It Matters</p>
              <p className="text-white/60 leading-relaxed">{article.full_text_excerpt}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Freshness</p>
              <p className="text-white font-mono">{article.freshness_score || '-'}/5</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Credibility</p>
              <p className="text-white font-mono">{article.credibility_score || '-'}/5</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Usefulness</p>
              <p className="text-white font-mono">{article.usefulness_score || '-'}/5</p>
            </div>
          </div>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-berna-purple hover:underline">
              <ExternalLink className="w-3 h-3" />
              Open Source
            </a>
          )}
        </div>
      )}
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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeFilter = briefingType === 'daily' ? {} : { briefing_type: briefingType };
      const [briefs, arts, picks] = await Promise.all([
        base44.entities.Briefing.filter(typeFilter, '-created_date', 1),
        base44.entities.Article.filter({ status: 'approved' }, '-opportunity_score', 20),
        base44.entities.Article.filter({ status: 'bernas_pick' }, '-created_date', 5),
      ]);
      setBriefing(briefs[0] || null);
      setArticles([...picks, ...arts]);
    } catch (err) {
      setError(err.message || 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, [briefingType]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
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

  const bernasPick = articles.find(a => a.status === 'bernas_pick');
  const approvedArticles = articles.filter(a => a.status === 'approved');

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

  // Group articles by section
  const grouped = {};
  approvedArticles.forEach(a => {
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
        <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
          <Copy className="w-3 h-3 mr-1" />
          Copy Brief
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]" onClick={() => briefing?.monologue && copyToClipboard(briefing.monologue)}>
          <Mic className="w-3 h-3 mr-1" />
          Copy Monologue
        </Button>
        <Button variant="outline" size="sm" className="border-berna-orange/20 text-berna-orange text-xs hover:bg-berna-orange/10" onClick={() => setDirectionOpen(true)}>
          <Compass className="w-3 h-3 mr-1" />
          Change Direction
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-white text-xs hover:bg-white/[0.04]">
          <Archive className="w-3 h-3 mr-1" />
          Archive
        </Button>
        {briefing && <StatusBadge status={briefing.status} />}
        <Link to="/production" className="ml-auto">
          <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-8">
            <Layers className="w-3 h-3 mr-1" />Begin Production
          </Button>
        </Link>
      </div>

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
        <BriefSection icon={Star} title="Berna's Pick" highlight defaultOpen>
          <StoryCard article={bernasPick} isBernasPick />
        </BriefSection>
      )}

      {/* Top Story */}
      {approvedArticles[0] && (
        <BriefSection icon={TrendingUp} title="Top Story of the Day" defaultOpen>
          <StoryCard article={approvedArticles[0]} />
        </BriefSection>
      )}

      {/* Category sections */}
      {Object.entries(grouped).map(([section, sectionArticles]) => (
        <BriefSection key={section} icon={sectionMap[sectionArticles[0]?.category]?.icon || Star} title={section}>
          {sectionArticles.map(a => (
            <StoryCard key={a.id} article={a} />
          ))}
        </BriefSection>
      ))}

      {/* Monologue */}
      {briefing?.monologue && (
        <BriefSection icon={Mic} title="Opening Monologue (60–90 sec)">
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{briefing.monologue}</p>
          </div>
        </BriefSection>
      )}

      {/* Poll */}
      {briefing?.poll && (
        <BriefSection icon={MessageSquare} title="Chat Poll of the Day">
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm text-white/80">{briefing.poll}</p>
          </div>
        </BriefSection>
      )}

      {/* Graphic Stat */}
      {briefing?.graphic_stat && (
        <BriefSection icon={BarChart3} title="Graphic-Worthy Statistic">
          <div className="mt-3 p-4 rounded-lg bg-gradient-to-r from-berna-purple/5 to-berna-orange/5 border border-berna-purple/10">
            <p className="text-lg font-bold text-white">{briefing.graphic_stat}</p>
          </div>
        </BriefSection>
      )}

      {/* B-Roll */}
      {briefing?.broll && (
        <BriefSection icon={Camera} title="Suggested B-Roll Ideas">
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{briefing.broll}</p>
          </div>
        </BriefSection>
      )}

      {/* CTA */}
      {briefing?.cta && (
        <BriefSection icon={Megaphone} title="Call to Action">
          <div className="mt-3 p-4 rounded-lg bg-berna-orange/5 border border-berna-orange/10">
            <p className="text-sm text-white font-medium">{briefing.cta}</p>
          </div>
        </BriefSection>
      )}

      {/* Conversation Starters */}
      {briefing?.conversation_starters && (
        <BriefSection icon={MessageSquare} title="Conversation Starters">
          <div className="mt-3 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{briefing.conversation_starters}</p>
          </div>
        </BriefSection>
      )}

      {/* Source Library */}
      <BriefSection icon={BookOpen} title="Source Library">
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
      </BriefSection>

      {/* Empty state */}
      {!briefing && articles.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No Brief Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">The morning brief hasn't been generated yet. Click "Generate Brief" to create one.</p>
        </div>
      )}

      <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
    </div>
  );
}