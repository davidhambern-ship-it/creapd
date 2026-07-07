/**
 * RPP-AI-001 — AI Worker Registry
 *
 * Canonical definition of all AI workers in the Research Production Profile.
 * Each worker has one clearly defined responsibility (Canonical Rule #3).
 * Workers are organized by department and assigned by capability, not vendor (Canonical Rule #10).
 *
 * Hierarchy: CREAPr Brain → Department Controllers → Generation Workers → Review Workers → QA Workers → Controller Approval
 */

// ── AI Model Strategy (Section 9) ───────────────────────────────────────────
// Workers are assigned by capability. Models are interchangeable.
// Controllers never depend on a specific AI vendor.

export const AI_CAPABILITIES = {
  reasoning: {
    label: 'Reasoning',
    description: 'Logical analysis, fact-checking, structured thinking',
    preferred_models: ['gpt_5_4', 'gpt_5_5', 'claude_sonnet_4_6'],
    fallback: 'gpt_5_mini',
  },
  deep_research: {
    label: 'Deep Research',
    description: 'Web search, source discovery, multi-perspective gathering',
    preferred_models: ['gemini_3_flash', 'gemini_3_1_pro'],
    fallback: 'gemini_3_flash',
  },
  long_form_writing: {
    label: 'Long-form Writing',
    description: 'Scripts, narration, detailed prose',
    preferred_models: ['claude_opus_4_6', 'claude_opus_4_7', 'claude_sonnet_4_6'],
    fallback: 'claude_sonnet_4_6',
  },
  creative_generation: {
    label: 'Creative Generation',
    description: 'Image prompts, visual concepts, design suggestions',
    preferred_models: ['gpt_5_mini', 'gemini_3_flash'],
    fallback: 'gpt_5_mini',
  },
  organization: {
    label: 'Organization & Synthesis',
    description: 'Structuring, categorizing, summarizing',
    preferred_models: ['claude_sonnet_4_6', 'gpt_5_4'],
    fallback: 'gpt_5_mini',
  },
  intent_mapping: {
    label: 'Intent Mapping',
    description: 'Interpreting producer requests, routing',
    preferred_models: ['gpt_5_mini', 'gemini_3_flash'],
    fallback: 'gpt_5_mini',
  },
  quality_assurance: {
    label: 'Quality Assurance',
    description: 'Rubric-based evaluation, scoring',
    preferred_models: ['claude_sonnet_4_6', 'gpt_5_4'],
    fallback: 'gpt_5_mini',
  },
};

// ── Worker Types ────────────────────────────────────────────────────────────

export const WORKER_TYPES = {
  GENERATION: 'generation',
  REVIEW: 'review',
  QA: 'qa',
};

// ── Department Workers (Sections 4-8) ────────────────────────────────────────

