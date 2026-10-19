/* =========================================================
   APD TOPIC INTELLIGENCE + SOURCE BROKER + IMAGE BROKER
   + AUTOMATED PRESENTATION DIRECTOR WORKSTATION

   Browser-only. No Base44 backend functions. No API keys.
========================================================= */

const APD_SOURCE_PROVIDERS = {
  wikipedia: { label: 'Wikipedia', authority: 10 },
  crossref: { label: 'Crossref', authority: 16 },
  europepmc: { label: 'Europe PMC', authority: 18 },
  loc: { label: 'Library of Congress', authority: 15 },
  gdelt: { label: 'GDELT', authority: 10 },
};

const APD_IMAGE_PROVIDERS = {
  wikimedia: { label: 'Wikimedia Commons' },
  openverse: { label: 'Openverse' },
  loc: { label: 'Library of Congress' },
  nasa: { label: 'NASA Images' },
  met: { label: 'The Met' },
};

const APD_TOPIC_DOMAINS = {
  religion: {
    label: 'Religion & belief',
    triggers: [
      'god', 'religion', 'religious', 'faith', 'belief', 'church', 'christian',
      'christianity', 'jewish', 'judaism', 'islam', 'muslim', 'bible', 'worship',
      'spiritual', 'spirituality', 'atheism', 'atheist', 'theology', 'prayer',
    ],
    concepts: [
      'religion', 'faith', 'belief', 'worship', 'religious life', 'spirituality',
      'church', 'community', 'culture', 'society',
    ],
    drift: [
      'song', 'singer', 'album', 'lyrics', 'recording', 'performed', 'performance',
      'concert', 'hockey', 'anthem', 'soundtrack', 'music video', 'single',
    ],
  },
  history: {
    label: 'History',
    triggers: [
      'history', 'historical', 'war', 'battle', 'ancient', 'medieval', 'century',
      'revolution', 'empire', 'civilization', 'archaeology', 'era', 'decade',
    ],
    concepts: [
      'history', 'historical context', 'timeline', 'society', 'events', 'change',
      'people', 'place', 'period',
    ],
    drift: [],
  },
  science: {
    label: 'Science',
    triggers: [
      'science', 'scientific', 'space', 'mars', 'planet', 'astronomy', 'biology',
      'physics', 'chemistry', 'climate', 'medical', 'medicine', 'health', 'disease',
      'research', 'nasa', 'oceanography', 'geology',
    ],
    concepts: [
      'science', 'research', 'evidence', 'system', 'process', 'data', 'discovery',
      'observation',
    ],
    drift: [],
  },
  technology: {
    label: 'Technology',
    triggers: [
      'technology', 'computer', 'software', 'hardware', 'internet', 'ai',
      'artificial intelligence', 'robot', 'digital', 'electric vehicle', 'ev',
      'machine', 'engineering', 'app', 'website',
    ],
    concepts: [
      'technology', 'engineering', 'system', 'design', 'innovation', 'digital',
      'machine', 'process',
    ],
    drift: [],
  },
  clothing: {
    label: 'Fashion & clothing',
    triggers: [
      'clothes', 'clothing', 'apparel', 'garment', 'garments', 'sleepwear',
      'pajamas', 'pyjamas', 'nightwear', 'nightclothes', 'loungewear', 'workwear',
      'sportswear', 'swimwear', 'rainwear', 'fashion', 'outfit', 'outfits',
    ],
    concepts: [
      'clothing', 'apparel', 'garment', 'garments', 'fashion', 'fabric', 'style',
      'wear', 'design', 'use', 'comfort',
    ],
    visuals: [
      'clothing', 'apparel', 'garment', 'outfit', 'fabric', 'fashion', 'wearing',
      'display', 'wardrobe',
    ],
    drift: [],
  },
  politics: {
    label: 'Civics & political systems',
    triggers: [
      'political party', 'political parties', 'politics', 'political', 'election',
      'elections', 'candidate', 'campaign', 'ballot', 'government', 'civic',
      'legislature', 'parliament', 'congress', 'party system',
    ],
    concepts: [
      'political party', 'party organization', 'party system', 'civic participation',
      'public organization', 'elections', 'governance', 'membership', 'political system',
    ],
    visuals: [
      'political meeting', 'public meeting', 'civic gathering', 'party convention',
      'campaign volunteers', 'voters', 'community organizing',
    ],
    drift: [
      'birthday party', 'dance party', 'cocktail party', 'party venue', 'party supplies',
      'album', 'song', 'movie', 'nightclub',
    ],
  },
  business: {
    label: 'Business & entrepreneurship',
    triggers: [
      'business', 'businesses', 'startup', 'start-up', 'small business',
      'entrepreneur', 'entrepreneurship', 'company', 'venture', 'founder',
      'business owner', 'business startup', 'business formation',
    ],
    concepts: [
      'business', 'startup', 'entrepreneurship', 'small business', 'company formation',
      'business planning', 'ownership', 'operations', 'customers', 'financing',
      'registration', 'licenses', 'workplace',
    ],
    visuals: [
      'small business', 'business owner', 'entrepreneur', 'storefront', 'workplace',
      'startup team', 'business meeting', 'business planning', 'office', 'shop owner',
    ],
    drift: [
      'show business', 'music business', 'film business', 'business class', 'monkey business',
    ],
  },
  nonprofit: {
    label: 'Nonprofit & civic organizations',
    triggers: [
      'nonprofit', 'non-profit', 'not-for-profit', 'charity', 'charitable', 'ngo',
      '501(c)(3)', '501c3', 'tax-exempt', 'foundation', 'nonprofit organization',
    ],
    concepts: [
      'nonprofit organization', 'charitable organization', 'mission', 'board', 'governance',
      'volunteers', 'fundraising', 'donations', 'community service', 'incorporation',
      'tax-exempt', 'organization',
    ],
    visuals: [
      'nonprofit volunteers', 'community service', 'charity volunteers', 'board meeting',
      'fundraising', 'donations', 'community organization', 'volunteer team',
    ],
    drift: [
      'for-profit company', 'corporate profit', 'stock market',
    ],
  },
  culture: {
    label: 'Culture & society',
    triggers: [
      'culture', 'society', 'social', 'hip hop', 'hip-hop', 'art',
      'film', 'cinema', 'literature', 'renaissance', 'identity', 'community',
      'skateboarding', 'sports culture',
    ],
    concepts: [
      'culture', 'society', 'community', 'identity', 'people', 'movement', 'media',
      'history', 'influence',
    ],
    drift: [],
  },
  economics: {
    label: 'Economics & finance',
    triggers: [
      'economy', 'economic', 'finance', 'financial', 'banking', 'market', 'stock',
      'inflation', 'recession', 'currency', 'money', 'employment', 'trade',
    ],
    concepts: [
      'economy', 'finance', 'markets', 'policy', 'households', 'business', 'money',
      'employment', 'trade',
    ],
    drift: [],
  },
  geography: {
    label: 'Place & geography',
    triggers: [
      'geography', 'city', 'country', 'state', 'region', 'map', 'river', 'mountain',
      'volcano', 'island', 'ocean', 'landscape', 'location',
    ],
    concepts: [
      'place', 'geography', 'location', 'region', 'landscape', 'environment',
      'population', 'map',
    ],
    drift: [],
  },
  media: {
    label: 'Live production & media',
    triggers: [
      'live stream', 'livestream', 'streaming', 'broadcast', 'obs', 'streamlabs',
      'webcam', 'camera', 'microphone', 'encoder', 'twitch', 'youtube live',
      'live production', 'podcast', 'video production', 'audio production',
    ],
    concepts: [
      'live streaming', 'broadcast', 'camera', 'microphone', 'audio', 'video',
      'encoder', 'streaming software', 'platform', 'signal flow', 'lighting', 'production',
    ],
    visuals: [
      'live streaming setup', 'streaming desk', 'camera microphone', 'broadcast setup',
      'creator studio', 'production desk', 'streaming software', 'signal flow',
    ],
    drift: [
      'stream river', 'water stream', 'creek', 'river', 'stream ecology',
    ],
  },
  general: {
    label: 'General subject',
    triggers: [],
    concepts: ['context', 'history', 'society', 'people', 'evidence'],
    drift: [],
  },
};

const APD_TOPIC_SYNONYMS = {
  america: ['america', 'american', 'united states'],
  american: ['america', 'american', 'united states'],
  god: ['god', 'divine', 'deity'],
  religion: ['religion', 'religious', 'faith', 'belief', 'worship'],
  ai: ['ai', 'artificial intelligence'],
  ev: ['ev', 'electric vehicle', 'electric vehicles'],
  car: ['car', 'cars', 'vehicle', 'vehicles', 'automobile'],
  ship: ['ship', 'ships', 'vessel', 'vessels'],
  wreck: ['wreck', 'wrecks', 'shipwreck', 'shipwrecks'],
  political: ['political', 'politics', 'civic'],
  party: ['party', 'parties', 'political party', 'political parties'],
  sleepwear: ['sleepwear', 'pajamas', 'pyjamas', 'nightwear', 'nightclothes', 'sleep clothing'],
  pajamas: ['pajamas', 'pyjamas', 'sleepwear', 'nightwear'],
  pyjamas: ['pajamas', 'pyjamas', 'sleepwear', 'nightwear'],
  clothes: ['clothes', 'clothing', 'apparel', 'garments'],
  clothing: ['clothes', 'clothing', 'apparel', 'garments'],
  business: ['business', 'businesses', 'small business', 'company', 'startup', 'entrepreneurship'],
  startup: ['startup', 'start-up', 'startup company', 'business startup', 'new business'],
  entrepreneur: ['entrepreneur', 'entrepreneurship', 'business owner', 'founder'],
  nonprofit: ['nonprofit', 'non-profit', 'not-for-profit', 'nonprofit organization', 'charity'],
  charity: ['charity', 'charitable organization', 'nonprofit', 'non-profit'],
};

/* =========================================================
   MEANING ANCHORS
   Local phrase normalization before search/scoring.
   This is deliberately deterministic and browser-only.
========================================================= */

