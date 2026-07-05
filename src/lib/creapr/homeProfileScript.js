/**
 * Home Profile Spotlight Script
 *
 * A real hybrid script that orchestrates the Production Profile cards
 * on the CreapdHome page. Each ProfileCard registers as an atom via
 * useDirectable with ID `profile-{key}`.
 *
 * Flow:
 *   1. set_context  → seed profile data into contextVars
 *   2. run_logic   → reset all atoms, pick the recommended profile
 *   3. highlight   → glow the recommended profile card
 *   4. dim ×6      → fade the remaining profile cards
 */
const logicModules = {
  pickRecommendedProfile: async ({ get, set, registry }) => {
    const profiles = get('profiles') || [];

    // Reset all registered profile atoms to normal state
    for (const atomId of registry.list()) {
      const atom = registry.get(atomId);
      if (atom) await atom.onCommand('reset', {});
    }

    if (profiles.length === 0) return { vars: { recommended_id: null, other_ids: [] } };

    // News is the primary recommended profile
    const recommended = profiles.find((p) => p.key === 'news') || profiles[0];
    const others = profiles.filter((p) => p.id !== recommended.id).map((p) => p.id);

    return {
      vars: {
        recommended_id: recommended.id,
        recommended_label: recommended.label,
        other_ids: others,
      },
    };
  },
};

export const homeProfileSpotlightScript = {
  id: 'home-profile-spotlight',
  name: 'Profile Spotlight',
  description: 'Resets all profile cards, highlights the recommended profile, dims the rest.',
  logicModules,
  steps: [
    {
      action: 'set_context',
      payload: {
        profiles: [
          { id: 'profile-news', key: 'news', label: 'News Production' },
          { id: 'profile-spiritual', key: 'spiritual', label: 'Spiritual Production' },
          { id: 'profile-talk', key: 'talk', label: 'Talk Production' },
          { id: 'profile-music', key: 'music', label: 'Music Production' },
          { id: 'profile-sports', key: 'sports', label: 'Sports Production' },
          { id: 'profile-cooking', key: 'cooking', label: 'Cooking Production' },
          { id: 'profile-cosmo', key: 'cosmo', label: 'Cosmo Production' },
        ],
      },
    },
    {
      action: 'run_logic',
      script: 'pickRecommendedProfile',
    },
    {
      action: 'highlight',
      target: 'profile-news',
      command: 'highlight',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-spiritual',
      command: 'dim',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-talk',
      command: 'dim',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-music',
      command: 'dim',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-sports',
      command: 'dim',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-cooking',
      command: 'dim',
      on_missing: 'skip',
    },
    {
      action: 'dim',
      target: 'profile-cosmo',
      command: 'dim',
      on_missing: 'skip',
    },
  ],
};

export default homeProfileSpotlightScript;