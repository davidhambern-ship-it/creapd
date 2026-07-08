import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { SPIRITUAL_NAV_ITEMS } from '@/lib/spiritualConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, BookOpen, GraduationCap,
  PenTool, Sparkles, Package, Download, Settings, X, Menu, LayoutGrid, Circle, Church,
  Library, Languages, Columns2, Star, Clock3, Compass
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/spiritual/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/spiritual/configure' },
  { icon: Search, label: 'Knowledge', path: '/spiritual/research' },
  { icon: GraduationCap, label: 'Blueprint', path: '/spiritual/study' },
  { icon: Sparkles, label: 'Production', path: '/spiritual/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, BookOpen,
  GraduationCap, PenTool, Sparkles, Package, Download, Settings,
  X, Menu, LayoutGrid, Circle, Church, Library, Languages, Columns2,
  Star, Clock3, Compass
};

export default function SpiritualLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.spiritual.vars}>
      <EnvironmentLayer profileKey="spiritual" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 flex-col env-glass-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={SPIRITUAL_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="spiritual" onNavigate={() => {}} />
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <Link to="/production-types" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
              Switch Production Type
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <ProductionFooter variant="spiritual" />
      </div>
      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={SPIRITUAL_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="spiritual"
      />
    </div>
  );
}