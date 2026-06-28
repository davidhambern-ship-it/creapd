import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ProducerHeader from './ProducerHeader';
import ProducerSidebar from './ProducerSidebar';
import ProducerFooter from './ProducerFooter';

export default function ProducerLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <ProducerHeader onGenerateBrief={() => {}} />
      <div className="flex flex-1 overflow-hidden">
        <ProducerSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <ProducerFooter />
    </div>
  );
}