import { generateStructuredGatewayResponse } from './aiGateway.js';

const VIDEO_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scenes: {
      type: 'array',
      minItems: 3,
      maxItems: 14,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          narration_excerpt: { type: 'string' },
          duration_seconds: { type: 'number' },
          beat_type: { type: 'string' },
          visual_type: { type: 'string' },
          visual_theme: { type: 'string' },
          background_prompt: { type: 'string' },
          text_overlay: { type: 'string' },
          lower_third: { type: 'string' },
          broll_suggestion: { type: 'string' },
          motion_graphic: { type: 'string' },
          transition: { type: 'string' },
          use_story_image: { type: 'boolean' },
        },
        required: [
          'title',
          'narration_excerpt',
          'duration_seconds',
          'beat_type',
          'visual_type',
          'visual_theme',
          'background_prompt',
          'text_overlay',
          'lower_third',
          'broll_suggestion',
          'motion_graphic',
          'transition',
          'use_story_image',
        ],
      },
    },
  },
  required: ['scenes'],
};

function trimText(value, max = 10000) {
  return String(value || '').slice(0, max);
}

function words(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function roundTime(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeScenes(rawScenes, audioDurationSeconds) {
  const scenes = (Array.isArray(rawScenes) ? rawScenes : [])
    .filter(scene => scene && typeof scene === 'object')
    .slice(0, 14);

  if (scenes.length < 3) {
    const error = new Error('Presentation Director returned too few video scenes');
    error.code = 'VIDEO_PLAN_TOO_FEW_SCENES';
    throw error;
  }

  const fallbackWeight = 1;
  const weights = scenes.map(scene => {
    const requested = Number(scene.duration_seconds);
    if (Number.isFinite(requested) && requested > 0) return requested;
    const wordWeight = words(scene.narration_excerpt);
    return wordWeight > 0 ? wordWeight : fallbackWeight;
  });

  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || scenes.length;
  let cursor = 0;

  return scenes.map((scene, index) => {
    const isLast = index === scenes.length - 1;
    const proportionalDuration = (weights[index] / totalWeight) * audioDurationSeconds;
    const startTime = roundTime(cursor);
    const endTime = isLast
      ? roundTime(audioDurationSeconds)
      : roundTime(Math.min(audioDurationSeconds, cursor + proportionalDuration));

    cursor = endTime;

    return {
      scene_id: `scene_${String(index + 1).padStart(2, '0')}`,
      order: index,
      title: trimText(scene.title, 140),
      narration_excerpt: trimText(scene.narration_excerpt, 700),
      start_time: startTime,
      end_time: endTime,
      duration_seconds: roundTime(Math.max(0.1, endTime - startTime)),
      beat_type: trimText(scene.beat_type, 80),
      visual_type: trimText(scene.visual_type, 80),
      visual_theme: trimText(scene.visual_theme, 240),
      background_prompt: trimText(scene.background_prompt, 900),
      text_overlay: trimText(scene.text_overlay, 180),
      lower_third: trimText(scene.lower_third, 180),
      broll_suggestion: trimText(scene.broll_suggestion, 500),
      motion_graphic: trimText(scene.motion_graphic, 500),
      transition: trimText(scene.transition, 100),
      use_story_image: Boolean(scene.use_story_image),
    };
  });
}

function plannerPrompt(pkg, audioDurationSeconds) {
  return `You are CREAPD's Presentation Director. Transform an approved Research production package into a timed visual scene plan for a finished news/research video.

The narration has ALREADY been generated. Its real measured duration is ${audioDurationSeconds.toFixed(2)} seconds. Build the visual plan around that narration; do not rewrite the story.

TELEPROMPTER SCRIPT
${trimText(pkg.teleprompter_script, 10000)}

STORY SUMMARY
${trimText(pkg.story_summary, 2200)}

AVAILABLE PRODUCTION GUIDANCE
Lower thirds:
${trimText(pkg.lower_third_text, 1200)}

Visual suggestions:
${trimText(pkg.visual_suggestions, 2200)}

B-roll suggestions:
${trimText(pkg.broll_suggestions, 2200)}

Existing story image available: ${pkg.generated_image_url ? 'YES' : 'NO'}
Existing thumbnail available: ${pkg.generated_thumbnail_url ? 'YES' : 'NO'}

DIRECTING RULES
- Return 5-12 scenes for a normal short research segment. Use fewer only when the narration is very short.
- Scenes must follow the narration in order and collectively cover the full story.
- duration_seconds is the RELATIVE pacing weight for each scene; CREAPD will normalize the final timestamps to the exact ${audioDurationSeconds.toFixed(2)} second audio duration.
- narration_excerpt must quote or closely identify the matching portion of the supplied teleprompter so a producer can tell what audio belongs to the scene.
- beat_type examples: hook, context, evidence, statistic, timeline, explanation, counterpoint, implication, closing.
- visual_type examples: story_image, generated_still, broll, document, chart, map, motion_graphic, text_only.
- background_prompt should be suitable for generating or sourcing the visual without inventing events that the research does not support.
- text_overlay: maximum 8 words. Use an empty string when no overlay is needed.
- lower_third: short broadcast lower third or empty string.
- broll_suggestion: realistic obtainable footage or empty string.
- motion_graphic: useful animation concept or empty string.
- transition: fade, dissolve, slide, zoom, cut, or none.
- use_story_image should be true only when the existing generated story image is appropriate; avoid repeating it excessively.
- Prioritize documentary/news credibility. Do not fabricate footage, quotes, people, documents, statistics, or locations.
- Visuals should explain or reinforce the narration, not merely decorate it.

Return only the required JSON object.`;
}

export async function planResearchVideo({ pkg, audioDurationSeconds }) {
  if (!pkg?.id || !pkg?.teleprompter_script) {
    const error = new Error('A production package with a teleprompter script is required');
    error.code = 'VIDEO_PLAN_PACKAGE_INVALID';
    throw error;
  }

  const duration = Number(audioDurationSeconds);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 3600) {
    const error = new Error('A valid voiceover duration is required for video planning');
    error.code = 'VIDEO_PLAN_DURATION_INVALID';
    throw error;
  }

  const gateway = await generateStructuredGatewayResponse({
    prompt: plannerPrompt(pkg, duration),
    schema: VIDEO_PLAN_SCHEMA,
    schemaName: 'creapd_research_video_plan_v1',
    webSearch: false,
    maxOutputTokens: 2600,
    timeoutMs: 55000,
  });

  const scenes = normalizeScenes(gateway.data?.scenes, duration);

  return {
    plan: {
      version: 'research-video-plan-v1',
      audio_duration_seconds: roundTime(duration),
      audio_url: pkg.generated_audio_url || null,
      story_image_url: pkg.generated_image_url || null,
      thumbnail_url: pkg.generated_thumbnail_url || null,
      scene_count: scenes.length,
      scenes,
      generated_at: new Date().toISOString(),
    },
    gateway: {
      model: gateway.model,
      auth_source: gateway.authSource,
      elapsed_ms: gateway.elapsedMs,
      response_id: gateway.responseId,
    },
  };
}
