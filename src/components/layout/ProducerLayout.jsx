import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ProducerHeader from './ProducerHeader';
import EnvironmentLayer from '@/components/environment/EnvironmentLayer';
import MobilePageShell from '@/components/mobile/MobilePageShell';
import PodcastProductionMap from './PodcastProductionMap';
import { PRODUCTION_PROFILE_THEMES } from '@/lib/productionProfileThemes';

export default function ProducerLayout() {
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  return (
    <div
      className="talk-studio-shell relative h-screen flex flex-col overflow-hidden env-root"
      style={PRODUCTION_PROFILE_THEMES.talk.vars}
    >
      <div className="talk-studio-backdrop" aria-hidden="true" />
      <EnvironmentLayer profileKey="talk" />


      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        <ProducerHeader
          variant="podcast"
          onGenerateBrief={() => {}}
          onOpenNav={() => setNavDrawerOpen(true)}
        />

        <main className="talk-studio-main relative flex-1 overflow-y-auto">
          <div className="relative z-20 min-h-full">
            <MobilePageShell>
              <Outlet />
            </MobilePageShell>
          </div>
        </main>
      </div>

      <PodcastProductionMap
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
      />
    </div>
  );
}
