/**
 * CREAPD PA-RUB Canonical Rubric Definitions
 *
 * Defines all 8 rubrics from the PA-RUB Specification document with
 * their exact evaluation categories, weighted scoring, quality levels,
 * and automatic revision triggers.
 *
 * Each rubric inherits the Master Rubric (PA-RUB-001) categories
 * and adds its own specialized evaluation categories.
 */

// ── PA-RUB-001: Master Rubric Universal Categories ───────────────────────────

export const MASTER_RUBRIC_CATEGORIES = {
  accuracy: {
    label: 'Accuracy',
    weight: 0.15,
    description: 'Does the asset correctly represent the approved Research Dossier? Facts, names, dates, statistics, quotations, references.',
  },
  completeness: {
    label: 'Completeness',
    weight: 0.10,
    description: 'Does the asset contain everything required? Required fields, media, references, metadata.',
  },
  relevance: {
    label: 'Relevance',
    weight: 0.10,
    description: 'Does the asset contribute directly to the approved presentation objective?',
  },
  audience_fit: {
    label: 'Audience Fit',
    weight: 0.10,
    description: 'Is the asset appropriate for the intended audience? Complexity, terminology, tone, pacing.',
  },
  brand_consistency: {
    label: 'Brand Consistency',
    weight: 0.10,
    description: 'Does the asset ensure consistency with the active Show Profile? Tone, writing style, terminology, formatting.',
  },
  clarity: {
    label: 'Clarity',
    weight: 0.15,
    description: 'Does the asset communicate clearly? Easy to understand, organized logically, minimal ambiguity, clear hierarchy.',
  },
  technical_integrity: {
    label: 'Technical Integrity',
    weight: 0.15,
    description: 'Is the asset technically valid? No broken references, missing images, invalid formatting, corrupted metadata.',
  },
  accessibility: {
    label: 'Accessibility',
    weight: 0.15,
    description: 'Does the asset remain usable? Readable typography, caption support, color contrast, alt text, reading order.',
  },
};

// ── Quality Levels (Section 7) ──────────────────────────────────────────────

export const QUALITY_LEVELS = {
  draft: { label: 'Draft', minScore: 75 },
  standard: { label: 'Standard', minScore: 85 },
  professional: { label: 'Professional', minScore: 92 },
  broadcast_ready: { label: 'Broadcast Ready', minScore: 97 },
};

// ── Review Actions (Section 8) ──────────────────────────────────────────────

export const REVIEW_ACTIONS = {
  PASS: 'pass',
  REVISE: 'revise',
  ESCALATE: 'escalate',
  PRODUCER_REVIEW: 'producer_review',
};

// ── Revision Limits (Section 9) ─────────────────────────────────────────────

export const DEFAULT_MAX_ITERATIONS = 5;

// ── Full Rubric Definitions ─────────────────────────────────────────────────

