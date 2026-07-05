import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  FileText, RefreshCw, Layers, Archive, Radio, Settings,
  Play, Clock, CheckCircle, AlertCircle, TrendingUp, Star,
  Zap, ArrowRight, ChevronRight, Compass, CalendarDays,
  Sparkles, Copy, BarChart3, RotateCw, Palette, Tv, Download, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/StatusBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import ProductionStatusIndicator from '@/components/shared/ProductionStatusIndicator';

export default function Dashboard() {
  const [briefing, setBriefing] = useState(null);
  const [articles, setArticles] = useState([]);
  const [lastLog, setLastLog] = useState(null);
  const [favBrands, setFavBrands] = useState([]);
  const [favShows, setFavShows] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [recentPackages, setRecentPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionOpen, setDirectionOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Briefing.filter({}, '-created_date', 1),
      base44.entities.Article.filter({}, '-created_date', 20),
      base44.entities.AutomationLog.filter({}, '-created_date', 1),
      base44.entities.BrandProfile.filter({ is_favorite: true }, '-created_date', 5),
      base44.entities.ShowProfile.filter({ is_favorite: true }, '-created_date', 5),
      base44.entities.ExportLog.list('-created_date', 5),
      base44.entities.ProductionPackage.filter({ production_profile: 'news' }, '-created_date', 5),
    ]).then(([briefs, arts, logs, brands, shows, exports, pkgs]) => {
      setBriefing(briefs[0] || null);
      setArticles(arts);
      setLastLog(logs[0] || null);
      setFavBrands(brands);
      setFavShows(shows);
      setRecentExports(exports);
      setRecentPackages(pkgs);
    }).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const isSaturday = today.getDay() === 6;
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

  if (isSaturday) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Saturday Planning Day */}
        <div className="glass-panel glow-orange p-6 lg:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-berna-orange/10 to-transparent rounded-full -mr-20 -mt-20" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-5 h-5 text-berna-orange" />
              <p className="text-[10px] text-berna-orange uppercase tracking-[0.2em] font-semibold">Saturday Planning Day</p>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">CREAP Your Week!</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Map out every day of the week in one view — assign daily themes, select focus topics and categories,
              schedule your morning briefings, choose which stories to prioritize, copy a previous week's plan as a starting point,
              and fine-tune your automation settings before Monday arrives.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Link to="/planner">
                <Button className="bg-gradient-to-r from-berna-orange to-berna-orange/80 hover:from-berna-orange/90 text-white glow-orange">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Plan Next Week
                </Button>
              </Link>
              <Link to="/planner">
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                  <Copy className="w-4 h-4 mr-2" />Copy Last Week
                </Button>
              </Link>
              <Link to="/planner">
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                  <Sparkles className="w-4 h-4 mr-2" />Generate Suggested Week
                </Button>
              </Link>
              <Link to="/archive">
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                  <BarChart3 className="w-4 h-4 mr-2" />Review Source Performance
                </Button>
              </Link>
              <Link to="/archive">
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                  <RotateCw className="w-4 h-4 mr-2" />Review Archive Repeats
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick stats for planning context */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-panel p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white neon-underline">This Week's Status</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-xs text-muted-foreground">Briefs Generated</span>
                <span className="text-xs font-mono text-berna-emerald">{articles.filter(a => a.status === 'used').length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <span className="text-xs text-muted-foreground">Stories Approved</span>
                <span className="text-xs font-mono text-white">{approvedCount}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">Pending Review</span>
                <span className="text-xs font-mono text-yellow-400">{pendingCount}</span>
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white neon-underline">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/planner" className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all group">
                <CalendarDays className="w-4 h-4 text-berna-purple" />
                <span className="text-sm text-white/80 group-hover:text-white">Open Weekly Planner</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
              </Link>
              <Link to="/sources" className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all group">
                <Radio className="w-4 h-4 text-berna-emerald" />
                <span className="text-sm text-white/80 group-hover:text-white">Manage Sources</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
              </Link>
              <Link to="/archive" className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-all group">
                <Archive className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white/80 group-hover:text-white">Review Archive</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
              </Link>
            </div>
          </div>
          <div className="glass-panel p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white neon-underline">Berna's Pick</h2>
            {bernasPick ? (
              <div className="p-3 rounded-lg bg-gradient-to-r from-berna-orange/10 to-berna-purple/10 border border-berna-orange/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
                  <span className="text-[10px] text-berna-orange font-semibold uppercase tracking-wider">Top Story</span>
                </div>
                <p className="text-xs text-white font-medium leading-snug">{bernasPick.title}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No pick selected yet.</p>
            )}
          </div>
        </div>

        <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
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
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/brief">
              <Button className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 hover:to-berna-purple/70 text-white glow-purple">
                <FileText className="w-4 h-4 mr-2" />
                Open Today's Brief
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/planner">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.04]">
                <CalendarDays className="w-4 h-4 mr-2" />Weekly Planner
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setDirectionOpen(true)} className="border-berna-orange/20 text-berna-orange hover:bg-berna-orange/10">
              <Compass className="w-4 h-4 mr-2" />Change Direction
            </Button>
          </div>
        </div>
      </div>

      {/* Weekly Planner Card */}
      <Link to="/planner" className="block group">
        <div className="glass-panel glow-purple p-5 lg:p-6 relative overflow-hidden transition-all hover:border-berna-purple/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-berna-purple/10 to-transparent rounded-full -mr-16 -mt-16" />
          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-berna-purple/20 to-berna-purple/5 border border-berna-purple/20 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-berna-purple" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-white mb-1">Plan Your Week</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Set daily themes, choose focus topics, and schedule briefings ahead of time. Map out your entire week's content strategy in one place.
              </p>
              <div className="flex items-center gap-1 mt-3 text-xs text-berna-purple font-medium">
                Open Weekly Planner
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>

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
              { icon: CalendarDays, label: 'Weekly Planner', path: '/planner', color: 'text-berna-purple' },
              { icon: FileText, label: 'Generate Brief', path: '/brief', color: 'text-berna-purple' },
              { icon: RefreshCw, label: 'Refresh Sources', path: '/sources', color: 'text-berna-emerald' },
              { icon: Layers, label: 'Review Story Queue', path: '/queue', color: 'text-berna-orange' },
              { icon: Archive, label: 'Open Archive', path: '/archive', color: 'text-blue-400' },
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

      {/* Production Status & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Recent Productions with Status */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline">Recent Productions</h2>
            <Link to="/production" className="text-[10px] text-berna-purple hover:text-berna-purple/80">View All</Link>
          </div>
          {recentPackages.length > 0 ? (
            <div className="space-y-3">
              {recentPackages.slice(0, 3).map(pkg => {
                const stageMap = { not_generated: 'briefing', generating: 'package_generated', generated: 'package_generated', edited: 'editing_complete', approved: 'ready_for_export' };
                return (
                  <Link key={pkg.id} to="/production" className="block p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all">
                    <p className="text-xs text-white font-medium line-clamp-1 mb-2">{pkg.story_summary || pkg.teleprompter_script?.slice(0, 60) || 'Untitled Package'}</p>
                    <ProductionStatusIndicator currentStage={stageMap[pkg.status] || 'briefing'} showLabels={false} compactLabel />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No productions yet. Generate packages from the Production page.</p>
          )}
        </div>

        {/* Favorite Profiles */}
        <div className="glass-panel p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white neon-underline">Favorite Profiles</h2>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Palette className="w-3 h-3 text-berna-purple" />Brand Profiles</p>
              {favBrands.length > 0 ? (
                <div className="space-y-1.5">
                  {favBrands.map(brand => (
                    <Link key={brand.id} to="/brands" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                      <Heart className="w-3 h-3 text-berna-orange fill-berna-orange flex-shrink-0" />
                      <span className="text-xs text-white/80 group-hover:text-white truncate">{brand.brand_name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">No favorites yet. Star profiles from the Brand Profiles page.</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Tv className="w-3 h-3 text-berna-emerald" />Show Profiles</p>
              {favShows.length > 0 ? (
                <div className="space-y-1.5">
                  {favShows.map(show => (
                    <Link key={show.id} to="/shows" className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                      <Heart className="w-3 h-3 text-berna-orange fill-berna-orange flex-shrink-0" />
                      <span className="text-xs text-white/80 group-hover:text-white truncate">{show.show_name}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">No favorites yet. Star profiles from the Show Profiles page.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Exports */}
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline">Recent Exports</h2>
            <Link to="/export" className="text-[10px] text-berna-purple hover:text-berna-purple/80">View All</Link>
          </div>
          {recentExports.length > 0 ? (
            <div className="space-y-2">
              {recentExports.map(exp => (
                <div key={exp.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <Download className={`w-3 h-3 flex-shrink-0 ${exp.status === 'success' ? 'text-berna-emerald' : 'text-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{exp.file_name || `${exp.format} export`}</p>
                    <p className="text-[10px] text-muted-foreground">{exp.format?.toUpperCase()} · {exp.asset_count || 0} assets</p>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${exp.status === 'success' ? 'bg-berna-emerald/10 text-berna-emerald' : 'bg-red-500/10 text-red-400'}`}>
                    {exp.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No exports yet. Export packages from the Export Center.</p>
          )}
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

      <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
    </div>
  );
}