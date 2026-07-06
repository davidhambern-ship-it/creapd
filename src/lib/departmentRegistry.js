/**
 * Department Registry — CBS Part 3
 * 
 * Static configuration defining each department's capabilities,
 * triggers, backend functions, and delegation rules.
 */

export const DEPARTMENTS = {
  sift: {
    key: 'sift',
    name: 'Sift Department',
    role: 'Content Intelligence',
    description: 'Content acquisition, classification, scoring, filtering, and ShowProfile matching.',
    icon: 'Filter',
    color: 'blue',
    pocStages: [1, 2],
    responsibilities: [
      'Acquire stories from RSS feeds, manual imports, and external sources',
      'Classify articles as video or text content',
      'Score articles (priority, opportunity, freshness, credibility)',
      'Detect and group duplicate stories',
      'Match articles to the active ShowProfile',
      'Match articles to the active ProductionModule',
    ],
    functions: {
      fetchStories: 'RSS/feed acquisition',
      siftArticles: 'Classification, scoring, filtering',
      importStory: 'Manual import',
      processVideoArticle: 'Video transcription',
      fetchArticleContent: 'Full body extraction',
    },
    entities: ['Article', 'Source', 'ShowProfile'],
  },

  research: {
    key: 'research',
    name: 'Research Department',
    role: 'Deep Investigation',
    description: 'Deep investigation, multi-source research, dossier assembly, and research point extraction.',
    icon: 'Search',
    color: 'purple',
    pocStages: [2, 3],
    responsibilities: [
      'Break down a research query into sub-questions',
      'Discover sources via web search',
      'Verify source credibility',
      'Synthesize findings into a structured dossier',
      'Fact-check claims',
      'Perform critical analysis (gray areas, competing perspectives)',
      'Extract research points from dossiers',
    ],
    specialists: [
      { name: 'Discovery', role: 'Web search, source gathering' },
      { name: 'Organization', role: 'Theme clustering, timeline, categorization' },
      { name: 'Critical Analysis', role: 'Gray areas, logical gaps, competing perspectives' },
    ],
    functions: {
      deepResearchV2: 'Full orchestration pipeline',
      researchDepartmentOrchestrator: 'Specialist coordination',
      conductResearch: 'Legacy single-query research',
      performDeepResearch: 'Legacy deep research',
      extractResearchPoints: 'Point extraction from dossier',
    },
    entities: ['ResearchTopic', 'ResearchDossier', 'ResearchPoint'],
  },

  manager: {
    key: 'manager',
    name: 'Manager Department',
    role: 'Production Preparation',
    description: 'Production package creation, voice package generation, and production preparation.',
    icon: 'Package',
    color: 'emerald',
    pocStages: [4, 5],
    responsibilities: [
      'Receive approved stories/research points',
      'Generate ProductionPackages (script, talking points, b-roll)',
      'Generate VoicePackages (TTS audio from scripts)',
      'Runtime tracking and status management',
      'Coordinate with APD for slide generation',
    ],
    functions: {
      generateProductionPackage: 'Create package from approved content',
      generateSynthesizedPackage: 'Synthesized multi-source package',
      generateVoicePackage: 'TTS generation from package script',
      buildResearchProduction: 'Full Research PP build',
      buildNewsProduction: 'Full News PP build',
    },
    entities: ['ProductionPackage', 'VoicePackage', 'ProductionModule'],
  },

  apd: {
    key: 'apd',
    name: 'APD Department',
    role: 'Presentation Assembly',
    description: 'Slide generation, presentation assembly, and visual production.',
    icon: 'Presentation',
    color: 'orange',
    pocStages: [6, 7],
    responsibilities: [
      'Generate presentation slides from ProductionPackages',
      'Create visual scenes (AI image generation, graphics)',
      'Assemble StoriesPresentations from slides',
      'Manage slide transitions and timing',
      'Generate presentation timelines',
    ],
    functions: {
      createAPDReadyPackage: 'Prepare package for APD',
      generateStoriesPresentation: 'Assemble full presentation',
      generateNewsPresentation: 'News-specific presentation',
      generatePresentationTimeline: 'Timeline/rundown generation',
      generateSpiritualVoiceovers: 'Spiritual module voiceovers',
      sharePresentation: 'Share/export presentation',
    },
    entities: ['StoriesPresentation', 'StorySlide', 'PresentationScene'],
  },
};

/**
 * Determine which department handles a given POC stage.
 */
export function getDepartmentForStage(stage) {
  for (const dept of Object.values(DEPARTMENTS)) {
    if (dept.pocStages.includes(stage)) return dept;
  }
  return null;
}

/**
 * Map producer intent keywords to departments.
 * Used by the Brain for deterministic intent classification (before AI escalation).
 */
export const INTENT_PATTERNS = [
  { patterns: ["get today's stories", 'find stories', 'fetch stories', 'gather stories'], department: 'sift', action: 'acquire' },
  { patterns: ['research this', 'dig into', 'investigate', 'deep dive on'], department: 'research', action: 'research' },
  { patterns: ['package', 'generate script', 'build package', 'create package'], department: 'manager', action: 'package' },
  { patterns: ['voiceover', 'read this', 'narrate', 'tts', 'voice package'], department: 'manager', action: 'voice' },
  { patterns: ['presentation', 'slides', 'build presentation', 'assemble'], department: 'apd', action: 'present' },
  { patterns: ['export', 'download', 'share'], department: null, action: 'export' },
];

/**
 * Classify producer intent deterministically.
 * Returns { department, action, confidence } or null if no match.
 */
export function classifyIntent(message) {
  if (!message) return null;
  const lower = message.toLowerCase();
  for (const rule of INTENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (lower.includes(pattern)) {
        return { department: rule.department, action: rule.action, confidence: 0.8 };
      }
    }
  }
  return null;
}