const APD_MEANING_ANCHORS = [
  {
    key: 'sleepwear',
    semanticRewrite: true,
    matches: (lower) =>
      /\b(sleepwear|nightwear|nightclothes|night clothes|sleep clothes|sleep clothing|pajamas|pyjamas)\b/i.test(lower) ||
      (/\b(sleep|night|bed)\b/i.test(lower) && /\b(clothes|clothing|wear|garments?)\b/i.test(lower)),
    canonical: 'sleepwear',
    domainKey: 'clothing',
    aliases: [
      'sleepwear', 'pajamas', 'pyjamas', 'nightwear', 'nightclothes',
      'sleep clothing', 'night clothing', 'bed clothes',
    ],
    anchorGroups: [[
      'sleepwear', 'pajamas', 'pyjamas', 'nightwear', 'nightclothes',
      'sleep clothing', 'night clothing', 'nightgown', 'nightdress',
    ]],
    consumedTerms: [
      'sleep', 'night', 'bed', 'clothes', 'clothing', 'wear', 'garment', 'garments',
      'sleepwear', 'nightwear', 'nightclothes', 'pajamas', 'pyjamas',
    ],
    concepts: [
      'sleepwear', 'pajamas', 'nightwear', 'clothing', 'garments', 'fabric',
      'comfort', 'bedtime', 'loungewear',
    ],
    visualTerms: [
      'sleepwear', 'pajamas', 'pyjamas', 'nightwear', 'nightgown', 'nightdress',
      'clothing', 'garment', 'outfit',
    ],
    drift: [
      'sleep disorder', 'sleep disorders', 'insomnia', 'sleep issues', 'sleep problems',
      'sleep deprivation', 'psychological distress', 'anxiety', 'depression',
    ],
    searchQueries: [
      'sleepwear', 'pajamas nightwear', 'sleep clothing garments',
    ],
    visualIntent: {
      heroGoal: 'A clear photograph of sleepwear, pajamas or nightwear being worn or displayed.',
      supportGoal: 'A secondary sleepwear visual showing another style, garment type, fabric or context.',
      heroQueries: [
        'sleepwear pajamas clothing',
        'pajamas nightwear person',
        'nightwear clothing display',
      ],
      supportQueries: [
        'sleepwear styles pajamas',
        'nightwear garments clothing',
        'pajamas fabric clothing',
      ],
      fallbackHeroQueries: ['pajamas clothing', 'nightwear person'],
      fallbackSupportQueries: ['sleepwear garment', 'nightwear clothing'],
    },
  },
  {
    key: 'business-startup',
    semanticRewrite: true,
    matches: (lower) =>
      /\b(start|starting|launch|create|form|build|establish|found|set up)\b.*\b(business|company|startup|venture)\b/i.test(lower) ||
      /\b(new business|business startup|startup business|starting a business)\b/i.test(lower),
    canonical: 'business startup',
    domainKey: 'business',
    aliases: [
      'business startup', 'startup company', 'entrepreneurship', 'small business',
      'starting a business', 'new business formation',
    ],
    anchorGroups: [[
      'business startup', 'startup company', 'startup business', 'entrepreneurship',
      'small business', 'new business', 'business formation',
    ]],
    consumedTerms: [
      'business', 'businesses', 'company', 'startup', 'start-up', 'venture',
      'entrepreneur', 'entrepreneurship', 'new',
    ],
    concepts: [
      'business startup', 'entrepreneurship', 'small business', 'business planning',
      'company formation', 'registration', 'licenses', 'financing', 'business owner',
    ],
    visualTerms: [
      'small business', 'business owner', 'entrepreneur', 'storefront', 'shop',
      'startup team', 'office', 'workplace', 'business meeting', 'business planning',
    ],
    drift: [
      'show business', 'music business', 'film business', 'business class', 'monkey business',
    ],
    searchQueries: [
      'startup company', 'entrepreneurship small business', 'business startup formation',
    ],
    sourceFallbackQueries: [
      'entrepreneurship', 'startup company', 'small business',
    ],
    visualIntent: {
      heroGoal: 'A real entrepreneur, small-business owner, storefront or startup team actively working on a new business.',
      supportGoal: 'A concrete startup-process visual such as business planning, paperwork, licensing, financing or team organization.',
      heroQueries: [
        'small business owner storefront',
        'entrepreneur working small business',
        'startup team business meeting',
        'shop owner workplace',
      ],
      supportQueries: [
        'business planning entrepreneur paperwork',
        'small business planning meeting',
        'startup team whiteboard planning',
        'business registration paperwork',
      ],
      fallbackHeroQueries: [
        'small business owner', 'entrepreneur office', 'shop owner business',
      ],
      fallbackSupportQueries: [
        'business planning meeting', 'startup team planning', 'small business paperwork',
      ],
    },
  },
  {
    key: 'nonprofit-startup',
    semanticRewrite: true,
    matches: (lower) =>
      /\b(start|starting|launch|create|form|build|establish|found|set up|register)\b.*\b(nonprofit|non-profit|not-for-profit|charity|ngo)\b/i.test(lower) ||
      /\b(new nonprofit|nonprofit startup|non-profit startup|starting a nonprofit)\b/i.test(lower),
    canonical: 'nonprofit organization',
    domainKey: 'nonprofit',
    aliases: [
      'nonprofit organization', 'non-profit organization', 'charitable organization',
      'not-for-profit organization', 'nonprofit formation', 'starting a nonprofit',
    ],
    anchorGroups: [[
      'nonprofit organization', 'non-profit organization', 'not-for-profit organization',
      'charitable organization', 'charity', 'nonprofit formation', 'non-profit formation',
    ]],
    consumedTerms: [
      'nonprofit', 'non-profit', 'not-for-profit', 'charity', 'charitable', 'ngo', 'organization',
    ],
    concepts: [
      'nonprofit organization', 'charitable organization', 'mission', 'board', 'governance',
      'volunteers', 'fundraising', 'donations', 'incorporation', 'tax-exempt',
    ],
    visualTerms: [
      'nonprofit volunteers', 'community organization', 'charity volunteers',
      'community service', 'board meeting', 'fundraising', 'volunteer team',
    ],
    drift: [
      'for-profit company', 'corporate profit', 'stock market',
    ],
    searchQueries: [
      'nonprofit organization', 'nonprofit formation', 'charitable organization',
    ],
    sourceFallbackQueries: [
      'nonprofit organization', 'charitable organization', 'non-profit organization',
    ],
    visualIntent: {
      heroGoal: 'A real nonprofit or community organization at work, preferably volunteers or staff serving a mission together.',
      supportGoal: 'A concrete nonprofit-process visual such as a board meeting, fundraising, donations, volunteer coordination or community service.',
      heroQueries: [
        'nonprofit volunteers community organization',
        'charity volunteers community service',
        'nonprofit staff volunteers',
        'community organization volunteers',
      ],
      supportQueries: [
        'nonprofit board meeting',
        'fundraising volunteers charity',
        'donation drive volunteers',
        'community service volunteer team',
      ],
      fallbackHeroQueries: [
        'volunteer organization people', 'charity volunteers', 'community service volunteers',
      ],
      fallbackSupportQueries: [
        'board meeting nonprofit', 'fundraising volunteers', 'donation drive people',
      ],
    },
  },
  {
    key: 'political-party',
    matches: (lower) => /\bpolitical part(?:y|ies)\b/i.test(lower),
    canonical: 'political party',
    domainKey: 'politics',
    aliases: ['political party', 'political parties', 'party organization', 'party formation'],
    anchorGroups: [[
      'political party', 'political parties', 'party organization', 'party formation',
    ]],
    consumedTerms: ['political', 'party', 'parties'],
    concepts: ['political party', 'party organization', 'party system', 'civic participation'],
    visualTerms: ['political meeting', 'civic meeting', 'organizing', 'voters', 'volunteers'],
    drift: ['birthday party', 'dance party', 'cocktail party', 'party supplies', 'nightclub'],
  },
  {
    key: 'shipwreck',
    matches: (lower) => /\bship ?wrecks?\b/i.test(lower),
    canonical: 'shipwreck',
    domainKey: 'history',
    aliases: ['shipwreck', 'shipwrecks', 'ship wreck', 'ship wrecks'],
    anchorGroups: [['shipwreck', 'shipwrecks', 'ship wreck', 'ship wrecks']],
    consumedTerms: ['shipwreck', 'shipwrecks', 'ship', 'wreck', 'wrecks'],
    concepts: ['shipwreck', 'vessel', 'maritime', 'ocean', 'disaster'],
    visualTerms: ['shipwreck', 'wrecked ship', 'vessel', 'maritime', 'underwater wreck'],
    drift: [],
  },
  {
    key: 'electric-vehicle',
    matches: (lower) => /\belectric vehicles?\b|\bev\b/i.test(lower),
    canonical: 'electric vehicle',
    domainKey: 'technology',
    aliases: ['electric vehicle', 'electric vehicles', 'EV', 'EVs'],
    anchorGroups: [['electric vehicle', 'electric vehicles', 'ev', 'evs']],
    consumedTerms: ['electric', 'vehicle', 'vehicles', 'ev', 'evs'],
    concepts: ['electric vehicle', 'battery', 'charging', 'transportation', 'technology'],
    visualTerms: ['electric vehicle', 'charging', 'battery', 'electric car'],
    drift: [],
  },
];

const apdResolveMeaningAnchor = (subject) => {
  const cleanSubject = apdCleanText(subject);
  const lower = cleanSubject.toLowerCase();
  return APD_MEANING_ANCHORS.find((anchor) => anchor.matches(lower)) || null;
};

const APD_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'were', 'what', 'when',
  'where', 'which', 'who', 'why', 'with', 'into', 'about', 'over', 'under',
]);

const apdCleanText = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const apdClamp = (value, min, max) => Math.min(max, Math.max(min, value));

const apdWords = (value = '') =>
  apdCleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const apdUnique = (items) => [...new Set(items.filter(Boolean))];

const apdHasAny = (haystack, terms = []) => {
  const lower = String(haystack || '').toLowerCase();
  return terms.some((term) => lower.includes(String(term).toLowerCase()));
};

const apdCountTerms = (haystack, terms = []) => {
  const lower = String(haystack || '').toLowerCase();
  return terms.reduce(
    (count, term) => count + (lower.includes(String(term).toLowerCase()) ? 1 : 0),
    0
  );
};

const apdTermGroupMatched = (haystack, group = []) => {
  const lower = String(haystack || '').toLowerCase();
  return group.some((term) => lower.includes(term));
};

/* =========================================================
   PUTER AI DIRECTOR
   LLM interpretation layer. The deterministic engine remains
   available as a fallback when Puter is unavailable/cancelled.
========================================================= */

const APD_AI_MODEL = 'openai/gpt-5.6-luna';
let apdPuterLoadPromise = null;

const APD_ICON_CATALOG = {
  camera: { label: 'Camera', path: 'M23 19V7a2 2 0 0 0-2-2h-3.2l-1.4-2H7.6L6.2 5H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2ZM12 17a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z' },
  mic: { label: 'Microphone', path: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm-7 10a7 7 0 0 0 14 0M12 19v3M8 22h8' },
  monitor: { label: 'Monitor', path: 'M2 3h20v14H2zM8 21h8M12 17v4' },
  wifi: { label: 'Network', path: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01' },
  users: { label: 'People', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  clipboard: { label: 'Plan', path: 'M9 5H7a2 2 0 0 0-2 2v14h14V7a2 2 0 0 0-2-2h-2M9 3h6v4H9zM9 12h6M9 16h6' },
  building: { label: 'Organization', path: 'M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-3h4v3' },
  heart: { label: 'Mission', path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z' },
  dollar: { label: 'Funding', path: 'M12 1v22M17 5.5A4 4 0 0 0 13.5 4h-3A3.5 3.5 0 0 0 7 7.5 3.5 3.5 0 0 0 10.5 11h3A3.5 3.5 0 0 1 17 14.5 3.5 3.5 0 0 1 13.5 18h-3A4 4 0 0 1 7 16.5' },
  ballot: { label: 'Ballot', path: 'M5 4h14v6H5zM3 10h18v11H3zM9 15l2 2 4-4' },
  file: { label: 'Documents', path: 'M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h6' },
  lightbulb: { label: 'Idea', path: 'M9 18h6M10 22h4M8.5 14.5A7 7 0 1 1 15.5 14.5C14.6 15.4 14 16.4 14 18h-4c0-1.6-.6-2.6-1.5-3.5Z' },
  store: { label: 'Business', path: 'M3 9l2-5h14l2 5M5 9v11h14V9M3 9h18M8 20v-6h8v6' },
  moon: { label: 'Night', path: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z' },
  shirt: { label: 'Clothing', path: 'M8 4 4 6l-2 4 4 2v9h12v-9l4-2-2-4-4-2a4 4 0 0 1-8 0Z' },
  globe: { label: 'World', path: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20' },
  gear: { label: 'System', path: 'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Zm8.5-3.5 2-1-2-3.5-2.2.5a7 7 0 0 0-1.3-.8L16.7 5H12.7l-.7 2.2a7 7 0 0 0-1.3.8L8.5 7.5 6.5 11l2 1a7 7 0 0 0 0 1.5l-2 1 2 3.5 2.2-.5c.4.3.8.6 1.3.8l.7 2.2h4l.7-2.2c.5-.2.9-.5 1.3-.8l2.2.5 2-3.5-2-1a7 7 0 0 0 0-1.5Z' },
};

const APD_TYPE_PRESETS = {
  editorial_serif: {
    label: 'Editorial Serif',
    titleStyle: { fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 700, letterSpacing: '-0.035em' },
    bodyStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 400 },
  },
  modern_grotesk: {
    label: 'Modern Grotesk',
    titleStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 800, letterSpacing: '-0.04em' },
    bodyStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 400 },
  },
  technical_mono: {
    label: 'Technical Mono',
    titleStyle: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 800, letterSpacing: '-0.025em' },
    bodyStyle: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 400 },
  },
  humanist_sans: {
    label: 'Humanist Sans',
    titleStyle: { fontFamily: 'Trebuchet MS, Arial, sans-serif', fontWeight: 700, letterSpacing: '-0.03em' },
    bodyStyle: { fontFamily: 'Trebuchet MS, Arial, sans-serif', fontWeight: 400 },
  },
  condensed_display: {
    label: 'Condensed Display',
    titleStyle: { fontFamily: 'Arial Narrow, Arial, sans-serif', fontWeight: 800, letterSpacing: '-0.045em', fontStretch: 'condensed' },
    bodyStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 400 },
  },
  cinematic_serif: {
    label: 'Cinematic Serif',
    titleStyle: { fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 700, letterSpacing: '-0.045em', fontStyle: 'italic' },
    bodyStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 400 },
  },
  clean_sans: {
    label: 'Clean Sans',
    titleStyle: { fontFamily: 'Inter, Arial, Helvetica, sans-serif', fontWeight: 700, letterSpacing: '-0.03em' },
    bodyStyle: { fontFamily: 'Inter, Arial, Helvetica, sans-serif', fontWeight: 400 },
  },
};

const APD_MOTION_PRESETS = {
  cross_dissolve: { label: 'Cross Dissolve' },
  fade_up: { label: 'Fade Up' },
  wipe_left: { label: 'Wipe Left' },
  blur_in: { label: 'Blur In' },
  scale_in: { label: 'Scale In' },
  slide_right: { label: 'Slide Right' },
  slow_push: { label: 'Slow Push' },
  drift_left: { label: 'Slow Drift' },
  parallax: { label: 'Parallax Drift' },
  opacity_reveal: { label: 'Opacity Reveal' },
};

const apdEnsurePuterLoaded = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser environment required.'));
  if (window.puter?.ai?.chat) return Promise.resolve(window.puter);
  if (apdPuterLoadPromise) return apdPuterLoadPromise;

  apdPuterLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-apd-puter]');
    const finish = () => {
      if (window.puter?.ai?.chat) resolve(window.puter);
      else reject(new Error('Puter.js loaded without the AI client.'));
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('Puter.js failed to load.')), { once: true });
      setTimeout(() => window.puter?.ai?.chat && resolve(window.puter), 50);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.dataset.apdPuter = 'true';
    script.onload = finish;
    script.onerror = () => reject(new Error('Puter.js failed to load.'));
    document.head.appendChild(script);
  });

  return apdPuterLoadPromise;
};

const apdEnsurePuterAuth = async () => {
  // When Puter has already been preloaded, signIn() is invoked before any
  // asynchronous yield so browsers treat it as part of the user's click.
  let puter = typeof window !== 'undefined' ? window.puter : null;
  if (!puter?.ai?.chat) puter = await apdEnsurePuterLoaded();
  if (!puter.auth?.isSignedIn?.()) {
    await puter.auth.signIn({ attempt_temp_user_creation: true });
  }
  return puter;
};

