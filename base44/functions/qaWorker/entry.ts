import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * CREAPD QA Worker — PA-RUB Canonical Quality Evaluation
 *
 * Evaluates a production asset against the appropriate PA-RUB rubric
 * (PA-RUB-001 through PA-RUB-008), generates a standardized Quality Report
 * per the Required QA Output Schema (Section 10 of PA-RUB-001), and invokes
 * the Controller Decision Engine to determine the next workflow action.
 *
 * Pipeline:
 *   1. Receive asset reference + rubric ID
 *   2. Fetch asset content from the appropriate entity
 *   3. Build rubric-specific evaluation prompt with categories, weights, and triggers
 *   4. Invoke LLM with structured JSON schema matching the QA Output Schema
 *   5. Calculate weighted overall score (Section 6 of PA-RUB-001)
 *   6. Classify quality level (Section 7 of PA-RUB-001)
 *   7. Persist Quality Report
 *   8. Invoke Controller Decision Engine
 *   9. Return the Controller's decision
 */

// ── Canonical Rubric Definitions (mirrors src/lib/creapd/rubricDefinitions.js) ──

const MASTER_CATEGORIES = {
  accuracy: { label: 'Accuracy', weight: 0.15, description: 'Does the asset correctly represent the approved Research Dossier? Facts, names, dates, statistics, quotations, references.' },
  completeness: { label: 'Completeness', weight: 0.10, description: 'Does the asset contain everything required? Required fields, media, references, metadata.' },
  relevance: { label: 'Relevance', weight: 0.10, description: 'Does the asset contribute directly to the approved presentation objective?' },
  audience_fit: { label: 'Audience Fit', weight: 0.10, description: 'Is the asset appropriate for the intended audience? Complexity, terminology, tone, pacing.' },
  brand_consistency: { label: 'Brand Consistency', weight: 0.10, description: 'Does the asset ensure consistency with the active Show Profile? Tone, writing style, terminology, formatting.' },
  clarity: { label: 'Clarity', weight: 0.15, description: 'Does the asset communicate clearly? Easy to understand, organized logically, minimal ambiguity, clear hierarchy.' },
  technical_integrity: { label: 'Technical Integrity', weight: 0.15, description: 'Is the asset technically valid? No broken references, missing images, invalid formatting, corrupted metadata.' },
  accessibility: { label: 'Accessibility', weight: 0.15, description: 'Does the asset remain usable? Readable typography, caption support, color contrast, alt text, reading order.' },
};

