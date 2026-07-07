/**
 * RPP-POC-001 — Research Production Profile: Process of Creation
 * Canonical Workflow Constants
 *
 * This module codifies the constitution-level specification for the Research
 * Production Profile's Process of Creation (POC). It defines the five
 * department transformations that take an idea from inception to a
 * production-ready presentation.
 *
 * Canonical Rule: Every department performs ONE transformation.
 * Each department builds upon the work of the previous department.
 * No department should perform another department's responsibilities.
 *
 * @see docs/RPP_POC-001_Specification.md
 */

// ── Department Chain (ordered) ──────────────────────────────────────────────

export const POC_DEPARTMENTS = [
  {
    id: 'topics',
    name: 'Topics Department',
    input: 'Producer Idea',
    output: 'Research Assignment',
    mission:
      'Transform an idea into a structured Research Assignment. CREAPr guides the producer through narrowing broad interests into a clearly defined research objective.',
    rule: 'The Topics Department never performs research. It determines what will be researched. Research must never begin until the producer approves the Research Assignment.',
    responsibilities: [
      'Interpret producer intent',
      'Ask clarifying questions only when necessary',
      'Generate intelligent research directions',
      'Suggest related categories',
      'Help define research boundaries',
      'Determine the scope of the research',
      'Identify missing context',
      'Refine objectives',
      'Build a structured Research Assignment',
      'Present the assignment for producer approval',
    ],
    entity: 'ResearchTopic',
  },
  {
    id: 'research',
    name: 'Research Department',
    input: 'Research Assignment',
    output: 'Raw Research Dataset',
    mission:
      'Acquire knowledge by executing the approved Research Assignment. Functions as an AI research office composed of multiple specialized research workers. Collects the highest quality information possible without organizing or interpreting it into production assets.',
    rule: 'Nothing produced by this department should be considered presentation-ready. Utilize multiple AI models whenever appropriate to increase coverage, identify conflicting information, and improve confidence.',
    responsibilities: [
      'Fact gathering and source verification',
      'Historical research and timeline construction',
      'Statistical research',
      'Expert opinions, important people, organizations',
      'Supporting documents, government publications, academic references',
      'Visual references, images, maps',
      'Areas of disagreement, contradictory viewpoints',
      'Open questions, emerging developments',
      'Reconcile conflicting findings while preserving areas of legitimate debate',
    ],
    entity: 'ResearchDossier',
  },
  {
    id: 'dossier',
    name: 'Dossier Department',
    input: 'Raw Research Dataset',
    output: 'Approved Research Dossier',
    mission:
      'Transform raw research into structured knowledge. Organize, validate, and present research in a format suitable for production. The Dossier becomes the authoritative knowledge source for the remainder of the Process of Creation.',
    rule: 'No downstream department should return to the raw research unless additional research has been requested. Once approved, the Dossier becomes the single source of truth for every downstream production activity.',
    responsibilities: [
      'Executive Summary',
      'Background',
      'Timeline',
      'Key Facts',
      'Important People',
      'Organizations',
      'Statistics',
      'Verified Sources',
      'References',
      'Supporting Documents',
      'Images',
      'Maps',
      'Areas of Debate',
      'Open Questions',
      'Related Topics',
      'Confidence Scores',
    ],
    entity: 'ResearchDossier',
  },
  {
    id: 'develop',
    name: 'Develop Department',
    input: 'Approved Research Dossier',
    output: 'Presentation Assets',
    mission:
      'Transform the approved Research Dossier into every production element required to construct a presentation. Does NOT create slides. Does NOT assemble presentations. Generates all individual components that will eventually be placed into slides.',
    rule: 'Every generated asset remains editable. Nothing is assembled into slides at this stage.',
    assetCategories: [
      {
        category: 'Presentation Structure',
        assets: [
          'Presentation Points',
          'Presentation Outline',
          'Slide Titles',
          'Section Breaks',
          'Story Flow',
        ],
      },
      {
        category: 'Scripts',
        assets: [
          'Teleprompter Script',
          'Long-form Presentation Script',
          'Speaker Notes',
          'Talking Points',
          'Story Summaries',
          'Presenter Notes',
        ],
      },
      {
        category: 'Visual Assets',
        assets: [
          'Image Prompts',
          'Generated Images',
          'Icons',
          'Infographics',
          'Charts',
          'Maps',
          'Diagrams',
          'Illustrations',
          'Lower Third Graphics',
          'Thumbnail Concepts',
        ],
      },
      {
        category: 'Video Assets',
        assets: [
          'Video Prompts',
          'Generated Video Concepts',
          'B-Roll Suggestions',
          'Motion Graphics Suggestions',
        ],
      },
      {
        category: 'Audio Assets',
        assets: [
          'Voice Package',
          'Narration Script',
          'Voiceovers',
          'Audio Timing',
          'Music Suggestions',
          'Sound Effect Suggestions',
        ],
      },
      {
        category: 'Presentation Metadata',
        assets: [
          'Suggested Layouts',
          'Animation Recommendations',
          'Transition Recommendations',
          'Runtime Estimates',
          'Reading Style',
          'Producer Notes',
        ],
      },
    ],
    entity: 'ResearchPoint',
  },
  {
    id: 'packet',
    name: 'Packet Department',
    input: 'Presentation Assets',
    output: 'Production Packet',
    mission:
      'Construct the final presentation. Consumes all production assets from the Develop Department. Does NOT generate content — its responsibility is assembly.',
    rule: 'The generated presentation must remain fully editable. Exports are generated only when requested. The exported file is never considered the authoritative source.',
    responsibilities: [
      'Construct the presentation',
      'Create individual StorySlide records',
      'Populate each slide using the corresponding Presentation Point',
      'Assign slide content, speaker notes, images, icons, charts, video references',
      'Assign voice timing, narration, layout template, animation & transition settings',
      'Generate slides in logical order per the approved Presentation Outline',
      'Create the master StoriesPresentation entity',
    ],
    packetContents: [
      'Editable StoriesPresentation',
      'StorySlide collection',
      'Approved Research Dossier',
      'Voice Package',
      'Scripts',
      'Images',
      'Videos',
      'Icons',
      'Supporting assets',
      'Export-ready presentation files (when requested)',
    ],
    entity: 'StoriesPresentation',
  },
];

