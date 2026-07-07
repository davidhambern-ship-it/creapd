import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useOutletContext } from 'react-router-dom';
import { RPP_DEPARTMENTS, RPP_PROGRESS_STAGES } from '@/lib/rppConstants';
import {
  ChevronRight, ArrowRight, Clock, Calendar, CheckCircle2,
  Circle, Loader2, RefreshCw, Settings, TrendingUp
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
    { label: 'Configuration Saved', done: !!config?.production_name, stage: null },
    { label: 'Research Assignment', done: topics.length > 0, stage: 'assignment' },
    { label: 'Research Complete', done: researchedTopics.length > 0, stage: 'research' },
    { label: 'Points Extracted', done: points.length > 0, stage: 'research' },
    { label: 'Points Approved', done: approvedPoints.length > 0, stage: 'research' },
    { label: 'Packages Generated', done: packages.length > 0, stage: 'assets' },
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rpp-lobby">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Lobby</p>
            <h1 className="text-3xl font-heading font-bold">
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

      {/* Continue previous work */}
      {nextDept && (
        <div className="px-6 md:px-10 mb-6">
          <button
            onClick={() => navigate(nextDept.path)}
            className="rpp-continue-card w-full text-left"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <nextDept.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Continue your work</p>
                  <p className="text-lg font-heading font-semibold">{nextDept.name} Department</p>
                  <p className="text-sm text-muted-foreground">{nextDept.description}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </div>
          </button>
        </div>
      )}

      {/* Department Directory */}
      <div className="px-6 md:px-10 mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Department Directory</h2>
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
                className="rpp-dept-card group text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {count > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/5 text-muted-foreground">
                      {count}
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                  {dept.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{dept.subtitle}</p>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">{dept.description}</p>
                {dept.output && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Output</p>
                    <p className="text-xs font-medium text-foreground/80">{dept.output}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Grid: Status + Recent Packets */}
      <div className="px-6 md:px-10 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Status */}
        <div className="rpp-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Production Status</h3>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                )}
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Production Readiness</span>
              <span className="text-sm font-bold text-primary">{readinessPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${readinessPercent}%`,
                  background: 'linear-gradient(90deg, hsl(270 80% 60%), hsl(152 60% 45%))',
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent Production Packets */}
        <div className="rpp-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Recent Production Packets</h3>
            <Link to="/research/export" className="text-xs text-primary hover:underline">View all</Link>
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
        <div className="px-6 md:px-10 pb-8">
          <div className="rpp-panel p-4 flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-400">
                {researchingTopics.length} topic{researchingTopics.length > 1 ? 's' : ''} currently being researched
              </p>
              <p className="text-xs text-muted-foreground">
                {researchingTopics.map(t => t.title).join(', ')}
              </p>
            </div>
            <button
              onClick={() => navigate('/research/manager')}
              className="ml-auto text-xs text-primary hover:underline shrink-0"
            >
              View progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
}