/**
 * System Narration Scripts
 *
 * When AUTOPILOT mode is active, each page gets an animated, narrated
 * "guided tour" before revealing the actual interface.
 *
 * CREAPD is pronounced "Creeped" — TTS text uses the phonetic spelling
 * so the voice engine reads it correctly.
 */

// Phonetic spelling for TTS — "Creeped" not "C-R-E-A-P-D"
export const CREAPD_SPOKEN = 'Creeped';

export const NARRATION_ROUTES = {
  '/home': {
    name: 'Home',
    scenes: [
      {
        id: 'welcome',
        text: `Welcome to the studio. This is ${CREAPD_SPOKEN} — your AI co-producer.`,
        visual: 'persona',
      },
      {
        id: 'what-is-creapd',
        text: `${CREAPD_SPOKEN} handles the entire production pipeline. I sift stories, build production packages, direct scenes, and deliver finished shows — automatically.`,
        visual: 'pipeline',
      },
      {
        id: 'tagline',
        text: 'Create. Automate. Produce. Direct. That is the workflow, end to end.',
        visual: 'tagline',
      },
      {
        id: 'profiles-intro',
        text: 'Down below are your Production Profiles. Each one is a different type of show — News, Music, Talk, Sports, Cooking, Spiritual, and more.',
        visual: 'profiles',
      },
      {
        id: 'profiles-action',
        text: 'Pick a profile and I will set everything up. Your dashboard, content, and assets — all generated automatically.',
        visual: 'arrow-down',
      },
      {
        id: 'start',
        text: "Let's get to work. The interface is yours now — I'm right here when you need me.",
        visual: 'reveal',
      },
    ],
  },
  '/': {
    name: 'Dashboard',
    scenes: [
      {
        id: 'dashboard-intro',
        text: `This is your production dashboard. ${CREAPD_SPOKEN} pulls stories from your sources and organizes them here.`,
        visual: 'persona',
      },
      {
        id: 'dashboard-stories',
        text: 'Each story is scored and filtered to match your show profile. The ones with the highest fit scores rise to the top.',
        visual: 'pipeline',
      },
      {
        id: 'dashboard-action',
        text: 'Approve stories to move them into production, or let me handle it in AUTOPILOT. Your call.',
        visual: 'reveal',
      },
    ],
  },
  '/queue': {
    name: 'Story Queue',
    scenes: [
      {
        id: 'queue-intro',
        text: `This is the Story Queue. ${CREAPD_SPOKEN} sifts through hundreds of articles and brings you only the ones worth your time.`,
        visual: 'persona',
      },
      {
        id: 'queue-scoring',
        text: 'Every story is scored on opportunity, credibility, and how well it fits your show. The strong ones make the cut.',
        visual: 'pipeline',
      },
      {
        id: 'queue-action',
        text: 'Review, approve, or reject — or let me drive. The interface is ready.',
        visual: 'reveal',
      },
    ],
  },
};

/**
 * Check if a route has a narration script.
 */
export function hasNarration(pathname) {
  return !!NARRATION_ROUTES[pathname];
}

/**
 * Get the narration script for a route.
 */
export function getNarration(pathname) {
  return NARRATION_ROUTES[pathname] || null;
}

/**
 * Session-level tracking — narration plays once per page per session.
 */
export function hasNarrationPlayed(pathname) {
  try {
    return sessionStorage.getItem(`creapd_narrated_${pathname}`) === 'true';
  } catch {
    return false;
  }
}

export function markNarrationPlayed(pathname) {
  try {
    sessionStorage.setItem(`creapd_narrated_${pathname}`, 'true');
  } catch {
    // sessionStorage might be unavailable
  }
}

/**
 * Clear all narration tracking (for testing or replay).
 */
export function resetNarration() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('creapd_narrated_'))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    // noop
  }
}