export const RUBRIC_DEFINITIONS = {
  // ═══ PA-RUB-001: Master Presentation Asset Rubric ═══
  'PA-RUB-001': {
    name: 'Master Presentation Asset Rubric',
    appliesTo: 'All Presentation Assets',
    assetType: 'ProductionPackage',
    inheritMaster: false,
    categories: MASTER_RUBRIC_CATEGORIES,
    evaluationFocus: 'Universal quality evaluation applied to every Presentation Asset before asset-specific evaluation. Establishes a common quality language across the entire platform.',
    missionStatement: 'Is this production-ready? Production-ready means accurate, complete, understandable, visually consistent, technically correct, aligned with producer objectives, and suitable for intended audience.',
    revisionTriggers: [
      { trigger: 'overall_score_below_threshold', action: 'revise' },
      { trigger: 'critical_category_failure', action: 'revise' },
      { trigger: 'confidence_below_minimum', action: 'producer_review' },
      { trigger: 'max_iterations_reached', action: 'escalate' },
    ],
  },

  // ═══ PA-RUB-002: Presentation Point Rubric ═══
  'PA-RUB-002': {
    name: 'Presentation Point Rubric',
    appliesTo: 'Presentation Points',
    assetType: 'ResearchPoint',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      single_concept: {
        label: 'Single Concept Integrity',
        weight: 0.15,
        description: 'Does this Point communicate one complete idea? Poor Points contain multiple unrelated concepts. Strong Points teach one concept exceptionally well.',
      },
      presentation_value: {
        label: 'Presentation Value',
        weight: 0.10,
        description: 'Would this Point improve the presentation? Information should be worth placing on its own slide. Avoid filler.',
      },
      story_flow: {
        label: 'Story Flow',
        weight: 0.10,
        description: 'Does this Point naturally connect to the previous and next Point? Points should contribute to a logical narrative.',
      },
      visual_potential: {
        label: 'Visual Potential',
        weight: 0.10,
        description: 'Can this Point be enhanced visually? Should naturally suggest images, charts, maps, timelines, animations, icons.',
      },
      narration_potential: {
        label: 'Narration Potential',
        weight: 0.10,
        description: 'Can the presenter comfortably explain this Point? Points should support natural spoken delivery. Avoid academic writing.',
      },
      information_density: {
        label: 'Information Density',
        weight: 0.10,
        description: 'Does this Point contain the appropriate amount of information? Too little feels empty, too much creates overloaded slides.',
      },
      educational_effectiveness: {
        label: 'Educational Effectiveness',
        weight: 0.15,
        description: 'After hearing this Point, what should the audience know? The learning objective should be immediately obvious.',
      },
    },
    evaluationFocus: 'Presentation Points are the semantic blueprint — each Point represents the complete informational intent of one future StorySlide. One Presentation Point equals one future StorySlide.',
    missionStatement: 'If this became a slide, would it teach exactly one important idea?',
    revisionTriggers: [
      { trigger: 'multiple_concepts', action: 'Split into multiple Points', category: 'single_concept' },
      { trigger: 'insufficient_evidence', action: 'Retrieve additional information from the Dossier', category: 'completeness' },
      { trigger: 'weak_visual_opportunity', action: 'Rewrite to emphasize visual communication', category: 'visual_potential' },
      { trigger: 'excessive_information', action: 'Divide into multiple Points', category: 'information_density' },
      { trigger: 'weak_narrative_connection', action: 'Reorder or rewrite', category: 'story_flow' },
    ],
  },

  // ═══ PA-RUB-003: StorySlide Rubric ═══
  'PA-RUB-003': {
    name: 'StorySlide Rubric',
    appliesTo: 'StorySlides',
    assetType: 'StorySlide',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      visual_hierarchy: {
        label: 'Visual Hierarchy',
        weight: 0.12,
        description: 'Is the most important information immediately obvious? Evaluate eye movement, emphasis, spacing, alignment.',
      },
      text_density: {
        label: 'Text Density',
        weight: 0.10,
        description: 'Does the slide contain the appropriate amount of text? Avoid paragraphs. Prefer concise statements. Allow the presenter to provide detail verbally.',
      },
      visual_effectiveness: {
        label: 'Visual Effectiveness',
        weight: 0.12,
        description: 'Does the selected visual improve understanding? Evaluate relevance, quality, educational value, clarity. Decorative visuals should receive lower scores.',
      },
      layout_balance: {
        label: 'Layout Balance',
        weight: 0.10,
        description: 'Does the slide feel visually balanced? Evaluate whitespace, alignment, proportion, composition.',
      },
      information_hierarchy: {
        label: 'Information Hierarchy',
        weight: 0.10,
        description: 'Can the audience identify title, main idea, and supporting information within five seconds?',
      },
      narration_synchronization: {
        label: 'Narration Synchronization',
        weight: 0.10,
        description: 'Does the slide support the narration? Evaluate pacing, information order, timing. Slides should never force the presenter to skip important information.',
      },
      cognitive_load: {
        label: 'Cognitive Load',
        weight: 0.10,
        description: 'Can the audience comfortably process this slide? Avoid excessive text, unnecessary visuals, clutter, competing focal points.',
      },
      educational_impact: {
        label: 'Educational Impact',
        weight: 0.12,
        description: 'After viewing this slide, what should the audience understand? Every StorySlide should teach exactly one important idea.',
      },
    },
    evaluationFocus: 'A StorySlide is the visual representation of a Presentation Point. It exists to communicate one idea quickly, clearly, and visually. Slides should support the presenter, not replace them.',
    missionStatement: 'Can the audience understand the main idea within five seconds?',
    revisionTriggers: [
      { trigger: 'excessive_text', action: 'Reduce text, increase visual communication', category: 'text_density' },
      { trigger: 'missing_visual', action: 'Generate image, chart, or diagram', category: 'visual_effectiveness' },
      { trigger: 'poor_balance', action: 'Select alternative layout', category: 'layout_balance' },
      { trigger: 'weak_educational_value', action: 'Split into multiple StorySlides', category: 'educational_impact' },
      { trigger: 'runtime_conflict', action: 'Shorten narration or divide slide', category: 'narration_synchronization' },
    ],
  },

  // ═══ PA-RUB-004: Script Rubric ═══
  'PA-RUB-004': {
    name: 'Script Rubric',
    appliesTo: 'All Presentation Scripts',
    assetType: 'PresentationScript',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      conversational_flow: {
        label: 'Conversational Flow',
        weight: 0.15,
        description: 'Does the script sound like natural speech? Avoid academic language, robot-like transitions, AI clichés, overly formal wording.',
      },
      storytelling: {
        label: 'Storytelling',
        weight: 0.10,
        description: 'Does the script maintain audience interest? Evaluate curiosity, momentum, transitions, examples, emotional engagement.',
      },
      speaker_confidence: {
        label: 'Speaker Confidence',
        weight: 0.10,
        description: 'Can a presenter comfortably deliver this script? Evaluate sentence rhythm, breathing points, natural emphasis, pronunciation difficulty.',
      },
      runtime_accuracy: {
        label: 'Runtime Accuracy',
        weight: 0.12,
        description: 'Can this section realistically be delivered within the target runtime? Evaluate word count, speaking pace, pause opportunities.',
      },
      slide_synchronization: {
        label: 'Slide Synchronization',
        weight: 0.10,
        description: 'Does the narration match the active StorySlide? The presenter should never describe visuals that are not visible. Important visuals should never appear without explanation.',
      },
      audience_engagement: {
        label: 'Audience Engagement',
        weight: 0.10,
        description: 'Does the script encourage attention? Evaluate questions, examples, analogies, stories, comparisons, transitions.',
      },
      information_progression: {
        label: 'Information Progression',
        weight: 0.10,
        description: 'Does the script gradually build understanding? Avoid jumping between unrelated ideas.',
      },
      call_to_action: {
        label: 'Call-to-Action Quality',
        weight: 0.08,
        description: 'When applicable: Does the script conclude appropriately? Evaluate closing statements, summary, next steps, discussion prompts, reflection.',
      },
    },
    evaluationFocus: 'Scripts should be written for speech, not reading. They should sound conversational, never like academic papers or AI-generated text. Scripts complement StorySlides rather than duplicate them.',
    missionStatement: 'If the presenter read this naturally, would the audience remain engaged, informed, and confident in the material?',
    revisionTriggers: [
      { trigger: 'ai_language_detected', action: 'Rewrite naturally. Detect: "As an AI...", "Let\'s dive into...", "It\'s important to note...", generic filler', category: 'conversational_flow' },
      { trigger: 'poor_timing', action: 'Condense wording', category: 'runtime_accuracy' },
      { trigger: 'weak_transitions', action: 'Improve narrative flow', category: 'storytelling' },
      { trigger: 'redundant_information', action: 'Merge or remove', category: 'information_progression' },
      { trigger: 'slide_mismatch', action: 'Synchronize with StorySlide content', category: 'slide_synchronization' },
    ],
  },

  // ═══ PA-RUB-005: Image Rubric ═══
  'PA-RUB-005': {
    name: 'Image Rubric',
    appliesTo: 'Generated Images, Illustrations, Graphics, Icons, Diagrams, Maps, Charts, Infographics',
    assetType: 'ImageAsset',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      educational_value: {
        label: 'Educational Value',
        weight: 0.15,
        description: 'Does the image teach something? Illustrates a process, explains a relationship, clarifies a comparison, shows geography, visualizes statistics. Higher educational value receives higher scores.',
      },
      prompt_fidelity: {
        label: 'Prompt Fidelity',
        weight: 0.12,
        description: 'Did the image accurately follow the approved prompt? Evaluate subject, style, composition, objects, relationships, mood, perspective.',
      },
      topic_relevance: {
        label: 'Topic Relevance',
        weight: 0.12,
        description: 'Does the image directly support the Presentation Point? Images unrelated to the current slide should receive lower scores.',
      },
      visual_clarity: {
        label: 'Visual Clarity',
        weight: 0.10,
        description: 'Can the audience immediately understand the image? Evaluate composition, focus, lighting, contrast, visual noise, readability.',
      },
      professional_quality: {
        label: 'Professional Quality',
        weight: 0.10,
        description: 'Does the image appear production ready? Evaluate resolution, rendering quality, sharpness, consistency, artifacts, distortion, image defects.',
      },
      presentation_suitability: {
        label: 'Presentation Suitability',
        weight: 0.10,
        description: 'Would this image work well on a presentation slide? Evaluate negative space, cropping, text placement, visual balance.',
      },
      copyright_risk: {
        label: 'Copyright Risk',
        weight: 0.10,
        description: 'Does the image present potential copyright concerns? Evaluate watermarks, logos, recognizable copyrighted material, licensing concerns, potential infringement. 100 = no risk.',
      },
    },
    evaluationFocus: 'Images are educational assets. They should communicate, not decorate. Beautiful images with little educational value should receive lower scores than simpler images that explain a concept effectively.',
    missionStatement: 'Does this image improve the audience\'s understanding of the Presentation Point?',
    revisionTriggers: [
      { trigger: 'low_resolution', action: 'Regenerate at higher resolution', category: 'professional_quality' },
      { trigger: 'prompt_failure', action: 'Regenerate with corrected prompt', category: 'prompt_fidelity' },
      { trigger: 'ai_artifacts', action: 'Regenerate — detect extra fingers, distorted faces, broken text, impossible geometry, visual corruption', category: 'professional_quality' },
      { trigger: 'weak_educational_value', action: 'Replace with more educational image', category: 'educational_value' },
      { trigger: 'poor_composition', action: 'Regenerate with improved framing', category: 'visual_clarity' },
      { trigger: 'copyright_concerns', action: 'Regenerate to avoid infringement', category: 'copyright_risk' },
    ],
  },

  // ═══ PA-RUB-006: Voice Rubric ═══
  'PA-RUB-006': {
    name: 'Voice Rubric',
    appliesTo: 'Voiceovers, Narration, Speech Synthesis, Presenter Audio',
    assetType: 'VoicePackage',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      pronunciation_accuracy: {
        label: 'Pronunciation Accuracy',
        weight: 0.15,
        description: 'Are names pronounced correctly? Locations? Technical terms? Abbreviations handled correctly?',
      },
      natural_delivery: {
        label: 'Natural Delivery',
        weight: 0.15,
        description: 'Does the narration sound human? Does it avoid robotic pacing? Does emphasis occur naturally? Does speech rhythm resemble real conversation?',
      },
      emotional_alignment: {
        label: 'Emotional Alignment',
        weight: 0.10,
        description: 'Does the emotion match the subject? Breaking News, Educational, Inspirational, Historical, Comedy, Serious Discussion. Emotion should support—not overpower—content.',
      },
      pacing: {
        label: 'Pacing',
        weight: 0.12,
        description: 'Is the narration too fast? Too slow? Does it provide time for visuals? Does it allow audience processing? Recommended: 140-170 WPM unless overridden.',
      },
      vocal_emphasis: {
        label: 'Vocal Emphasis',
        weight: 0.10,
        description: 'Evaluate keyword emphasis, sentence stress, natural pauses, inflection, variation.',
      },
      narration_synchronization: {
        label: 'Narration Synchronization',
        weight: 0.10,
        description: 'Does narration match StorySlide timing? Do visual reveals occur at appropriate moments? Do transitions occur naturally?',
      },
      audience_engagement: {
        label: 'Audience Engagement',
        weight: 0.10,
        description: 'Would the audience remain interested? Does the narration vary naturally? Does it avoid monotony?',
      },
      presentation_confidence: {
        label: 'Presentation Confidence',
        weight: 0.08,
        description: 'Does the speaker sound informed? Does the narration inspire confidence? Does delivery match the intended authority level?',
      },
    },
    evaluationFocus: 'The purpose of narration is to tell the story behind the presentation, not to read slides. Voice should guide the audience naturally while complementing StorySlides. Should sound intentional, conversational, and engaging.',
    missionStatement: 'Would this narration sound like a confident, knowledgeable presenter speaking naturally to an audience?',
    revisionTriggers: [
      { trigger: 'pronunciation_errors', action: 'Regenerate with corrected pronunciation', category: 'pronunciation_accuracy' },
      { trigger: 'emotion_mismatched', action: 'Regenerate with adjusted emotion profile', category: 'emotional_alignment' },
      { trigger: 'runtime_exceeds_target', action: 'Regenerate with adjusted pacing', category: 'pacing' },
      { trigger: 'robotic_speech', action: 'Regenerate with more natural delivery', category: 'natural_delivery' },
      { trigger: 'long_pauses', action: 'Regenerate with adjusted pause timing', category: 'pacing' },
      { trigger: 'poor_synchronization', action: 'Regenerate with corrected timing', category: 'narration_synchronization' },
      { trigger: 'monotone_delivery', action: 'Regenerate with more variation', category: 'natural_delivery' },
    ],
  },

  // ═══ PA-RUB-007: Video Rubric ═══
  'PA-RUB-007': {
    name: 'Video Rubric',
    appliesTo: 'Generated Videos, Motion Graphics, B-Roll, Animations, Screen Recordings, Video Inserts',
    assetType: 'VideoAsset',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      educational_value: {
        label: 'Educational Value',
        weight: 0.15,
        description: 'Does the video improve understanding? Does motion communicate something meaningful? Would removing the video reduce audience comprehension? Videos should educate before they entertain.',
      },
      prompt_fidelity: {
        label: 'Prompt Fidelity',
        weight: 0.12,
        description: 'Does the generated video accurately represent the approved prompt? Evaluate subject, movement, environment, perspective, objects, sequence, timing.',
      },
      story_relevance: {
        label: 'Story Relevance',
        weight: 0.12,
        description: 'Does the video directly support the active Presentation Point? Videos that introduce unrelated information should receive lower scores.',
      },
      motion_quality: {
        label: 'Motion Quality',
        weight: 0.10,
        description: 'Is motion smooth? Is movement believable? Are transitions natural? Does motion direct audience attention appropriately?',
      },
      narration_synchronization: {
        label: 'Narration Synchronization',
        weight: 0.10,
        description: 'Does narration align with visual events? Do animations occur when discussed? Do reveals happen at the correct moment?',
      },
      runtime_efficiency: {
        label: 'Runtime Efficiency',
        weight: 0.10,
        description: 'Is the video too long? Too short? Does it remain on screen longer than necessary? Every second of video should provide value.',
      },
      presentation_compatibility: {
        label: 'Presentation Compatibility',
        weight: 0.08,
        description: 'Does the video fit naturally within a presentation? Evaluate cropping, margins, text placement, overlay compatibility, slide layout compatibility.',
      },
      professional_quality: {
        label: 'Professional Quality',
        weight: 0.08,
        description: 'Evaluate resolution, compression, rendering artifacts, lighting, color consistency, frame stability, motion quality.',
      },
      copyright_licensing: {
        label: 'Copyright & Licensing',
        weight: 0.10,
        description: 'Can this video legally be used? Evaluate ownership, stock licensing, generated content, brand conflicts, logos, protected material. 100 = no risk.',
      },
    },
    evaluationFocus: 'Video is the highest-impact visual asset. Unlike static images, video introduces movement, timing, emotion, and progression. Video should never be inserted simply because motion looks appealing. Every video should contribute directly to the educational objective.',
    missionStatement: 'Does this video improve the audience\'s understanding of the Presentation Point better than a static image could?',
    revisionTriggers: [
      { trigger: 'unnatural_motion', action: 'Regenerate with improved motion', category: 'motion_quality' },
      { trigger: 'low_prompt_fidelity', action: 'Regenerate with corrected prompt', category: 'prompt_fidelity' },
      { trigger: 'low_resolution', action: 'Regenerate at higher resolution', category: 'professional_quality' },
      { trigger: 'narration_timing_conflict', action: 'Regenerate with corrected timing', category: 'narration_synchronization' },
      { trigger: 'runtime_exceeds_target', action: 'Trim or regenerate', category: 'runtime_efficiency' },
      { trigger: 'visual_artifacts', action: 'Regenerate', category: 'professional_quality' },
      { trigger: 'copyright_risks', action: 'Regenerate to avoid infringement', category: 'copyright_licensing' },
      { trigger: 'insufficient_educational_value', action: 'Replace with more educational video', category: 'educational_value' },
    ],
  },

  // ═══ PA-RUB-008: Layout Rubric ═══
  'PA-RUB-008': {
    name: 'Layout Rubric',
    appliesTo: 'StorySlide Layouts, Presentation Templates, Content Placement, Visual Composition',
    assetType: 'Layout',
    inheritMaster: true,
    categories: {
      ...MASTER_RUBRIC_CATEGORIES,
      visual_hierarchy: {
        label: 'Visual Hierarchy',
        weight: 0.12,
        description: 'Can the audience immediately identify title, primary message, supporting visual, and supporting information within five seconds? Visual hierarchy should guide attention naturally.',
      },
      information_organization: {
        label: 'Information Organization',
        weight: 0.10,
        description: 'Is the information grouped logically? Does the organization reduce confusion? Are related elements visually connected?',
      },
      balance: {
        label: 'Balance',
        weight: 0.10,
        description: 'Does the slide feel balanced? Evaluate whitespace, symmetry, weight distribution, image placement, text placement.',
      },
      eye_flow: {
        label: 'Eye Flow',
        weight: 0.10,
        description: 'Does the layout naturally guide the audience\'s eyes? The expected reading path should be predictable and effortless.',
      },
      content_density: {
        label: 'Content Density',
        weight: 0.10,
        description: 'Is there too much information? Too little? Is spacing appropriate? The layout should breathe. Crowded layouts reduce comprehension.',
      },
      media_placement: {
        label: 'Media Placement',
        weight: 0.08,
        description: 'Are images placed where they support understanding? Do charts receive sufficient emphasis? Does media compete with text? Media should reinforce—not overwhelm—the message.',
      },
      typography_integration: {
        label: 'Typography Integration',
        weight: 0.08,
        description: 'Are typography choices appropriate? Evaluate headline placement, body text, hierarchy, spacing, readability, alignment. Typography should function as part of the layout—not independently.',
      },
      responsive_adaptability: {
        label: 'Responsive Adaptability',
        weight: 0.08,
        description: 'Can the layout adapt to desktop, laptop, tablet, mobile, large displays, projectors, interactive displays? Should maintain communication effectiveness across supported formats.',
      },
      presentation_cohesion: {
        label: 'Presentation Cohesion',
        weight: 0.08,
        description: 'Does this layout visually belong with the rest of the presentation? Transitions between layouts should feel intentional. Layouts should create rhythm without sacrificing consistency.',
      },
    },
    evaluationFocus: 'A layout is the structural framework that organizes presentation content. Layouts do not create content — they determine how content is visually arranged to maximize communication, comprehension, and audience engagement.',
    missionStatement: 'Does this arrangement communicate the Presentation Point in the clearest and most effective way possible?',
    revisionTriggers: [
      { trigger: 'poor_hierarchy', action: 'Reorganize visual emphasis', category: 'visual_hierarchy' },
      { trigger: 'crowded_composition', action: 'Increase whitespace, select alternative layout, or split into multiple StorySlides', category: 'content_density' },
      { trigger: 'weak_eye_flow', action: 'Adjust grid, reposition content', category: 'eye_flow' },
      { trigger: 'media_conflict', action: 'Resize or reposition media', category: 'media_placement' },
      { trigger: 'responsive_failure', action: 'Generate responsive variation', category: 'responsive_adaptability' },
      { trigger: 'accessibility_failure', action: 'Modify layout for contrast, font size, reading order', category: 'accessibility' },
    ],
  },
};

