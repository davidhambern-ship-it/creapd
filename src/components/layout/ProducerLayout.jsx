import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ProducerHeader from './ProducerHeader';
import ProducerSidebar from './ProducerSidebar';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import { PRODUCER_NAV_ITEMS } from '@/lib/producerNav';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

export default function ProducerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  return (
    <div className="relative h-screen flex flex-col overflow-hidden env-root" style={PRODUCTION_PROFILE_THEMES.news.vars}>
      <EnvironmentLayer profileKey="news" />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
      <ProducerHeader
        onGenerateBrief={() => {}}
        onOpenNav={() => setNavDrawerOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <ProducerSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <ProductionFooter variant="news" />
      </div>
      <MobileNavDrawer
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
        navItems={PRODUCER_NAV_ITEMS}
        variant="producer"
      />
    </div>
  );
}