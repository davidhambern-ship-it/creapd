import React, { useState } from 'react';
import HeroSection from '@/components/home/HeroSection';
import PipelineExplainer from '@/components/home/PipelineExplainer';
import ProfileCard from '@/components/home/ProfileCard';
import ProductionDetailsModal from '@/components/home/ProductionDetailsModal';
import ShowcaseSection from '@/components/home/ShowcaseSection';
import QuickLaunch from '@/components/home/QuickLaunch';
import ModeStatusBanner from '@/components/creap/ModeStatusBanner';
import IdlePersonalityToast from '@/components/creap/IdlePersonalityToast';
import ShowSetupChat from '@/components/creap/ShowSetupChat';
import { ACTIVE_PROFILES, COMING_SOON_PROFILES } from '@/lib/productionProfiles';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

export default function CreapdHome() {
  const [detailsProfile, setDetailsProfile] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const { toast } = useToast();

  const handleGetStarted = (profile) => {
    if (profile.path) {
      window.location.href = profile.path;
    } else {
      toast({
        title: `${profile.label} — Coming Soon`,
        description: 'This Production Profile is being set up. Check back soon!',
      });
    }
  };

  const scrollToProfiles = () => {
    document.getElementById('profiles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToShowcase = () => {
    document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <ModeStatusBanner />
      <HeroSection onStart={scrollToProfiles} onExplore={scrollToProfiles} />
      <PipelineExplainer />

      {/* Production Profile Cards */}
      <section id="profiles" className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white neon-underline">Production Profiles</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{ACTIVE_PROFILES.length} active</span>
          </div>
        </div>

        {/* Mobile: horizontal swipe, Desktop: grid */}
        <div className="flex gap-3 overflow-x-auto pb-2 lg:overflow-visible lg:grid lg:grid-cols-3 lg:gap-4">
          {ACTIVE_PROFILES.map((profile) => (
            <div key={profile.key} className="w-72 lg:w-auto flex-shrink-0">
              <ProfileCard
                profile={profile}
                onGetStarted={handleGetStarted}
                onShowDetails={setDetailsProfile}
                index={ACTIVE_PROFILES.indexOf(profile)}
              />
            </div>
          ))}
        </div>

        {/* Coming soon profiles */}
        {COMING_SOON_PROFILES.length > 0 && (
          <>
            <p className="text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground/50 mt-6 mb-3">Coming Soon</p>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:overflow-visible lg:grid lg:grid-cols-3 lg:gap-4">
              {COMING_SOON_PROFILES.map((profile) => (
                <div key={profile.key} className="w-72 lg:w-auto flex-shrink-0">
                  <ProfileCard profile={profile} onGetStarted={() => {}} onShowDetails={() => {}} index={0} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Quick Launch */}
      <QuickLaunch onScrollToShowcase={scrollToShowcase} />

      {/* Showcase */}
      <div id="showcase">
        <ShowcaseSection />
      </div>

      {/* Footer */}
      <footer className="px-4 lg:px-6 py-8 max-w-6xl mx-auto border-t border-white/[0.04] mt-4">
        <p className="text-center text-[10px] text-muted-foreground">
          CREAPD · The AI Production Company · Create. Automate. Produce. Direct.
        </p>
      </footer>

      {/* Production Details Modal */}
      <ProductionDetailsModal profile={detailsProfile} onClose={() => setDetailsProfile(null)} />
      <ShowSetupChat open={setupOpen} onClose={() => setSetupOpen(false)} onCreated={() => { window.location.href = '/news/showprofiles'; }} />
      <IdlePersonalityToast />
    </div>
  );
}