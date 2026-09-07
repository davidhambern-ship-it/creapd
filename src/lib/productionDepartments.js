/**
 * PP-ARCH-001: Universal Production Department Architecture
 *
 * Every Production Profile uses the same five departments.
 * Only Workers, Knowledge Sources, Templates, Rubrics, and Deliverables
 * may differ between profiles — the department workflow is universal.
 *
 * Workflow: Discovery → Knowledge → Blueprint → Production → Assembly
 */

export const UNIVERSAL_DEPARTMENTS = [
  {
    key: 'discovery',
    order: 1,
    name: 'Discovery',
    mission: 'Transform a producer\'s idea into a clearly defined Production Assignment.',
    description: 'Defines what is being created, why, audience, tone, deliverable, scope, objectives, constraints, and success criteria.',
    input: 'Producer Idea',
    output: 'Approved Production Assignment',
    icon: 'Compass',
    color: '#00FFFF',
    responsibilities: [
      'Define what is being created',
      'Define why it is being created',
      'Identify target audience',
      'Determine desired tone',
      'Determine desired deliverable',
      'Define scope and objectives',
      'Identify constraints',
      'Establish success criteria',
    ],
  },
  {
    key: 'knowledge',
    order: 2,
    name: 'Knowledge',
    mission: 'Acquire every piece of knowledge required to complete the Production Assignment.',
    description: 'Gathers facts, statistics, articles, lyrics, artist info, scriptures, publications, feeds, papers, maps, images, icons, charts, metadata, audio, video, datasets, API results, and references.',
    input: 'Approved Production Assignment',
    output: 'Knowledge Dataset',
    icon: 'Database',
    color: '#8B00FF',
    responsibilities: [
      'Acquire facts and statistics',
      'Gather articles and references',
      'Collect media assets (images, audio, video)',
      'Retrieve API results and datasets',
      'Source lyrics, scriptures, or domain-specific content',
      'Compile references and citations',
    ],
  },
  {
    key: 'blueprint',
    order: 3,
    name: 'Blueprint',
    mission: 'Transform acquired knowledge into an organized production blueprint.',
    description: 'Creates the authoritative source for every downstream department — executive summary, story structure, presentation points, timeline, references, key facts, speaker notes, and production notes.',
    input: 'Knowledge Dataset',
    output: 'Approved Production Blueprint',
    icon: 'ClipboardList',
    color: '#FF00FF',
    responsibilities: [
      'Create executive summary',
      'Define story structure',
      'Extract presentation points',
      'Build timeline',
      'Compile references and key facts',
      'Write speaker notes',
      'Define production notes',
    ],
  },
  {
    key: 'production',
    order: 4,
    name: 'Production',
    mission: 'Transform the Blueprint into production assets.',
    description: 'Creates scripts, images, icons, charts, maps, infographics, videos, voiceovers, music, animations, layouts, graphics, timelines, lower thirds, and visual effects.',
    input: 'Approved Production Blueprint',
    output: 'Approved Production Assets',
    icon: 'Sparkles',
    color: '#FF6B00',
    responsibilities: [
      'Generate scripts',
      'Create images and graphics',
      'Produce voiceovers and audio',
      'Generate videos and animations',
      'Build charts, maps, and infographics',
      'Create layouts and lower thirds',
    ],
  },
  {
    key: 'assembly',
    order: 5,
    name: 'Assembly',
    mission: 'Construct the final editable production using approved assets.',
    description: 'Creates StorySlides, builds editable presentations, places media, applies layouts, animations, and transitions, synchronizes narration, performs final QA, builds Production Packets, and generates exports.',
    input: 'Approved Production Assets',
    output: 'Production Packet + Editable Production + Exports',
    icon: 'Package',
    color: '#00FF88',
    responsibilities: [
      'Create StorySlides',
      'Build editable presentations',
      'Place media and apply layouts',
      'Apply animations and transitions',
      'Synchronize narration',
      'Perform final QA',
      'Build Production Packets',
      'Generate exports',
    ],
  },
];

export const DEPARTMENT_KEYS = UNIVERSAL_DEPARTMENTS.map(d => d.key);

export function getDepartment(key) {
  return UNIVERSAL_DEPARTMENTS.find(d => d.key === key);
}

export function getDepartmentByOrder(order) {
  return UNIVERSAL_DEPARTMENTS.find(d => d.order === order);
}

export function getNextDepartment(key) {
  const dept = getDepartment(key);
  if (!dept) return null;
  return getDepartmentByOrder(dept.order + 1) || null;
}

export function getPreviousDepartment(key) {
  const dept = getDepartment(key);
  if (!dept) return null;
  return getDepartmentByOrder(dept.order - 1) || null;
}

