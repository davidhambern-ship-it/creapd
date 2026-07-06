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

const VARIANTS = {
  news: {
    label: 'News Production',
    icon: Radio,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: Clock, label: 'Last Refresh', value: 'Today 6:00 AM' },
      { icon: Radio, label: 'Sources', value: '24' },
      { icon: Database, label: 'Pulled', value: '47' },
      { icon: CheckCircle, label: 'Approved', value: '18', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Generate Brief', path: '/news/brief' },
  },
  music: {
    label: 'Music Production',
    icon: Music,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: Disc3, label: 'Runtime', value: '70 min' },
      { icon: ListMusic, label: 'Playlist', value: '12 tracks' },
      { icon: Headphones, label: 'Talk Segments', value: '12 min' },
      { icon: CheckCircle, label: 'Rundown', value: 'Ready', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Build Rundown', path: '/music/rundown' },
  },
  spiritual: {
    label: 'Spiritual Production',
    icon: Church,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: BookOpen, label: 'Scriptures', value: '6 indexed' },
      { icon: GraduationCap, label: 'Studies', value: '3 active' },
      { icon: PenTool, label: 'Sections', value: '8' },
      { icon: CheckCircle, label: 'Approved', value: '5', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Build Message', path: '/spiritual/message' },
  },
  talk: {
    label: 'Talk Production',
    icon: Mic2,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: Lightbulb, label: 'Topics', value: '5 ready' },
      { icon: Users, label: 'Guests', value: '2 confirmed' },
      { icon: ClipboardList, label: 'Rundown', value: 'Ready', color: 'text-berna-emerald' },
      { icon: CheckCircle, label: 'Assets', value: '8', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/talk/rundown' },
  },
  cooking: {
    label: 'Cooking Production',
    icon: ChefHat,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: ChefHat, label: 'Recipes', value: '4 ready' },
      { icon: Carrot, label: 'Ingredients', value: '12 listed' },
      { icon: ClipboardList, label: 'Rundown', value: 'Ready', color: 'text-berna-emerald' },
      { icon: CheckCircle, label: 'Assets', value: '8', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/cooking/rundown' },
  },
  cosmo: {
    label: 'Cosmo Production',
    icon: Sparkles,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: Sparkles, label: 'Topics', value: '5 ready' },
      { icon: Users, label: 'Guests', value: '2 confirmed' },
      { icon: ClipboardList, label: 'Rundown', value: 'Ready', color: 'text-berna-emerald' },
      { icon: CheckCircle, label: 'Assets', value: '8', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Open Rundown', path: '/cosmo/rundown' },
  },
  research: {
    label: 'Research Production',
    icon: FlaskConical,
    stats: [
      { icon: Activity, label: 'Automation', value: 'Active', color: 'text-berna-emerald' },
      { icon: Lightbulb, label: 'Topics', value: '3 active' },
      { icon: Layers, label: 'Points', value: '24' },
      { icon: CheckCircle, label: 'Approved', value: '12', color: 'text-berna-emerald' },
      { icon: Sparkles, label: 'Packages', value: '5', color: 'text-berna-emerald' },
    ],
    action: { icon: Zap, label: 'Open Topics', path: '/research/topics' },
  },
};

export default function ProductionFooter({ variant = 'news' }) {
  const config = VARIANTS[variant] || VARIANTS.news;
  const ActionIcon = config.action.icon;

  return (
    <footer className="hidden lg:flex h-8 glass-panel-navy border-t border-white/[0.06] items-center px-4 gap-6 text-[10px] font-mono text-muted-foreground">
      {config.stats.map((stat, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <stat.icon className={`w-3 h-3 ${stat.color || ''}`} />
          <span>{stat.label}: <span className={stat.color || 'text-foreground'}>{stat.value}</span></span>
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
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Wifi className="w-3 h-3 text-berna-emerald" />
          <span>All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
}