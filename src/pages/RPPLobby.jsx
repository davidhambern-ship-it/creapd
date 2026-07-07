import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { RPP_DEPARTMENTS } from '@/lib/rppConstants';
import {
  ChevronRight, ArrowRight, Calendar, Clock, TrendingUp, RefreshCw, Settings,
  Loader2, CheckCircle2, Circle, Rss, BookOpen, Package, FileText, Archive,
  Clapperboard, Library
} from 'lucide-react';

const HERO_BG = 'https://media.base44.com/images/public/6a4126962e5804304cc84b12/210016586_generated_image.png';

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

  const nextDept = RPP_DEPARTMENTS.find(d => {
    if (d.id === 'lobby') return false;
    if (d.id === 'topics' && topics.length === 0) return true;
    if (d.id === 'research' && topics.length > 0 && points.length === 0) return true;
    if (d.id === 'develop' && points.length > 0 && packages.length === 0) return true;
    if (d.id === 'packet' && packages.length > 0) return true;
    return false;
  }) || RPP_DEPARTMENTS[1];

  const metrics = [
    { label: 'TOPICS', value: topics.length, sub: 'research assignments', dept: 'topics', icon: Library },
    { label: 'ACTIVE RESEARCH', value: researchingTopics.length, sub: 'currently running', dept: 'research', icon: Archive },
    { label: 'POINTS EXTRACTED', value: points.length, sub: 'knowledge cards', dept: 'research', icon: FileText },
    { label: 'APPROVED POINTS', value: approvedPoints.length, sub: 'ready for production', dept: 'research', icon: CheckCircle2 },
    { label: 'PACKETS', value: packages.length, sub: 'production packages', dept: 'packet', icon: Package },
    { label: 'DOSSIERS', value: dossiers?.length || 0, sub: 'briefing documents', dept: 'dossier', icon: FileText },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(190 80% 55%)' }} />
      </div>
    );
  }

  const rssItems = topics.length > 0
    ? topics.slice(0, 8).map(t => ({ title: t.title, subtitle: t.category || 'Research Topic', status: t.status }))
    : [
        { title: 'No active research topics yet', subtitle: 'Visit the Topics department', status: 'pending' },
        { title: 'CREAPr Library ready for assignments', subtitle: 'Define your research scope', status: 'ready' },
      ];
  const rssDoubled = [...rssItems, ...rssItems];

  const systemServices = [
    { label: 'Research Engine', status: researchingTopics.length > 0 ? 'active' : 'operational' },
    { label: 'CREAPr Assistant', status: 'operational' },
    { label: 'Data Storage', status: 'operational' },
    { label: 'Export Pipeline', status: 'operational' },
  ];

  return (
    <div className="rpp-lobby">
      {/* Hero Banner */}
      <div className="px-4 md:px-6 pt-4 pb-3">
        <button
          onClick={() => navigate(nextDept.path)}
          className="cc-hero-banner w-full text-left block cc-animate-fade-up"
        >
          {/* Background image */}
          <div className="absolute inset-0">
            <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, hsl(210 40% 5% / 0.92) 0%, hsl(210 40% 5% / 0.6) 50%, hsl(210 40% 5% / 0.3) 100%)' }} />
          </div>
          {/* Content */}
          <div className="relative z-10 p-5 md:p-6 flex items-center justify-between gap-4 min-h-[180px]">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" style={{ color: 'hsl(190 80% 55%)' }} />
                <p className="text-[10px] uppercase tracking-widest" style={{ color: 'hsl(190 60% 50% / 0.7)' }}>Command Center · Continue your work</p>
              </div>
              <h1 className="text-xl md:text-2xl font-heading font-bold mb-1">
                {config ? config.production_name : 'Research Production Profile'}
              </h1>
              <p className="text-sm text-muted-foreground mb-3">{nextDept.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {config && (
                  <>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {config.show_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {config.show_start_time || 'TBD'}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {config.research_depth || 'standard'}</span>
                  </>
                )}
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'hsl(190 50% 15% / 0.3)', color: 'hsl(190 70% 55%)' }}>
                  <nextDept.icon className="w-3 h-3" /> Next: {nextDept.name}
                </span>
              </div>
            </div>
            <div className="hidden md:flex shrink-0 cc-hero-icon-float">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(190 50% 18% / 0.4), hsl(190 40% 10% / 0.2))', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
                <ArrowRight className="w-6 h-6" style={{ color: 'hsl(35 90% 60%)' }} />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Top action bar */}
      <div className="px-4 md:px-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-muted-foreground">Library Sections</h2>
        </div>
        <div className="flex items-center gap-2">
          {config && (
            <button onClick={refresh} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
          <button onClick={() => navigate('/research/configure')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <Settings className="w-3.5 h-3.5" /> Configure
          </button>
        </div>
      </div>

      {/* Metrics Grid (3x2) */}
      <div className="px-4 md:px-6 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map((m, mIdx) => {
            const Icon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => navigate(`/research/${m.dept === 'topics' ? 'topics' : m.dept === 'research' ? 'manager' : m.dept === 'dossier' ? 'manager' : m.dept === 'develop' ? 'assets' : 'export'}`)}
                className={`cc-metric-card group cc-animate-scale-in cc-stagger-${Math.min(mIdx + 1, 6)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'hsl(190 60% 50% / 0.6)' }} />
                  </div>
                  {m.label === 'ACTIVE RESEARCH' && m.value > 0 && (
                    <span className="status-dot status-dot-active" />
                  )}
                </div>
                <p className="text-2xl md:text-3xl font-bold font-mono cc-number-pop" style={{ color: 'hsl(35 90% 60%)', animationDelay: `${0.15 + mIdx * 0.05}s` }}>{m.value}</p>
                <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'hsl(152 40% 55% / 0.7)' }}>{m.label}</p>
                <p className="text-xs text-muted-foreground/60">{m.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Department Tiles (horizontal row) */}
      <div className="px-4 md:px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {RPP_DEPARTMENTS.filter(d => d.id !== 'lobby').map((dept, dIdx) => {
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
                className={`cc-dept-tile group cc-animate-fade-up cc-stagger-${Math.min(dIdx + 1, 6)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="cc-dept-icon w-9 h-9 rounded-lg flex items-center justify-center group-hover:bg-opacity-20" style={{ background: 'hsl(190 30% 12% / 0.3)' }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: 'hsl(190 55% 50% / 0.6)' }} />
                  </div>
                  {count > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'hsl(190 40% 12% / 0.3)', color: 'hsl(190 70% 55%)' }}>
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-sm mb-0.5 group-hover:text-amber-400 transition-colors">{dept.name}</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-1.5">{dept.subtitle}</p>
                <p className="text-xs text-muted-foreground/70 leading-relaxed line-clamp-2">{dept.description}</p>
                {dept.output && (
                  <div className="mt-2 pt-2 border-t border-border/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/50">→ {dept.output}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Modules: 3 columns */}
      <div className="px-4 md:px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Platform Status */}
        <div className="cc-glass-card p-4 cc-animate-fade-up cc-stagger-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: 'hsl(152 50% 15% / 0.3)', border: '1px solid hsl(152 40% 25% / 0.3)' }}>
              <CheckCircle2 className="w-3 h-3" style={{ color: 'hsl(152 60% 50%)' }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'hsl(152 50% 55%)' }}>All Systems Operational</span>
            </div>
          </div>
          <div className="space-y-2">
            {systemServices.map(svc => (
              <div key={svc.label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{svc.label}</span>
                <span className={`status-dot ${svc.status === 'active' ? 'status-dot-active' : 'status-dot-operational'}`} />
              </div>
            ))}
          </div>
          {/* Readiness bar */}
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Production Readiness</span>
              <span className="text-sm font-bold" style={{ color: 'hsl(35 90% 60%)' }}>{readinessPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(190 20% 12% / 0.5)' }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${readinessPercent}%`, background: 'linear-gradient(90deg, hsl(190 55% 45%), hsl(35 80% 55%))' }} />
            </div>
            <div className="mt-2 space-y-1">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {item.done ? <CheckCircle2 className="w-3 h-3" style={{ color: 'hsl(35 90% 60%)' }} /> : <Circle className="w-3 h-3 text-muted-foreground/30" />}
                  <span className={item.done ? 'text-foreground/80' : 'text-muted-foreground/50'}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Latest Creation Packets */}
        <div className="cc-glass-card p-4 cc-animate-fade-up cc-stagger-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-semibold">Latest Packets</h3>
            <Link to="/research/export" className="text-[10px] hover:underline" style={{ color: 'hsl(190 70% 55%)' }}>View all</Link>
          </div>
          {recentPackets.length > 0 ? (
            <div className="space-y-2">
              {recentPackets.map(pkt => (
                <div key={pkt.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(190 30% 12% / 0.3)' }}>
                      <Package className="w-3.5 h-3.5" style={{ color: 'hsl(190 55% 50% / 0.6)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pkt.title || pkt.package_name || 'Untitled Package'}</p>
                      <p className="text-[10px] text-muted-foreground">{pkt.asset_count || 0} assets · {pkt.status}</p>
                    </div>
                  </div>
                  {pkt.status === 'new' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'hsl(35 80% 20% / 0.3)', color: 'hsl(35 90% 60%)' }}>NEW</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Circle className="w-7 h-7 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No packets yet.</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Complete research to generate your first packet.</p>
            </div>
          )}
        </div>

        {/* CREAPr RSS Feed */}
        <div className="cc-glass-card p-4 cc-animate-fade-up cc-stagger-3">
          <div className="flex items-center gap-2 mb-3">
            <Rss className="w-4 h-4" style={{ color: 'hsl(190 60% 50% / 0.7)' }} />
            <h3 className="text-sm font-heading font-semibold">Knowledge Feed</h3>
          </div>
          <div className="space-y-2">
            {topics.slice(0, 4).map(t => (
              <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate('/research/manager')}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category || 'Research'} · {t.status}</p>
                </div>
                <span className={`status-dot shrink-0 ${t.status === 'researching' ? 'status-dot-active' : t.status === 'researched' ? 'status-dot-operational' : 'status-dot-idle'}`} />
              </div>
            ))}
            {topics.length === 0 && (
              <div className="text-center py-6">
                <Rss className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No active feeds.</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Create topics to populate the feed.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active research indicator */}
      {researchingTopics.length > 0 && (
        <div className="px-4 md:px-6 pb-3">
          <div className="cc-glass-card p-3 flex items-center gap-3" style={{ borderColor: 'hsl(35 60% 30% / 0.3)' }}>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'hsl(35 90% 60%)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: 'hsl(35 90% 60%)' }}>
                {researchingTopics.length} topic{researchingTopics.length > 1 ? 's' : ''} currently being researched
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {researchingTopics.map(t => t.title).join(', ')}
              </p>
            </div>
            <button onClick={() => navigate('/research/manager')} className="text-[10px] hover:underline shrink-0" style={{ color: 'hsl(35 90% 60%)' }}>
              View progress
            </button>
          </div>
        </div>
      )}

      {/* RSS Feed Shelf */}
      <div className="px-4 md:px-6 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Rss className="w-3.5 h-3.5" style={{ color: 'hsl(190 60% 50% / 0.6)' }} />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Live Knowledge Feed</span>
        </div>
        <div className="rss-shelf">
          <div className="rss-feed-track py-2 px-1">
            {rssDoubled.map((item, idx) => (
              <div key={idx} className="rss-feed-item">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`status-dot ${item.status === 'researching' ? 'status-dot-active' : item.status === 'researched' ? 'status-dot-operational' : 'status-dot-idle'}`} />
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