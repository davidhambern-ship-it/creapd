import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  FileText, RefreshCw, Layers, Archive, Radio, Settings,
  Play, Clock, CheckCircle, AlertCircle, TrendingUp, Star,
  Zap, ArrowRight, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [articles, setArticles] = useState([]);
  const [lastLog, setLastLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Briefing.filter({}, '-created_date', 1),
      base44.entities.Article.filter({}, '-created_date', 20),
      base44.entities.AutomationLog.filter({}, '-created_date', 1),
    ]).then(([briefs, arts, logs]) => {
      setBriefing(briefs[0] || null);
      setArticles(arts);
      setLastLog(logs[0] || null);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const approvedCount = articles.filter(a => a.status === 'approved' || a.status === 'bernas_pick' || a.status === 'used').length;
  const pendingCount = articles.filter(a => a.status === 'pending').length;
  const rejectedCount = articles.filter(a => a.status === 'rejected').length;
  const topStories = articles.filter(a => (a.opportunity_score || 0) >= 4).slice(0, 3);
  const bernasPick = articles.find(a => a.status === 'bernas_pick');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Good Morning Card */}
      <div className="glass-panel glow-purple p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-berna-purple/10 to-transparent rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-berna-orange/5 to-transparent rounded-full -ml-12 -mb-12" />
        <div className="relative">
          <p className="text-muted-foreground text-sm mb-1">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Good Morning, <span className="text-transparent bg-clip-text bg-gradient-to-r from-berna-purple to-berna-orange">Berna</span>.
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {briefing && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme</span>
                  <span className="text-xs text-white font-medium">{briefing.theme || 'American Innovation'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Read</span>
                  <span className="text-xs text-white font-medium">{briefing.estimated_read_time || '12 min'}</span>
                </div>
              </>
            )}
            <StatusBadge status={briefing?.status || 'pending'} />
          </div>
          <div className="mt-6">
            <Link to="/brief">
              <Button className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 hover:to-berna-purple/70 text-white glow-purple">
                <FileText className="w-4 h-4 mr-2" />
                Open Today's Brief
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Automation Status */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline">Automation Status</h2>
            <Link to="/automation" className="text-[10px] text-berna-purple hover:text-berna-purple/80">View All</Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-xs text-muted-foreground">Next Run</span>
              <span className="text-xs font-mono text-berna-purple">Tomorrow 6:00 AM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-xs text-muted-foreground">Last Run</span>
              <span className="text-xs font-mono text-white">{lastLog?.started_at ? new Date(lastLog.started_at).toLocaleString() : 'Today 6:00 AM'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-xs text-muted-foreground">Source Pull</span>
              <span className="text-xs text-berna-emerald flex items-center gap-1"><CheckCircle className="w-3 h-3" />Complete</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <span className="text-xs text-muted-foreground">Scoring</span>
              <span className="text-xs text-berna-emerald flex items-center gap-1"><CheckCircle className="w-3 h-3" />Complete</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">Archive</span>
              <span className="text-xs text-berna-emerald flex items-center gap-1"><CheckCircle className="w-3 h-3" />Saved</span>
            </div>
          </div>
          <Link to="/automation">
            <Button variant="outline" size="sm" className="w-full border-white/10 text-white hover:bg-white/[0.04] text-xs">
              <Play className="w-3 h-3 mr-1" />
              Run Now
            </Button>
          </Link>
        </div>

        {/* Executive Snapshot */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline">Executive Snapshot</h2>
          
          {bernasPick && (
            <div className="p-3 rounded-lg bg-gradient-to-r from-berna-orange/10 to-berna-purple/10 border border-berna-orange/20">
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
                <span className="text-[10px] text-berna-orange font-semibold uppercase tracking-wider">Berna's Pick</span>
              </div>
              <p className="text-xs text-white font-medium leading-snug">{bernasPick.title}</p>
            </div>
          )}

          {topStories.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Stories</p>
              <div className="space-y-2">
                {topStories.map((story, i) => (
                  <div key={story.id} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-berna-purple mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    <p className="text-xs text-white/80 leading-snug">{story.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-bold text-white">{articles.length}</p>
              <p className="text-[10px] text-muted-foreground">Reviewed</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-bold text-berna-emerald">{approvedCount}</p>
              <p className="text-[10px] text-muted-foreground">Selected</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-bold text-yellow-400">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-bold text-red-400">{rejectedCount}</p>
              <p className="text-[10px] text-muted-foreground">Rejected</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { icon: FileText, label: 'Generate Brief', path: '/brief', color: 'text-berna-purple' },
              { icon: RefreshCw, label: 'Refresh Sources', path: '/sources', color: 'text-berna-emerald' },
              { icon: Layers, label: 'Review Story Queue', path: '/queue', color: 'text-berna-orange' },
              { icon: Archive, label: 'Open Archive', path: '/archive', color: 'text-blue-400' },
              { icon: Radio, label: 'Edit Sources', path: '/sources', color: 'text-cyan-400' },
              { icon: Settings, label: 'Automation Settings', path: '/automation', color: 'text-muted-foreground' },
            ].map(action => (
              <Link
                key={action.label}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
              >
                <action.icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-sm text-white/80 group-hover:text-white">{action.label}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Newsroom Pulse Ticker */}
      <div className="glass-panel p-3 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-berna-purple/10 border border-berna-purple/20 flex-shrink-0">
            <TrendingUp className="w-3 h-3 text-berna-purple" />
            <span className="text-[10px] text-berna-purple font-semibold uppercase tracking-wider">Newsroom Pulse</span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex gap-8 animate-ticker whitespace-nowrap">
              {(articles.length > 0 ? articles : [{ title: 'Awaiting fresh stories...' }]).map((a, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {a.category && <span className="text-berna-purple mr-1">•</span>}
                  {a.title}
                </span>
              ))}
              {(articles.length > 0 ? articles : [{ title: 'Awaiting fresh stories...' }]).map((a, i) => (
                <span key={`dup-${i}`} className="text-xs text-muted-foreground">
                  {a.category && <span className="text-berna-purple mr-1">•</span>}
                  {a.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}