const APD_DIRECTOR_PLAN_TOOL = {
  type: 'function',
  function: {
    name: 'submit_apd_director_plan',
    description: 'Return the complete structured direction plan for one presentation slide. Always call this function exactly once after interpreting the assignment.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        interpreted_topic: { type: 'string' },
        domain_key: {
          type: 'string',
          enum: ['religion', 'history', 'science', 'technology', 'clothing', 'politics', 'business', 'nonprofit', 'culture', 'economics', 'geography', 'media', 'general'],
        },
        domain_label: { type: 'string' },
        intent_key: { type: 'string', enum: ['procedural', 'explainer', 'comparison'] },
        intent_label: { type: 'string' },
        objective: { type: 'string' },
        meaning_aliases: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8 },
        key_concepts: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 10 },
        reject_concepts: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 10 },
        source_queries: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
        source_fallback_queries: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
        source_must_cover: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 8 },
        hero_goal: { type: 'string' },
        hero_queries: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
        hero_fallback_queries: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
        hero_must_show: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
        hero_avoid: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 8 },
        support_goal: { type: 'string' },
        support_visual_type: { type: 'string', enum: ['photo', 'diagram'] },
        support_queries: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
        support_fallback_queries: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
        support_must_show: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
        support_avoid: { type: 'array', items: { type: 'string' }, minItems: 0, maxItems: 8 },
        diagram_title: { type: 'string' },
        diagram_nodes: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
        icon_ids: {
          type: 'array',
          items: { type: 'string', enum: ['camera', 'mic', 'monitor', 'wifi', 'users', 'clipboard', 'building', 'heart', 'dollar', 'ballot', 'file', 'lightbulb', 'store', 'moon', 'shirt', 'globe', 'gear'] },
          minItems: 2,
          maxItems: 6,
        },
        typography_preset: { type: 'string', enum: ['editorial_serif', 'modern_grotesk', 'technical_mono', 'humanist_sans', 'condensed_display', 'cinematic_serif', 'clean_sans'] },
        typography_headline: { type: 'string' },
        typography_support_line: { type: 'string' },
        typography_reason: { type: 'string' },
        entrance_transition: { type: 'string', enum: ['cross_dissolve', 'fade_up', 'wipe_left', 'blur_in', 'scale_in', 'slide_right'] },
        hero_effect: { type: 'string', enum: ['slow_push', 'drift_left', 'parallax', 'opacity_reveal'] },
        support_transition: { type: 'string', enum: ['cross_dissolve', 'fade_up', 'wipe_left', 'blur_in', 'scale_in', 'slide_right'] },
        exit_transition: { type: 'string', enum: ['cross_dissolve', 'fade_up', 'wipe_left', 'blur_in', 'scale_in', 'slide_right'] },
        motion_reason: { type: 'string' },
        narration_direction: { type: 'string' },
        visual_count: { type: 'integer', minimum: 2, maximum: 4 },
      },
      required: [
        'interpreted_topic', 'domain_key', 'domain_label', 'intent_key', 'intent_label', 'objective',
        'meaning_aliases', 'key_concepts', 'reject_concepts', 'source_queries', 'source_fallback_queries',
        'source_must_cover', 'hero_goal', 'hero_queries', 'hero_fallback_queries', 'hero_must_show',
        'hero_avoid', 'support_goal', 'support_visual_type', 'support_queries', 'support_fallback_queries',
        'support_must_show', 'support_avoid', 'diagram_title', 'diagram_nodes', 'icon_ids',
        'typography_preset', 'typography_headline', 'typography_support_line', 'typography_reason',
        'entrance_transition', 'hero_effect', 'support_transition', 'exit_transition', 'motion_reason',
        'narration_direction', 'visual_count'
      ],
    },
  },
};

const apdParseToolArguments = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const apdNormalizeAIPlan = (plan, subject) => {
  if (!plan || typeof plan !== 'object') throw new Error('AI Director returned an invalid plan.');
  const cleanSubject = apdCleanText(subject);
  const asArray = (value, fallback = []) => apdUnique(Array.isArray(value) ? value.map(apdCleanText).filter(Boolean) : fallback);
  const interpretedTopic = apdCleanText(plan.interpreted_topic || cleanSubject) || cleanSubject;
  const domainKey = APD_TOPIC_DOMAINS[plan.domain_key] ? plan.domain_key : 'general';
  const intentKey = ['procedural', 'comparison', 'explainer'].includes(plan.intent_key) ? plan.intent_key : 'explainer';
  const iconIds = asArray(plan.icon_ids).filter((id) => APD_ICON_CATALOG[id]).slice(0, 6);

  return {
    ...plan,
    interpreted_topic: interpretedTopic,
    domain_key: domainKey,
    domain_label: apdCleanText(plan.domain_label || APD_TOPIC_DOMAINS[domainKey]?.label || 'General subject'),
    intent_key: intentKey,
    intent_label: apdCleanText(plan.intent_label || (intentKey === 'procedural' ? 'Process / setup explainer' : intentKey === 'comparison' ? 'Comparison' : 'Subject explainer')),
    objective: apdCleanText(plan.objective || `Explain ${interpretedTopic} clearly on one slide.`),
    meaning_aliases: asArray(plan.meaning_aliases, [interpretedTopic, cleanSubject]).slice(0, 8),
    key_concepts: asArray(plan.key_concepts, apdWords(interpretedTopic)).slice(0, 10),
    reject_concepts: asArray(plan.reject_concepts).slice(0, 10),
    source_queries: asArray(plan.source_queries, [interpretedTopic]).slice(0, 6),
    source_fallback_queries: asArray(plan.source_fallback_queries, [interpretedTopic]).slice(0, 6),
    source_must_cover: asArray(plan.source_must_cover, plan.key_concepts || []).slice(0, 8),
    hero_goal: apdCleanText(plan.hero_goal || `A strong primary visual for ${interpretedTopic}.`),
    hero_queries: asArray(plan.hero_queries, [interpretedTopic]).slice(0, 6),
    hero_fallback_queries: asArray(plan.hero_fallback_queries, [interpretedTopic]).slice(0, 5),
    hero_must_show: asArray(plan.hero_must_show, plan.key_concepts || []).slice(0, 6),
    hero_avoid: asArray(plan.hero_avoid).slice(0, 8),
    support_goal: apdCleanText(plan.support_goal || `A secondary visual that explains ${interpretedTopic}.`),
    support_visual_type: plan.support_visual_type === 'diagram' ? 'diagram' : 'photo',
    support_queries: asArray(plan.support_queries, [interpretedTopic]).slice(0, 6),
    support_fallback_queries: asArray(plan.support_fallback_queries, [interpretedTopic]).slice(0, 5),
    support_must_show: asArray(plan.support_must_show, plan.key_concepts || []).slice(0, 6),
    support_avoid: asArray(plan.support_avoid).slice(0, 8),
    diagram_title: apdCleanText(plan.diagram_title || 'Process Flow'),
    diagram_nodes: asArray(plan.diagram_nodes, plan.key_concepts || ['Input', 'Process', 'Output']).slice(0, 6),
    icon_ids: iconIds.length ? iconIds : ['lightbulb', 'users', 'gear'],
    typography_preset: APD_TYPE_PRESETS[plan.typography_preset] ? plan.typography_preset : 'clean_sans',
    typography_headline: apdCleanText(plan.typography_headline || interpretedTopic.toUpperCase()),
    typography_support_line: apdCleanText(plan.typography_support_line || 'Clear supporting context'),
    typography_reason: apdCleanText(plan.typography_reason || 'Keep the hierarchy clear and readable.'),
    entrance_transition: APD_MOTION_PRESETS[plan.entrance_transition] ? plan.entrance_transition : 'fade_up',
    hero_effect: APD_MOTION_PRESETS[plan.hero_effect] ? plan.hero_effect : 'slow_push',
    support_transition: APD_MOTION_PRESETS[plan.support_transition] ? plan.support_transition : 'fade_up',
    exit_transition: APD_MOTION_PRESETS[plan.exit_transition] ? plan.exit_transition : 'cross_dissolve',
    motion_reason: apdCleanText(plan.motion_reason || 'Use restrained motion to support comprehension.'),
    narration_direction: apdCleanText(plan.narration_direction || 'Measured documentary delivery with clear emphasis on the main idea.'),
    visual_count: apdClamp(Number(plan.visual_count) || 3, 2, 4),
  };
};

const apdGetAIDirectorPlan = async (subject, onProgress = () => {}) => {
  onProgress({ label: 'AI DIRECTOR', detail: 'Interpreting the assignment with Puter AI...', tone: 'active' });
  const puter = await apdEnsurePuterAuth();

  const systemPrompt = `You are APD, the Automated Presentation Director inside HireBerna. Your job is to DIRECT exactly one presentation slide, not render it.\n\nInterpret natural language semantically. Do not treat the assignment as a bag of keywords. "sleep clothes" means sleepwear. "set up my live stream" is a live-production setup process. "start a non profit" means forming a nonprofit organization.\n\nReturn an execution-ready plan for browser automation: research queries, source concepts, hero visual intent, supporting visual intent, icon choices, typography treatment, transitions, effects, and narration direction.\n\nFor setup/process/tutorial assignments, prioritize a real hero photo plus a diagram/process visual when that communicates better than a second photo, and include 3-5 useful icons. For ordinary subjects, use a second contextual photo unless a diagram is clearly better.\n\nAll image search queries must describe what should visibly appear in the image, not merely repeat the user's phrase. Include avoid terms to prevent celebrity portraits, logos, PDFs, unrelated named works, and semantic drift.\n\nChoose typography and motion ONLY from the provided enum values. Keep motion restrained and professional.\n\nFor political/civic subjects, remain neutral and descriptive. Do not advocate for or against a party, candidate, ballot choice, or political position.\n\nUse web search when it materially helps you understand an ambiguous or current assignment. Then call submit_apd_director_plan exactly once.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Direct one slide for this assignment: ${subject}\nAvailable icon IDs: ${Object.keys(APD_ICON_CATALOG).join(', ')}` },
  ];

  const readPlan = (response) => {
    const toolCalls = response?.message?.tool_calls || [];
    const planCall = toolCalls.find((call) => call?.function?.name === 'submit_apd_director_plan');
    let parsed = apdParseToolArguments(planCall?.function?.arguments);
    if (!parsed && typeof response?.message?.content === 'string') {
      const raw = response.message.content.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
      parsed = apdParseToolArguments(raw);
    }
    return parsed;
  };

  let response;
  try {
    response = await puter.ai.chat(messages, {
      model: APD_AI_MODEL,
      normalize: true,
      tools: [{ type: 'web_search' }, APD_DIRECTOR_PLAN_TOOL],
    });
  } catch (firstError) {
    console.warn('APD AI Director web-search call failed; retrying without web search:', firstError);
    response = await puter.ai.chat(messages, {
      model: 'gpt-5.6-luna',
      normalize: true,
      tools: [APD_DIRECTOR_PLAN_TOOL],
    });
  }

  let plan = readPlan(response);

  if (!plan) {
    onProgress({ label: 'AI DIRECTOR', detail: 'Structured plan missing. Retrying a strict planner pass...', tone: 'warn' });
    const retry = await puter.ai.chat(messages, {
      model: 'gpt-5.6-luna',
      normalize: true,
      tools: [APD_DIRECTOR_PLAN_TOOL],
    });
    plan = readPlan(retry);
  }

  const normalized = apdNormalizeAIPlan(plan, subject);
  onProgress({
    label: 'AI DIRECTOR',
    detail: `${normalized.domain_label} · ${normalized.intent_label} · plan locked`,
    tone: 'good',
  });
  return normalized;
};

const apdMergeAIPlanIntoProfile = (subject, aiPlan) => {
  const base = buildAPDTopicProfile(subject);
  const canonical = aiPlan.interpreted_topic || base.canonicalSubject;
  const aliases = apdUnique([canonical, subject, ...aiPlan.meaning_aliases]);
  const coreTerms = apdUnique([
    ...apdWords(canonical).filter((word) => word.length > 2 && !APD_STOP_WORDS.has(word)),
    ...aiPlan.key_concepts.flatMap((value) => apdWords(value)),
  ]).slice(0, 18);
  const anchorGroup = apdUnique([
    canonical.toLowerCase(),
    ...aliases.map((value) => value.toLowerCase()),
  ]);
  const intentKey = aiPlan.intent_key || base.intentKey;
  const proceduralTerms = intentKey === 'procedural'
    ? apdUnique(['process', 'setup', 'formation', 'steps', 'planning', 'requirements', ...aiPlan.source_must_cover])
    : apdUnique(aiPlan.source_must_cover);

  return {
    ...base,
    aiPlan,
    aiDirected: true,
    canonicalSubject: canonical,
    normalizedSubject: canonical,
    meaningNormalized: canonical.toLowerCase() !== apdCleanText(subject).toLowerCase(),
    meaningRequired: false,
    meaningAliases: aliases,
    meaningAnchorGroups: [anchorGroup],
    domainKey: aiPlan.domain_key,
    domainLabel: aiPlan.domain_label,
    intentKey,
    intentLabel: aiPlan.intent_label,
    primaryAnchor: canonical,
    coreTerms,
    coreGroups: coreTerms.map((term) => APD_TOPIC_SYNONYMS[term] || [term]),
    anchorGroups: [anchorGroup],
    proceduralTerms,
    conceptTerms: apdUnique([...aiPlan.key_concepts, ...aiPlan.source_must_cover]),
    visualTerms: apdUnique([
      ...aiPlan.key_concepts,
      ...aiPlan.hero_must_show,
      ...aiPlan.support_must_show,
    ]),
    driftTerms: apdUnique([...base.driftTerms, ...aiPlan.reject_concepts, ...aiPlan.hero_avoid, ...aiPlan.support_avoid]),
    broadConcept: true,
    searchQueries: aiPlan.source_queries,
    sourceFallbackQueries: aiPlan.source_fallback_queries,
    imageQueries: apdUnique([...aiPlan.hero_queries, ...aiPlan.support_queries]),
    visualIntent: {
      heroGoal: aiPlan.hero_goal,
      supportGoal: aiPlan.support_goal,
      heroQueries: aiPlan.hero_queries,
      supportQueries: aiPlan.support_queries,
      fallbackHeroQueries: aiPlan.hero_fallback_queries,
      fallbackSupportQueries: aiPlan.support_fallback_queries,
    },
    interpretation: `${aiPlan.domain_label} · ${aiPlan.intent_label} · AI-directed`,
  };
};

