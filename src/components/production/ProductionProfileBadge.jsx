import React from 'react';
import { 
  Search, Mic, Radio, Music, ChefHat, Trophy, 
  MessageCircle, Video, Church, GraduationCap, 
  Briefcase, Gamepad2, Settings 
} from 'lucide-react';

const PROFILE_ICONS = {
  news: Search,
  podcast: Mic,
  radio_show: Radio,
  music_show: Music,
  cooking_show: ChefHat,
  sports_show: Trophy,
  talk_show: MessageCircle,
  livestream: Video,
  church_service: Church,
  educational_content: GraduationCap,
  business_briefing: Briefcase,
  gaming_stream: Gamepad2,
  custom: Settings
};

const PROFILE_COLORS = {
  news: 'text-berna-purple bg-berna-purple/10 border-berna-purple/20',
  podcast: 'text-berna-orange bg-berna-orange/10 border-berna-orange/20',
  radio_show: 'text-berna-emerald bg-berna-emerald/10 border-berna-emerald/20',
  music_show: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  cooking_show: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  sports_show: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  talk_show: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  livestream: 'text-red-500 bg-red-500/10 border-red-500/20',
  church_service: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  educational_content: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
  business_briefing: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  gaming_stream: 'text-lime-500 bg-lime-500/10 border-lime-500/20',
  custom: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
};

export default function ProductionProfileBadge({ profileType, size = 'md', showLabel = true }) {
  const Icon = PROFILE_ICONS[profileType] || Settings;
  const colorClass = PROFILE_COLORS[profileType] || PROFILE_COLORS.custom;
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClass}`}>
      <Icon className={sizeClasses[size]} />
      {showLabel && (
        <span className={`font-medium ${sizeClasses[size]}`}>
          {profileType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      )}
    </div>
  );
}