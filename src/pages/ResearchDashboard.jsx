import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import { useCreaprEngine } from '@/hooks/useCreaprEngine';
import { useCREAPMode } from '@/context/CREAPModeContext';
import GuidedFocus from '@/components/creapr/GuidedFocus';
import { Button } from '@/components/ui/button';
import { formatConfidence, POINT_TYPE_LABELS } from '@/lib/researchConstants';
import {
  FlaskConical, RefreshCw, Lightbulb, Layers, Sparkles, Download,
  Settings, Clock, TrendingUp, AlertCircle, CheckCircle2, Loader2,
  Calendar, Search, ArrowRight, FileSearch, Target
} from 'lucide-react';

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function ResearchDashboard() {
  const researchData = useResearchProduction();
  const { config, topics, points, packages, loading, refresh } = researchData;
  const { mode } = useCREAPMode();
  const engine = useCreaprEngine(researchData);

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <FlaskConical className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">No Research Production Found</h2>
          <p className="text-muted-foreground mb-6">Configure your research production to get started. Add topics, run deep research, and generate production packages from findings.</p>
          <Button asChild size="lg">
            <Link to="/research/configure">Configure Production</Link>
          </Button>
        </div>
      </div>
    );
  }

  const researchingTopics = topics.filter(t => t.status === 'researching');
  const researchedTopics = topics.filter(t => t.status === 'researched' || t.status === 'in_review');
  const approvedPoints = points.filter(p => p.status === 'approved' || p.status === 'used');
  const usedPoints = points.filter(p => p.status === 'used');

  const checklist = [
    { label: 'Configuration Saved', done: !!config.production_name },
    { label: 'Topics Added', done: topics.length > 0 },
    { label: 'Research Completed', done: researchedTopics.length > 0 },
    { label: 'Points Extracted', done: points.length > 0 },
    { label: 'Points Approved', done: approvedPoints.length > 0 },
    { label: 'Packages Generated', done: packages.length > 0 },
  ];

  const checklistDone = checklist.filter(c => c.done).length;
  const readinessPercent = Math.round((checklistDone / checklist.length) * 100);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="!flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="!flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-heading font-bold">{config.production_name}</h1>
          </div>
          <div className="!flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="!flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {config.show_date}</span>
            <span className="!flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {config.show_start_time}</span>
            <span className="!flex items-center gap-1"><Search className="w-3.5 h-3.5" /> {config.research_depth}</span>
            <span className="!flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {config.tone}</span>
          </div>
        </div>
        <div className="!flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/research/configure?config_id=${config.id}`}>
              <Settings className="w-4 h-4 mr-1" />
              Edit Config
            </Link>
          </Button>
        </div>
      </div>

      {/* CREAPr Engine — Guided Focus Panel */}
      <GuidedFocus
        pocState={engine.pocState}
        guidedFocus={engine.guidedFocus}
        activeDepartment={engine.activeDepartment}
        mode={mode}
      />

      {/* Compact Stats — supplementary to Guided Focus */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Runtime</p>
          <p className="text-sm font-bold">{config.total_show_runtime}m</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Depth</p>
          <p className="text-sm font-medium">{config.research_depth}</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Topics</p>
          <p className="text-sm font-bold text-primary">{topics.length}</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Points</p>
          <p className="text-sm font-bold text-primary">{points.length}</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Packages</p>
          <p className="text-sm font-bold text-emerald-400">{packages.length}</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Ready</p>
          <p className="text-sm font-bold text-emerald-400">{readinessPercent}%</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="!flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild><Link to="/research/topics"><Lightbulb className="w-4 h-4 mr-1" /> Manage Topics</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/research/manager"><Layers className="w-4 h-4 mr-1" /> Point Manager</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/research/assets"><Sparkles className="w-4 h-4 mr-1" /> Packages</Link></Button>
        <Button size="sm" variant="outline" asChild><Link to="/research/export"><Download className="w-4 h-4 mr-1" /> Export</Link></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topics Widget */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Research Topics</h3>
            <Link to="/research/topics" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {topics.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {topics.slice(0, 6).map(topic => (
                <div key={topic.id} className="!flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{topic.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{topic.point_count} points · {formatConfidence(topic.confidence_score)} confidence</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    topic.status === 'researching' ? 'bg-amber-500/15 text-amber-400' :
                    topic.status === 'researched' || topic.status === 'in_review' ? 'bg-emerald-500/15 text-emerald-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {topic.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No topics yet. Add research topics to begin." actionLabel="Add Topics" onAction={() => window.location.href = '/research/topics'} />
          )}
        </div>

        {/* Points Widget */}
        <div className="glass-panel p-5">
          <div className="!flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold !flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Recent Point Cards</h3>
            <Link to="/research/manager" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {points.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {points.slice(0, 6).map(point => (
                <div key={point.id} className="!flex items-start justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-white/5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{point.title}</p>
                    <p className="text-xs text-muted-foreground">{POINT_TYPE_LABELS[point.point_type] || point.point_type} · Score: {point.priority_score?.toFixed(1)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    point.status === 'approved' || point.status === 'used' ? 'bg-emerald-500/15 text-emerald-400' :
                    point.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {point.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No point cards extracted yet." onAction={() => window.location.href = '/research/manager'} actionLabel="Open Manager" />
          )}
        </div>

        {/* Research Progress Widget */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold !flex items-center gap-2 mb-4"><FileSearch className="w-4 h-4 text-primary" /> Research Progress</h3>
          <div className="space-y-3 text-sm">
            <div className="!flex items-center justify-between">
              <span className="text-muted-foreground">Topics Researched</span>
              <span className="font-medium">{researchedTopics.length} / {topics.length}</span>
            </div>
            <div className="!flex items-center justify-between">
              <span className="text-muted-foreground">Points Extracted</span>
              <span className="font-medium">{points.length}</span>
            </div>
            <div className="!flex items-center justify-between">
              <span className="text-muted-foreground">Points Approved</span>
              <span className="font-medium text-emerald-400">{approvedPoints.length}</span>
            </div>
            <div className="!flex items-center justify-between">
              <span className="text-muted-foreground">Packages Generated</span>
              <span className="font-medium">{packages.length}</span>
            </div>
            {researchingTopics.length > 0 && (
              <div className="!flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
                <Loader2 className="w-3 h-3 animate-spin" />
                {researchingTopics.length} topic{researchingTopics.length > 1 ? 's' : ''} currently researching...
              </div>
            )}
          </div>
        </div>

        {/* Production Checklist */}
        <div className="glass-panel p-5">
          <h3 className="font-heading font-semibold mb-4">Production Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.map((item, i) => (
              <div key={i} className="!flex items-center gap-2 text-sm">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className={item.done ? '' : 'text-muted-foreground'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, actionLabel, onAction }) {
  return (
    <div className="text-center py-6">
      <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="outline" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}