// ── Quick lookups ───────────────────────────────────────────────────────────

export const POC_DEPARTMENT_IDS = POC_DEPARTMENTS.map((d) => d.id);

export function getPocDepartment(id) {
  return POC_DEPARTMENTS.find((d) => d.id === id) || null;
}

export function getPocDepartmentByOutput(output) {
  return POC_DEPARTMENTS.find((d) => d.output === output) || null;
}

export function getNextPocDepartment(id) {
  const idx = POC_DEPARTMENTS.findIndex((d) => d.id === id);
  if (idx < 0 || idx >= POC_DEPARTMENTS.length - 1) return null;
  return POC_DEPARTMENTS[idx + 1];
}

export function getPreviousPocDepartment(id) {
  const idx = POC_DEPARTMENTS.findIndex((d) => d.id === id);
  if (idx <= 0) return null;
  return POC_DEPARTMENTS[idx - 1];
}

// ── Canonical transformation summary ────────────────────────────────────────

export const POC_TRANSFORMATION_SUMMARY = POC_DEPARTMENTS.map((d) => ({
  department: d.name,
  input: d.input,
  output: d.output,
}));

// ── Canonical Rules ─────────────────────────────────────────────────────────

export const POC_CANONICAL_RULES = [
  'Every department performs one transformation.',
  'Topics transforms ideas into Research Assignments.',
  'Research transforms Research Assignments into Raw Research.',
  'Dossier transforms Raw Research into structured knowledge.',
  'Develop transforms structured knowledge into production assets.',
  'Packet transforms production assets into a fully editable presentation.',
  'Each department builds upon the work of the previous department.',
  'No department should perform another department\'s responsibilities.',
  'This separation ensures modularity, maintainability, and independent improvement.',
];