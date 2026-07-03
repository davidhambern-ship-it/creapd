import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CloudSun, TrendingUp, Trophy, Flame, Clapperboard, Bot, ListVideo } from 'lucide-react';

export default function MonitorWall({ articles = [], automationLog, packages = [] }) {
  const breaking = articles.find(a => a.status === 'bernas_pick')
    || articles.find(a => (a.opportunity_score || 0) >= 4);
  const trending = [...articles]
    .sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
    .slice(0, 3);
  const pendingCount = articles.filter(a => a.status === 'pending').length;

  const monitors = [
    { icon: AlertCircle, label: 'BREAKING NEWS', path: '/queue',
      content: breaking?.title || 'Monitoring feeds...',
      active: !!breaking, dot: 'bg-red-500', text: 'text-red-400' },
    { icon: CloudSun, label: 'WEATHER', path: '/research',
      content: '72°F · Partly Cloudy · Atlanta, GA',
      active: true, dot: 'bg-sky-500', text: 'text-sky-400' },
    { icon: TrendingUp, label: 'MARKETS', path: '/research',
      content: 'DOW +0.8% · NASDAQ +1.2% · S&P +0.5%',
      active: true, dot: 'bg-emerald-500', text: 'text-emerald-400' },
    { icon: Trophy, label: 'SPORTS', path: '/research',
      content: 'Braves 4-2 · Hawks preseason 7:30 PM',
      active: true, dot: 'bg-amber-500', text: 'text-amber-400' },
    { icon: Flame, label: 'TRENDING', path: '/queue',
      content: trending.length > 0 ? trending.map(t => t.title).join(' · ') : 'No trending stories',
      active: trending.length > 0, dot: 'bg-purple-500', text: 'text-purple-400' },
    { icon: Clapperboard, label: 'PRODUCTION', path: '/production',
      content: `${packages.length} active package${packages.length !== 1 ? 's' : ''}`,
      active: packages.length > 0, dot: 'bg-blue-500', text: 'text-blue-400' },
    { icon: Bot, label: 'AI ACTIVITY', path: '/automation',
      content: automationLog?.status === 'success' ? 'All systems operational' : (automationLog?.status || 'Idle'),
      active: true, dot: 'bg-cyan-500', text: 'text-cyan-400' },
    { icon: ListVideo, label: 'RUNDOWN', path: '/brief',
      content: `${pendingCount} stor${pendingCount !== 1 ? 'ies' : 'y'} pending review`,
      active: pendingCount > 0, dot: 'bg-yellow-500', text: 'text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {monitors.map((m, i) => (
        <Link key={i} to={m.path} className="group">
          <div className="relative rounded-lg overflow-hidden border border-white/[0.06] bg-gradient-to-b from-zinc-900/80 to-black/90 h-full transition-all duration-300 hover:scale-[1.02] hover:border-white/15">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${m.active ? 'animate-pulse' : 'opacity-30'}`} />
                <m.icon className={`w-3 h-3 ${m.text}`} />
                <span className="text-[9px] font-mono font-bold tracking-wider text-white/60">{m.label}</span>
              </div>
              <span className="text-[8px] font-mono text-white/25">CH{i + 1}</span>
            </div>
            <div className="p-3 min-h-[60px] flex items-center">
              <p className={`text-[11px] leading-snug line-clamp-3 ${m.active ? 'text-white/80' : 'text-white/35'}`}>
                {m.content}
              </p>
            </div>
            <div className="px-3 py-1 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-wider">{m.active ? 'ON AIR' : 'STANDBY'}</span>
              <span className={`text-[8px] font-mono ${m.text} opacity-0 group-hover:opacity-100 transition-opacity`}>OPEN →</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}