const RUBRICS = {
  'PA-RUB-001': {
    name: 'Master Presentation Asset Rubric',
    assetType: 'ProductionPackage',
    inheritMaster: false,
    categories: MASTER_CATEGORIES,
    mission: 'Is this production-ready? Production-ready means accurate, complete, understandable, visually consistent, technically correct, aligned with producer objectives, and suitable for intended audience.',
    focus: 'Universal quality evaluation applied to every Presentation Asset before asset-specific evaluation. Establishes a common quality language across the entire platform.',
    triggers: ['overall_score_below_threshold', 'critical_category_failure', 'confidence_below_minimum', 'max_iterations_reached'],
  },
  'PA-RUB-002': {
    name: 'Presentation Point Rubric',
    assetType: 'ResearchPoint',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      single_concept: { label: 'Single Concept Integrity', weight: 0.15, description: 'Does this Point communicate one complete idea? Poor Points contain multiple unrelated concepts. Strong Points teach one concept exceptionally well.' },
      presentation_value: { label: 'Presentation Value', weight: 0.10, description: 'Would this Point improve the presentation? Information should be worth placing on its own slide. Avoid filler.' },
      story_flow: { label: 'Story Flow', weight: 0.10, description: 'Does this Point naturally connect to the previous and next Point? Points should contribute to a logical narrative.' },
      visual_potential: { label: 'Visual Potential', weight: 0.10, description: 'Can this Point be enhanced visually? Should naturally suggest images, charts, maps, timelines, animations, icons.' },
      narration_potential: { label: 'Narration Potential', weight: 0.10, description: 'Can the presenter comfortably explain this Point? Points should support natural spoken delivery. Avoid academic writing.' },
      information_density: { label: 'Information Density', weight: 0.10, description: 'Does this Point contain the appropriate amount of information? Too little feels empty, too much creates overloaded slides.' },
      educational_effectiveness: { label: 'Educational Effectiveness', weight: 0.15, description: 'After hearing this Point, what should the audience know? The learning objective should be immediately obvious.' },
    },
    mission: 'If this became a slide, would it teach exactly one important idea? A Point should never attempt to explain an entire topic. One Presentation Point equals one future StorySlide.',
    focus: 'Presentation Points are the semantic blueprint of the presentation. Each Point represents the complete informational intent of one future StorySlide.',
    triggers: ['multiple_concepts:Split into multiple Points', 'insufficient_evidence:Retrieve additional information from the Dossier', 'weak_visual_opportunity:Rewrite to emphasize visual communication', 'excessive_information:Divide into multiple Points', 'weak_narrative_connection:Reorder or rewrite'],
  },
  'PA-RUB-003': {
    name: 'StorySlide Rubric',
    assetType: 'StorySlide',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      visual_hierarchy: { label: 'Visual Hierarchy', weight: 0.12, description: 'Is the most important information immediately obvious? Evaluate eye movement, emphasis, spacing, alignment.' },
      text_density: { label: 'Text Density', weight: 0.10, description: 'Does the slide contain the appropriate amount of text? Avoid paragraphs. Prefer concise statements.' },
      visual_effectiveness: { label: 'Visual Effectiveness', weight: 0.12, description: 'Does the selected visual improve understanding? Evaluate relevance, quality, educational value, clarity. Decorative visuals should receive lower scores.' },
      layout_balance: { label: 'Layout Balance', weight: 0.10, description: 'Does the slide feel visually balanced? Evaluate whitespace, alignment, proportion, composition.' },
      information_hierarchy: { label: 'Information Hierarchy', weight: 0.10, description: 'Can the audience identify title, main idea, and supporting information within five seconds?' },
      narration_synchronization: { label: 'Narration Synchronization', weight: 0.10, description: 'Does the slide support the narration? Evaluate pacing, information order, timing. Slides should never force the presenter to skip important information.' },
      cognitive_load: { label: 'Cognitive Load', weight: 0.10, description: 'Can the audience comfortably process this slide? Avoid excessive text, unnecessary visuals, clutter, competing focal points.' },
      educational_impact: { label: 'Educational Impact', weight: 0.12, description: 'After viewing this slide, what should the audience understand? Every StorySlide should teach exactly one important idea.' },
    },
    mission: 'Can the audience understand the main idea within five seconds? Slides should support the presenter, not replace them. The presenter tells the story; the StorySlide reinforces it.',
    focus: 'A StorySlide is the visual representation of a Presentation Point. It must faithfully represent the Point — never introduce new facts, never omit critical facts.',
    triggers: ['excessive_text:Reduce text, increase visual communication', 'missing_visual:Generate image, chart, or diagram', 'poor_balance:Select alternative layout', 'weak_educational_value:Split into multiple StorySlides', 'runtime_conflict:Shorten narration or divide slide'],
  },
  'PA-RUB-004': {
    name: 'Script Rubric',
    assetType: 'PresentationScript',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      conversational_flow: { label: 'Conversational Flow', weight: 0.15, description: 'Does the script sound like natural speech? Avoid academic language, robot-like transitions, AI clichés ("As an AI...", "Let\'s dive into...", "It\'s important to note..."), overly formal wording.' },
      storytelling: { label: 'Storytelling', weight: 0.10, description: 'Does the script maintain audience interest? Evaluate curiosity, momentum, transitions, examples, emotional engagement.' },
      speaker_confidence: { label: 'Speaker Confidence', weight: 0.10, description: 'Can a presenter comfortably deliver this script? Evaluate sentence rhythm, breathing points, natural emphasis, pronunciation difficulty.' },
      runtime_accuracy: { label: 'Runtime Accuracy', weight: 0.12, description: 'Can this section realistically be delivered within the target runtime? Evaluate word count, speaking pace, pause opportunities.' },
      slide_synchronization: { label: 'Slide Synchronization', weight: 0.10, description: 'Does the narration match the active StorySlide? The presenter should never describe visuals that are not visible. Important visuals should never appear without explanation.' },
      audience_engagement: { label: 'Audience Engagement', weight: 0.10, description: 'Does the script encourage attention? Evaluate questions, examples, analogies, stories, comparisons, transitions.' },
      information_progression: { label: 'Information Progression', weight: 0.10, description: 'Does the script gradually build understanding? Avoid jumping between unrelated ideas.' },
      call_to_action: { label: 'Call-to-Action Quality', weight: 0.08, description: 'When applicable: Does the script conclude appropriately? Evaluate closing statements, summary, next steps, discussion prompts, reflection.' },
    },
    mission: 'If the presenter read this naturally, would the audience remain engaged, informed, and confident in the material? Scripts should sound conversational, never like academic papers or AI-generated text.',
    focus: 'Scripts should be written for speech, not reading. They should sound natural, flow smoothly, avoid unnecessary complexity, avoid repetitive wording, and encourage eye contact rather than constant reading.',
    triggers: ['ai_language_detected:Rewrite naturally — detect "As an AI...", "Let\'s dive into...", "It\'s important to note...", generic filler', 'poor_timing:Condense wording', 'weak_transitions:Improve narrative flow', 'redundant_information:Merge or remove', 'slide_mismatch:Synchronize with StorySlide content'],
  },
  'PA-RUB-005': {
    name: 'Image Rubric',
    assetType: 'ImageAsset',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      educational_value: { label: 'Educational Value', weight: 0.15, description: 'Does the image teach something? Illustrates a process, explains a relationship, clarifies a comparison, shows geography, visualizes statistics. Higher educational value receives higher scores.' },
      prompt_fidelity: { label: 'Prompt Fidelity', weight: 0.12, description: 'Did the image accurately follow the approved prompt? Evaluate subject, style, composition, objects, relationships, mood, perspective.' },
      topic_relevance: { label: 'Topic Relevance', weight: 0.12, description: 'Does the image directly support the Presentation Point? Images unrelated to the current slide should receive lower scores.' },
      visual_clarity: { label: 'Visual Clarity', weight: 0.10, description: 'Can the audience immediately understand the image? Evaluate composition, focus, lighting, contrast, visual noise, readability.' },
      professional_quality: { label: 'Professional Quality', weight: 0.10, description: 'Does the image appear production ready? Evaluate resolution, rendering quality, sharpness, consistency, artifacts, distortion, image defects.' },
      presentation_suitability: { label: 'Presentation Suitability', weight: 0.10, description: 'Would this image work well on a presentation slide? Evaluate negative space, cropping, text placement, visual balance.' },
      copyright_risk: { label: 'Copyright Risk', weight: 0.10, description: 'Does the image present potential copyright concerns? Evaluate watermarks, logos, recognizable copyrighted material, licensing concerns. 100 = no risk.' },
    },
    mission: 'Does this image improve the audience\'s understanding of the Presentation Point? If the answer is no, the image should be replaced.',
    focus: 'Images are educational assets. They should communicate, not decorate. Beautiful images with little educational value should receive lower scores than simpler images that explain a concept effectively.',
    triggers: ['low_resolution:Regenerate at higher resolution', 'prompt_failure:Regenerate with corrected prompt', 'ai_artifacts:Regenerate — detect extra fingers, distorted faces, broken text, impossible geometry', 'weak_educational_value:Replace with more educational image', 'poor_composition:Regenerate with improved framing', 'copyright_concerns:Regenerate to avoid infringement'],
  },
  'PA-RUB-006': {
    name: 'Voice Rubric',
    assetType: 'VoicePackage',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      pronunciation_accuracy: { label: 'Pronunciation Accuracy', weight: 0.15, description: 'Are names pronounced correctly? Locations? Technical terms? Abbreviations handled correctly?' },
      natural_delivery: { label: 'Natural Delivery', weight: 0.15, description: 'Does the narration sound human? Does it avoid robotic pacing? Does emphasis occur naturally? Does speech rhythm resemble real conversation?' },
      emotional_alignment: { label: 'Emotional Alignment', weight: 0.10, description: 'Does the emotion match the subject? Breaking News, Educational, Inspirational, Historical, Comedy, Serious Discussion. Emotion should support—not overpower—content.' },
      pacing: { label: 'Pacing', weight: 0.12, description: 'Is the narration too fast? Too slow? Does it provide time for visuals? Does it allow audience processing? Recommended: 140-170 WPM unless overridden.' },
      vocal_emphasis: { label: 'Vocal Emphasis', weight: 0.10, description: 'Evaluate keyword emphasis, sentence stress, natural pauses, inflection, variation.' },
      narration_synchronization: { label: 'Narration Synchronization', weight: 0.10, description: 'Does narration match StorySlide timing? Do visual reveals occur at appropriate moments? Do transitions occur naturally?' },
      audience_engagement: { label: 'Audience Engagement', weight: 0.10, description: 'Would the audience remain interested? Does the narration vary naturally? Does it avoid monotony?' },
      presentation_confidence: { label: 'Presentation Confidence', weight: 0.08, description: 'Does the speaker sound informed? Does the narration inspire confidence? Does delivery match the intended authority level?' },
    },
    mission: 'Would this narration sound like a confident, knowledgeable presenter speaking naturally to an audience? Voice should never sound robotic or like text being read aloud.',
    focus: 'The purpose of narration is to tell the story behind the presentation, not to read slides. Voice should guide the audience naturally while complementing StorySlides.',
    triggers: ['pronunciation_errors:Regenerate with corrected pronunciation', 'emotion_mismatched:Regenerate with adjusted emotion profile', 'runtime_exceeds_target:Regenerate with adjusted pacing', 'robotic_speech:Regenerate with more natural delivery', 'long_pauses:Regenerate with adjusted pause timing', 'poor_synchronization:Regenerate with corrected timing', 'monotone_delivery:Regenerate with more variation'],
  },
  'PA-RUB-007': {
    name: 'Video Rubric',
    assetType: 'VideoAsset',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      educational_value: { label: 'Educational Value', weight: 0.15, description: 'Does the video improve understanding? Does motion communicate something meaningful? Would removing the video reduce audience comprehension? Videos should educate before they entertain.' },
      prompt_fidelity: { label: 'Prompt Fidelity', weight: 0.12, description: 'Does the generated video accurately represent the approved prompt? Evaluate subject, movement, environment, perspective, objects, sequence, timing.' },
      story_relevance: { label: 'Story Relevance', weight: 0.12, description: 'Does the video directly support the active Presentation Point? Videos that introduce unrelated information should receive lower scores.' },
      motion_quality: { label: 'Motion Quality', weight: 0.10, description: 'Is motion smooth? Is movement believable? Are transitions natural? Does motion direct audience attention appropriately?' },
      narration_synchronization: { label: 'Narration Synchronization', weight: 0.10, description: 'Does narration align with visual events? Do animations occur when discussed? Do reveals happen at the correct moment?' },
      runtime_efficiency: { label: 'Runtime Efficiency', weight: 0.10, description: 'Is the video too long? Too short? Does it remain on screen longer than necessary? Every second of video should provide value.' },
      presentation_compatibility: { label: 'Presentation Compatibility', weight: 0.08, description: 'Does the video fit naturally within a presentation? Evaluate cropping, margins, text placement, overlay compatibility, slide layout compatibility.' },
      professional_quality: { label: 'Professional Quality', weight: 0.08, description: 'Evaluate resolution, compression, rendering artifacts, lighting, color consistency, frame stability, motion quality.' },
      copyright_licensing: { label: 'Copyright & Licensing', weight: 0.10, description: 'Can this video legally be used? Evaluate ownership, stock licensing, generated content, brand conflicts, logos, protected material. 100 = no risk.' },
    },
    mission: 'Does this video improve the audience\'s understanding of the Presentation Point better than a static image could? If a still image communicates the same information more effectively, a video should not be used.',
    focus: 'Video is the highest-impact visual asset. Unlike static images, video introduces movement, timing, emotion, and progression. Video should never be inserted simply because motion looks appealing.',
    triggers: ['unnatural_motion:Regenerate with improved motion', 'low_prompt_fidelity:Regenerate with corrected prompt', 'low_resolution:Regenerate at higher resolution', 'narration_timing_conflict:Regenerate with corrected timing', 'runtime_exceeds_target:Trim or regenerate', 'visual_artifacts:Regenerate', 'copyright_risks:Regenerate to avoid infringement', 'insufficient_educational_value:Replace with more educational video'],
  },
  'PA-RUB-008': {
    name: 'Layout Rubric',
    assetType: 'Layout',
    inheritMaster: true,
    categories: {
      ...MASTER_CATEGORIES,
      visual_hierarchy: { label: 'Visual Hierarchy', weight: 0.12, description: 'Can the audience immediately identify title, primary message, supporting visual, and supporting information within five seconds? Visual hierarchy should guide attention naturally.' },
      information_organization: { label: 'Information Organization', weight: 0.10, description: 'Is the information grouped logically? Does the organization reduce confusion? Are related elements visually connected?' },
      balance: { label: 'Balance', weight: 0.10, description: 'Does the slide feel balanced? Evaluate whitespace, symmetry, weight distribution, image placement, text placement.' },
      eye_flow: { label: 'Eye Flow', weight: 0.10, description: 'Does the layout naturally guide the audience\'s eyes? The expected reading path should be predictable and effortless.' },
      content_density: { label: 'Content Density', weight: 0.10, description: 'Is there too much information? Too little? Is spacing appropriate? The layout should breathe. Crowded layouts reduce comprehension.' },
      media_placement: { label: 'Media Placement', weight: 0.08, description: 'Are images placed where they support understanding? Do charts receive sufficient emphasis? Does media compete with text? Media should reinforce—not overwhelm—the message.' },
      typography_integration: { label: 'Typography Integration', weight: 0.08, description: 'Are typography choices appropriate? Evaluate headline placement, body text, hierarchy, spacing, readability, alignment.' },
      responsive_adaptability: { label: 'Responsive Adaptability', weight: 0.08, description: 'Can the layout adapt to desktop, laptop, tablet, mobile, large displays, projectors? Should maintain communication effectiveness across supported formats.' },
      presentation_cohesion: { label: 'Presentation Cohesion', weight: 0.08, description: 'Does this layout visually belong with the rest of the presentation? Transitions between layouts should feel intentional.' },
    },
    mission: 'Does this arrangement communicate the Presentation Point in the clearest and most effective way possible? The objective is visual communication, not visual beauty.',
    focus: 'A layout is the structural framework that organizes presentation content. Layouts do not create content — they determine how content is visually arranged to maximize communication, comprehension, and audience engagement.',
    triggers: ['poor_hierarchy:Reorganize visual emphasis', 'crowded_composition:Increase whitespace, select alternative layout, or split content', 'weak_eye_flow:Adjust grid, reposition content', 'media_conflict:Resize or reposition media', 'responsive_failure:Generate responsive variation', 'accessibility_failure:Modify layout for contrast, font size, reading order'],
  },
};

