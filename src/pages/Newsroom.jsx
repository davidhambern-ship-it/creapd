import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CalendarDays, Sparkles, Compass, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import LedTicker from '@/components/newsroom/LedTicker';
import MonitorWall from '@/components/newsroom/MonitorWall';
import AssignmentWhiteboard from '@/components/newsroom/AssignmentWhiteboard';
import ProducerDesk from '@/components/newsroom/ProducerDesk';
import StoryFolder from '@/components/newsroom/StoryFolder';
import AiProducerBooth from '@/components/newsroom/AiProducerBooth';
import ResearchQuickDesk from '@/components/newsroom/ResearchQuickDesk';
import MediaPreview from '@/components/newsroom/MediaPreview';
import BroadcastReadyPanel from '@/components/newsroom/BroadcastReadyPanel';
import MiniArchive from '@/components/newsroom/MiniArchive';

export default function Newsroom() {
  const [briefing, setBriefing] = useState(null);
  const [articles, setArticles] = useState([]);
  const [lastLog, setLastLog] = useState(null);
  const [packages, setPackages] = useState([]);
  const [exportsList, setExportsList] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionOpen, setDirectionOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Briefing.filter({}, '-created_date', 1),
      base44.entities.Article.filter({}, '-created_date', 30),
      base44.entities.AutomationLog.filter({}, '-created_date', 1),
      base44.entities.ProductionPackage.list('-created_date', 5),
      base44.entities.ExportLog.list('-created_date', 5),
      base44.entities.ImageAsset.list('-created_date', 6),
    ]).then(([briefs, arts, logs, pkgs, exps, imgs]) => {
      setBriefing(briefs[0] || null);
      setArticles(arts);
      setLastLog(logs[0] || null);
      setPackages(pkgs);
      setExportsList(exps);
      setImages(imgs);
    }).finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = (id, status) => {
    setArticles(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const isSaturday = new Date().getDay() === 6;
  const topStories = articles.filter(a => a.status === 'approved' || a.status === 'bernas_pick').slice(0, 4);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">Entering newsroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-4 p-3 lg:p-4 env-atmosphere-production">
      {/* LED NEWS TICKER */}
      <LedTicker articles={articles} breakingNews={articles.find(a => a.status === 'bernas_pick')} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white font-display tracking-wide">
            NEWSROOM <span className="text-berna-orange">LIVE</span>
          </h1>
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {briefing && ` · ${briefing.theme || "Today's Brief"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSaturday && (
            <Link to="/planner">
              <Button variant="outline" size="sm" className="border-amber-400/20 text-amber-400 text-xs hover:bg-amber-400/10">
                <CalendarDays className="w-3 h-3 mr-1" />Plan Week
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={() => setDirectionOpen(true)} className="border-berna-orange/20 text-berna-orange text-xs hover:bg-berna-orange/10">
            <Compass className="w-3 h-3 mr-1" />Change Direction
          </Button>
          <Link to="/brief">
            <Button size="sm" className="bg-gradient-to-r from-berna-purple to-berna-purple/80 text-white text-xs">
              <Sparkles className="w-3 h-3 mr-1" />Open Brief
            </Button>
          </Link>
        </div>
      </div>

      {/* FLOOR PLAN — Row 1: Monitor Wall | Assignment Whiteboard | AI Producer Booth */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        <div className="lg:col-span-5">
          <MonitorWall articles={articles} automationLog={lastLog} packages={packages} />
        </div>
        <div className="lg:col-span-4">
          <AssignmentWhiteboard articles={articles} onUpdateStatus={handleStatusUpdate} />
        </div>
        <div className="lg:col-span-3">
          <AiProducerBooth automationLog={lastLog} />
        </div>
      </div>

      {/* FLOOR PLAN — Row 2: Research Quick Desk | Producer Desk (Hero) | Story Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        <div className="lg:col-span-3">
          <ResearchQuickDesk articles={articles} />
        </div>
        <div className="lg:col-span-6">
          <ProducerDesk briefing={briefing} packages={packages} exports={exportsList} />
        </div>
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-zinc-800/40 to-zinc-900/60 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-amber-400 rounded-full" />
                <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Story Manager</h3>
              </div>
              <Link to="/workspace" className="text-[10px] font-mono text-amber-400/60 hover:text-amber-400">ALL →</Link>
            </div>
            <div className="space-y-1.5 flex-1">
              {topStories.length > 0 ? topStories.map(article => (
                <StoryFolder key={article.id} article={article} />
              )) : (
                <div className="text-center py-6">
                  <FolderOpen className="w-6 h-6 text-white/10 mx-auto mb-1" />
                  <p className="text-[10px] text-white/30 font-mono">No active folders</p>
                </div>
              )}
            </div>
            <Link to="/workspace" className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-colors">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">Story Manager</span>
            </Link>
          </div>
        </div>
      </div>

      {/* FLOOR PLAN — Row 3: Media Preview | Broadcast Ready Panel | Mini Archive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        <div className="lg:col-span-4">
          <MediaPreview images={images} />
        </div>
        <div className="lg:col-span-4">
          <BroadcastReadyPanel packages={packages} />
        </div>
        <div className="lg:col-span-4">
          <MiniArchive articles={articles} />
        </div>
      </div>

      <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
    </div>
  );
}