const buildAPDTopicProfile = (subject) => {
  const cleanSubject = apdCleanText(subject);
  const lower = cleanSubject.toLowerCase();
  const rawWords = apdWords(cleanSubject);
  const meaningAnchor = apdResolveMeaningAnchor(cleanSubject);

  const proceduralPattern = /\b(how to|start|create|form|build|launch|establish|organize|organise|register|found|set up|make)\b/i;
  const comparePattern = /\b(vs\.?|versus|compare|comparison|difference|differences)\b/i;
  const procedural = proceduralPattern.test(cleanSubject);
  const comparison = comparePattern.test(cleanSubject);
  const intentKey = procedural ? 'procedural' : comparison ? 'comparison' : 'explainer';
  const intentLabel = procedural
    ? 'Formation / process explainer'
    : comparison
      ? 'Comparison'
      : 'Subject explainer';

  const intentNoise = new Set([
    'start', 'create', 'form', 'build', 'launch', 'establish', 'organize', 'organise',
    'register', 'found', 'set', 'make', 'new', 'how', 'compare', 'comparison', 'versus',
  ]);

  const consumedTerms = new Set(meaningAnchor?.consumedTerms || []);
  const modifierTerms = apdUnique(
    rawWords.filter(
      (word) =>
        word.length > 2 &&
        !APD_STOP_WORDS.has(word) &&
        !intentNoise.has(word) &&
        !consumedTerms.has(word)
    )
  );

  const normalizedSubject = meaningAnchor?.canonical || cleanSubject;
  const normalizedWords = apdWords(normalizedSubject).filter(
    (word) => word.length > 2 && !APD_STOP_WORDS.has(word)
  );

  const coreTerms = apdUnique([
    ...normalizedWords,
    ...modifierTerms,
  ]);

  const domainScores = Object.entries(APD_TOPIC_DOMAINS)
    .filter(([key]) => key !== 'general')
    .map(([key, domain]) => ({
      key,
      score: domain.triggers.reduce(
        (total, trigger) =>
          total + (lower.includes(trigger) ? (trigger.includes(' ') ? 3 : 1) : 0),
        0
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const detectedDomainKey = domainScores[0]?.score > 0 ? domainScores[0].key : 'general';
  const domainKey = meaningAnchor?.domainKey || detectedDomainKey;
  const domain = APD_TOPIC_DOMAINS[domainKey] || APD_TOPIC_DOMAINS.general;

  const coreGroups = coreTerms.map((term) =>
    APD_TOPIC_SYNONYMS[term] ? APD_TOPIC_SYNONYMS[term] : [term]
  );

  const meaningAnchorGroups = meaningAnchor?.anchorGroups || [];
  const americaContext = /\bamerica\b|\bamerican\b|\bunited states\b/i.test(cleanSubject);
  const geoTerms = americaContext ? ['america', 'american', 'united states', 'u.s.'] : [];

  const anchorGroups = [...meaningAnchorGroups];
  if (!anchorGroups.length && /\bpolitical part(?:y|ies)\b/i.test(cleanSubject)) {
    anchorGroups.push(['political party', 'political parties', 'party organization', 'party formation']);
  }
  if (!anchorGroups.length && /\belectric vehicles?\b|\bev\b/i.test(cleanSubject)) {
    anchorGroups.push(['electric vehicle', 'electric vehicles', 'ev']);
  }
  if (!anchorGroups.length && /\bshipwrecks?\b/i.test(cleanSubject)) {
    anchorGroups.push(['shipwreck', 'shipwrecks', 'ship wreck', 'ship wrecks']);
  }
  if (!anchorGroups.length && coreTerms.length >= 2) {
    const phrase = coreTerms.slice(0, Math.min(3, coreTerms.length)).join(' ');
    const last = coreTerms[Math.min(2, coreTerms.length - 1)];
    const singular = last?.endsWith('s') && last.length > 4 ? last.slice(0, -1) : '';
    const plural = last && !last.endsWith('s') ? `${last}s` : '';
    const variants = [phrase];
    if (singular) variants.push([...coreTerms.slice(0, -1), singular].join(' '));
    if (plural) variants.push([...coreTerms.slice(0, -1), plural].join(' '));
    anchorGroups.push(apdUnique(variants));
  }

  const proceduralTerms = procedural
    ? [
        'formation', 'forming', 'founding', 'establishing', 'organizing', 'organisation',
        'organization', 'registration', 'structure', 'process', 'requirements',
      ]
    : [];

  const driftTerms = apdUnique([
    ...domain.drift,
    ...(meaningAnchor?.drift || []),
  ]).filter((term) => !lower.includes(term));

  const conceptTerms = apdUnique([
    ...domain.concepts,
    ...(meaningAnchor?.concepts || []),
    ...geoTerms,
  ]);

  const visualTerms = apdUnique([
    ...(domain.visuals || domain.concepts),
    ...(meaningAnchor?.visualTerms || []),
    ...geoTerms,
  ]);

  const primaryAnchor = meaningAnchor?.canonical || anchorGroups[0]?.[0] || coreTerms.join(' ');
  const modifierPhrase = modifierTerms.join(' ');
  const contextPhrase = apdUnique([
    primaryAnchor,
    modifierPhrase,
    ...domain.concepts.slice(0, 4),
    ...(americaContext ? ['united states'] : []),
  ]).join(' ');

  const proceduralQuery = procedural
    ? apdUnique([
        primaryAnchor,
        modifierPhrase,
        ...proceduralTerms.slice(0, 5),
        ...(americaContext ? ['united states'] : []),
      ]).join(' ')
    : '';

  const anchorQueries = meaningAnchor?.searchQueries || meaningAnchor?.aliases || [];
  const sourceFallbackQueries = apdUnique(
    (meaningAnchor?.sourceFallbackQueries || meaningAnchor?.aliases || [])
      .map((query) => apdCleanText(`${query} ${modifierPhrase}`))
      .filter(Boolean)
  );
  const searchQueries = apdUnique([
    ...anchorQueries.map((query) => apdCleanText(`${query} ${modifierPhrase}`)),
    proceduralQuery,
    contextPhrase,
    cleanSubject,
  ]).filter(Boolean);

  const geoSuffix = americaContext ? 'United States' : '';
  const q = (...parts) => apdCleanText(parts.filter(Boolean).join(' '));

  let heroGoal = `A strong documentary-style visual that communicates ${primaryAnchor || cleanSubject}.`;
  let supportGoal = `A secondary visual that adds useful context to ${primaryAnchor || cleanSubject}.`;
  let heroQueries = [
    q(primaryAnchor || cleanSubject, modifierPhrase, 'documentary photo', geoSuffix),
    q(primaryAnchor || cleanSubject, modifierPhrase, 'people context', geoSuffix),
  ];
  let supportQueries = [
    q(primaryAnchor || cleanSubject, modifierPhrase, 'context detail', geoSuffix),
    q(primaryAnchor || cleanSubject, modifierPhrase, 'supporting scene', geoSuffix),
  ];
  let fallbackHeroQueries = [q(primaryAnchor || cleanSubject, modifierPhrase)];
  let fallbackSupportQueries = [q(primaryAnchor || cleanSubject, 'detail context', modifierPhrase)];

  if (meaningAnchor?.visualIntent) {
    heroGoal = meaningAnchor.visualIntent.heroGoal;
    supportGoal = meaningAnchor.visualIntent.supportGoal;
    heroQueries = meaningAnchor.visualIntent.heroQueries.map((query) => q(query, modifierPhrase));
    supportQueries = meaningAnchor.visualIntent.supportQueries.map((query) => q(query, modifierPhrase));
    fallbackHeroQueries = meaningAnchor.visualIntent.fallbackHeroQueries.map((query) => q(query, modifierPhrase));
    fallbackSupportQueries = meaningAnchor.visualIntent.fallbackSupportQueries.map((query) => q(query, modifierPhrase));
  } else if (domainKey === 'politics' && intentKey === 'procedural') {
    heroGoal = 'People visibly organizing, meeting or coordinating around a civic or political effort.';
    supportGoal = 'A concrete process visual such as petitioning, voter outreach, registration or volunteer organization.';
    heroQueries = [
      q('civic organizing meeting people', geoSuffix),
      q('community political meeting citizens', geoSuffix),
      q('campaign volunteers organizing', geoSuffix),
    ];
    supportQueries = [
      q('petition signatures civic', geoSuffix),
      q('voter registration volunteers', geoSuffix),
      q('campaign volunteers table', geoSuffix),
      q('political convention delegates', geoSuffix),
    ];
    fallbackHeroQueries = [
      q('community meeting citizens organizing', geoSuffix),
      q('public meeting people discussion', geoSuffix),
    ];
    fallbackSupportQueries = [
      q('petition signing people', geoSuffix),
      q('volunteers registration table', geoSuffix),
    ];
  } else if (domainKey === 'politics') {
    heroGoal = 'A neutral civic-participation scene that visually establishes the political subject.';
    supportGoal = 'A secondary election, ballot, public-meeting or organizing visual that adds context.';
    heroQueries = [
      q('civic participation voters', geoSuffix),
      q('public political meeting citizens', geoSuffix),
      q(primaryAnchor, 'people meeting', geoSuffix),
    ];
    supportQueries = [
      q('ballot voting polling place', geoSuffix),
      q('campaign volunteers', geoSuffix),
      q('public meeting government', geoSuffix),
    ];
    fallbackHeroQueries = [q('citizens public meeting', geoSuffix)];
    fallbackSupportQueries = [q('voting ballot people', geoSuffix)];
  } else if (domainKey === 'clothing') {
    heroGoal = `A clear clothing photograph that directly shows ${primaryAnchor || cleanSubject}.`;
    supportGoal = `A second clothing visual that adds style, material, use or garment context to ${primaryAnchor || cleanSubject}.`;
    heroQueries = [
      q(primaryAnchor || cleanSubject, modifierPhrase, 'clothing apparel'),
      q(primaryAnchor || cleanSubject, modifierPhrase, 'garment outfit'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, modifierPhrase, 'styles garments'),
      q(primaryAnchor || cleanSubject, modifierPhrase, 'fabric apparel'),
    ];
    fallbackHeroQueries = [q(primaryAnchor || cleanSubject, 'clothing')];
    fallbackSupportQueries = [q(primaryAnchor || cleanSubject, 'garment apparel')];
  } else if (domainKey === 'religion') {
    heroGoal = 'A human, documentary-style scene of religious life, faith or worship connected to the topic.';
    supportGoal = 'A secondary community, worship-space or interfaith visual that adds cultural context.';
    heroQueries = [
      q('religious life faith community', geoSuffix),
      q('worship community people', geoSuffix),
      q(primaryAnchor, 'religious culture', geoSuffix),
    ];
    supportQueries = [
      q('worship service community', geoSuffix),
      q('interfaith gathering people', geoSuffix),
      q('religious community event', geoSuffix),
    ];
    fallbackHeroQueries = [q('faith community people', geoSuffix)];
    fallbackSupportQueries = [q('worship gathering people', geoSuffix)];
  } else if (domainKey === 'history') {
    heroGoal = 'A period-appropriate historical photograph or scene that establishes the subject and era.';
    supportGoal = 'A secondary archival scene, artifact, location or map that adds historical context.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'historical photograph'),
      q(primaryAnchor || cleanSubject, 'archive photo'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'historical people place'),
      q(primaryAnchor || cleanSubject, 'historical map artifact'),
    ];
    fallbackHeroQueries = [q('historical archive people photograph')];
    fallbackSupportQueries = [q('historical map artifact archive')];
  } else if (domainKey === 'science') {
    heroGoal = 'A clear scientific image or observation that directly establishes the phenomenon or subject.';
    supportGoal = 'A research, laboratory, diagram or secondary observation that explains context or process.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'scientific image'),
      q(primaryAnchor || cleanSubject, 'research observation'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'diagram research'),
      q(primaryAnchor || cleanSubject, 'laboratory science'),
    ];
    fallbackHeroQueries = [q('scientific research observation')];
    fallbackSupportQueries = [q('science laboratory research diagram')];
  } else if (domainKey === 'technology') {
    heroGoal = 'A real-world technology or engineering scene that clearly establishes the subject.';
    supportGoal = 'A detail, component, interface or engineering-process visual that explains how it works.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'technology engineering'),
      q(primaryAnchor || cleanSubject, 'real world technology'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'engineering detail'),
      q(primaryAnchor || cleanSubject, 'technology process'),
    ];
    fallbackHeroQueries = [q('technology engineering people')];
    fallbackSupportQueries = [q('engineering component detail')];
  } else if (domainKey === 'culture') {
    heroGoal = 'A human cultural scene, performance or community image that establishes the movement or subject.';
    supportGoal = 'A secondary artifact, detail, place or participant image that adds cultural context.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'culture people documentary'),
      q(primaryAnchor || cleanSubject, 'community performance'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'artifact detail culture'),
      q(primaryAnchor || cleanSubject, 'community context'),
    ];
    fallbackHeroQueries = [q('culture community people documentary')];
    fallbackSupportQueries = [q('cultural artifact community detail')];
  } else if (domainKey === 'economics') {
    heroGoal = 'A real-world economy, business, work or market scene that visually establishes the subject.';
    supportGoal = 'A secondary household, workplace, currency, market or chart visual that adds economic context.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'economy business people'),
      q(primaryAnchor || cleanSubject, 'market workplace'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'workers consumers market'),
      q(primaryAnchor || cleanSubject, 'economic chart currency'),
    ];
    fallbackHeroQueries = [q('business workers market people')];
    fallbackSupportQueries = [q('economy currency chart market')];
  } else if (domainKey === 'geography') {
    heroGoal = 'A strong landscape or place image that clearly establishes the geographic subject.';
    supportGoal = 'A secondary map, community, environmental or location-detail visual that adds spatial context.';
    heroQueries = [
      q(primaryAnchor || cleanSubject, 'landscape place'),
      q(primaryAnchor || cleanSubject, 'geography location'),
    ];
    supportQueries = [
      q(primaryAnchor || cleanSubject, 'map geography'),
      q(primaryAnchor || cleanSubject, 'people place environment'),
    ];
    fallbackHeroQueries = [q('landscape geography place')];
    fallbackSupportQueries = [q('map location community')];
  }

  const visualIntent = {
    heroGoal,
    supportGoal,
    heroQueries: apdUnique(heroQueries.filter(Boolean)).slice(0, 4),
    supportQueries: apdUnique(supportQueries.filter(Boolean)).slice(0, 4),
    fallbackHeroQueries: apdUnique(fallbackHeroQueries.filter(Boolean)).slice(0, 3),
    fallbackSupportQueries: apdUnique(fallbackSupportQueries.filter(Boolean)).slice(0, 3),
  };

  const broadConcept = coreTerms.length <= 4 && domainKey !== 'general';
  const genericPolitics =
    domainKey === 'politics' &&
    !/\b(republican|democrat|democratic|libertarian|green party|labour|labor party|conservative party)\b/i.test(cleanSubject);

  const meaningNormalized = Boolean(
    meaningAnchor?.semanticRewrite &&
    meaningAnchor.canonical.toLowerCase() !== cleanSubject.toLowerCase()
  );

  return {
    subject: cleanSubject,
    normalizedSubject,
    canonicalSubject: meaningAnchor?.canonical || cleanSubject,
    meaningKey: meaningAnchor?.key || null,
    meaningNormalized,
    meaningRequired: Boolean(meaningAnchor),
    meaningAliases: meaningAnchor?.aliases || [],
    meaningAnchorGroups,
    domainKey,
    domainLabel: domain.label,
    coreTerms,
    coreGroups,
    anchorGroups,
    proceduralTerms,
    conceptTerms,
    visualTerms,
    driftTerms,
    americaContext,
    broadConcept,
    genericPolitics,
    intentKey,
    intentLabel,
    primaryAnchor,
    searchQueries,
    sourceFallbackQueries,
    imageQueries: apdUnique([...visualIntent.heroQueries, ...visualIntent.supportQueries]),
    visualIntent,
    interpretation: meaningNormalized
      ? `${domain.label} · ${intentLabel} · interpreted as ${meaningAnchor.canonical}`
      : americaContext
        ? `${domain.label} · ${intentLabel} · United States context`
        : `${domain.label} · ${intentLabel}`,
  };
};

