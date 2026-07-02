import React, { useState, useMemo } from 'react';
import { Loader2, Search, Database, Play, Pause, RefreshCw, ExternalLink, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FOUNDATION_CATEGORIES, IMPORTANCE_LEVELS } from '@/lib/seedManifest';

const STATUS_META = {
  'Missing': { color: 'text-muted-foreground', bg: 'bg-muted', icon: AlertCircle },
  'Source Needed': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: AlertCircle },
  'Source Found': { color: 'text-primary', bg: 'bg-primary/10', icon: Database },
  'Approved Source Available': { color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle2 },
  'Ready to Import': { color: 'text-primary', bg: 'bg-primary/10', icon: Play },
  'Queued': { color: 'text-accent', bg: 'bg-accent/10', icon: Clock },
  'Importing': { color: 'text-accent', bg: 'bg-accent/10', icon: Loader2 },
  'Imported': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle2 },
  'Indexed': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle2 },
  'Published': { color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', icon: CheckCircle2 },
  'Failed': { color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
  'Needs Review': { color: 'text-accent', bg: 'bg-accent/10', icon: AlertCircle },
  'License Blocked': { color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertCircle },
  'Parser Missing': { color: 'text-muted-foreground', bg: 'bg-secondary', icon: AlertCircle },
  'Update Available': { color: 'text-accent', bg: 'bg-accent/10', icon: RefreshCw },
};

function parseArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return []; }
}

export default function SeedManifestPanel({ foundationWorks, onImport, onQueue, onRetry, actionLoading }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [importanceFilter, setImportanceFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    return foundationWorks
      .filter(w => {
        if (statusFilter !== 'all' && w.roadmap_status !== statusFilter) return false;
        if (categoryFilter !== 'all' && w.collection_category !== categoryFilter) return false;
        if (importanceFilter !== 'all' && w.importance_label !== importanceFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (w.work_title || '').toLowerCase().includes(q) ||
            (w.tradition || '').toLowerCase().includes(q) ||
            (w.admin_notes || '').toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  }, [foundationWorks, search, statusFilter, categoryFilter, importanceFilter]);

  const statuses = Object.keys(STATUS_META);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass-panel p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search works by title, tradition, or notes..."
              className="w-full glass-panel pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Categories</option>
            {FOUNDATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={importanceFilter} onChange={e => setImportanceFilter(e.target.value)} className="glass-panel px-3 py-2 text-sm rounded-lg">
            <option value="all">All Importance</option>
            {IMPORTANCE_LEVELS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {foundationWorks.length} works shown</p>
      </div>

      {/* Manifest List */}
      <div className="space-y-2">
        {filtered.map(work => {
          const meta = STATUS_META[work.roadmap_status] || STATUS_META['Missing'];
          const Icon = meta.icon;
          const isExpanded = expandedId === work.id;
          const deps = parseArray(work.dependencies);
          const langs = parseArray(work.language_coverage);
          const isLoading = actionLoading === work.id;

          return (
            <div key={work.id} className="glass-panel overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : work.id)}
                className="flex items-center gap-3 w-full p-4 hover:bg-secondary/20 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${meta.color} ${work.roadmap_status === 'Importing' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{work.work_title}</p>
                    {work.importance_label && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/40 text-muted-foreground shrink-0">{work.importance_label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{work.tradition}</span>
                    <span>·</span>
                    <span>{work.collection_category}</span>
                    {work.provider_name && <><span>·</span><span>{work.provider_name}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{work.roadmap_status}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    {work.priority_score > 0 && (
                      <div><span className="text-muted-foreground text-xs">Priority:</span> <span className="font-medium">{work.priority_score}</span></div>
                    )}
                    {work.estimated_import_time_minutes > 0 && (
                      <div><span className="text-muted-foreground text-xs">Est. Time:</span> <span className="font-medium">{work.estimated_import_time_minutes} min</span></div>
                    )}
                    {langs.length > 0 && (
                      <div><span className="text-muted-foreground text-xs">Languages:</span> <span className="font-medium">{langs.join(', ')}</span></div>
                    )}
                    {deps.length > 0 && (
                      <div className="col-span-2"><span className="text-muted-foreground text-xs">Dependencies:</span> <span className="font-medium text-xs">{deps.join(', ')}</span></div>
                    )}
                  </div>

                  {work.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{work.admin_notes}</p>
                  )}

                  {work.import_job_id && (
                    <a href="#" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                      <ExternalLink className="w-3 h-3" /> View Import Job
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(work.roadmap_status === 'Ready to Import' || work.roadmap_status === 'Approved Source Available') && (
                      <Button size="sm" onClick={() => onImport(work)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                        Import Now
                      </Button>
                    )}
                    {['Ready to Import', 'Approved Source Available', 'Source Found'].includes(work.roadmap_status) && (
                      <Button size="sm" variant="outline" onClick={() => onQueue(work)} disabled={isLoading}>
                        <Database className="w-3 h-3 mr-1" /> Queue
                      </Button>
                    )}
                    {work.roadmap_status === 'Failed' && (
                      <Button size="sm" variant="outline" onClick={() => onRetry(work)} disabled={isLoading}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    )}
                    {['Missing', 'Source Needed'].includes(work.roadmap_status) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 py-1.5">
                        <AlertCircle className="w-3 h-3" /> Needs source approval in SMC
                      </span>
                    )}
                    {work.roadmap_status === 'License Blocked' && (
                      <span className="text-xs text-destructive flex items-center gap-1 py-1.5">
                        <AlertCircle className="w-3 h-3" /> License review required
                      </span>
                    )}
                    {work.roadmap_status === 'Parser Missing' && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 py-1.5">
                        <AlertCircle className="w-3 h-3" /> Needs parser in SMC Parser Registry
                      </span>
                    )}
                    {['Imported', 'Indexed', 'Published'].includes(work.roadmap_status) && work.source_id && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/spiritual/library`} className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Open in Library
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}