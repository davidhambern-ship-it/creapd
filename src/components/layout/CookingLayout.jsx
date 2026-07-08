import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { COOKING_NAV_ITEMS } from '@/lib/cookingConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, ChefHat, Carrot,
  ClipboardList, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle,
  Compass
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
  { icon: LayoutDashboard, label: 'Dashboard', path: '/cooking/dashboard' },
  { icon: Compass, label: 'Discovery', path: '/cooking/configure' },
  { icon: Search, label: 'Knowledge', path: '/cooking/research' },
  { icon: ChefHat, label: 'Blueprint', path: '/cooking/recipes' },
  { icon: Sparkles, label: 'Production', path: '/cooking/assets' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ChefHat, Carrot,
  ClipboardList, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle, Compass
};

export default function CookingLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex h-screen overflow-hidden flex-col env-root" style={PRODUCTION_PROFILE_THEMES.cooking.vars}>
      <EnvironmentLayer profileKey="cooking" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col env-glass-sidebar">
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            <SidebarNavSections items={COOKING_NAV_ITEMS} iconMap={ICON_MAP} />
            <AdminSidebarSection variant="cooking" onNavigate={() => {}} />
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <Link to="/home" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors">
              <LayoutGrid className="w-4 h-4" />
              CREAPD Home
            </Link>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <ProductionFooter variant="cooking" />
      </div>
      <MobileBottomNav items={MOBILE_NAV_ITEMS} />

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        navItems={COOKING_NAV_ITEMS}
        iconMap={ICON_MAP}
        variant="cooking"
      />
    </div>
  );
}