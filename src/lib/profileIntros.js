/**
 * Per-Module Profile Intro Scripts
 *
 * Each Production Profile gets its own opening animation — different
 * colors, different personality, different pacing. When the producer
 * enters a profile section for the first time in a session, the
 * ProfileIntroOverlay plays a short cinematic intro before revealing
 * the profile's dashboard.
 *
 * CREAPD is pronounced "Creeped" in TTS.
 */

import {
  Newspaper, Music, Mic2, Trophy, ChefHat, Church, Brush,
  Sparkles, ArrowRight, Zap,
} from 'lucide-react';

export const CREAPD_SPOKEN = 'Creeped';

/**
 * Each profile intro has:
 * - name: display name
 * - icon: lucide icon
 * - colorClass: tailwind text color class for accents
 * - bgGradient: gradient classes for the ambient background
 * - glowClass: glow effect class
 * - scenes: array of { id, text, speech, visual }
 */
export const PROFILE_INTROS = {
  news: {
    name: 'News Production',
    icon: Newspaper,
    colorClass: 'text-blue-400',
    bgGradient: 'from-blue-500/8 to-cyan-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(210_80%_55%_/_0.15)]',
    accentRing: 'border-blue-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Newsroom.',
        speech: 'Welcome to the Newsroom.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD monitors your sources around the clock. Breaking stories, local updates, market moves — I sift them all and bring you only what matters for your show.',
        speech: 'Creeped monitors your sources around the clock. Breaking stories, local updates, market moves — I sift them all and bring you only what matters for your show.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'Your Story Queue is ready. Let\u2019s get you on air.',
        speech: 'Your Story Queue is ready. Let\u2019s get you on air.',
        visual: 'reveal',
      },
    ],
  },

  music: {
    name: 'Music Production',
    icon: Music,
    colorClass: 'text-purple-400',
    bgGradient: 'from-purple-500/8 to-indigo-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(270_80%_60%_/_0.15)]',
    accentRing: 'border-purple-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Studio.',
        speech: 'Welcome to the Studio.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD builds your radio show — host scripts, playlist segments, artist facts, and rundowns. All generated, all ready to go.',
        speech: 'Creeped builds your radio show — host scripts, playlist segments, artist facts, and rundowns. All generated, all ready to go.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'Your playlist is warming up. Let\u2019s hit play.',
        speech: 'Your playlist is warming up. Let\u2019s hit play.',
        visual: 'reveal',
      },
    ],
  },

  talk: {
    name: 'Talk Production',
    icon: Mic2,
    colorClass: 'text-pink-400',
    bgGradient: 'from-pink-500/8 to-rose-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(340_75%_55%_/_0.15)]',
    accentRing: 'border-pink-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Talk Show.',
        speech: 'Welcome to the Talk Show.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD develops your topics, generates talking points, writes host notes, and structures your episodes. Conversation-ready, every time.',
        speech: 'Creeped develops your topics, generates talking points, writes host notes, and structures your episodes. Conversation-ready, every time.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'Your topics are queued up. Let\u2019s start the conversation.',
        speech: 'Your topics are queued up. Let\u2019s start the conversation.',
        visual: 'reveal',
      },
    ],
  },

  cooking: {
    name: 'Cooking Production',
    icon: ChefHat,
    colorClass: 'text-green-400',
    bgGradient: 'from-green-500/8 to-emerald-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(152_60%_45%_/_0.15)]',
    accentRing: 'border-green-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Kitchen.',
        speech: 'Welcome to the Kitchen.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD generates your recipes, ingredient lists, technique tips, and host scripts. Your cooking show, prepped and ready.',
        speech: 'Creeped generates your recipes, ingredient lists, technique tips, and host scripts. Your cooking show, prepped and ready.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'The burners are on. Let\u2019s cook.',
        speech: 'The burners are on. Let\u2019s cook.',
        visual: 'reveal',
      },
    ],
  },

  sports: {
    name: 'Sports Production',
    icon: Trophy,
    colorClass: 'text-amber-400',
    bgGradient: 'from-amber-500/8 to-orange-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(25_95%_55%_/_0.15)]',
    accentRing: 'border-amber-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Sports Desk.',
        speech: 'Welcome to the Sports Desk.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD pulls game schedules, tracks athletes, and builds your show — previews, recaps, scoreboard updates, and analysis. All automated.',
        speech: 'Creeped pulls game schedules, tracks athletes, and builds your show — previews, recaps, scoreboard updates, and analysis. All automated.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'The whistle is about to blow. Let\u2019s go.',
        speech: 'The whistle is about to blow. Let\u2019s go.',
        visual: 'reveal',
      },
    ],
  },

  cosmo: {
    name: 'Cosmo Production',
    icon: Brush,
    colorClass: 'text-fuchsia-400',
    bgGradient: 'from-pink-500/8 to-fuchsia-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(320_75%_55%_/_0.15)]',
    accentRing: 'border-fuchsia-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Beauty Studio.',
        speech: 'Welcome to the Beauty Studio.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD researches beauty trends, generates tutorials, and builds your wellness show — routines, product reviews, and expert segments.',
        speech: 'Creeped researches beauty trends, generates tutorials, and builds your wellness show — routines, product reviews, and expert segments.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'Your studio is glowing. Let\u2019s shine.',
        speech: 'Your studio is glowing. Let\u2019s shine.',
        visual: 'reveal',
      },
    ],
  },

  spiritual: {
    name: 'Spiritual Production',
    icon: Church,
    colorClass: 'text-amber-400',
    bgGradient: 'from-amber-500/8 to-yellow-500/5',
    glowClass: 'shadow-[0_0_40px_hsl(40_90%_50%_/_0.15)]',
    accentRing: 'border-amber-500/30',
    scenes: [
      {
        id: 'enter',
        text: 'Welcome to the Sanctuary.',
        speech: 'Welcome to the Sanctuary.',
        visual: 'icon',
      },
      {
        id: 'what',
        text: 'CREAPD researches scripture, builds your message, generates reflections, and directs your presentation. Faith-based content, crafted with care.',
        speech: 'Creeped researches scripture, builds your message, generates reflections, and directs your presentation. Faith-based content, crafted with care.',
        visual: 'flow',
      },
      {
        id: 'go',
        text: 'The message is ready. Let\u2019s begin.',
        speech: 'The message is ready. Let\u2019s begin.',
        visual: 'reveal',
      },
    ],
  },
};

// ─── Session tracking ───

export function hasProfileIntroPlayed(profileKey) {
  try {
    return sessionStorage.getItem(`creapd_profile_intro_${profileKey}`) === 'true';
  } catch {
    return false;
  }
}

export function markProfileIntroPlayed(profileKey) {
  try {
    sessionStorage.setItem(`creapd_profile_intro_${profileKey}`, 'true');
  } catch {
    // sessionStorage unavailable
  }
}

export function resetAllProfileIntros() {
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('creapd_profile_intro_'))
      .forEach(k => sessionStorage.removeItem(k));
  } catch {
    // noop
  }
}