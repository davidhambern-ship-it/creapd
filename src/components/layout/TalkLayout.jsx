import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TALK_NAV_ITEMS } from '@/lib/talkConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, Lightbulb, Users,
  ClipboardList, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle, Mic2,
  Compass, Home
} from 'lucide-react';
import MobileNavDrawer from './MobileNavDrawer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';
import { PP_NAV_ITEMS } from '@/lib/ppNavItems';

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, Lightbulb, Users,
  ClipboardList, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Mic2, Compass
};

const TALK_NAV_TONES = [
  'border-orange-300/25 bg-orange-400/10 text-orange-100 hover:bg-orange-400/20',
  'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100 hover:bg-fuchsia-400/20',
  'border-violet-300/25 bg-violet-400/10 text-violet-100 hover:bg-violet-400/20',
  'border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20',
  'border-pink-300/25 bg-pink-400/10 text-pink-100 hover:bg-pink-400/20',
  'border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20',
];

function TalkProfileDock({ pathname, onOpenNav }) {
  return (
    <nav
      aria-label="Production Profiles"
      className="absolute right-2 top-2 z-40 flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-xl border border-fuchsia-300/15 bg-[#0a0610]/74 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,.42)] backdrop-blur-xl lg:right-3 lg:top-3"
    >
      <button
        type="button"
        onClick={onOpenNav}
        className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[9px] font-semibold text-white/70 transition hover:border-fuchsia-300/25 hover:bg-fuchsia-300/10 hover:text-white lg:hidden"
        title="Talk menu"
      >
        <Menu className="h-3.5 w-3.5" />
        Menu
      </button>

      <Link
        to="/"
        className="flex h-7 shrink-0 items-center gap-1 rounded-lg border border-orange-300/25 bg-gradient-to-r from-orange-400/14 to-fuchsia-400/10 px-2 text-[9px] font-semibold text-orange-100 shadow-[0_0_16px_rgba(249,115,22,.08)] transition hover:from-orange-400/24 hover:to-fuchsia-400/18"
        title="CREAPD Home"
      >
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>

      {PP_NAV_ITEMS.map((item, index) => {
        const Icon = item.icon;
        const profileRoot = '/' + item.path.split('/').filter(Boolean)[0];
        const isActive = pathname.startsWith(profileRoot);
        const tone = TALK_NAV_TONES[index % TALK_NAV_TONES.length];

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[9px] font-semibold transition ${isActive
              ? 'border-fuchsia-200/45 bg-gradient-to-r from-violet-500/35 via-fuchsia-500/30 to-orange-400/25 text-white shadow-[0_0_20px_rgba(217,70,239,.18)]'
              : tone}`}
            title={item.label}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function TalkLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isDashboard = location.pathname === '/talk/dashboard';

  return (
    <div className="talk-studio-shell relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.talk.vars}>
      <div className="talk-studio-backdrop" aria-hidden="true" />
      <EnvironmentLayer profileKey="talk" />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <TalkProfileDock
          pathname={location.pathname}
          onOpenNav={() => setMobileNavOpen(true)}
        />

        <main className={isDashboard
          ? "talk-studio-main relative flex-1 min-h-0 overflow-hidden"
          : "talk-studio-main relative flex-1 min-h-0 overflow-y-auto"}>
          <MobilePageShell>
            <Outlet />
          </MobilePageShell>
        </main>
      </div>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={TALK_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="talk"
      />
    </div>
  );
}
