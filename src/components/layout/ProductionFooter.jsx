import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Clock, Database, CheckCircle, Radio, Wifi,
  Music, ListMusic, Disc3, Headphones,
  Church, BookOpen, GraduationCap, PenTool,
  Mic2, Lightbulb, Users, ClipboardList,
  ChefHat, Carrot, Trophy, Sparkles,
  Zap, FlaskConical, Layers
} from 'lucide-react';
import { useFooterStats } from '@/hooks/useFooterStats';

const VARIANTS = {
  news: {
    label: 'News Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'lastRefresh', icon: Clock, label: 'Last Refresh' },
      { key: 'sources', icon: Radio, label: 'Sources' },
      { key: 'pulled', icon: Database, label: 'Pulled' },
      { key: 'approved', icon: CheckCircle, label: 'Approved' },
    ],
    action: { icon: Zap, label: 'Generate Brief', path: '/news/brief' },
  },
  music: {
    label: 'Music Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'runtime', icon: Disc3, label: 'Runtime' },
      { key: 'playlist', icon: ListMusic, label: 'Playlist' },
      { key: 'talkSegments', icon: Headphones, label: 'Talk Segments' },
      { key: 'rundown', icon: CheckCircle, label: 'Rundown' },
    ],
    action: { icon: Zap, label: 'Build Rundown', path: '/music/rundown' },
  },
  spiritual: {
    label: 'Spiritual Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'research', icon: BookOpen, label: 'Research' },
      { key: 'studies', icon: GraduationCap, label: 'Studies' },
      { key: 'sections', icon: PenTool, label: 'Sections' },
      { key: 'approved', icon: CheckCircle, label: 'Approved Assets' },
    ],
    action: { icon: Zap, label: 'Build Message', path: '/spiritual/message' },
  },
  talk: {
    label: 'Talk Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'topics', icon: Lightbulb, label: 'Topics' },
      { key: 'guests', icon: Users, label: 'Guests' },
      { key: 'rundown', icon: ClipboardList, label: 'Rundown' },
      { key: 'assets', icon: CheckCircle, label: 'Assets' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/talk/rundown' },
  },
  cooking: {
    label: 'Cooking Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'recipes', icon: ChefHat, label: 'Recipes' },
      { key: 'ingredients', icon: Carrot, label: 'Ingredients' },
      { key: 'rundown', icon: ClipboardList, label: 'Rundown' },
      { key: 'assets', icon: CheckCircle, label: 'Assets' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/cooking/rundown' },
  },
  sports: {
    label: 'Sports Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'games', icon: Trophy, label: 'Games' },
      { key: 'athletes', icon: Users, label: 'Athletes' },
      { key: 'rundown', icon: ClipboardList, label: 'Rundown' },
      { key: 'assets', icon: CheckCircle, label: 'Assets' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/sports/rundown' },
  },
  cosmo: {
    label: 'Cosmo Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'topics', icon: Sparkles, label: 'Topics' },
      { key: 'guests', icon: Users, label: 'Guests' },
      { key: 'rundown', icon: ClipboardList, label: 'Rundown' },
      { key: 'assets', icon: CheckCircle, label: 'Assets' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/cosmo/rundown' },
  },
  research: {
    label: 'Research Production',
    stats: [
      { key: 'automation', icon: Activity, label: 'Automation' },
      { key: 'topics', icon: Lightbulb, label: 'Topics' },
      { key: 'points', icon: Layers, label: 'Points' },
      { key: 'approved', icon: CheckCircle, label: 'Approved' },
      { key: 'packages', icon: Sparkles, label: 'Packages' },
    ],
    action: { icon: Zap, label: 'Open Topics', path: '/research/topics' },
  },
};

export default function ProductionFooter({ variant = 'news' }) {
  const config = VARIANTS[variant] || VARIANTS.news;
  const ActionIcon = config.action.icon;
  const liveStats = useFooterStats(variant);

  const stats = config.stats.map((stat) => {
    const live = liveStats?.[stat.key];
    return {
      ...stat,
      value: live?.value ?? '—',
      color: live?.color || 'text-foreground',
    };
  });

  const health = liveStats?.health || 'loading';
  const healthLabel = health === 'failed'
    ? 'Attention Required'
    : health === 'ok'
      ? 'Systems Reporting'
      : health === 'unknown'
        ? 'Status Unavailable'
        : 'Status Loading';
  const healthColor = health === 'failed'
    ? 'text-red-400'
    : health === 'ok'
      ? 'text-berna-emerald'
      : 'text-muted-foreground';

  return (
    <footer className="hidden lg:flex h-8 glass-panel-navy border-t border-white/[0.06] items-center px-4 gap-6 text-[10px] font-mono text-muted-foreground">
      {stats.map((stat) => (
        <div key={stat.key} className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <stat.icon className={`w-3 h-3 ${stat.color || ''}`} />
          <span>{stat.label}: <span className={stat.color}>{stat.value}</span></span>
        </div>
      ))}
      <div className="ml-auto flex items-center gap-4 flex-shrink-0">
        <Link
          to={config.action.path}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium whitespace-nowrap"
        >
          <ActionIcon className="w-3 h-3" />
          {config.action.label}
        </Link>
        <div className={`flex items-center gap-1.5 whitespace-nowrap ${healthColor}`}>
          <Wifi className="w-3 h-3" />
          <span>{healthLabel}</span>
        </div>
      </div>
    </footer>
  );
}
