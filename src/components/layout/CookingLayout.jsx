import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { COOKING_NAV_ITEMS } from '@/lib/cookingConstants';
import {
  LayoutDashboard, SlidersHorizontal, Search, ChefHat, Carrot,
  ClipboardList, Sparkles, Download, Settings, X, Menu, LayoutGrid, Circle
} from 'lucide-react';
import AdminSidebarSection from './AdminSidebarSection';
import SidebarNavSections from './SidebarNavSections';
import ProducerHeader from './ProducerHeader';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import ProfileIntroOverlay from '@/components/creap/cinematic/ProfileIntroOverlay';

const MOBILE_NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/cooking/dashboard' },
  { icon: Search, label: 'Research', path: '/cooking/research' },
  { icon: ChefHat, label: 'Recipes', path: '/cooking/recipes' },
  { icon: Carrot, label: 'Ingredients', path: '/cooking/ingredients' },
  { icon: ClipboardList, label: 'Rundown', path: '/cooking/rundown' },
];

const ICON_MAP = {
  LayoutDashboard, Settings2: SlidersHorizontal, Search, ChefHat, Carrot,
  ClipboardList, Sparkles, Download, Settings,
  X, Menu, LayoutGrid, Circle
};

export default function CookingLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <ProducerHeader onGenerateBrief={() => {}} onOpenNav={() => setMobileNavOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
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
      <ProfileIntroOverlay profileKey="cooking" />
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