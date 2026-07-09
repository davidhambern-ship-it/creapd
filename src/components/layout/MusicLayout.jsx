import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { MUSIC_NAV_ITEMS } from '@/lib/musicConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Music, Mic,
  List, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle,
  Compass, ListMusic, ClipboardList, Database, Package
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/music/configure' },
  { icon: Search, label: 'Knowledge', path: '/music/research' },
  { icon: ListMusic, label: 'Blueprint', path: '/music/playlist' },
  { icon: Sparkles, label: 'Production', path: '/music/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ListMusic: Music,
  Mic, ClipboardList: List, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Music, Compass, Database, Package
};

// Music-themed room cards — each nav item gets a unique neon color + music icon
const ROOM_CARDS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/music/dashboard', color: '#FFD700', subtitle: 'Command center' },
  { icon: Compass, label: 'Discovery', path: '/music/configure', color: '#FF00FF', subtitle: 'Configure your show' },
  { icon: Search, label: 'Knowledge', path: '/music/research', color: '#00FFFF', subtitle: 'Music research' },
  { icon: ClipboardList, label: 'Blueprint', path: '/music/playlist', color: '#8B00FF', subtitle: 'Playlist plan' },
  { icon: Sparkles, label: 'Production', path: '/music/assets', color: '#FF6B00', subtitle: 'AI assets' },
  { icon: Package, label: 'Assembly', path: '/music/rundown', color: '#00FF88', subtitle: 'Show rundown' },
  { icon: Settings, label: 'Settings', path: '/settings/default-production', color: '#6B7280', subtitle: 'Defaults' },
];

export default function MusicLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.music.vars}>
      <EnvironmentLayer profileKey="music" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop — Music Room Card Rail */}
        <aside className="hidden md:flex flex-col w-[88px] shrink-0 relative z-20 overflow-y-auto py-3 px-2 gap-2"
          style={{
            background: 'hsl(220 20% 8% / 0.85)',
            backdropFilter: 'blur(16px)',
            borderRight: '1px solid hsl(190 30% 18% / 0.3)',
          }}
        >
          {ROOM_CARDS.map((room, i) => {
            const Icon = room.icon;
            const isActive = location.pathname === room.path;
            return (
              <Link
                key={room.path}
                to={room.path}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all relative overflow-hidden"
                style={isActive ? {
                  background: `${room.color}12`,
                  borderColor: `${room.color}60`,
                  boxShadow: `0 0 12px ${room.color}25, inset 0 1px 0 ${room.color}10`,
                } : {
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                {isActive && (
                  <div
                    className="absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl"
                    style={{ background: `${room.color}30` }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10 transition-transform group-hover:scale-110"
                  style={{
                    background: `${room.color}15`,
                    border: `1px solid ${room.color}35`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: room.color }} />
                </div>
                <span
                  className="text-[9px] font-heading font-bold relative z-10 transition-colors"
                  style={{ color: isActive ? room.color : 'rgba(180,180,200,0.5)' }}
                >
                  {room.label}
                </span>
              </Link>
            );
          })}

          {/* Switch production type */}
          <Link
            to="/production-types"
            className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all mt-auto"
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'rgba(255,255,255,0.06)',
            }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center relative z-10 transition-transform group-hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <LayoutGrid className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-[9px] font-heading font-bold text-gray-500">Switch</span>
          </Link>
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </main>
      </div>

      <ProductionFooter variant="music" />
      </div>
      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={MUSIC_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="music"
      />
    </div>
  );
}