// ── Quality Levels (Section 7) ───────────────────────────────────────────────

const QUALITY_LEVELS = {
  draft: 75,
  standard: 85,
  professional: 92,
  broadcast_ready: 97,
};

// ── Asset Fetchers ──────────────────────────────────────────────────────────

const ENTITY_MAP = {
  ResearchPoint: 'ResearchPoint',
  StorySlide: 'StorySlide',
  PresentationScript: 'ProductionPackage',
  ImageAsset: 'ImageAsset',
  VoicePackage: 'VoicePackage',
  VideoAsset: 'ImageAsset',
  Layout: 'StorySlide',
  ProductionPackage: 'ProductionPackage',
};

async function fetchAssetContent(base44, assetType, assetId) {
  const entityName = ENTITY_MAP[assetType];
  if (!entityName) return null;
  try {
    return await base44.asServiceRole.entities[entityName].get(assetId);
  } catch {
    return null;
  }
}

function extractAssetText(asset, assetType) {
  if (!asset) return 'Asset could not be retrieved from the database.';
  const parts = [];
  switch (assetType) {
    case 'ResearchPoint':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.content) parts.push(`Content: ${asset.content}`);
      if (asset.key_facts) parts.push(`Key Facts: ${asset.key_facts}`);
      if (asset.sources) parts.push(`Sources: ${asset.sources}`);
      if (asset.significance) parts.push(`Significance: ${asset.significance}`);
      break;
    case 'StorySlide':
      if (asset.slide_title) parts.push(`Slide Title: ${asset.slide_title}`);
      if (asset.text_elements) parts.push(`Text Elements: ${asset.text_elements}`);
      if (asset.image_elements) parts.push(`Image Elements: ${asset.image_elements}`);
      if (asset.ai_reasoning) parts.push(`AI Reasoning: ${asset.ai_reasoning}`);
      break;
    case 'PresentationScript':
      if (asset.script) parts.push(`Script: ${asset.script}`);
      if (asset.teleprompter_script) parts.push(`Teleprompter Script: ${asset.teleprompter_script}`);
      if (asset.talking_points) parts.push(`Talking Points: ${asset.talking_points}`);
      break;
    case 'ImageAsset':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.source_prompt) parts.push(`Prompt: ${asset.source_prompt}`);
      if (asset.image_url) parts.push(`Image URL: ${asset.image_url}`);
      if (asset.width) parts.push(`Dimensions: ${asset.width}x${asset.height}`);
      break;
    case 'VoicePackage':
      if (asset.teleprompter_script) parts.push(`Script: ${asset.teleprompter_script}`);
      if (asset.transcript) parts.push(`Transcript: ${asset.transcript}`);
      if (asset.runtime_stats) parts.push(`Runtime Stats: ${asset.runtime_stats}`);
      if (asset.total_duration_seconds) parts.push(`Duration: ${asset.total_duration_seconds}s`);
      break;
    case 'Layout':
      if (asset.slide_title) parts.push(`Slide Title: ${asset.slide_title}`);
      if (asset.text_elements) parts.push(`Text Elements: ${asset.text_elements}`);
      if (asset.image_elements) parts.push(`Image Elements: ${asset.image_elements}`);
      if (asset.animation_plan) parts.push(`Animation Plan: ${asset.animation_plan}`);
      break;
    case 'ProductionPackage':
      if (asset.title) parts.push(`Title: ${asset.title}`);
      if (asset.script) parts.push(`Script: ${asset.script}`);
      if (asset.talking_points) parts.push(`Talking Points: ${asset.talking_points}`);
      if (asset.summary) parts.push(`Summary: ${asset.summary}`);
      if (asset.teleprompter_script) parts.push(`Teleprompter Script: ${asset.teleprompter_script}`);
      break;
    default:
      parts.push(JSON.stringify(asset).slice(0, 3000));
  }
  return parts.join('\n\n');
}