/* =========================================================
   SOURCE BROKER
========================================================= */

const apdBrokerFetchJson = async (url, timeout = 9000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
};

const apdBrokerTopicFit = (profile, candidate) => {
  const haystack = [candidate.title, candidate.text, candidate.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const title = String(candidate.title || '').toLowerCase();

  const coreHits = profile.coreGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const coreRatio = profile.coreGroups.length ? coreHits / profile.coreGroups.length : 0;
  const conceptHits = apdCountTerms(haystack, profile.conceptTerms);
  const driftHits = apdCountTerms(haystack, profile.driftTerms);
  const titleCoreHits = profile.coreGroups.filter((group) =>
    apdTermGroupMatched(title, group)
  ).length;
  const anchorHits = profile.anchorGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const titleAnchorHits = profile.anchorGroups.filter((group) =>
    apdTermGroupMatched(title, group)
  ).length;
  const meaningHits = profile.meaningAnchorGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const titleMeaningHits = profile.meaningAnchorGroups.filter((group) =>
    apdTermGroupMatched(title, group)
  ).length;
  const intentHits = apdCountTerms(haystack, profile.proceduralTerms);
  const titleIntentHits = apdCountTerms(title, profile.proceduralTerms);
  const exactPhrase = haystack.includes(profile.subject.toLowerCase());
  const normalizedPhrase = profile.canonicalSubject
    ? haystack.includes(profile.canonicalSubject.toLowerCase())
    : false;

  let score = Math.round(coreRatio * 10);
  score += Math.min(10, conceptHits * 2);
  score += Math.min(8, titleCoreHits * 4);
  score += Math.min(12, anchorHits * 8);
  score += Math.min(8, titleAnchorHits * 6);
  score += Math.min(7, intentHits * 2);
  if (normalizedPhrase) score += 8;
  if (exactPhrase) score += 3;
  if (profile.meaningRequired && meaningHits > 0) score += 8;
  if (profile.meaningRequired && titleMeaningHits > 0) score += 5;
  score -= Math.min(32, driftHits * 8);

  const meaningSatisfied = !profile.meaningRequired || meaningHits > 0;
  const processPrimaryFit =
    profile.intentKey !== 'procedural' ||
    (profile.aiDirected
      ? (
          titleIntentHits > 0 ||
          intentHits >= 2 ||
          (meaningSatisfied && anchorHits > 0 && intentHits > 0)
        )
      : (
          titleAnchorHits > 0 ||
          titleIntentHits > 0 ||
          normalizedPhrase ||
          (meaningSatisfied && anchorHits > 0 && intentHits > 0)
        ));

  const supportFit =
    profile.intentKey !== 'procedural' ||
    titleAnchorHits > 0 ||
    titleIntentHits > 0 ||
    (anchorHits > 0 && intentHits > 0) ||
    (meaningSatisfied && normalizedPhrase);

  const hardReject =
    !meaningSatisfied ||
    (driftHits >= 2 && conceptHits === 0) ||
    (profile.broadConcept && driftHits >= 1 && score < 22) ||
    (profile.anchorGroups.length > 0 && anchorHits === 0 && coreRatio < 0.6);

  return {
    score: apdClamp(score, 0, 45),
    hardReject,
    coreHits,
    conceptHits,
    driftHits,
    anchorHits,
    titleAnchorHits,
    meaningHits,
    titleMeaningHits,
    intentHits,
    primaryEligible: !hardReject && processPrimaryFit,
    supportEligible: !hardReject && supportFit,
  };
};

const apdBrokerDepthScore = (candidate) => {
  const length = candidate.text?.length || 0;
  if (length >= 5000) return 20;
  if (length >= 2500) return 18;
  if (length >= 1200) return 15;
  if (length >= 600) return 11;
  if (length >= 300) return 8;
  if (length >= 100) return 4;
  return 0;
};

const apdBrokerReadabilityScore = (candidate) => {
  const length = candidate.text?.length || 0;
  if (length >= 500) return 10;
  if (length >= 250) return 8;
  if (length >= 100) return 5;
  if (length > 0) return 2;
  return 0;
};

const apdBrokerDateFitScore = (profile, candidate) => {
  const combined = [candidate.title, candidate.text, candidate.date]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const decadeMatch = profile.subject.toLowerCase().match(/\b(18|19|20)(\d)0s\b/);

  if (decadeMatch) {
    const decadeStart = Number(`${decadeMatch[1]}${decadeMatch[2]}0`);
    for (let year = decadeStart; year <= decadeStart + 9; year += 1) {
      if (combined.includes(String(year))) return 10;
    }
    return 0;
  }

  const yearMatch = profile.subject.toLowerCase().match(/\b(18|19|20)\d{2}\b/);
  if (yearMatch) return combined.includes(yearMatch[0]) ? 10 : 0;
  return 5;
};

const apdBrokerDirectnessScore = (profile, candidate) => {
  if (candidate.sourceType === 'scholarly' && candidate.text?.length >= 250) {
    return profile.intentKey === 'procedural' ? 6 : 9;
  }
  if (candidate.sourceType === 'reference' && candidate.text?.length >= 500) {
    return profile.intentKey === 'procedural' ? 13 : 9;
  }
  if (candidate.sourceType === 'news') return profile.intentKey === 'procedural' ? 3 : 6;
  if (candidate.sourceType === 'archive') {
    if (profile.domainKey === 'history' || profile.intentKey === 'explainer') return 4;
    return 1;
  }
  return 3;
};

const apdBrokerScoreCandidate = (profile, candidate) => {
  const topic = apdBrokerTopicFit(profile, candidate);
  const depth = apdBrokerDepthScore(candidate);
  const readability = apdBrokerReadabilityScore(candidate);
  const dateFit = apdBrokerDateFitScore(profile, candidate);
  const authority = apdClamp(candidate.authority || 0, 0, 18);
  const directness = apdBrokerDirectnessScore(profile, candidate);

  const total = topic.hardReject
    ? 0
    : apdClamp(
        topic.score + depth + readability + dateFit + authority + directness,
        0,
        96
      );

  return {
    ...candidate,
    score: total,
    topicFit: topic.score,
    hardTopicReject: topic.hardReject,
    primaryEligible: topic.primaryEligible,
    supportEligible: topic.supportEligible,
    meaningHits: topic.meaningHits || 0,
    titleMeaningHits: topic.titleMeaningHits || 0,
    scoring: {
      topicFit: topic.score,
      depth,
      readability,
      dateFit,
      authority,
      directness,
    },
  };
};

const apdBrokerOverlapScore = (a, b) => {
  if (!a?.text || !b?.text) return 0;
  const wordsA = new Set(apdWords(a.text).filter((word) => word.length > 4));
  const wordsB = new Set(apdWords(b.text).filter((word) => word.length > 4));
  if (!wordsA.size || !wordsB.size) return 0;

  let shared = 0;
  wordsA.forEach((word) => {
    if (wordsB.has(word)) shared += 1;
  });

  return apdClamp(
    Math.round((shared / Math.min(wordsA.size, wordsB.size)) * 100),
    0,
    100
  );
};

const apdBrokerSearchWikipedia = async (query) => {
  const searchParams = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '5',
    format: 'json',
    origin: '*',
  });

  const searchData = await apdBrokerFetchJson(
    `https://en.wikipedia.org/w/api.php?${searchParams.toString()}`
  );
  const results = searchData?.query?.search || [];
  if (!results.length) return [];

  const pageIds = results.map((result) => result.pageid).join('|');
  const documentParams = new URLSearchParams({
    action: 'query',
    prop: 'extracts|info',
    pageids: pageIds,
    explaintext: '1',
    exsectionformat: 'plain',
    inprop: 'url',
    format: 'json',
    origin: '*',
  });

  const documentData = await apdBrokerFetchJson(
    `https://en.wikipedia.org/w/api.php?${documentParams.toString()}`
  );
  const pages = documentData?.query?.pages || {};

  return results
    .map((result) => {
      const page = pages[result.pageid];
      if (!page) return null;
      return {
        id: `wikipedia-${result.pageid}`,
        provider: 'Wikipedia',
        providerKey: 'wikipedia',
        sourceType: 'reference',
        title: page.title || '',
        url: page.fullurl || '',
        text: apdCleanText(page.extract || ''),
        description: apdCleanText(result.snippet || ''),
        date: null,
        authority: APD_SOURCE_PROVIDERS.wikipedia.authority,
      };
    })
    .filter(Boolean);
};

const apdBrokerSearchCrossref = async (query) => {
  const params = new URLSearchParams({ 'query.bibliographic': query, rows: '7' });
  const data = await apdBrokerFetchJson(
    `https://api.crossref.org/works?${params.toString()}`
  );
  const items = data?.message?.items || [];

  return items.map((item, index) => {
    const title = Array.isArray(item.title) ? item.title[0] : item.title || '';
    const container = Array.isArray(item['container-title'])
      ? item['container-title'][0]
      : '';
    const year =
      item?.published?.['date-parts']?.[0]?.[0] ||
      item?.issued?.['date-parts']?.[0]?.[0] ||
      null;

    return {
      id: item.DOI || `crossref-${index}`,
      provider: 'Crossref',
      providerKey: 'crossref',
      sourceType: 'scholarly',
      title: apdCleanText(title),
      url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : ''),
      text: apdCleanText(item.abstract || ''),
      description: apdCleanText(
        [container, item.publisher, item.type].filter(Boolean).join(' · ')
      ),
      date: year,
      authority: APD_SOURCE_PROVIDERS.crossref.authority,
    };
  });
};

const apdBrokerSearchEuropePMC = async (query) => {
  const params = new URLSearchParams({
    query,
    format: 'json',
    pageSize: '7',
    resultType: 'core',
  });
  const data = await apdBrokerFetchJson(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`
  );
  const results = data?.resultList?.result || [];

  return results.map((item, index) => ({
    id: item.id || item.doi || `europepmc-${index}`,
    provider: 'Europe PMC',
    providerKey: 'europepmc',
    sourceType: 'scholarly',
    title: apdCleanText(item.title || ''),
    url: item.doi
      ? `https://doi.org/${item.doi}`
      : item.pmcid
        ? `https://europepmc.org/articles/${item.pmcid}`
        : '',
    text: apdCleanText(item.abstractText || ''),
    description: apdCleanText(
      [item.journalTitle, item.authorString].filter(Boolean).join(' · ')
    ),
    date: item.pubYear || null,
    authority: APD_SOURCE_PROVIDERS.europepmc.authority,
  }));
};

const apdBrokerNormalizeList = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string' ? item : item?.title || item?.name || item?.label || ''
      )
      .filter(Boolean)
      .join(' · ');
  }
  if (typeof value === 'object') return value.title || value.name || value.label || '';
  return '';
};

const apdBrokerSearchLOC = async (query) => {
  const params = new URLSearchParams({ q: query, fo: 'json', c: '7' });
  const data = await apdBrokerFetchJson(
    `https://www.loc.gov/search/?${params.toString()}`
  );
  const results = data?.results || [];

  return results.map((item, index) => ({
    id: item.id || `loc-${index}`,
    provider: 'Library of Congress',
    providerKey: 'loc',
    sourceType: 'archive',
    title: apdCleanText(item.title || ''),
    url: item.id || '',
    text: apdCleanText(
      [
        apdBrokerNormalizeList(item.description),
        apdBrokerNormalizeList(item.subject),
        apdBrokerNormalizeList(item.notes),
      ]
        .filter(Boolean)
        .join(' ')
    ),
    description: apdCleanText(apdBrokerNormalizeList(item.partof)),
    date: item.date || null,
    authority: APD_SOURCE_PROVIDERS.loc.authority,
  }));
};