export const AI_WORKERS = [
  // ── Topics Department (Section 4) ──
  {
    id: 'topics_intent_mapper',
    name: 'Intent Mapping AI',
    department: 'topics',
    type: WORKER_TYPES.GENERATION,
    capability: 'intent_mapping',
    mission: 'Transform producer intent into a structured Research Assignment',
    responsibilities: [
      'Interpret producer requests',
      'Determine primary topic, supporting topics, categories',
      'Determine research scope and missing information',
      'Generate suggested categories and research paths',
      'Construct the Research Assignment',
    ],
    output: 'Research Assignment',
    requires_producer_approval: true,
  },

  // ── Research Department (Section 5) ──
  {
    id: 'research_fact',
    name: 'Fact Research Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'deep_research',
    mission: 'Collect verified factual information',
    responsibilities: ['Gather verified facts', 'Attribute sources', 'Flag unverified claims'],
    output: 'Verified facts with citations',
  },
  {
    id: 'research_historical',
    name: 'Historical Research Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'deep_research',
    mission: 'Build historical context, timelines, chronology',
    responsibilities: ['Construct timelines', 'Identify major events', 'Establish chronology'],
    output: 'Historical context and timeline',
  },
  {
    id: 'research_statistics',
    name: 'Statistics Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'deep_research',
    mission: 'Collect numerical data, reports, studies',
    responsibilities: ['Gather statistics', 'Verify data sources', 'Collect measurements and percentages'],
    output: 'Statistical data with sources',
  },
  {
    id: 'research_source_verification',
    name: 'Source Verification Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'reasoning',
    mission: 'Evaluate source credibility and trustworthiness',
    responsibilities: ['Assess source authority', 'Flag conflicting sources', 'Assign confidence scores'],
    output: 'Source credibility assessments',
  },
  {
    id: 'research_visual',
    name: 'Visual Research Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'deep_research',
    mission: 'Collect maps, images, charts, visual references',
    responsibilities: ['Gather visual references', 'Collect maps and diagrams', 'Identify charts'],
    output: 'Visual reference collection',
  },
  {
    id: 'research_debate',
    name: 'Debate Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'reasoning',
    mission: 'Identify areas of debate and contradictory viewpoints',
    responsibilities: ['Identify gray areas', 'Preserve contradictory viewpoints', 'Flag scholarly disagreement'],
    output: 'Debate analysis with preserved viewpoints',
  },
  {
    id: 'research_entity',
    name: 'Entity Worker',
    department: 'research',
    type: WORKER_TYPES.GENERATION,
    capability: 'reasoning',
    mission: 'Identify people, organizations, locations, products, events',
    responsibilities: ['Extract key entities', 'Map relationships', 'Identify technologies'],
    output: 'Entity registry',
  },

  // ── Dossier Department (Section 6) ──
  {
    id: 'dossier_organizer',
    name: 'Knowledge Organization AI',
    department: 'dossier',
    type: WORKER_TYPES.GENERATION,
    capability: 'organization',
    mission: 'Transform raw research into structured knowledge',
    responsibilities: [
      'Organize executive summary, background, timeline',
      'Structure key facts, people, organizations',
      'Compile statistics, verified sources, references',
      'Document areas of debate and open questions',
      'Assign confidence scores',
    ],
    output: 'Approved Research Dossier',
    requires_producer_approval: true,
  },

  // ── Develop Department (Section 7) ──
  {
    id: 'develop_planning',
    name: 'Presentation Planning Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'organization',
    mission: 'Create presentation structure (one Point = one future Slide)',
    responsibilities: [
      'Create presentation outline',
      'Generate presentation points',
      'Define story flow and section breaks',
      'Determine slide sequence',
    ],
    output: 'Presentation Points & Outline',
  },
  {
    id: 'develop_script',
    name: 'Script Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'long_form_writing',
    mission: 'Create all scripts and narration text',
    responsibilities: [
      'Write teleprompter script',
      'Write presentation script',
      'Create speaker notes and talking points',
      'Write story summaries and presenter notes',
    ],
    output: 'Scripts & Speaker Notes',
  },
  {
    id: 'develop_image',
    name: 'Image Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'creative_generation',
    mission: 'Create all visual assets',
    responsibilities: [
      'Generate image prompts',
      'Create illustrations and icons',
      'Design charts, infographics, diagrams',
      'Produce visual concepts',
    ],
    output: 'Image Assets & Prompts',
  },
  {
    id: 'develop_video',
    name: 'Video Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'creative_generation',
    mission: 'Create all video assets',
    responsibilities: [
      'Generate video prompts',
      'Suggest motion graphics',
      'Identify B-roll suggestions',
      'Produce video concepts',
    ],
    output: 'Video Assets & Prompts',
  },
  {
    id: 'develop_voice',
    name: 'Voice Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'long_form_writing',
    mission: 'Create narration scripts and voice packages',
    responsibilities: [
      'Write narration script',
      'Create voice package with timing',
      'Add pronunciation notes',
      'Suggest music and sound effects',
    ],
    output: 'Voice Package & Narration',
  },
  {
    id: 'develop_design',
    name: 'Presentation Design Worker',
    department: 'develop',
    type: WORKER_TYPES.GENERATION,
    capability: 'creative_generation',
    mission: 'Create layout and design recommendations',
    responsibilities: [
      'Recommend layouts and typography',
      'Suggest animations and transitions',
      'Define visual hierarchy',
      'Recommend color schemes',
    ],
    output: 'Layout & Design Metadata',
  },

  // ── Packet Department (Section 8) ──
  {
    id: 'packet_assembly',
    name: 'Presentation Assembly AI',
    department: 'packet',
    type: WORKER_TYPES.GENERATION,
    capability: 'organization',
    mission: 'Assemble the editable presentation (does not generate content)',
    responsibilities: [
      'Consume all presentation assets',
      'Create StorySlides from Presentation Points',
      'Populate slide content, media, narration, layouts',
      'Assemble the master StoriesPresentation',
    ],
    output: 'Production Packet (Editable StoriesPresentation)',
  },
  {
    id: 'packet_export',
    name: 'Export Worker',
    department: 'packet',
    type: WORKER_TYPES.GENERATION,
    capability: 'organization',
    mission: 'Produce disposable export files from the editable presentation',
    responsibilities: [
      'Export to PowerPoint, Google Slides, PDF, Video',
      'StoriesPresentation remains the authoritative source',
      'Exports are disposable',
    ],
    output: 'Export files (disposable)',
  },

  // ── Review Workers (Section 10) ──
  {
    id: 'review_general',
    name: 'Review Worker',
    department: 'all',
    type: WORKER_TYPES.REVIEW,
    capability: 'reasoning',
    mission: 'Critique generated assets before QA evaluation',
    responsibilities: [
      'Review generated assets for quality',
      'Identify issues and improvement areas',
      'No worker may approve its own work (Canonical Rule #9)',
    ],
    output: 'Review critique',
  },

  // ── QA Workers (Section 10) ──
  {
    id: 'qa_general',
    name: 'QA Worker',
    department: 'all',
    type: WORKER_TYPES.QA,
    capability: 'quality_assurance',
    mission: 'Evaluate assets using standardized rubrics (PA-RUB-001 through PA-RUB-008)',
    responsibilities: [
      'Score assets against rubrics',
      'Generate Quality Reports',
      'Flag revision requirements',
      'Assign confidence scores',
    ],
    output: 'Quality Report',
  },
];