/**
 * Map each Production Profile's primary room to the universal department it serves.
 * These paths are navigation anchors, not a complete list of rooms.
 */
export const PROFILE_DEPARTMENT_MAP = {
  music: {
    discovery: {
      label: 'Show Configuration',
      path: '/music/configure',
      description: 'Define show name, date, genres, mood, and runtime targets.',
    },
    knowledge: {
      label: 'Music Research',
      path: '/music/research',
      description: 'Gather artist facts, song history, genre context, and music news.',
    },
    blueprint: {
      label: 'Topics & Playlist',
      path: '/music/playlist',
      description: 'Organize playlist, talking points, and show structure.',
    },
    production: {
      label: 'AI Assets',
      path: '/music/assets',
      description: 'Generate host scripts, song intros, artist facts, and social captions.',
    },
    assembly: {
      label: 'Rundown & Export',
      path: '/music/rundown',
      description: 'Assemble the show rundown and export the final production.',
    },
  },
  talk: {
    discovery: { label: 'Configure', path: '/talk/configure', description: 'Define show format, host, and topics.' },
    knowledge: { label: 'Research', path: '/talk/research', description: 'Gather guest info and topic research.' },
    blueprint: { label: 'Topics', path: '/talk/topics', description: 'Organize talking points, guests, and show structure.' },
    production: { label: 'Assets', path: '/talk/assets', description: 'Generate scripts, voiceovers, and media.' },
    assembly: { label: 'Rundown & Export', path: '/talk/rundown', description: 'Assemble the show and export.' },
  },
  cooking: {
    discovery: { label: 'Configure', path: '/cooking/configure', description: 'Define show format, cuisines, and production goals.' },
    knowledge: { label: 'Research', path: '/cooking/research', description: 'Gather recipe research and ingredient information.' },
    blueprint: { label: 'Recipes', path: '/cooking/recipes', description: 'Organize recipes, ingredients, and show structure.' },
    production: { label: 'Assets', path: '/cooking/assets', description: 'Generate scripts, voiceovers, and media.' },
    assembly: { label: 'Rundown & Export', path: '/cooking/rundown', description: 'Assemble the show and export.' },
  },
  sports: {
    discovery: { label: 'Configure', path: '/sports/configure', description: 'Define show format, sports, and coverage goals.' },
    knowledge: { label: 'Research', path: '/sports/research', description: 'Gather game data, stats, and athlete information.' },
    blueprint: { label: 'Games', path: '/sports/games', description: 'Organize games, athletes, matchups, and show structure.' },
    production: { label: 'Assets', path: '/sports/assets', description: 'Generate scripts, voiceovers, and media.' },
    assembly: { label: 'Rundown & Export', path: '/sports/rundown', description: 'Assemble the show and export.' },
  },
  cosmo: {
    discovery: { label: 'Configure', path: '/cosmo/configure', description: 'Define show format and health/beauty production goals.' },
    knowledge: { label: 'Research', path: '/cosmo/research', description: 'Gather product, expert, and health/beauty research.' },
    blueprint: { label: 'Topics', path: '/cosmo/topics', description: 'Organize topics, guests, talking points, and show structure.' },
    production: { label: 'Assets', path: '/cosmo/assets', description: 'Generate scripts, voiceovers, and media.' },
    assembly: { label: 'Rundown & Export', path: '/cosmo/rundown', description: 'Assemble the show and export.' },
  },
  research: {
    discovery: { label: 'Configure', path: '/research/configure', description: 'Define the production scope, methodology, sources, and research parameters.' },
    knowledge: { label: 'CREAPr Library', path: '/research/topics', description: 'Define topics and acquire verified research knowledge.' },
    blueprint: { label: 'Point Manager', path: '/research/manager', description: 'Review research points and shape the approved research blueprint.' },
    production: { label: 'Development Studio', path: '/research/assets', description: 'Generate production-ready assets from approved research.' },
    assembly: { label: 'Assembly Office', path: '/research/export', description: 'Assemble and export the final research production packet.' },
  },
  spiritual: {
    discovery: { label: 'Configure', path: '/spiritual/configure', description: 'Define message type, audience, tradition, and study parameters.' },
    knowledge: { label: 'Research & Library', path: '/spiritual/research', description: 'Gather scripture, commentary, history, language, and study materials.' },
    blueprint: { label: 'Study & Message', path: '/spiritual/study', description: 'Organize study findings, message sections, and teaching points.' },
    production: { label: 'Assets', path: '/spiritual/assets', description: 'Generate voiceovers and visual assets.' },
    assembly: { label: 'Package & Export', path: '/spiritual/package', description: 'Assemble the message package and export.' },
  },
  news: {
    discovery: { label: 'Brief & Story Queue', path: '/news/brief', description: 'Define the briefing direction and identify candidate stories.' },
    knowledge: { label: 'Research Desk', path: '/news/research', description: 'Gather, verify, and organize source material.' },
    blueprint: { label: 'Story Manager', path: '/news/workspace', description: 'Organize approved stories into production-ready blueprints.' },
    production: { label: 'Production Packages', path: '/news/production', description: 'Generate scripts, voice, and media.' },
    assembly: { label: 'Presentations & Export', path: '/news/presentations', description: 'Assemble presentations and export.' },
  },
};

