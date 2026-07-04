/**
 * CREAPD Personality Engine — Message Library
 * Centralized loading / success / empty-state messaging.
 * Add new messages here without touching application code.
 *
 * Rarity weights drive the random selection:
 *   common 70% | uncommon 20% | rare 9% | legendary 1%
 */

export const RARITY_WEIGHTS = {
  common: 70,
  uncommon: 20,
  rare: 9,
  legendary: 1,
};

export const creapdMessages = {
  common: [
    "CREAPing your production…",
    "CREAPing your ideas…",
    "CREAPing your project…",
    "Building something awesome…",
    "Organizing the chaos…",
    "Getting production ready…",
    "Polishing the details…",
    "Making the magic happen…",
    "Putting everything together…",
    "Almost ready…",
    "One more thing…",
    "Building greatness…",
    "Preparing your masterpiece…",
  ],

  uncommon: [
    "Calling the producer…",
    "Cue the lights…",
    "Rolling cameras…",
    "Mic check…",
    "Finding your next big idea…",
    "Turning coffee into content…",
    "Making you look brilliant…",
    "The producer is on it…",
    "Finding the good stuff…",
    "Putting your ideas to work…",
    "The creative gears are turning…",
  ],

  rare: [
    "CREAPing around the corner…",
    "CREAPing in the shadows…",
    "Quietly CREAPing…",
    "Professional CREAPing…",
    "Maximum CREAP detected…",
    "Sneaking in improvements…",
    "CREAPing your CREAP…",
    "We fixed a few things…",
    "You left this idea unattended…",
    "Don’t worry…",
    "We’ve got this…",
    "You can’t hide good ideas from us…",
    "Too late…",
    "We’re already CREAPing…",
    "We brought snacks.",
  ],

  legendary: [
    "Achievement Unlocked: Maximum CREAP.",
    "Congratulations. You have successfully CREAPD the CREAP.",
    "This message has no purpose. We’re just checking if anyone actually reads these.",
    "Producer.exe has become self-aware. Don’t panic. Actually… maybe panic a little.",
    "You’ve discovered a legendary loading screen.",
    "The producer escaped containment. Somebody should probably do something.",
    "This production won’t CREAP itself. Well… here we are.",
  ],
};

/** Production-profile-specific loading messages (mixed into rotation when a profile is active). */
export const profileMessages = {
  news: [
    "Checking today’s headlines…",
    "Verifying sources…",
    "Building your rundown…",
    "Finding tomorrow’s stories…",
  ],
  spiritual: [
    "Opening the scriptures…",
    "Connecting the message…",
    "Looking for wisdom…",
    "Preparing your message…",
  ],
  talk: [
    "Setting the microphones…",
    "Finding great questions…",
    "Building your episode…",
  ],
  music: [
    "Cueing the tracks…",
    "Finding the right tempo…",
    "Building your playlist…",
  ],
  business: [
    "Sharpening the pitch…",
    "Crunching the numbers…",
    "Building your business…",
  ],
  cooking: [
    "Preheating the studio…",
    "Plating the story…",
    "Building your recipe…",
  ],
  sports: [
    "Checking the scoreboard…",
    "Breaking down the matchup…",
    "Building your highlight reel…",
  ],
  cosmo: [
    "Finding your next viral moment…",
    "Packaging your content…",
    "Building your post…",
    "Optimizing your production…",
  ],
};

/** Completion / success messages. */
export const completionMessages = [
  "✅ CREAPD!",
  "Ready to Produce.",
  "Production Locked In.",
  "Showtime.",
  "Let’s go.",
  "Mission CREAPD.",
];

/** Save success messages. */
export const saveMessages = [
  "Production Locked In.",
  "CREAPD!",
  "You’re all set.",
];

/** Export success messages. */
export const exportMessages = [
  "Ready to Share.",
  "CREAPD!",
  "Time to make some noise.",
];

/** Empty-state messages. */
export const emptyStateMessages = {
  noProjects: [
    "Nothing to CREAP yet.",
    "Got an idea? CREAP it.",
    "Your next production starts here.",
  ],
};

/** First-launch welcome block. */
export const firstLaunch = {
  headline: "Welcome to CREAPD.",
  subhead: "You bring the idea. We’ll help produce the rest.",
  cta: "Let’s CREAP Something",
};

/**
 * Pick a rarity bucket based on weighted random selection.
 */
export function pickRarity() {
  const entries = Object.entries(RARITY_WEIGHTS);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return "common";
}

/**
 * Pick a random message from a pool, optionally avoiding the last-used message
 * so the same message never repeats back-to-back.
 */
export function pickMessage(pool, lastMessage = null) {
  if (!pool || pool.length === 0) return "";
  if (pool.length === 1) return pool[0];
  let next;
  let attempts = 0;
  do {
    next = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  } while (next === lastMessage && attempts < 10);
  return next;
}

/**
 * Build the active message pool for a session.
 * Mixes in profile-specific messages when a production profile is provided.
 */
export function buildPool(profile = null) {
  const rarity = pickRarity();
  let pool = [...creapdMessages[rarity]];
  if (profile && profileMessages[profile]) {
    pool = [...pool, ...profileMessages[profile]];
  }
  return pool;
}