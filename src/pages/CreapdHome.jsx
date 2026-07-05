import React, { useState } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import CreapdSidebar from '@/components/home/CreapdSidebar';
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

export default function CreapdHome() {
  const [detailsProfile, setDetailsProfile] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-r border-white/[0.06]">
        <CreapdSidebar onGetStarted={handleGetStarted} onShowDetails={setDetailsProfile} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-12 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-b border-white/[0.06] flex items-center px-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 text-muted-foreground hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-heading font-bold text-white ml-2">CREAPD</span>
      </div>

      {/* Mobile nav sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-[hsl(220,20%,8%)] to-[hsl(220,20%,6%)] border-white/[0.06]">
          <CreapdSidebar
            onGetStarted={(p) => { setMobileNavOpen(false); handleGetStarted(p); }}
            onShowDetails={(p) => { setMobileNavOpen(false); setDetailsProfile(p); }}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-12 lg:pt-0">
        <ModeStatusBanner />
        <HeroSection onStart={scrollToProfiles} onExplore={scrollToProfiles} />
        <PipelineExplainer />

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
      </main>

      {/* Production Details Modal */}
      <ProductionDetailsModal profile={detailsProfile} onClose={() => setDetailsProfile(null)} />
      <ShowSetupChat open={setupOpen} onClose={() => setSetupOpen(false)} onCreated={() => { window.location.href = '/shows'; }} />
      <IdlePersonalityToast />
    </div>
  );
}