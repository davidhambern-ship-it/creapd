import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHome from '@/components/mobile/MobileHome';
import HeroSection from '@/components/home/HeroSection';
import PipelineExplainer from '@/components/home/PipelineExplainer';
import InteractiveProfileCards from '@/components/home/InteractiveProfileCards';
import ProductionDetailsModal from '@/components/home/ProductionDetailsModal';
import ShowcaseSection from '@/components/home/ShowcaseSection';
import QuickLaunch from '@/components/home/QuickLaunch';
import IdlePersonalityToast from '@/components/creap/IdlePersonalityToast';
import ShowSetupChat from '@/components/creap/ShowSetupChat';
import CursorGlow from '@/components/creap/CursorGlow';
import FloatingObjects from '@/components/home/FloatingObjects';
import CreapdGuideOverlay from '@/components/creap/CreapdGuideOverlay';
import { PRODUCTION_PROFILES, ACTIVE_PROFILES, COMING_SOON_PROFILES } from '@/lib/productionProfiles';
import { useToast } from '@/components/ui/use-toast';

export default function CreapdHome() {
  const [detailsProfile, setDetailsProfile] = useState(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleGetStarted = (profile) => {
    if (profile.available && profile.path) {
      window.location.href = profile.path;
    } else {
      toast({
        title: `${profile.label} — Under Construction`,
        description: 'This Production Profile is being rebuilt for the new CREAPD system.',
      });
    }
  };

  const scrollToProfiles = () => {
    document.getElementById('profiles')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToShowcase = () => {
    document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isMobile) {
    return (
      <div className="h-screen flex bg-background overflow-hidden">
        <MobileHome
          onGetStarted={handleGetStarted}
          onShowDetails={setDetailsProfile}
          onBuildWithCREAPD={() => setSetupOpen(true)}
        />
        <ProductionDetailsModal profile={detailsProfile} onClose={() => setDetailsProfile(null)} />
        <ShowSetupChat open={setupOpen} onClose={() => setSetupOpen(false)} onCreated={() => { window.location.href = '/news/shows'; }} />
        <IdlePersonalityToast />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <FloatingObjects />
      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <HeroSection onStart={scrollToProfiles} onExplore={scrollToProfiles} onTour={() => setGuideOpen(true)} />
        <div id="pipeline">
          <PipelineExplainer />
        </div>

        {/* Production Profile Cards */}
        <section id="profiles" className="px-4 lg:px-6 py-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-bold text-white neon-underline">Production Profiles</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">{ACTIVE_PROFILES.length} active</span>
              <Button size="sm" className="bg-gradient-to-r from-berna-emerald to-berna-purple hover:opacity-90 text-white text-xs h-8" onClick={() => setSetupOpen(true)}>
                <Sparkles className="w-3 h-3 mr-1" />Build with CREAPD
              </Button>
            </div>
          </div>

          <InteractiveProfileCards
            profiles={PRODUCTION_PROFILES}
            onEnter={handleGetStarted}
          />

          {COMING_SOON_PROFILES.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Studios marked Under Construction are being rebuilt for the new CREAPD system.
            </p>
          )}
        </section>

        {/* Quick Launch */}
        <div id="quicklaunch">
          <QuickLaunch onScrollToShowcase={scrollToShowcase} />
        </div>

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
      </main>

      {/* Production Details Modal */}
      <ProductionDetailsModal profile={detailsProfile} onClose={() => setDetailsProfile(null)} />
      <ShowSetupChat open={setupOpen} onClose={() => setSetupOpen(false)} onCreated={() => { window.location.href = '/news/shows'; }} />
      <IdlePersonalityToast />
      <CreapdGuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}