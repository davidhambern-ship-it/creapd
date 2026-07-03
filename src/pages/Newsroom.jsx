import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CalendarDays, Sparkles, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChangeDirectionModal from '@/components/weekly/ChangeDirectionModal';
import LedTicker from '@/components/newsroom/LedTicker';
import MonitorWall from '@/components/newsroom/MonitorWall';
import AssignmentWhiteboard from '@/components/newsroom/AssignmentWhiteboard';
import StickyNoteBoard from '@/components/newsroom/StickyNoteBoard';
import ProducerDesk from '@/components/newsroom/ProducerDesk';
import StoryFolder from '@/components/newsroom/StoryFolder';
import BroadcastControlPanel from '@/components/newsroom/BroadcastControlPanel';
import AiProducerBooth from '@/components/newsroom/AiProducerBooth';

export default function Newsroom() {
  const [briefing, setBriefing] = useState(null);
  const [articles, setArticles] = useState([]);
  const [lastLog, setLastLog] = useState(null);
  const [packages, setPackages] = useState([]);
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directionOpen, setDirectionOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Briefing.filter({}, '-created_date', 1),
      base44.entities.Article.filter({}, '-created_date', 30),
      base44.entities.AutomationLog.filter({}, '-created_date', 1),
      base44.entities.ProductionPackage.list('-created_date', 5),
      base44.entities.ExportLog.list('-created_date', 5),
    ]).then(([briefs, arts, logs, pkgs, exps]) => {
      setBriefing(briefs[0] || null);
      setArticles(arts);
      setLastLog(logs[0] || null);
      setPackages(pkgs);
      setExportsList(exps);
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
    <div className="space-y-3 lg:space-y-4 p-3 lg:p-4">
      <LedTicker articles={articles} breakingNews={articles.find(a => a.status === 'bernas_pick')} />

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

      <MonitorWall articles={articles} automationLog={lastLog} packages={packages} />

      <AssignmentWhiteboard articles={articles} onUpdateStatus={handleStatusUpdate} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        <StickyNoteBoard articles={articles} />
      </div>

      <ProducerDesk briefing={briefing} packages={packages} exports={exportsList} />

      {topStories.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-zinc-800/30 to-zinc-900/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h3 className="text-sm font-mono font-bold text-white/80 tracking-wider uppercase">Story Folders</h3>
            <Link to="/queue" className="text-[10px] font-mono text-white/40 hover:text-white/70 ml-auto">ALL STORIES →</Link>
          </div>
          <div className="space-y-1.5">
            {topStories.map(article => (
              <StoryFolder key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <BroadcastControlPanel packages={packages} />
        <AiProducerBooth automationLog={lastLog} />
      </div>

      <ChangeDirectionModal open={directionOpen} currentFocus={briefing?.theme} onClose={() => setDirectionOpen(false)} />
    </div>
  );
}