// ── Helper: Calculate weighted overall score ─────────────────────────────────

export function calculateWeightedScore(scores, rubricId) {
  const rubric = RUBRIC_DEFINITIONS[rubricId];
  if (!rubric) return 0;

  let totalWeight = 0;
  let weightedSum = 0;
  for (const [category, config] of Object.entries(rubric.categories)) {
    const score = scores[category];
    if (typeof score === 'number') {
      weightedSum += score * config.weight;
      totalWeight += config.weight;
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ── Helper: Determine quality classification from score ──────────────────────

export function classifyScore(score, qualityMode) {
  const threshold = QUALITY_LEVELS[qualityMode]?.minScore || 85;
  if (score >= 97) return 'broadcast_ready';
  if (score >= 92) return 'professional';
  if (score >= 85) return 'standard';
  if (score >= 75) return 'draft';
  if (score > 0) return 'needs_revision';
  return 'failed';
}

// ── Helper: Get rubric by asset type ─────────────────────────────────────────

export function getRubricForAssetType(assetType) {
  for (const [id, rubric] of Object.entries(RUBRIC_DEFINITIONS)) {
    if (rubric.assetType === assetType) return { id, ...rubric };
  }
  return null;
}

// ── Helper: Get all category labels for a rubric ─────────────────────────────

export function getRubricCategories(rubricId) {
  const rubric = RUBRIC_DEFINITIONS[rubricId];
  if (!rubric) return [];
  return Object.entries(rubric.categories).map(([key, config]) => ({
    key,
    label: config.label,
    weight: config.weight,
    description: config.description,
  }));
}