/**
 * Complete room-to-department registry used to answer "where am I?" consistently.
 * Dashboard, archive, settings, and system routes intentionally do not pretend to
 * be a production department unless they directly perform department work.
 */
export const PROFILE_ROOM_DEPARTMENT_MAP = {
  news: {
    discovery: ['/news/brief', '/news/queue', '/news/review', '/news/brands', '/news/shows', '/news/planner'],
    knowledge: ['/news/research', '/news/sources', '/news/import', '/news/library', '/news/images'],
    blueprint: ['/news/workspace', '/news/templates', '/news/graphics-templates', '/news/prompt-templates'],
    production: ['/news/production'],
    assembly: ['/news/presentations', '/news/export'],
  },
  music: {
    discovery: ['/music/configure'],
    knowledge: ['/music/research'],
    blueprint: ['/music/topics', '/music/playlist', '/music/top10'],
    production: ['/music/assets'],
    assembly: ['/music/rundown'],
  },
  talk: {
    discovery: ['/talk/configure'],
    knowledge: ['/talk/research'],
    blueprint: ['/talk/topics', '/talk/guests'],
    production: ['/talk/assets'],
    assembly: ['/talk/rundown', '/talk/export'],
  },
  cooking: {
    discovery: ['/cooking/configure'],
    knowledge: ['/cooking/research'],
    blueprint: ['/cooking/recipes', '/cooking/ingredients'],
    production: ['/cooking/assets'],
    assembly: ['/cooking/rundown', '/cooking/export'],
  },
  sports: {
    discovery: ['/sports/configure'],
    knowledge: ['/sports/research'],
    blueprint: ['/sports/games', '/sports/athletes'],
    production: ['/sports/assets'],
    assembly: ['/sports/rundown', '/sports/export'],
  },
  cosmo: {
    discovery: ['/cosmo/configure'],
    knowledge: ['/cosmo/research'],
    blueprint: ['/cosmo/topics', '/cosmo/guests'],
    production: ['/cosmo/assets'],
    assembly: ['/cosmo/rundown', '/cosmo/export'],
  },
  spiritual: {
    discovery: ['/spiritual/configure'],
    knowledge: ['/spiritual/research', '/spiritual/library'],
    blueprint: ['/spiritual/study', '/spiritual/message'],
    production: ['/spiritual/assets'],
    assembly: ['/spiritual/package', '/spiritual/export'],
  },
  research: {
    discovery: ['/research/configure'],
    knowledge: ['/research/topics'],
    blueprint: ['/research/manager', '/research/dossier'],
    production: ['/research/assets'],
    assembly: ['/research/export'],
  },
};

const PROFILE_PREFIXES = ['news', 'music', 'talk', 'cooking', 'sports', 'cosmo', 'spiritual', 'research'];

export function deriveProfileFromPath(pathname = '') {
  return PROFILE_PREFIXES.find(profile => pathname === `/${profile}` || pathname.startsWith(`/${profile}/`)) || null;
}

export function getDepartmentKeyFromPath(pathname = '', profileKey = deriveProfileFromPath(pathname)) {
  if (!profileKey) return null;
  const roomMap = PROFILE_ROOM_DEPARTMENT_MAP[profileKey];
  if (!roomMap) return null;

  for (const departmentKey of DEPARTMENT_KEYS) {
    const paths = roomMap[departmentKey] || [];
    if (paths.some(path => pathname === path || pathname.startsWith(`${path}/`))) {
      return departmentKey;
    }
  }

  return null;
}

export function getProfileDepartmentState(pathname = '') {
  const profileKey = deriveProfileFromPath(pathname);
  const departmentKey = getDepartmentKeyFromPath(pathname, profileKey);
  const department = departmentKey ? getDepartment(departmentKey) : null;
  const profileDepartment = profileKey && departmentKey
    ? PROFILE_DEPARTMENT_MAP[profileKey]?.[departmentKey] || null
    : null;

  return {
    profileKey,
    departmentKey,
    department,
    profileDepartment,
  };
}

export function getProfileDepartmentMap(profileKey) {
  return PROFILE_DEPARTMENT_MAP[profileKey] || null;
}
