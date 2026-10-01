import { Mic2, Music, FlaskConical } from 'lucide-react';

// CREAPD is organized by production FORMAT, not subject matter.
// Topics such as Sports, Beauty, Cooking, Faith, News, etc. live inside a Format.
export const CREAPD_FORMATS = [
  {
    key: 'radio',
    legacyKey: 'music',
    label: 'Radio',
    shortLabel: 'Radio',
    description: 'Music-centered programming with playlists, host scripting, DJ workflow, rundown control, OBS, teleprompter, and live production tools.',
    icon: Music,
    available: true,
    path: '/music/configure',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/10',
    accentBorder: 'border-purple-500/20',
    spotlightFeature: 'Radio Pipeline',
    spotlightDescription: 'Configure the show, prepare music and segments, review the package, build the rundown, then produce it in the Radio Studio.',
    workflow: [
      'Configure the show identity, host, length, music rules, and recurring segments',
      'Gather music, topics, notes, station IDs, and supporting material',
      'Review tracks, scripts, and individual segments',
      'Build the approved show rundown and production package',
      'Produce live or recorded in the Radio Studio',
      'Archive the episode, playlist, scripts, and production history'
    ],
    outputs: 'Show rundowns, playlists, host scripts, station IDs, production assets, archived episodes',
    examples: ['Morning Radio Show', 'Artist Spotlight', 'Countdown Show']
  },
  {
    key: 'podcast',
    legacyKey: 'news',
    label: 'Podcast',
    shortLabel: 'Podcast',
    description: 'Spoken-word production for any subject. CREAPD prepares the next episode, lets you approve the material, builds the package, and sends it to the studio.',
    icon: Mic2,
    available: true,
    path: '/news/dashboard',
    gradient: 'from-orange-500/20 via-fuchsia-500/10 to-violet-500/10',
    accent: 'text-orange-300',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/20',
    spotlightFeature: 'Episode Pipeline',
    spotlightDescription: 'The News preparation engine and Talk studio become one Podcast workflow: prepare, review, approve, package, and produce.',
    workflow: [
      'Configure the podcast, hosts, cadence, topic/category, sources, and recurring segments',
      'Gather stories, topics, research leads, guest material, and source content',
      'Review and approve the next episode material',
      'Build the episode rundown, scripts, talking points, assets, and production package',
      'Send the approved episode to the Podcast Studio',
      'Archive the episode and use its history to prepare what comes next'
    ],
    outputs: 'Episode briefs, topic queues, source lists, talking points, rundowns, studio packages, archived episodes',
    examples: ['Sports Podcast', 'News & Current Events', 'Faith & Theology', 'Beauty Podcast', 'Interview Show']
  },
  {
    key: 'research',
    legacyKey: 'research',
    label: 'Research',
    shortLabel: 'Research',
    description: 'Deep investigation and dossier building for any subject, with evidence, source review, structured findings, and outputs that can feed other CREAPD formats.',
    icon: FlaskConical,
    available: true,
    path: '/research',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/20',
    spotlightFeature: 'Research Pipeline',
    spotlightDescription: 'Define the question, gather and review evidence, build the dossier, then export it or send the findings into Podcast or Radio.',
    workflow: [
      'Define the research question, scope, depth, and source requirements',
      'Gather sources, evidence, documents, timelines, and data',
      'Review claims, conflicts, credibility, and research gaps',
      'Build the dossier, chronology, source library, and structured findings',
      'Refine findings in the Research Workspace',
      'Export the dossier or send approved research into Podcast or Radio'
    ],
    outputs: 'Research dossiers, source libraries, timelines, Point Cards, evidence notes, production-ready findings',
    examples: ['Deep Investigation', 'Doctrine Breakdown', 'Company Research', 'Historical Dossier']
  },
];

export const ACTIVE_FORMATS = CREAPD_FORMATS.filter(format => format.available);
export const COMING_SOON_FORMATS = CREAPD_FORMATS.filter(format => !format.available);

export function getFormatByKey(key) {
  const normalized = String(key || '').toLowerCase();
  return CREAPD_FORMATS.find(format =>
    format.key === normalized || format.legacyKey === normalized
  );
}

// Temporary aliases while older internal code migrates from PP/Studio terminology.
export const PRODUCTION_STUDIOS = CREAPD_FORMATS;
export const ACTIVE_STUDIOS = ACTIVE_FORMATS;
export const COMING_SOON_STUDIOS = COMING_SOON_FORMATS;
export const PRODUCTION_PROFILES = CREAPD_FORMATS;
export const ACTIVE_PROFILES = ACTIVE_FORMATS;
export const COMING_SOON_PROFILES = COMING_SOON_FORMATS;
export const getStudioByKey = getFormatByKey;
export const getProfileByKey = getFormatByKey;
