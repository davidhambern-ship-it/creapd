import React from 'react';
import { Home } from 'lucide-react';
import { PRODUCTION_PROFILES } from '@/lib/productionProfiles';
import ProfileCard from './ProfileCard';

const HOME_PROFILE = {
  key: 'home',
  shortLabel: 'Home',
  label: 'CREAPD Home',
  description: 'Your central hub for all production profiles, tools, and quick-launch actions.',
  icon: Home,
  path: '/',
  workflow: [
    'Browse all production profiles',
    'Launch into any production workflow',
    'Access quick actions and tools',
    'Review showcase productions',
    'Manage settings and preferences',
  ],
};

const ALL_PROFILES = [HOME_PROFILE, ...PRODUCTION_PROFILES];

export default function NerveCenterBottomConsole() {
  const tickerItems = [
    'PROFILES: 9 ACTIVE',
    'STATUS: READY',
    'PIPELINE: ONLINE',
    'CLICK ANY CARD TO ENTER',
    'PRODUCTION SUITE: OPERATIONAL',
  ];
  return (
    <div className="nc-bottom">
      <div className="pc-strip">
        {ALL_PROFILES.map((profile, i) => (
          <ProfileCard key={profile.key} profile={profile} index={i} />
        ))}
      </div>
      <div className="nc-ticker">
        <div className="nc-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="nc-ticker-item">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}