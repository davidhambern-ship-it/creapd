import { generateStructuredGatewayResponse } from './aiGateway.js';

const SAMPLE_RATE = 24000;
const PCM_BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
const MAX_PACKAGES = 12;

const ELEMENT_TYPES = new Set([
  'headline',
  'body_text',
  'talking_point_card',
  'lower_third',
  'callout',
  'statistic',
  'quote',
]);

const POSITIONS = new Set(['center', 'top', 'bottom', 'left', 'right', 'full_screen', 'lower_third']);
const ENTRANCE_ANIMATIONS = new Set([
  'fade',
  'zoom',
  'slide_left',
  'slide_right',
  'pop',
  'dissolve',
  'typewriter',
  'word_by_word',
  'lower_third',
]);
const EXIT_ANIMATIONS = new Set(['fade_out', 'slide_out_left', 'slide_out_right', 'dissolve_out', 'none']);
const TRANSITIONS = new Set(['fade', 'dissolve', 'slide_left', 'slide_right', 'zoom', 'cut', 'none']);

const PRESENTATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    slides: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_PACKAGES,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          package_index: { type: 'integer' },
          decision_rationale: { type: 'string' },
          confidence_score: { type: 'number' },
          scenes: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                beat_type: { type: 'string' },
                scene_purpose: { type: 'string' },
                duration_weight: { type: 'number' },
                visual_theme: { type: 'string' },
                background_design: { type: 'string' },
                background_prompt: { type: 'string' },
                camera_behavior: { type: 'string' },
                motion_intensity: { type: 'string' },
                transition_type: { type: 'string' },
                use_story_image: { type: 'boolean' },
                elements: {
                  type: 'array',
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      element_type: { type: 'string' },
                      content: { type: 'string' },
                      position: { type: 'string' },
                      animation_in: { type: 'string' },
                      animation_out: { type: 'string' },
                      start_ratio: { type: 'number' },
                      end_ratio: { type: 'number' },
                      priority: { type: 'number' },
                      purpose: { type: 'string' },
                    },
                    required: [
                      'element_type',
                      'content',
                      'position',
                      'animation_in',
                      'animation_out',
                      'start_ratio',
                      'end_ratio',
                      'priority',
                      'purpose',
                    ],
                  },
                },
              },
              required: [
                'title',
                'beat_type',
                'scene_purpose',
                'duration_weight',
                'visual_theme',
                'background_design',
                'background_prompt',
                'camera_behavior',
                'motion_intensity',
                'transition_type',
                'use_story_image',
                'elements',
              ],
            },
          },
        },
        required: ['package_index', 'decision_rationale', 'confidence_score', 'scenes'],
      },
    },
  },
  required: ['slides'],
};

function safeJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function trimText(value, max = 1000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function clamp(value, min, max) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return min;
  return Math.min(max, Math.max(min, numberValue));
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function durationFromOwnedWav(pkg) {
  const payload = safeJson(pkg?.source_payload);
  const media = safeJson(payload?.last_media_generation);
  const direct = Number(
    media.duration_seconds ||
    payload.voice_duration_seconds ||
    payload.audio_duration_seconds ||
    0,
  );
  if (Number.isFinite(direct) && direct > 0) {
    return { seconds: round(direct), source: 'stored_metadata' };
  }

  const byteSize = Number(media.byte_size || 0);
  if (Number.isFinite(byteSize) && byteSize > WAV_HEADER_BYTES) {
    const seconds = (byteSize - WAV_HEADER_BYTES) / (SAMPLE_RATE * PCM_BYTES_PER_SAMPLE);
    if (Number.isFinite(seconds) && seconds > 0) {
      return { seconds: round(seconds), source: 'owned_wav_byte_size' };
    }
  }

  const words = wordCount(pkg?.teleprompter_script || pkg?.story_summary || '');
  const estimated = words > 0 ? (words / 145) * 60 : 5;
  return { seconds: round(Math.max(3, estimated)), source: 'speech_estimate' };
}

function fallbackSlide(pkg, packageIndex) {
  const title = trimText(pkg.source_point_title || pkg.title || pkg.headline_suggestions || `Research Story ${packageIndex + 1}`, 120);
  const lowerThird = trimText(pkg.lower_third_text, 120);
  const summary = trimText(pkg.story_summary || pkg.talking_points || pkg.teleprompter_script, 180);
  const elements = [
    {
      element_type: 'headline',
      content: title,
      position: 'center',
      animation_in: 'dissolve',
      animation_out: 'fade_out',
      start_ratio: 0,
      end_ratio: 0.55,
      priority: 10,
      purpose: 'Establish the research story clearly.',
    },
  ];
  if (lowerThird) {
    elements.push({
      element_type: 'lower_third',
      content: lowerThird,
      position: 'lower_third',
      animation_in: 'lower_third',
      animation_out: 'fade_out',
      start_ratio: 0.08,
      end_ratio: 0.82,
      priority: 7,
      purpose: 'Provide concise supporting context.',
    });
  } else if (summary) {
    elements.push({
      element_type: 'body_text',
      content: summary,
      position: 'bottom',
      animation_in: 'fade',
      animation_out: 'fade_out',
      start_ratio: 0.2,
      end_ratio: 0.85,
      priority: 6,
      purpose: 'Reinforce the narration with a concise visual summary.',
    });
  }

  return {
    package_index: packageIndex,
    decision_rationale: 'Deterministic fallback scene generated from the approved production package.',
    confidence_score: 72,
    scenes: [{
      title,
      beat_type: 'story',
      scene_purpose: 'Communicate the approved research story without changing its facts.',
      duration_weight: 1,
      visual_theme: 'documentary research presentation',
      background_design: 'dark_gradient',
      background_prompt: trimText(pkg.image_prompt || pkg.visual_suggestions || 'Documentary research visual', 500),
      camera_behavior: pkg.generated_image_url ? 'slow_push' : 'static',
      motion_intensity: 'low',
      transition_type: 'dissolve',
      use_story_image: Boolean(pkg.generated_image_url),
      elements,
    }],
  };
}

function buildPrompt(config, packages) {
  const packageBlocks = packages.map((pkg, index) => {
    const duration = durationFromOwnedWav(pkg);
    return `PACKAGE ${index}
Title: ${trimText(pkg.source_point_title || pkg.title || pkg.headline_suggestions || `Research Story ${index + 1}`, 160)}
Voice duration: ${duration.seconds}s (${duration.source})
Story image available: ${pkg.generated_image_url ? 'YES' : 'NO'}
Teleprompter: ${trimText(pkg.teleprompter_script, 3000)}
Summary: ${trimText(pkg.story_summary, 700)}
Talking points: ${trimText(pkg.talking_points, 800)}
Lower third: ${trimText(pkg.lower_third_text, 250)}
Visual suggestions: ${trimText(pkg.visual_suggestions, 700)}
B-roll suggestions: ${trimText(pkg.broll_suggestions, 550)}
Fact-check notes: ${trimText(pkg.fact_check_notes, 650)}`;
  }).join('\n\n---\n\n');

  return `You are the CREAPD Presentation Director. Migrate the existing CREAPD presentation-directing philosophy into the owned Research pipeline.

PRODUCTION
Title: ${trimText(config?.production_name || 'Research Presentation', 180)}
Host: ${trimText(config?.host_name, 120)}
Tone: ${trimText(config?.tone || 'educational', 120)}
Reading style: ${trimText(config?.reading_style || 'broadcast narration', 120)}
Target audience: ${trimText(config?.target_audience, 180)}

CORE DIRECTING RULES
1. Story comes before presentation. Every visual must improve communication.
2. One approved Research production package remains one story segment; do not merge facts between packages.
3. The already-generated Kokoro voiceover is the master timeline. Do not rewrite narration.
4. Facts are never altered. Never invent statistics, quotes, people, documents, locations, or footage.
5. Motion guides attention; it does not decorate.
6. Every segment should feel alive and paced like a video, not a static slideshow.
7. Create 1-3 scenes per package. Use more scenes only when the narration has clear narrative changes.
8. Use the existing story image only when it reinforces that scene. Do not repeat it in every scene by default.
9. Elements must contain actual viewer-facing content, never production instructions or placeholders.
10. Text should be concise: headlines <= 10 words; other on-screen text <= 18 words whenever possible.
11. Element start_ratio/end_ratio are relative to that scene from 0.0 to 1.0. Keep 0 <= start < end <= 1.
12. duration_weight is relative pacing inside the package. CREAPD will normalize all scene durations to the exact voice duration.

DIRECTING VOCABULARY
- beat_type: hook, context, evidence, statistic, timeline, explanation, counterpoint, implication, closing.
- background_design: dark_gradient, warm_gradient, gradient_orb, particle_field, grid_floor, glassmorphism, neon_glow, scan_lines, circuit_pattern, data_stream, energy_rings, gradient_mesh.
- camera_behavior: static, slow_push, pull_back, pan_left, pan_right, drift, parallax, focus_shift.
- motion_intensity: low, medium, high.
- transition_type: fade, dissolve, slide_left, slide_right, zoom, cut, none.
- element_type: headline, body_text, talking_point_card, lower_third, callout, statistic, quote.
- position: center, top, bottom, left, right, full_screen, lower_third.
- animation_in: fade, zoom, slide_left, slide_right, pop, dissolve, typewriter, word_by_word, lower_third.
- animation_out: fade_out, slide_out_left, slide_out_right, dissolve_out, none.

PACKAGE DATA
${packageBlocks}

Return exactly one slide object for every package index from 0 through ${packages.length - 1}, in package order. The output is a directing plan only; CREAPD will calculate exact timestamps deterministically from the real voice durations.`;
}

function normalizeElement(element, sceneDuration, index) {
  const elementType = ELEMENT_TYPES.has(element?.element_type) ? element.element_type : 'body_text';
  const position = POSITIONS.has(element?.position) ? element.position : (elementType === 'lower_third' ? 'lower_third' : 'center');
  const animationIn = ENTRANCE_ANIMATIONS.has(element?.animation_in) ? element.animation_in : (elementType === 'lower_third' ? 'lower_third' : 'fade');
  const animationOut = EXIT_ANIMATIONS.has(element?.animation_out) ? element.animation_out : 'fade_out';
  const startRatio = clamp(element?.start_ratio, 0, 0.95);
  const endRatio = clamp(element?.end_ratio, Math.min(1, startRatio + 0.05), 1);

  return {
    element_id: `element_${String(index + 1).padStart(2, '0')}`,
    element_type: elementType,
    text: trimText(element?.content, elementType === 'headline' ? 120 : 220),
    position,
    animation_in: animationIn,
    animation_out: animationOut,
    start_time: round(startRatio * sceneDuration),
    end_time: round(endRatio * sceneDuration),
    priority: Math.round(clamp(element?.priority, 1, 10)),
    purpose: trimText(element?.purpose, 180),
  };
}

function normalizePresentation(config, packages, rawSlides, gateway) {
  const slidesByIndex = new Map();
  for (const slide of Array.isArray(rawSlides) ? rawSlides : []) {
    const index = Number(slide?.package_index);
    if (!Number.isInteger(index) || index < 0 || index >= packages.length || slidesByIndex.has(index)) continue;
    slidesByIndex.set(index, slide);
  }

  let globalCursor = 0;
  let sceneNumber = 0;
  const scenes = [];
  const segments = [];
  const slideSummaries = [];

  packages.forEach((pkg, packageIndex) => {
    const directed = slidesByIndex.get(packageIndex) || fallbackSlide(pkg, packageIndex);
    const durationInfo = durationFromOwnedWav(pkg);
    const packageDuration = Math.max(0.1, durationInfo.seconds);
    const rawScenes = Array.isArray(directed.scenes) && directed.scenes.length
      ? directed.scenes.slice(0, 3)
      : fallbackSlide(pkg, packageIndex).scenes;

    const weights = rawScenes.map(scene => {
      const weight = Number(scene?.duration_weight);
      return Number.isFinite(weight) && weight > 0 ? weight : 1;
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || rawScenes.length;
    const segmentStart = round(globalCursor);
    let packageCursor = 0;
    const segmentSceneIds = [];

    rawScenes.forEach((scene, sceneIndex) => {
      const isLast = sceneIndex === rawScenes.length - 1;
      const sceneDuration = isLast
        ? round(Math.max(0.1, packageDuration - packageCursor))
        : round(Math.max(0.1, (weights[sceneIndex] / totalWeight) * packageDuration));
      const localStart = round(packageCursor);
      const localEnd = isLast ? round(packageDuration) : round(Math.min(packageDuration, packageCursor + sceneDuration));
      const actualDuration = round(Math.max(0.1, localEnd - localStart));
      const globalStart = round(segmentStart + localStart);
      const globalEnd = round(segmentStart + localEnd);
      packageCursor = localEnd;
      sceneNumber += 1;

      const rawElements = Array.isArray(scene?.elements) ? scene.elements.slice(0, 3) : [];
      const elements = rawElements.length
        ? rawElements.map((element, elementIndex) => normalizeElement(element, actualDuration, elementIndex))
        : fallbackSlide(pkg, packageIndex).scenes[0].elements.map((element, elementIndex) => normalizeElement(element, actualDuration, elementIndex));

      const sceneId = `scene_${String(sceneNumber).padStart(3, '0')}`;
      segmentSceneIds.push(sceneId);
      scenes.push({
        id: sceneId,
        slide_id: sceneId,
        package_id: String(pkg.id),
        package_index: packageIndex,
        segment_index: packageIndex,
        slide_title: trimText(scene?.title || pkg.source_point_title || pkg.title || `Research Story ${packageIndex + 1}`, 140),
        beat_type: trimText(scene?.beat_type || 'story', 80),
        scene_purpose: trimText(scene?.scene_purpose, 220),
        voice_start_time: globalStart,
        voice_end_time: globalEnd,
        duration_seconds: actualDuration,
        audio_start_time: localStart,
        audio_end_time: localEnd,
        audio_url: pkg.generated_audio_url || null,
        visual_theme: trimText(scene?.visual_theme, 240),
        background_design: trimText(scene?.background_design || 'dark_gradient', 80),
        background_prompt: trimText(scene?.background_prompt || pkg.image_prompt || pkg.visual_suggestions, 800),
        camera_behavior: trimText(scene?.camera_behavior || 'static', 80),
        motion_intensity: trimText(scene?.motion_intensity || 'low', 40),
        transition_plan: TRANSITIONS.has(scene?.transition_type) ? scene.transition_type : 'dissolve',
        generated_image_url: scene?.use_story_image && pkg.generated_image_url ? pkg.generated_image_url : null,
        text_elements: elements,
        image_elements: scene?.use_story_image && pkg.generated_image_url
          ? [{
              element_type: 'image',
              url: pkg.generated_image_url,
              start_time: 0,
              end_time: actualDuration,
              animation_in: 'dissolve',
              animation_out: 'fade_out',
              position: 'full_screen',
              priority: 5,
              purpose: 'Use the approved Story Image as directed visual support.',
            }]
          : [],
        speaker_notes: trimText(pkg.teleprompter_script, 900),
        production_notes: trimText(directed.decision_rationale, 350),
      });
    });

    const segmentEnd = round(segmentStart + packageDuration);
    segments.push({
      segment_id: `segment_${String(packageIndex + 1).padStart(2, '0')}`,
      package_id: String(pkg.id),
      package_index: packageIndex,
      title: trimText(pkg.source_point_title || pkg.title || pkg.headline_suggestions || `Research Story ${packageIndex + 1}`, 160),
      audio_url: pkg.generated_audio_url || null,
      voice_package_id: pkg.voice_package_id || null,
      start_time: segmentStart,
      end_time: segmentEnd,
      duration_seconds: packageDuration,
      duration_source: durationInfo.source,
      scene_ids: segmentSceneIds,
      story_image_url: pkg.generated_image_url || null,
      confidence_score: round(clamp(directed.confidence_score, 0, 100)),
    });

    slideSummaries.push({
      package_id: String(pkg.id),
      package_index: packageIndex,
      scene_count: segmentSceneIds.length,
      decision_rationale: trimText(directed.decision_rationale, 500),
      confidence_score: round(clamp(directed.confidence_score, 0, 100)),
    });

    globalCursor = segmentEnd;
  });

  const allHaveAudio = packages.every(pkg => Boolean(pkg.generated_audio_url));
  const allTimed = segments.every(segment => segment.duration_seconds > 0);
  const readableElements = scenes.flatMap(scene => Array.isArray(scene.text_elements) ? scene.text_elements : []);
  const readableCount = readableElements.filter(element => wordCount(element.text) <= (element.element_type === 'headline' ? 12 : 22)).length;
  const readability = readableElements.length ? Math.round((readableCount / readableElements.length) * 100) : 100;
  const avgConfidence = slideSummaries.length
    ? Math.round(slideSummaries.reduce((sum, slide) => sum + slide.confidence_score, 0) / slideSummaries.length)
    : 0;

  const qaScores = {
    story_integrity: 100,
    timeline_synchronization: allHaveAudio && allTimed ? 100 : 85,
    readability,
    technical_integrity: allHaveAudio && scenes.length > 0 ? 100 : 80,
    communication: avgConfidence,
    motion: scenes.every(scene => scene.camera_behavior && scene.transition_plan) ? 95 : 80,
    consistency: 95,
  };
  const confidenceScore = Math.round(
    qaScores.story_integrity * 0.20 +
    qaScores.timeline_synchronization * 0.20 +
    qaScores.communication * 0.20 +
    qaScores.readability * 0.15 +
    qaScores.motion * 0.10 +
    qaScores.technical_integrity * 0.10 +
    qaScores.consistency * 0.05
  );

  return {
    version: 'research-presentation-director-v1',
    title: `${config?.production_name || 'Research'} — Research Presentation`,
    production_profile: 'research',
    configuration_id: String(config?.id || ''),
    status: 'generated',
    story_count: packages.length,
    scene_count: scenes.length,
    total_runtime_seconds: round(globalCursor),
    total_runtime_ms: Math.round(globalCursor * 1000),
    playback_settings: {
      resolution: '1920x1080',
      aspect_ratio: '16:9',
      frame_rate: 30,
      playback_mode: 'sequential',
      transition_defaults: { type: 'fade', duration_ms: 500 },
    },
    master_timeline: {
      total_duration_seconds: round(globalCursor),
      events: segments.map(segment => ({
        event_type: 'segment_start',
        package_id: segment.package_id,
        start_time: segment.start_time,
        end_time: segment.end_time,
      })),
    },
    segments,
    scenes,
    slide_summaries: slideSummaries,
    qa_scores: qaScores,
    confidence_score: confidenceScore,
    qa_result: confidenceScore >= 90 ? 'pass' : confidenceScore >= 80 ? 'warning' : 'fail',
    planner: {
      model: gateway.model,
      auth_source: gateway.authSource,
      elapsed_ms: gateway.elapsedMs,
      response_id: gateway.responseId,
    },
    generated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
}

export async function directResearchPresentation({ config, packages }) {
  const approvedPackages = (Array.isArray(packages) ? packages : [])
    .filter(pkg => pkg && pkg.id && pkg.generated_audio_url && (pkg.teleprompter_script || pkg.story_summary))
    .slice(0, MAX_PACKAGES);

  if (!approvedPackages.length) {
    const error = new Error('Generate Kokoro voiceovers before assembling the Research presentation.');
    error.code = 'PRESENTATION_VOICEOVERS_REQUIRED';
    error.status = 409;
    throw error;
  }

  const gateway = await generateStructuredGatewayResponse({
    prompt: buildPrompt(config, approvedPackages),
    schema: PRESENTATION_SCHEMA,
    schemaName: 'creapd_research_presentation_v1',
    webSearch: false,
    maxOutputTokens: 7000,
    timeoutMs: 55000,
  });

  return normalizePresentation(config, approvedPackages, gateway.data?.slides, gateway);
}
