import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useOutletContext } from 'react-router-dom';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import {
  ChevronRight, ArrowRight, Clock, Calendar, CheckCircle2,
  Circle, Loader2, RefreshCw, Settings, TrendingUp, BookOpen, Rss
} from 'lucide-react';

export default function RPPLobby() {
  const navigate = useNavigate();
  const researchData = useResearchProduction();
  const { config, topics, points, packages, dossiers, loading, refresh } = researchData;
  const { setCreaprMessage } = useOutletContext() || {};
  const [recentPackets, setRecentPackets] = useState([]);

  useEffect(() => {
    if (packages.length > 0) {
      setRecentPackets(packages.slice(0, 4));
    }
  }, [packages]);

  const researchingTopics = topics.filter(t => t.status === 'researching');
  const researchedTopics = topics.filter(t => t.status === 'researched' || t.status === 'in_review');
  const approvedPoints = points.filter(p => p.status === 'approved' || p.status === 'used');

  const checklist = [
    { label: 'Configuration Saved', done: !!config?.production_name },
    { label: 'Research Assignment', done: topics.length > 0 },
    { label: 'Research Complete', done: researchedTopics.length > 0 },
    { label: 'Points Extracted', done: points.length > 0 },
    { label: 'Points Approved', done: approvedPoints.length > 0 },
    { label: 'Packages Generated', done: packages.length > 0 },
  ];
  const checklistDone = checklist.filter(c => c.done).length;
  const readinessPercent = Math.round((checklistDone / checklist.length) * 100);

  // Find next department to work in
  const nextDept = RPP_DEPARTMENTS.find(d => {
    if (d.id === 'lobby') return false;
    if (d.id === 'topics' && topics.length === 0) return true;
    if (d.id === 'research' && topics.length > 0 && points.length === 0) return true;
    if (d.id === 'develop' && points.length > 0 && packages.length === 0) return true;
    if (d.id === 'packet' && packages.length > 0) return true;
    return false;
  }) || RPP_DEPARTMENTS[1];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  // RSS feed items — use topics or fallback to generic knowledge items
  const rssItems = topics.length > 0
    ? topics.slice(0, 8).map(t => ({ title: t.title, subtitle: t.category || 'Research Topic', status: t.status }))
    : [
        { title: 'No active research topics yet', subtitle: 'Visit the Topics department', status: 'pending' },
        { title: 'CREAPr Library ready for assignments', subtitle: 'Define your research scope', status: 'ready' },
      ];
  const rssDoubled = [...rssItems, ...rssItems];

  return (
    <div className="rpp-lobby">
      {/* Header */}
      <div className="px-6 md:px-8 pt-6 pb-5 border-b border-border/30">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-amber-400/70" />
              <p className="text-xs uppercase tracking-widest text-amber-400/60">Lobby · Research Library</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">
              {config ? config.production_name : 'Research Production Profile'}
            </h1>
            {config && (
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {config.show_date}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {config.show_start_time || 'TBD'}</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> {config.research_depth || 'standard'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {config && (
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            )}
            <button
              onClick={() => navigate('/research/configure')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" /> Configure
            </button>
          </div>
        </div>
      </div>

      {/* Reading Desk — Continue previous work */}
      {nextDept && (
        <div className="px-6 md:px-8 py-5">
          <button
            onClick={() => navigate(nextDept.path)}
            className="reading-desk-card w-full text-left p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <nextDept.icon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-amber-400/60 mb-0.5">Reading Desk · Continue your work</p>
                  <p className="text-lg font-heading font-semibold">{nextDept.name}</p>
                  <p className="text-sm text-muted-foreground">{nextDept.description}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-amber-400 shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Library Section Cards — Department Directory */}
      <div className="px-6 md:px-8 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="book-spine-deco w-8" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Library Sections</h2>
          <div className="book-spine-deco flex-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RPP_DEPARTMENTS.filter(d => d.id !== 'lobby').map(dept => {
            const Icon = dept.icon;
            const stats = {
              topics: topics.length,
              research: points.length,
              dossier: dossiers?.length || 0,
              develop: packages.length,
              packet: packages.filter(p => p.status === 'approved').length,
            };
            const count = stats[dept.id] || 0;
            return (
              <button
                key={dept.id}
                onClick={() => navigate(dept.path)}
                className="dept-section-card group text-left p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/8 flex items-center justify-center group-hover:bg-amber-500/15 transition-colors">
                    <Icon className="w-5 h-5 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
                  </div>
                  {count > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400/80">
                      {count}
                    </span>
                  )}
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-heading font-semibold text-base group-hover:text-amber-400 transition-colors">
                    {dept.name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 px-1.5 py-0.5 rounded bg-white/5">
                    {dept.subtitle}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-3">{dept.description}</p>
                {dept.output && (
                  <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Output</p>
                      <p className="text-xs font-medium text-foreground/70">{dept.output}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Status + Recent Packets */}
      <div className="px-6 md:px-8 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Production Status */}
        <div className="lib-glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="book-spine-deco w-6" />
            <h3 className="font-heading font-semibold">Production Status</h3>
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                )}
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Production Readiness</span>
              <span className="text-sm font-bold text-amber-400">{readinessPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${readinessPercent}%`,
                  background: 'linear-gradient(90deg, hsl(35 70% 50%), hsl(25 80% 55%))',
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent Production Packets */}
        <div className="lib-glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="book-spine-deco w-6" />
              <h3 className="font-heading font-semibold">Recent Packets</h3>
            </div>
            <Link to="/research/export" className="text-xs text-amber-400 hover:underline">View all</Link>
          </div>
          {recentPackets.length > 0 ? (
            <div className="space-y-2">
              {recentPackets.map(pkt => (
                <div key={pkt.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pkt.title || pkt.package_name || 'Untitled Package'}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkt.asset_count || 0} assets · {pkt.status}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Circle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No packets yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Complete research to generate your first packet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Active research indicator */}
      {researchingTopics.length > 0 && (
        <div className="px-6 md:px-8 pb-4">
          <div className="lib-glass-card p-4 flex items-center gap-3 border-amber-500/20">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-400">
                {researchingTopics.length} topic{researchingTopics.length > 1 ? 's' : ''} currently being researched
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {researchingTopics.map(t => t.title).join(', ')}
              </p>
            </div>
            <button
              onClick={() => navigate('/research/manager')}
              className="text-xs text-amber-400 hover:underline shrink-0"
            >
              View progress
            </button>
          </div>
        </div>
      )}

      {/* RSS Knowledge Feed Shelf */}
      <div className="px-6 md:px-8 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <Rss className="w-4 h-4 text-amber-400/60" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Knowledge Feed</h2>
          <div className="book-spine-deco flex-1" />
        </div>
        <div className="rss-shelf p-1">
          <div className="rss-feed-track py-2 px-1">
            {rssDoubled.map((item, idx) => (
              <div key={idx} className="rss-feed-item">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'researching' ? 'bg-amber-400 animate-pulse' : item.status === 'researched' ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{item.subtitle}</span>
                </div>
                <p className="text-xs font-medium text-foreground/80 truncate">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}