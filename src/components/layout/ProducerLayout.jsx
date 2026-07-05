import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ProducerHeader from './ProducerHeader';
import ProducerSidebar from './ProducerSidebar';
import ProductionFooter from './ProductionFooter';
import MobileNavDrawer from './MobileNavDrawer';
import CreapdLauncher from '@/components/creap/CreapdLauncher';
import IdlePersonalityToast from '@/components/creap/IdlePersonalityToast';
import ModeStatusBanner from '@/components/creap/ModeStatusBanner';
import { PRODUCER_NAV_ITEMS } from '@/lib/producerNav';

export default function ProducerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <ProducerHeader
        onGenerateBrief={() => {}}
        onOpenNav={() => setNavDrawerOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <ProducerSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <ModeStatusBanner />
          <Outlet />
        </main>
      </div>
      <ProductionFooter variant="news" />
      <MobileNavDrawer
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
        navItems={PRODUCER_NAV_ITEMS}
        variant="producer"
      />
      <CreapdLauncher />
      <IdlePersonalityToast />
    </div>
  );
}