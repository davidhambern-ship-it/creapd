// PP-THEME-001: Production Profile Environmental Theme Registry
// Each Production Profile has one unified environmental theme that persists across all Rooms.

export const PRODUCTION_PROFILE_THEMES = {
  news: {
    key: 'news',
    name: 'Newsroom Command Center',
    description: 'Professional broadcast newsroom with real-time intelligence feeds',
    atmosphere: 'newsroom',
    vars: {
      '--env-bg': '220 25% 5%',
      '--env-surface': '220 20% 9%',
      '--env-accent': '25 95% 55%',
      '--env-accent-2': '210 80% 55%',
      '--env-text': '0 0% 92%',
      '--env-muted': '220 10% 50%',
      '--env-border': '220 15% 16%',
    },
  },
  music: {
    key: 'music',
    name: 'Modern Recording Studio',
    description: 'Professional music production facility with mixing and creative spaces',
    atmosphere: 'studio',
    vars: {
      '--env-bg': '260 30% 5%',
      '--env-surface': '260 25% 9%',
      '--env-accent': '270 80% 60%',
      '--env-accent-2': '190 80% 50%',
      '--env-text': '0 0% 92%',
      '--env-muted': '260 10% 50%',
      '--env-border': '260 15% 16%',
    },
  },
  talk: {
    key: 'talk',
    name: 'Late-Night Television Studio',
    description: 'Professional television production facility with stage and backstage areas',
    atmosphere: 'stage',
    vars: {
      '--env-bg': '0 0% 4%',
      '--env-surface': '0 0% 8%',
      '--env-accent': '35 95% 55%',
      '--env-accent-2': '280 70% 55%',
      '--env-text': '0 0% 92%',
      '--env-muted': '0 0% 45%',
      '--env-border': '0 0% 14%',
    },
  },
  cooking: {
    key: 'cooking',
    name: 'Professional Test Kitchen',
    description: 'Commercial kitchen and culinary workspace with preparation and presentation areas',
    atmosphere: 'kitchen',
    vars: {
      '--env-bg': '25 20% 6%',
      '--env-surface': '25 15% 10%',
      '--env-accent': '25 80% 50%',
      '--env-accent-2': '140 50% 45%',
      '--env-text': '0 0% 92%',
      '--env-muted': '25 10% 50%',
      '--env-border': '25 12% 16%',
    },
  },
  sports: {
    key: 'sports',
    name: 'Broadcast Sports Center',
    description: 'Stadium broadcast facility with live coverage and analytics capabilities',
    atmosphere: 'sports',
    vars: {
      '--env-bg': '200 30% 5%',
      '--env-surface': '200 25% 9%',
      '--env-accent': '150 70% 45%',
      '--env-accent-2': '200 80% 55%',
      '--env-text': '0 0% 92%',
      '--env-muted': '200 10% 50%',
      '--env-border': '200 15% 16%',
    },
  },
  cosmo: {
    key: 'cosmo',
    name: 'Modern Creative Agency',
    description: 'Collaborative creative workspace for beauty and wellness content production',
    atmosphere: 'agency',
    vars: {
      '--env-bg': '340 15% 8%',
      '--env-surface': '340 12% 12%',
      '--env-accent': '330 80% 60%',
      '--env-accent-2': '280 60% 65%',
      '--env-text': '0 0% 95%',
      '--env-muted': '340 8% 55%',
      '--env-border': '340 10% 18%',
    },
  },
  spiritual: {
    key: 'spiritual',
    name: 'Zen Sanctuary',
    description: 'Peaceful meditation and study environment with natural materials and soft lighting',
    atmosphere: 'sanctuary',
    vars: {
      '--env-bg': '35 15% 7%',
      '--env-surface': '35 12% 11%',
      '--env-accent': '40 60% 50%',
      '--env-accent-2': '150 40% 45%',
      '--env-text': '0 0% 90%',
      '--env-muted': '35 8% 50%',
      '--env-border': '35 10% 16%',
    },
  },
  research: {
    key: 'research',
    name: 'Executive Digital Library',
    description: 'Premium library environment for deep research and knowledge acquisition',
    atmosphere: 'library',
    vars: {
      '--env-bg': '28 20% 6%',
      '--env-surface': '30 16% 10%',
      '--env-accent': '190 60% 50%',
      '--env-accent-2': '40 50% 50%',
      '--env-text': '0 0% 88%',
      '--env-muted': '28 8% 50%',
      '--env-border': '30 12% 16%',
    },
  },
};

export function getProfileTheme(profileKey) {
  return PRODUCTION_PROFILE_THEMES[profileKey] || null;
}