// ── Weighted Score Calculator (Section 6 of PA-RUB-001) ──────────────────────

function calculateWeightedScore(scores, rubric) {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const [category, config] of Object.entries(rubric.categories)) {
    const score = scores[category];
    if (typeof score === 'number' && !isNaN(score)) {
      weightedSum += score * config.weight;
      totalWeight += config.weight;
    }
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ── Classification (Section 7) ───────────────────────────────────────────────

function classifyScore(score) {
  if (score >= 97) return 'broadcast_ready';
  if (score >= 92) return 'professional';
  if (score >= 85) return 'standard';
  if (score >= 75) return 'draft';
  if (score > 0) return 'needs_revision';
  return 'failed';
}

// ── Build Evaluation Prompt ─────────────────────────────────────────────────

function buildEvaluationPrompt(rubric, rubricId, assetType, assetId, assetText, qualityMode) {
  const categoryList = Object.entries(rubric.categories)
    .map(([key, config]) => `- ${key} (weight: ${config.weight}): ${config.description}`)
    .join('\n');

  const triggerList = rubric.triggers
    .map(t => {
      const [trigger, action] = t.includes(':') ? t.split(':') : [t, 'revise'];
      return `- ${trigger} → ${action}`;
    })
    .join('\n');

  const threshold = QUALITY_LEVELS[qualityMode] || 85;

  return `You are a CREAPD QA Worker evaluating a production asset against the ${rubric.name} (${rubricId}).

CANONICAL RULE: No AI Worker may evaluate its own work. Every quality score must be supported by measurable evaluation criteria. Assets should be revised automatically whenever practical before involving the producer.

MISSION:
${rubric.mission}

EVALUATION FOCUS:
${rubric.focus}

EVALUATION CATEGORIES (score each 0-100):
${categoryList}

WEIGHTED SCORING:
The Overall Quality Score is calculated using the weighted average of all evaluation categories.
Overall Quality = Σ(Category Score × Weight)

QUALITY MODE: ${qualityMode}
Threshold for ${qualityMode}: ${threshold}+
(Draft: 75+, Standard: 85+, Professional: 92+, Broadcast Ready: 97+)

QUALITY CLASSIFICATION:
- broadcast_ready: 97-100
- professional: 92-96
- standard: 85-91
- draft: 75-84
- needs_revision: 1-74
- failed: 0

AUTOMATIC REVISION TRIGGERS:
${triggerList}

SCORING RULES:
- Score each category independently and objectively.
- "accuracy" must be 95+ if the content is factually correct.
- "technical_integrity" must be 95+ if the asset meets technical specs.
- "copyright_risk" / "copyright_licensing" / "copyright_compliance" must be 100 if no copyright issues exist.
- "accessibility" must be 85+ if the asset meets accessibility standards (WCAG where applicable).
- "educational_value" must be 90+ if the asset clearly serves an educational purpose.
- "brand_consistency" must be 90+ if the asset aligns with brand guidelines.
- If a category does not apply to this asset, score it 100.
- Set revision_required=true if any score falls below the quality mode threshold or any critical category fails.
- Set confidence (0-100) to reflect your certainty in the evaluation.

Provide specific, actionable recommendations for any score below 95.
Recommendations should guide the assigned Worker on exactly what to fix.

ASSET TYPE: ${assetType}
ASSET ID: ${assetId}

ASSET CONTENT:
${assetText}

Return your evaluation as a structured JSON object matching the Required QA Output Schema (Section 10 of PA-RUB-001).`;
}

// ── Build JSON Schema for LLM Response ──────────────────────────────────────

function buildResponseSchema(rubric) {
  const scoresSchema = {};
  for (const [category] of Object.entries(rubric.categories)) {
    scoresSchema[category] = { type: 'number', description: `Score 0-100 for ${category}` };
  }

  return {
    type: 'object',
    properties: {
      overall_score: { type: 'number', description: 'Weighted aggregate quality score 0-100' },
      classification: {
        type: 'string',
        enum: ['draft', 'standard', 'professional', 'broadcast_ready', 'needs_revision', 'failed'],
        description: 'Quality classification label per Section 7',
      },
      scores: {
        type: 'object',
        properties: scoresSchema,
        description: 'Individual category scores 0-100',
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific, actionable recommendations for improvement — guide the assigned Worker on what to fix',
      },
      revision_required: { type: 'boolean', description: 'Whether revision is needed (true if any score below threshold or critical category fails)' },
      review_iteration: { type: 'number', description: 'Current revision iteration count' },
      confidence: { type: 'number', description: 'QA Worker certainty in the evaluation 0-100' },
      reasoning: { type: 'string', description: 'Brief explanation of the evaluation rationale' },
    },
    required: ['overall_score', 'classification', 'scores', 'recommendations', 'revision_required', 'confidence'],
  };
}

// ── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      asset_id,
      asset_type,
      rubric_id,
      department,
      production_id,
      production_profile,
      quality_mode = 'standard',
      review_iteration = 1,
      maximum_iterations = 5,
    } = body;

    if (!asset_id || !asset_type || !rubric_id) {
      return Response.json({
        error: 'asset_id, asset_type, and rubric_id are required.',
      }, { status: 400 });
    }

    const rubric = RUBRICS[rubric_id];
    if (!rubric) {
      return Response.json({
        error: `Unknown rubric: ${rubric_id}. Valid: ${Object.keys(RUBRICS).join(', ')}`,
      }, { status: 400 });
    }

    // ── 1. Fetch asset content ──────────────────────────────────────────────
    const asset = await fetchAssetContent(base44, asset_type, asset_id);
    const assetText = extractAssetText(asset, asset_type);

    // ── 2. Build evaluation prompt ────────────────────────────────────────────
    const evaluationPrompt = buildEvaluationPrompt(rubric, rubric_id, asset_type, asset_id, assetText, quality_mode);

    // ── 3. Build JSON schema for LLM response ─────────────────────────────────
    const responseSchema = buildResponseSchema(rubric);

    // ── 4. Invoke LLM ────────────────────────────────────────────────────────
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: evaluationPrompt,
      response_json_schema: responseSchema,
      model: 'automatic',
    });

    const evaluation = llmResponse && typeof llmResponse === 'object' ? llmResponse : {};

    // ── 5. Calculate weighted overall score (Section 6) ──────────────────────
    const scores = evaluation.scores || {};
    const calculatedScore = calculateWeightedScore(scores, rubric);
    const llmScore = typeof evaluation.overall_score === 'number'
      ? evaluation.overall_score
      : typeof evaluation.overall_score === 'string'
        ? parseFloat(evaluation.overall_score) || 0
        : 0;
    // Use the calculated weighted score; fall back to LLM's score if calculation yields 0
    const overallScore = calculatedScore > 0 ? calculatedScore : llmScore;

    const confidenceScore = typeof evaluation.confidence === 'number'
      ? evaluation.confidence
      : typeof evaluation.confidence === 'string'
        ? parseFloat(evaluation.confidence) || 0
        : 0;

    // ── 6. Classify quality level (Section 7) ───────────────────────────────
    const classification = evaluation.classification || classifyScore(overallScore);

    // ── 7. Persist Quality Report (Section 10) ──────────────────────────────
    const qualityReport = await base44.asServiceRole.entities.QualityReport.create({
      asset_id,
      asset_type,
      rubric_id,
      department: department || 'Unassigned',
      overall_score: overallScore,
      classification,
      status: 'pending',
      scores: JSON.stringify(scores),
      recommendations: JSON.stringify(evaluation.recommendations || []),
      confidence: confidenceScore,
      revision_required: evaluation.revision_required || false,
      review_iteration,
      maximum_iterations,
      production_profile: production_profile || null,
      quality_mode,
      production_id: production_id || null,
      story_slide_id: asset_type === 'StorySlide' || asset_type === 'Layout' ? asset_id : null,
    });

    // ── 8. Invoke Controller Decision Engine ─────────────────────────────────
    const controllerResponse = await base44.asServiceRole.functions.invoke(
      'controllerDecisionEngine',
      {
        quality_report_id: qualityReport.id,
        report: {
          asset_id,
          asset_type,
          overall_score: overallScore,
          classification,
          status: 'pending',
          scores,
          recommendations: evaluation.recommendations || [],
          confidence: confidenceScore,
          revision_required: evaluation.revision_required || false,
          review_iteration,
          maximum_iterations,
          quality_mode,
        },
        department: department || 'Unassigned',
        production_id: production_id || null,
        production_profile: production_profile || null,
      }
    );

    const controllerDecision = controllerResponse.data || controllerResponse;

    // ── 9. Return combined result ────────────────────────────────────────────
    return Response.json({
      quality_report_id: qualityReport.id,
      rubric_id,
      asset_id,
      asset_type,
      evaluation: {
        overall_score: overallScore,
        classification,
        scores,
        recommendations: evaluation.recommendations,
        confidence: confidenceScore,
        revision_required: evaluation.revision_required,
        reasoning: evaluation.reasoning,
      },
      controller_decision: controllerDecision,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});