const apdBrokerSearchGDELT = async (query) => {
  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    maxrecords: '10',
    format: 'json',
    sort: 'HybridRel',
  });
  const data = await apdBrokerFetchJson(
    `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`
  );
  const articles = data?.articles || [];

  return articles.map((article, index) => ({
    id: article.url || `gdelt-${index}`,
    provider: 'GDELT',
    providerKey: 'gdelt',
    sourceType: 'news',
    title: apdCleanText(article.title || ''),
    url: article.url || '',
    text: '',
    description: apdCleanText(
      [article.domain, article.sourcecountry, article.language]
        .filter(Boolean)
        .join(' · ')
    ),
    date: article.seendate || null,
    authority: APD_SOURCE_PROVIDERS.gdelt.authority,
  }));
};

const apdSourceProviderRelevant = (key, profile) => {
  if (key === 'europepmc') {
    return profile.domainKey === 'science' || apdHasAny(profile.subject, ['health', 'medical', 'medicine']);
  }
  if (key === 'loc' && profile.intentKey === 'procedural' && profile.domainKey !== 'history') {
    return false;
  }
  return true;
};

const apdBrokerRunProvider = async (key, searchFunction, profile) => {
  if (!apdSourceProviderRelevant(key, profile)) {
    return {
      key,
      label: APD_SOURCE_PROVIDERS[key]?.label || key,
      status: 'skipped',
      count: 0,
      candidates: [],
      error: 'Not relevant to this topic profile',
    };
  }

  const queries = profile.searchQueries.slice(0, 2);
  const settled = await Promise.allSettled(
    queries.map((query) => searchFunction(query))
  );
  const successful = settled.filter((item) => item.status === 'fulfilled');

  if (!successful.length) {
    const firstError = settled.find((item) => item.status === 'rejected')?.reason;
    return {
      key,
      label: APD_SOURCE_PROVIDERS[key]?.label || key,
      status: 'unavailable',
      count: 0,
      candidates: [],
      error: firstError?.name === 'AbortError'
        ? 'Request timed out'
        : firstError?.message || 'Provider unavailable',
    };
  }

  const seen = new Set();
  const candidates = successful
    .flatMap((item) => item.value)
    .filter((candidate) => {
      const id = candidate.url || candidate.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

  return {
    key,
    label: APD_SOURCE_PROVIDERS[key]?.label || key,
    status: 'available',
    count: candidates.length,
    candidates,
  };
};

const apdBrokerSelectEvidence = (profile, candidates) => {
  const scored = candidates
    .map((candidate) => apdBrokerScoreCandidate(profile, candidate))
    .filter((candidate) => candidate.title)
    .sort((a, b) => b.score - a.score);

  const eligible = scored.filter(
    (candidate) => !candidate.hardTopicReject && candidate.topicFit >= 20
  );

  const primaryEligible = eligible.filter(
    (candidate) => candidate.primaryEligible && candidate.text?.length >= 250
  );

  const primary =
    primaryEligible[0] ||
    eligible.find(
      (candidate) =>
        candidate.primaryEligible &&
        candidate.text?.length >= 100 &&
        candidate.topicFit >= 24
    ) ||
    null;

  if (!primary) return { primary: null, supporting: [], scored };

  const supporting = [];
  const usedProviders = new Set([primary.providerKey]);

  for (const candidate of eligible) {
    if (
      candidate.id === primary.id ||
      candidate.score < 38 ||
      !candidate.supportEligible
    ) {
      continue;
    }
    if (usedProviders.has(candidate.providerKey)) continue;
    supporting.push(candidate);
    usedProviders.add(candidate.providerKey);
    if (supporting.length >= 2) break;
  }

  if (supporting.length < 1) {
    for (const candidate of eligible) {
      if (
        candidate.id === primary.id ||
        candidate.score < 42 ||
        !candidate.supportEligible ||
        supporting.some((item) => item.id === candidate.id)
      ) {
        continue;
      }
      supporting.push(candidate);
      if (supporting.length >= 2) break;
    }
  }

  return {
    primary,
    supporting: supporting.map((candidate) => ({
      ...candidate,
      overlapWithPrimary: apdBrokerOverlapScore(primary, candidate),
    })),
    scored,
  };
};

const apdBrokerConfidence = (primary, supporting, profile = null) => {
  if (!primary) return { level: 'LOW', score: 0, reasons: ['No usable primary source.'] };

  const selected = [primary, ...supporting];
  const providers = new Set(selected.map((item) => item.providerKey));
  const readable = selected.filter((item) => item.text?.length >= 250);
  const avgQuality =
    selected.reduce((total, item) => total + (item.score || 0), 0) /
    Math.max(1, selected.length);
  const avgTopicFit =
    selected.reduce((total, item) => total + (item.topicFit || 0), 0) /
    Math.max(1, selected.length);
  const overlapValues = supporting
    .map((source) => source.overlapWithPrimary || 0)
    .filter((value) => value > 0);
  const avgOverlap = overlapValues.length
    ? overlapValues.reduce((total, value) => total + value, 0) / overlapValues.length
    : 0;

  let score = avgQuality * 0.48;
  score += (avgTopicFit / 45) * 22;
  score += Math.min(providers.size, 4) * 5;
  score += Math.min(readable.length, 3) * 3;
  score += Math.min(avgOverlap, 40) * 0.08;
  score = apdClamp(Math.round(score), 0, 100);

  // A weak semantic match can never masquerade as a strong research package.
  if ((primary.topicFit || 0) < 28) score = Math.min(score, 54);
  if (profile?.meaningRequired && (primary.meaningHits || 0) === 0) score = 0;

  let level = 'LOW';
  if (score >= 75) level = 'STRONG';
  else if (score >= 55) level = 'MODERATE';

  return {
    level,
    score,
    reasons: [
      `${providers.size} independent provider${providers.size === 1 ? '' : 's'} represented`,
      `${readable.length} selected source${readable.length === 1 ? '' : 's'} contained readable material`,
      `Primary topic fit: ${primary.topicFit}/45`,
      profile?.meaningNormalized
        ? `Meaning anchor preserved: ${profile.canonicalSubject}`
        : 'Original subject meaning preserved',
      avgOverlap > 0
        ? `Cross-source overlap: ${Math.round(avgOverlap)}%`
        : 'Limited readable cross-source overlap available',
    ],
  };
};

const acquireAPDEvidence = async (profile, onProgress = () => {}) => {
  onProgress({
    label: 'TOPIC PROFILE',
    detail: `${profile.interpretation} · guarding against semantic drift`,
    tone: 'active',
  });

  if (profile.meaningNormalized) {
    onProgress({
      label: 'MEANING ANCHOR',
      detail: `Interpreted “${profile.subject}” as ${profile.canonicalSubject}`,
      tone: 'good',
    });
  }

  onProgress({
    label: 'SOURCE BROKER',
    detail: 'Searching public research systems...',
    tone: 'active',
  });

  const providerDefs = [
    ['wikipedia', apdBrokerSearchWikipedia],
    ['crossref', apdBrokerSearchCrossref],
    ['europepmc', apdBrokerSearchEuropePMC],
    ['loc', apdBrokerSearchLOC],
    ['gdelt', apdBrokerSearchGDELT],
  ];

  const runProviderRound = async (roundProfile, announce = true) => {
    const jobs = providerDefs.map(async ([key, search]) => {
      const result = await apdBrokerRunProvider(key, search, roundProfile);
      if (announce) {
        onProgress({
          label: result.label,
          detail:
            result.status === 'available'
              ? `${result.count} candidate${result.count === 1 ? '' : 's'} returned`
              : result.status === 'skipped'
                ? 'Skipped for this topic profile'
                : 'Provider unavailable',
          tone:
            result.status === 'available'
              ? result.count > 0
                ? 'good'
                : 'muted'
              : result.status === 'skipped'
                ? 'muted'
                : 'bad',
        });
      }
      return result;
    });
    return Promise.all(jobs);
  };

  let providerResults = await runProviderRound(profile, true);
  let candidates = providerResults.flatMap((provider) => provider.candidates);

  onProgress({
    label: 'TOPIC-FIT GATE',
    detail: `Checking ${candidates.length} research candidates for semantic drift`,
    tone: 'active',
  });

  let selection = apdBrokerSelectEvidence(profile, candidates);

  if (!selection.primary && profile.sourceFallbackQueries?.length) {
    onProgress({
      label: 'SOURCE FALLBACK',
      detail: 'No strong first-pass source. Broadening to canonical reference terms automatically...',
      tone: 'warn',
    });

    const fallbackProfile = {
      ...profile,
      searchQueries: profile.sourceFallbackQueries,
    };

    const fallbackResults = await runProviderRound(fallbackProfile, false);
    const byProvider = new Map();

    [...providerResults, ...fallbackResults].forEach((provider) => {
      const current = byProvider.get(provider.key);
      if (!current) {
        byProvider.set(provider.key, { ...provider, candidates: [...(provider.candidates || [])] });
        return;
      }

      const seen = new Set((current.candidates || []).map((item) => item.url || item.id));
      const mergedCandidates = [...(current.candidates || [])];
      (provider.candidates || []).forEach((item) => {
        const key = item.url || item.id;
        if (!key || seen.has(key)) return;
        seen.add(key);
        mergedCandidates.push(item);
      });

      byProvider.set(provider.key, {
        ...current,
        status:
          current.status === 'available' || provider.status === 'available'
            ? 'available'
            : current.status,
        count: mergedCandidates.length,
        candidates: mergedCandidates,
      });
    });

    providerResults = [...byProvider.values()];
    candidates = providerResults.flatMap((provider) => provider.candidates);
    selection = apdBrokerSelectEvidence(profile, candidates);
  }

  const { primary, supporting, scored } = selection;

  if (!primary) {
    throw new Error(
      'APD found public material, but none was strong enough to direct this slide without guessing.'
    );
  }

  const rejectedForDrift = scored.filter(
    (candidate) => candidate.hardTopicReject || candidate.topicFit < 18
  ).length;

  if (rejectedForDrift > 0) {
    onProgress({
      label: 'SEMANTIC DRIFT',
      detail: `${rejectedForDrift} off-topic candidate${rejectedForDrift === 1 ? '' : 's'} rejected`,
      tone: 'good',
    });
  }

  const confidence = apdBrokerConfidence(primary, supporting, profile);

  onProgress({
    label: 'PRIMARY SELECTED',
    detail: `${primary.provider} · topic fit ${primary.topicFit}/45 · quality ${primary.score}/100`,
    tone: confidence.level === 'LOW' ? 'warn' : 'good',
  });

  onProgress({
    label: 'EVIDENCE PACKET',
    detail: `${supporting.length + 1} selected sources · ${confidence.level} ${confidence.score}/100`,
    tone:
      confidence.level === 'STRONG'
        ? 'good'
        : confidence.level === 'MODERATE'
          ? 'warn'
          : 'warn',
  });

  const readableSources = [primary, ...supporting].filter(
    (source) => source.text?.length >= 100
  );
  const combinedText = readableSources
    .map((source) => `${source.title}. ${source.text}`)
    .join('\n\n');

  return {
    subject: profile.subject,
    topicProfile: profile,
    primarySource: primary,
    supportingSources: supporting,
    selectedSources: [primary, ...supporting],
    confidence,
    providerStatus: providerResults.map((provider) => ({
      key: provider.key,
      label: provider.label,
      status: provider.status,
      count: provider.count,
      error: provider.error || null,
    })),
    combinedText: combinedText || primary.text,
    candidateCount: scored.length,
    rejectedForDrift,
    topCandidates: scored.slice(0, 10),
  };
};

/* =========================================================
   IMAGE BROKER
========================================================= */

const apdImageFetchJson = apdBrokerFetchJson;

const apdImageRightsGate = (candidate) => {
  if (candidate.publicDomain === true) {
    return { allowed: true, score: 10, reason: 'Public-domain material identified.' };
  }

  const combined = `${candidate.license || ''} ${candidate.rights || ''}`.toLowerCase();

  if (/noncommercial|non-commercial|by-nc|\bnc\b/.test(combined)) {
    return { allowed: false, score: 0, reason: 'Non-commercial restriction detected.' };
  }

  if (/all rights reserved|copyrighted|permission required|restricted/.test(combined)) {
    return { allowed: false, score: 0, reason: 'Rights metadata indicates a restriction.' };
  }

  const accepted = [
    /public domain/,
    /no known restrictions/,
    /free to use/,
    /\bcc0\b/,
    /\bpdm\b/,
    /creative commons zero/,
    /^by(?:-sa)?(?:\s|$)/,
    /cc by/,
    /cc-by/,
    /attribution/,
    /sharealike/,
    /share-alike/,
  ];

  if (accepted.some((pattern) => pattern.test(combined.trim()))) {
    return { allowed: true, score: 10, reason: 'Usable open-license metadata identified.' };
  }

  if (candidate.providerKey === 'nasa') {
    return {
      allowed: true,
      score: 6,
      reason: 'NASA media candidate. Usage guidance should remain attached.',
    };
  }

  return {
    allowed: false,
    score: 0,
    reason: 'Rights status was not clear enough for automatic use.',
  };
};

const apdImageTopicFit = (profile, candidate) => {
  const haystack = [candidate.title, candidate.description, candidate.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const title = String(candidate.title || '').toLowerCase();
  const searchQuery = String(candidate.apdSearchQuery || '').toLowerCase();
  const searchTerms = apdWords(searchQuery).filter(
    (word) => word.length > 3 && !APD_STOP_WORDS.has(word)
  );
  const searchHits = searchTerms.filter((term) => haystack.includes(term)).length;

  const coreHits = profile.coreGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const coreRatio = profile.coreGroups.length ? coreHits / profile.coreGroups.length : 0;
  const anchorHits = profile.anchorGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const meaningHits = profile.meaningAnchorGroups.filter((group) =>
    apdTermGroupMatched(haystack, group)
  ).length;
  const visualHits = apdCountTerms(haystack, profile.visualTerms);
  const conceptHits = apdCountTerms(haystack, profile.conceptTerms);
  const driftHits = apdCountTerms(haystack, profile.driftTerms);

  let score = Math.round(coreRatio * 7);
  score += Math.min(8, anchorHits * 8);
  score += Math.min(8, visualHits * 2);
  score += Math.min(5, conceptHits);
  score += Math.min(12, searchHits * 3);
  if (profile.meaningRequired && meaningHits > 0) score += 10;

  if (profile.americaContext && apdHasAny(haystack, ['america', 'american', 'united states'])) {
    score += 3;
  }

  if (profile.genericPolitics) {
    const partisanSpecific = /\brepublican\b|\bdemocrat(?:ic)?\b|\blibertarian\b|\bgreen party\b|\blabour party\b|\blabor party\b|\bconservative party\b/i.test(title);
    if (partisanSpecific) score -= 8;
  }

  score -= Math.min(28, driftHits * 8);

  const meaningSatisfied = !profile.meaningRequired || meaningHits > 0;
  const conceptuallyUseful =
    meaningSatisfied &&
    (searchHits >= 2 || visualHits >= 2 || anchorHits > 0 || coreRatio >= 0.6);

  const hardReject =
    !meaningSatisfied ||
    score < 14 ||
    !conceptuallyUseful ||
    (driftHits >= 2 && conceptHits === 0 && searchHits < 2);

  return {
    score: apdClamp(score, 0, 40),
    hardReject,
    coreHits,
    anchorHits,
    meaningHits,
    visualHits,
    conceptHits,
    driftHits,
    searchHits,
    searchQuery: candidate.apdSearchQuery || '',
  };
};

const apdImageResolutionScore = (candidate) => {
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  if (!width || !height) return 6;
  if (width >= 2400 && height >= 1200) return 15;
  if (width >= 1600 && height >= 900) return 13;
  if (width >= 1200 && height >= 700) return 11;
  if (width >= 700 && height >= 400) return 6;
  return 2;
};

const apdImageClassify = (candidate) => {
  const combined = [candidate.title, candidate.description, candidate.tags, candidate.mime]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/\.pdf\b|\.djvu\b|\bpdf\b|title page|research paper|working paper|thesis|dissertation|technical report/.test(combined)) return 'document';
  if (/logo|wordmark|emblem|coat of arms|seal\b/.test(combined)) return 'logo';
  if (/map\b|chart|diagram|schematic|infographic/.test(combined)) return 'diagram';
  if (/flag\b|banner/.test(combined)) return 'flag';
  if (/drawing|illustration|engraving|painting|artwork/.test(combined)) return 'illustration';
  return 'photo';
};

const apdImageRoleScore = (candidate, role, profile) => {
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  const ratio = height > 0 ? width / height : 1.5;
  const mediaType = apdImageClassify(candidate);
  const subjectLower = profile.subject.toLowerCase();
  const subjectRequestsMap = /map|geography|location|territory|route/.test(subjectLower);
  const subjectRequestsFlag = /flag|banner|symbol|seal|emblem/.test(subjectLower);

  let score = 0;
  let hardReject = false;
  const reasons = [];

  if (role === 'hero') {
    if (ratio >= 1.3 && ratio <= 2.25) {
      score += 15;
      reasons.push('Strong landscape composition.');
    } else if (ratio >= 1.05 && ratio <= 2.7) {
      score += 10;
      reasons.push('Usable hero aspect ratio.');
    } else {
      score += 3;
      reasons.push('Weak hero aspect ratio.');
    }

    if (mediaType === 'photo') score += 5;
    if (mediaType === 'document') {
      score -= 20;
      hardReject = true;
      reasons.push('Document/PDF preview rejected as a hero visual.');
    }
    if (mediaType === 'diagram' && !subjectRequestsMap) {
      score -= 10;
      reasons.push('Diagram/map is weak for primary hero use.');
    }
    if (mediaType === 'logo') {
      score -= 20;
      hardReject = true;
      reasons.push('Logo-like material rejected as hero.');
    }
    if (mediaType === 'flag' && !subjectRequestsFlag) {
      score -= 12;
      reasons.push('Flag is not appropriate as the primary visual.');
    }
  } else {
    score += ratio >= 0.7 && ratio <= 2.8 ? 10 : 5;
    if (mediaType === 'photo') score += 4;
    if (mediaType === 'document') {
      score -= 16;
      hardReject = true;
      reasons.push('Document/PDF preview rejected as a supporting visual.');
    }
    if (mediaType === 'diagram') score += 6;
    if (mediaType === 'illustration') score += 5;
    if (mediaType === 'logo') score -= 10;
  }

  return {
    score: apdClamp(score, 0, 20),
    hardReject,
    mediaType,
    reasons,
  };
};

const apdImageMetadataScore = (candidate) => {
  let score = 0;
  if (candidate.title) score += 2;
  if (candidate.description) score += 1;
  if (candidate.creator) score += 1;
  if (candidate.sourceUrl) score += 1;
  return apdClamp(score, 0, 5);
};

const apdImageUsefulnessScore = (candidate) => {
  let score = 0;
  if (candidate.imageUrl) score += 4;
  if (candidate.title) score += 2;
  if (candidate.description || candidate.tags) score += 2;
  if (candidate.sourceUrl) score += 2;
  return apdClamp(score, 0, 10);
};

const apdImageScoreCandidate = (profile, candidate, role) => {
  const topic = apdImageTopicFit(profile, candidate);
  const rights = apdImageRightsGate(candidate);
  const roleFit = apdImageRoleScore(candidate, role, profile);
  const resolution = apdImageResolutionScore(candidate);
  const metadata = apdImageMetadataScore(candidate);
  const usefulness = apdImageUsefulnessScore(candidate);
  const aiPlan = profile.aiPlan || null;
  const aiHaystack = [candidate.title, candidate.description, candidate.tags, candidate.apdSearchQuery]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const aiMustTerms = aiPlan
    ? (role === 'hero' ? aiPlan.hero_must_show : aiPlan.support_must_show)
    : [];
  const aiAvoidTerms = aiPlan
    ? (role === 'hero' ? aiPlan.hero_avoid : aiPlan.support_avoid)
    : [];
  const aiMustHits = apdCountTerms(aiHaystack, aiMustTerms);
  const aiAvoidHits = apdCountTerms(aiHaystack, aiAvoidTerms);
  const aiRoleScore = aiPlan ? Math.min(10, aiMustHits * 4) : 0;
  const aiHardReject = Boolean(
    aiPlan && (
      aiAvoidHits > 0 ||
      (aiMustTerms.length > 0 && aiMustHits === 0 && topic.score < 18)
    )
  );
  const width = Number(candidate.width || 0);
  const height = Number(candidate.height || 0);
  const tooSmall = width > 0 && height > 0 && (width < 500 || height < 300);
  const mime = String(candidate.mime || '').toLowerCase();
  const nonImageMime = Boolean(mime) && !mime.startsWith('image/');
  const fileLooksLikeDocument = /\.(pdf|djvu|docx?|pptx?)($|\?)/i.test(
    `${candidate.title || ''} ${candidate.originalUrl || ''}`
  );

  const hardReject =
    topic.hardReject ||
    !candidate.imageUrl ||
    !rights.allowed ||
    tooSmall ||
    nonImageMime ||
    fileLooksLikeDocument ||
    roleFit.hardReject ||
    aiHardReject;

  const total = hardReject
    ? 0
    : apdClamp(
        topic.score + roleFit.score + resolution + rights.score + metadata + usefulness + aiRoleScore,
        0,
        96
      );

  const threshold = role === 'hero' ? 60 : 54;
  let decision = 'REJECTED';
  if (!hardReject && total >= threshold) decision = 'ACCEPTED';
  else if (!hardReject && total >= threshold - 7) decision = 'CAUTION';

  return {
    ...candidate,
    role,
    score: total,
    decision,
    topicFit: topic.score,
    meaningHits: topic.meaningHits || 0,
    mediaType: roleFit.mediaType,
    scoreBreakdown: {
      topicFit: topic.score,
      roleFit: roleFit.score,
      resolution,
      rights: rights.score,
      metadata,
      usefulness,
      aiRoleScore,
    },
    rightsReview: rights.reason,
    reviewReasons: [
      ...roleFit.reasons,
      ...(aiAvoidHits > 0 ? ['AI Director avoid-term match detected.'] : []),
      ...(aiPlan && aiMustTerms.length > 0 && aiMustHits === 0 ? ['AI Director must-show concepts were not detected in the candidate metadata.'] : []),
    ],
  };
};

const apdImageSearchWikimedia = async (query) => {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1600',
    format: 'json',
    origin: '*',
  });

  const data = await apdImageFetchJson(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`
  );
  const pages = Object.values(data?.query?.pages || {});

  return pages
    .map((page) => {
      const info = page?.imageinfo?.[0];
      if (!info) return null;
      const metadata = info.extmetadata || {};
      return {
        id: `wikimedia-${page.pageid}`,
        provider: 'Wikimedia Commons',
        providerKey: 'wikimedia',
        diversityKey: 'wikimedia',
        title: String(page.title || '').replace(/^File:/, ''),
        description: apdCleanText(metadata?.ImageDescription?.value || ''),
        creator: apdCleanText(metadata?.Artist?.value || ''),
        license: apdCleanText(metadata?.LicenseShortName?.value || ''),
        rights: apdCleanText(metadata?.UsageTerms?.value || ''),
        imageUrl: info.thumburl || info.url,
        originalUrl: info.url,
        sourceUrl: info.descriptionurl || '',
        width: Number(info.width || 0),
        height: Number(info.height || 0),
        mime: info.mime || '',
        tags: '',
      };
    })
    .filter(Boolean);
};

const apdImageSearchOpenverse = async (query) => {
  const params = new URLSearchParams({ q: query, page_size: '20' });
  const data = await apdImageFetchJson(
    `https://api.openverse.org/v1/images/?${params.toString()}`
  );
  const results = data?.results || [];

  return results
    .map((item, index) => {
      const sourceName = item.source || item.provider || 'openverse';
      return {
        id: item.id || `openverse-${index}`,
        provider: item.provider ? `Openverse / ${item.provider}` : 'Openverse',
        providerKey: 'openverse',
        diversityKey: `openverse-${sourceName}`,
        upstreamSource: sourceName,
        title: apdCleanText(item.title || ''),
        description: apdCleanText(item.alt_text || ''),
        creator: apdCleanText(item.creator || ''),
        license: [item.license, item.license_version].filter(Boolean).join(' '),
        rights: item.license_url || '',
        imageUrl: item.thumbnail || item.url || '',
        originalUrl: item.url || '',
        sourceUrl: item.foreign_landing_url || item.detail_url || '',
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        mime: item.filetype ? `image/${item.filetype}` : '',
        tags: Array.isArray(item.tags)
          ? item.tags
              .map((tag) => tag?.name || tag)
              .filter(Boolean)
              .join(' ')
          : '',
      };
    })
    .filter((candidate) => candidate.imageUrl);
};

