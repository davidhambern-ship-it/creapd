import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Mic2, Radio, FlaskConical, Eye, ArrowRight, Clapperboard, Film } from 'lucide-react';

const QUICK_ACTIONS = [
  { icon: Radio, label: 'Open Radio', path: '/music/configure', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: Mic2, label: 'Open Podcast', path: '/news/dashboard', color: 'text-orange-300', bg: 'bg-orange-500/10' },
  { icon: FlaskConical, label: 'Open Research', path: '/research', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Clock, label: 'Continue Production', path: '/news/production', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Clapperboard, label: 'Blank Editor', path: '/editor', color: 'text-berna-purple', bg: 'bg-berna-purple/10' },
  { icon: Film, label: 'Presentations', path: '/presentations', color: 'text-berna-orange', bg: 'bg-berna-orange/10' },
  { icon: Eye, label: 'Shared Productions', path: null, color: 'text-berna-emerald', bg: 'bg-berna-emerald/10', action: 'scrollToShowcase' },
];

export default function QuickLaunch({ onScrollToShowcase }) {
  return (
    <section className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
      <h2 className="text-lg font-heading font-bold text-white neon-underline mb-4">Quick Launch</h2>
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-2 lg:gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <div className={`w-9 h-9 rounded-lg ${action.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <span className="text-xs font-heading font-semibold text-white/90 leading-tight">{action.label}</span>
              <ArrowRight className={`w-3 h-3 ${action.color} mt-1 opacity-0 group-hover:opacity-100 transition-opacity`} />
            </>
          );
          if (action.action === 'scrollToShowcase') {
            return <button key={action.label} onClick={onScrollToShowcase} className="glass-panel p-3 flex flex-col items-start text-left hover:border-white/[0.12] transition-all group">{content}</button>;
          }
          return <Link key={action.label} to={action.path} className="glass-panel p-3 flex flex-col items-start hover:border-white/[0.12] transition-all group">{content}</Link>;
        })}
      </div>
    </section>
  );
}
