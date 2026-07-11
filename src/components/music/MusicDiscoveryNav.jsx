import React from 'react';
import { LayoutDashboard, Search, ListMusic, ListChecks, Package, Sparkles } from 'lucide-react';
import DiscoveryNavBar from '@/components/music/DiscoveryNavBar';

const MUSIC_NAV_ROOMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard', color: '#00FFFF' },
  { icon: ListChecks, label: 'Topics', path: '/music/topics', color: '#FF6B00' },
  { icon: Search, label: 'Knowledge', path: '/music/research', color: '#00FF88' },
  { icon: ListMusic, label: 'Playlist', path: '/music/playlist', color: '#8B5CF6' },
  { icon: Sparkles, label: 'Assets', path: '/music/assets', color: '#FF00FF' },
  { icon: Package, label: 'Rundown', path: '/music/rundown', color: '#FFD700' },
];

export default function MusicDiscoveryNav({ onRoulette, rouletteColor = '#FF00FF' }) {
  return (
    <div className="flex justify-center overflow-x-auto">
      <DiscoveryNavBar
        rooms={MUSIC_NAV_ROOMS}
        onRoulette={onRoulette}
        rouletteColor={rouletteColor}
      />
    </div>
  );
}