const apdImageSearchLOC = async (query) => {
  const params = new URLSearchParams({ q: query, fo: 'json', c: '15' });
  const data = await apdImageFetchJson(
    `https://www.loc.gov/photos/?${params.toString()}`
  );
  const results = data?.results || [];

  return results
    .map((item, index) => {
      const images = Array.isArray(item.image_url) ? item.image_url : [];
      const imageUrl = images.length ? images[images.length - 1] : '';
      const rights = [item.rights, item.rights_advisory, item.rights_information]
        .flat()
        .filter(Boolean)
        .join(' ');

      return {
        id: item.id || `loc-image-${index}`,
        provider: 'Library of Congress',
        providerKey: 'loc',
        diversityKey: 'loc',
        title: apdCleanText(item.title || ''),
        description: apdCleanText(
          [item.description, item.notes, item.subject].flat().filter(Boolean).join(' ')
        ),
        creator: apdCleanText(
          Array.isArray(item.contributor)
            ? item.contributor.join(' · ')
            : item.contributor || ''
        ),
        license: '',
        rights: apdCleanText(rights),
        imageUrl,
        originalUrl: imageUrl,
        sourceUrl: item.id || '',
        width: 0,
        height: 0,
        mime: 'image/jpeg',
        tags: Array.isArray(item.subject) ? item.subject.join(' ') : '',
      };
    })
    .filter((candidate) => candidate.imageUrl);
};

const apdImageSearchNASA = async (query) => {
  const params = new URLSearchParams({ q: query, media_type: 'image', page_size: '20' });
  const data = await apdImageFetchJson(
    `https://images-api.nasa.gov/search?${params.toString()}`
  );
  const items = data?.collection?.items || [];

  return items
    .map((item, index) => {
      const metadata = item?.data?.[0] || {};
      const link =
        item?.links?.find(
          (candidate) => candidate.rel === 'preview' || candidate.render === 'image'
        ) || item?.links?.[0];
      const nasaId = metadata.nasa_id || '';

      return {
        id: nasaId || `nasa-${index}`,
        provider: 'NASA Images',
        providerKey: 'nasa',
        diversityKey: 'nasa',
        title: apdCleanText(metadata.title || ''),
        description: apdCleanText(metadata.description || metadata.description_508 || ''),
        creator: apdCleanText(metadata.photographer || metadata.center || 'NASA'),
        license: 'NASA Media Usage Guidelines',
        rights: 'NASA media usage guidance applies',
        imageUrl: link?.href || '',
        originalUrl: link?.href || '',
        sourceUrl: nasaId
          ? `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`
          : '',
        width: 0,
        height: 0,
        mime: 'image/jpeg',
        tags: Array.isArray(metadata.keywords) ? metadata.keywords.join(' ') : '',
      };
    })
    .filter((candidate) => candidate.imageUrl);
};