// ── Quick Lookups ───────────────────────────────────────────────────────────

export function getWorkersByDepartment(department) {
  return AI_WORKERS.filter(w => w.department === department || w.department === 'all');
}

export function getWorkersByType(type) {
  return AI_WORKERS.filter(w => w.type === type);
}

export function getWorkerById(id) {
  return AI_WORKERS.find(w => w.id === id) || null;
}

export function getGenerationWorkers(department) {
  return AI_WORKERS.filter(w => w.department === department && w.type === WORKER_TYPES.GENERATION);
}

export function getReviewWorker() {
  return AI_WORKERS.find(w => w.id === 'review_general');
}

export function getQAWorker() {
  return AI_WORKERS.find(w => w.id === 'qa_general');
}

// ── Model Selection (Section 9) ─────────────────────────────────────────────

export function getModelForCapability(capability, preferredOverride) {
  const cap = AI_CAPABILITIES[capability];
  if (!cap) return 'gpt_5_mini';
  if (preferredOverride && cap.preferred_models.includes(preferredOverride)) {
    return preferredOverride;
  }
  return cap.preferred_models[0] || cap.fallback;
}

export function getModelForWorker(workerId, preferredOverride) {
  const worker = getWorkerById(workerId);
  if (!worker) return 'gpt_5_mini';
  return getModelForCapability(worker.capability, preferredOverride);
}

// ── QA Pipeline (Section 10) ────────────────────────────────────────────────
// Every Generation Worker must pass through: Review → QA → Quality Report → Controller

export const QA_PIPELINE_STAGES = [
  { stage: 1, name: 'Generation', worker_type: WORKER_TYPES.GENERATION, description: 'Worker generates the asset' },
  { stage: 2, name: 'Review', worker_type: WORKER_TYPES.REVIEW, description: 'Review Worker critiques the asset' },
  { stage: 3, name: 'QA Evaluation', worker_type: WORKER_TYPES.QA, description: 'QA Worker evaluates against rubrics' },
  { stage: 4, name: 'Quality Report', worker_type: null, description: 'Structured report with scores and recommendations' },
  { stage: 5, name: 'Controller Decision', worker_type: null, description: 'Controller Decision Engine determines: pass, revise, escalate, or producer_review' },
];

export function getPipelineForAsset(assetType) {
  // All assets go through the same pipeline regardless of type
  return QA_PIPELINE_STAGES;
}

// ── Department Worker Summary ──────────────────────────────────────────────

export const DEPARTMENT_WORKER_SUMMARY = [
  { department: 'topics', generation_workers: 1, review: true, qa: true },
  { department: 'research', generation_workers: 7, review: true, qa: true },
  { department: 'dossier', generation_workers: 1, review: true, qa: true },
  { department: 'develop', generation_workers: 6, review: true, qa: true },
  { department: 'packet', generation_workers: 2, review: true, qa: true },
];