const apdImageSearchMet = async (query) => {
  const searchParams = new URLSearchParams({ q: query, hasImages: 'true' });
  const searchData = await apdImageFetchJson(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?${searchParams.toString()}`
  );
  const objectIDs = (searchData?.objectIDs || []).slice(0, 8);
  if (!objectIDs.length) return [];

  const objects = await Promise.all(
    objectIDs.map(async (objectID) => {
      try {
        return await apdImageFetchJson(
          `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`
        );
      } catch {
        return null;
      }
    })
  );

  return objects
    .filter(Boolean)
    .filter((item) => item.isPublicDomain && (item.primaryImageSmall || item.primaryImage))
    .map((item) => ({
      id: `met-${item.objectID}`,
      provider: 'The Met',
      providerKey: 'met',
      diversityKey: 'met',
      title: apdCleanText(item.title || ''),
      description: apdCleanText(
        [item.objectName, item.period, item.culture, item.medium]
          .filter(Boolean)
          .join(' · ')
      ),
      creator: apdCleanText(item.artistDisplayName || ''),
      license: 'Public Domain / Open Access',
      rights: 'CC0 / The Met Open Access',
      publicDomain: true,
      imageUrl: item.primaryImageSmall || item.primaryImage,
      originalUrl: item.primaryImage || item.primaryImageSmall,
      sourceUrl: item.objectURL || '',
      width: 0,
      height: 0,
      mime: 'image/jpeg',
      tags: [item.department, item.classification, item.objectName]
        .filter(Boolean)
        .join(' '),
    }));
};

const apdImageProviderRelevant = (key, profile) => {
  if (key === 'nasa') {
    return (
      profile.domainKey === 'science' ||
      apdHasAny(profile.subject, ['space', 'mars', 'planet', 'moon', 'nasa', 'astronomy'])
    );
  }
  if (key === 'met') {
    return ['history', 'culture', 'religion', 'general'].includes(profile.domainKey);
  }
  return true;
};

const apdImageRunProvider = async (
  key,
  searchFunction,
  profile,
  heroQueries,
  supportQueries
) => {
  if (!apdImageProviderRelevant(key, profile)) {
    return {
      key,
      label: APD_IMAGE_PROVIDERS[key]?.label || key,
      status: 'skipped',
      count: 0,
      heroCandidates: [],
      supportCandidates: [],
      error: 'Not relevant to this topic profile',
    };
  }

  const runQueries = async (queries, role) => {
    const uniqueQueries = apdUnique(queries.filter(Boolean)).slice(0, 3);
    const settled = await Promise.allSettled(
      uniqueQueries.map(async (query) => {
        const results = await searchFunction(query);
        return results.map((candidate) => ({
          ...candidate,
          apdSearchQuery: query,
          apdSearchRole: role,
        }));
      })
    );

    const successful = settled.filter((item) => item.status === 'fulfilled');
    if (!successful.length) {
      const firstError = settled.find((item) => item.status === 'rejected')?.reason;
      return {
        candidates: [],
        error: firstError?.name === 'AbortError'
          ? 'Request timed out'
          : firstError?.message || 'Provider unavailable',
      };
    }

    const seen = new Set();
    const candidates = successful
      .flatMap((item) => item.value)
      .filter((candidate) => {
        const id = candidate.originalUrl || candidate.imageUrl || candidate.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    return { candidates, error: null };
  };

  const [heroResult, supportResult] = await Promise.all([
    runQueries(heroQueries, 'hero'),
    runQueries(supportQueries, 'support'),
  ]);

  if (!heroResult.candidates.length && !supportResult.candidates.length && (heroResult.error || supportResult.error)) {
    return {
      key,
      label: APD_IMAGE_PROVIDERS[key]?.label || key,
      status: 'unavailable',
      count: 0,
      heroCandidates: [],
      supportCandidates: [],
      error: heroResult.error || supportResult.error || 'Provider unavailable',
    };
  }

  const allIds = new Set();
  [...heroResult.candidates, ...supportResult.candidates].forEach((candidate) => {
    const id = candidate.originalUrl || candidate.imageUrl || candidate.id;
    if (id) allIds.add(id);
  });

  return {
    key,
    label: APD_IMAGE_PROVIDERS[key]?.label || key,
    status: 'available',
    count: allIds.size,
    heroCount: heroResult.candidates.length,
    supportCount: supportResult.candidates.length,
    heroCandidates: heroResult.candidates,
    supportCandidates: supportResult.candidates,
    error: null,
  };
};

const apdImageEvaluatePool = (profile, candidates, role) =>
  candidates
    .map((candidate) => apdImageScoreCandidate(profile, candidate, role))
    .sort((a, b) => b.score - a.score);

const apdImageSelectAssets = (profile, heroCandidates, supportCandidates) => {
  const heroPool = apdImageEvaluatePool(profile, heroCandidates, 'hero');
  const hero =
    heroPool.find((candidate) => candidate.decision === 'ACCEPTED') ||
    heroPool.find((candidate) => candidate.decision === 'CAUTION') ||
    null;

  const supportPool = apdImageEvaluatePool(
    profile,
    supportCandidates.filter((candidate) => candidate.id !== hero?.id),
    'support'
  );
  const acceptableSupport = supportPool.filter(
    (candidate) => candidate.decision === 'ACCEPTED' || candidate.decision === 'CAUTION'
  );
  let support = acceptableSupport[0] || null;

  if (hero && support) {
    const diverse = acceptableSupport.find(
      (candidate) =>
        candidate.diversityKey !== hero.diversityKey &&
        candidate.score >= support.score - 7
    );
    if (diverse) support = diverse;
  }

  return {
    hero,
    support,
    heroPool: heroPool.slice(0, 8),
    supportPool: supportPool.slice(0, 8),
  };
};

const apdImageDirectorAsset = (candidate, role) => {
  const roleLabel = role === 'hero' ? 'Hero Image' : 'Supporting Image';
  if (!candidate) {
    return {
      role: roleLabel,
      status: 'REACQUIRE',
      score: 0,
      topicFit: 0,
      note: 'APD did not find a visual that cleared topic-fit, rights and quality gates.',
      placement: 'No placement issued.',
      provider: 'No provider selected',
      imageUrl: '',
    };
  }

  return {
    ...candidate,
    role: roleLabel,
    status: candidate.decision,
    note:
      candidate.decision === 'ACCEPTED'
        ? role === 'hero'
          ? 'APD accepted this as the strongest on-topic primary visual.'
          : 'APD accepted this as on-topic contextual support.'
        : 'APD considers this usable with caution. Full production should attempt a stronger acquisition if available.',
    placement:
      role === 'hero'
        ? 'Use as the dominant visual at roughly 60–65% of the slide. Protect the focal subject and reserve clean title space.'
        : 'Use at reduced scale as contextual support. Introduce after the hero establishes the subject.',
  };
};

const acquireAPDImages = async (profile, onProgress = () => {}) => {
  onProgress({
    label: 'VISUAL INTENT',
    detail: `Hero: ${profile.visualIntent.heroGoal}`,
    tone: 'active',
  });

  onProgress({
    label: 'IMAGE BROKER',
    detail: 'Searching open visual systems with role-specific visual concepts...',
    tone: 'active',
  });

  const providers = [
    ['wikimedia', apdImageSearchWikimedia],
    ['openverse', apdImageSearchOpenverse],
    ['loc', apdImageSearchLOC],
    ['nasa', apdImageSearchNASA],
    ['met', apdImageSearchMet],
  ];

  const runRound = async (heroQueries, supportQueries, roundLabel) => {
    const results = await Promise.all(
      providers.map(async ([key, search]) => {
        const result = await apdImageRunProvider(
          key,
          search,
          profile,
          heroQueries,
          supportQueries
        );

        if (roundLabel === 'PRIMARY') {
          onProgress({
            label: result.label,
            detail:
              result.status === 'available'
                ? `${result.heroCount || 0} hero · ${result.supportCount || 0} support candidates`
                : result.status === 'skipped'
                  ? 'Skipped for this topic profile'
                  : 'Provider unavailable',
            tone:
              result.status === 'available'
                ? result.count > 0
                  ? 'good'
                  : 'muted'
                : result.status === 'skipped'
                  ? 'muted'
                  : 'bad',
          });
        }

        return result;
      })
    );

    return results;
  };

  const mergeRoleCandidates = (results, role) => {
    const seen = new Set();
    return results
      .flatMap((provider) =>
        role === 'hero' ? provider.heroCandidates || [] : provider.supportCandidates || []
      )
      .filter((candidate) => {
        const key = candidate.originalUrl || candidate.imageUrl || candidate.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const primaryResults = await runRound(
    profile.visualIntent.heroQueries,
    profile.visualIntent.supportQueries,
    'PRIMARY'
  );

  let allResults = primaryResults;
  let heroCandidates = mergeRoleCandidates(primaryResults, 'hero');
  let supportCandidates = mergeRoleCandidates(primaryResults, 'support');

  onProgress({
    label: 'VISUAL TOPIC GATE',
    detail: `Checking ${heroCandidates.length + supportCandidates.length} role-specific visual candidates`,
    tone: 'active',
  });

  let selection = apdImageSelectAssets(profile, heroCandidates, supportCandidates);

  if (!selection.hero || !selection.support) {
    const missing = [!selection.hero ? 'hero' : null, !selection.support ? 'support' : null]
      .filter(Boolean)
      .join(' + ');

    onProgress({
      label: 'VISUAL FALLBACK',
      detail: `No strong ${missing} match. Broadening the visual search concepts automatically...`,
      tone: 'warn',
    });

    const fallbackResults = await runRound(
      !selection.hero ? profile.visualIntent.fallbackHeroQueries : [],
      !selection.support ? profile.visualIntent.fallbackSupportQueries : [],
      'FALLBACK'
    );

    allResults = primaryResults.map((primaryProvider) => {
      const fallbackProvider = fallbackResults.find((item) => item.key === primaryProvider.key);
      if (!fallbackProvider) return primaryProvider;
      return {
        ...primaryProvider,
        status:
          primaryProvider.status === 'available' || fallbackProvider.status === 'available'
            ? 'available'
            : primaryProvider.status,
        count: (primaryProvider.count || 0) + (fallbackProvider.count || 0),
        heroCount: (primaryProvider.heroCount || 0) + (fallbackProvider.heroCount || 0),
        supportCount: (primaryProvider.supportCount || 0) + (fallbackProvider.supportCount || 0),
        heroCandidates: [
          ...(primaryProvider.heroCandidates || []),
          ...(fallbackProvider.heroCandidates || []),
        ],
        supportCandidates: [
          ...(primaryProvider.supportCandidates || []),
          ...(fallbackProvider.supportCandidates || []),
        ],
      };
    });

    heroCandidates = mergeRoleCandidates(allResults, 'hero');
    supportCandidates = mergeRoleCandidates(allResults, 'support');
    selection = apdImageSelectAssets(profile, heroCandidates, supportCandidates);
  }

  const rejectedForTopic = [
    ...selection.heroPool,
    ...selection.supportPool,
  ].filter((candidate) => candidate.topicFit < 14 || candidate.decision === 'REJECTED').length;

  if (rejectedForTopic > 0) {
    onProgress({
      label: 'VISUAL DRIFT',
      detail: `${rejectedForTopic} top candidate${rejectedForTopic === 1 ? '' : 's'} rejected before selection`,
      tone: 'good',
    });
  }

  if (selection.hero) {
    onProgress({
      label: 'HERO',
      detail: `${selection.hero.provider} · ${selection.hero.decision} ${selection.hero.score}/100`,
      tone:
        selection.hero.decision === 'ACCEPTED'
          ? 'good'
          : selection.hero.decision === 'CAUTION'
            ? 'warn'
            : 'bad',
    });
  } else {
    onProgress({
      label: 'HERO',
      detail: 'No visual cleared the topic-fit, rights and role gates',
      tone: 'bad',
    });
  }

  if (selection.support) {
    onProgress({
      label: 'SUPPORT',
      detail: `${selection.support.provider} · ${selection.support.decision} ${selection.support.score}/100`,
      tone:
        selection.support.decision === 'ACCEPTED'
          ? 'good'
          : selection.support.decision === 'CAUTION'
            ? 'warn'
            : 'bad',
    });
  } else {
    onProgress({
      label: 'SUPPORT',
      detail: 'No supporting visual cleared the topic-fit, rights and role gates',
      tone: 'bad',
    });
  }

  const selected = [selection.hero, selection.support].filter(Boolean);
  const visualProviders = new Set(selected.map((candidate) => candidate.diversityKey));

  onProgress({
    label: 'VISUAL PACKAGE',
    detail: `${visualProviders.size} independent visual provider${visualProviders.size === 1 ? '' : 's'} selected`,
    tone: visualProviders.size >= 2 ? 'good' : visualProviders.size === 1 ? 'warn' : 'bad',
  });

  const providerStatus = allResults.map((provider) => ({
    key: provider.key,
    label: provider.label,
    status: provider.status,
    count: provider.count || 0,
    heroCount: provider.heroCount || 0,
    supportCount: provider.supportCount || 0,
    error: provider.error || null,
  }));

  return {
    subject: profile.subject,
    visualIntent: profile.visualIntent,
    heroAsset: apdImageDirectorAsset(selection.hero, 'hero'),
    supportAsset: apdImageDirectorAsset(selection.support, 'support'),
    providerStatus,
    candidateCount: heroCandidates.length + supportCandidates.length,
    providerDiversity: visualProviders.size,
    heroAudit: selection.heroPool,
    supportAudit: selection.supportPool,
  };
};


export { buildAPDTopicProfile, apdGetAIDirectorPlan, apdMergeAIPlanIntoProfile, apdEnsurePuterLoaded };
