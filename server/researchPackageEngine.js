import { generateStructuredGatewayResponse } from './aiGateway.js';

const PACKAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    teleprompter_script: { type: 'string' },
    story_summary: { type: 'string' },
    talking_points: { type: 'string' },
    lower_third_text: { type: 'string' },
    headline_suggestions: { type: 'string' },
    image_prompt: { type: 'string' },
    thumbnail_prompt: { type: 'string' },
    visual_suggestions: { type: 'string' },
    broll_suggestions: { type: 'string' },
    social_caption: { type: 'string' },
    fact_check_notes: { type: 'string' },
    producer_notes: { type: 'string' },
    estimated_runtime: { type: 'string' },
  },
  required: [
    'teleprompter_script',
    'story_summary',
    'talking_points',
    'lower_third_text',
    'headline_suggestions',
    'image_prompt',
    'thumbnail_prompt',
    'visual_suggestions',
    'broll_suggestions',
    'social_caption',
    'fact_check_notes',
    'producer_notes',
    'estimated_runtime',
  ],
};

function compactJson(value, fallback = '[]') {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function trimText(value, max = 12000) {
  return String(value || '').slice(0, max);
}

function packagePrompt({ point, config }) {
  const tone = config?.tone || 'professional';
  const readingStyle = config?.reading_style || 'broadcast_news';
  const audience = config?.target_audience || config?.audience || 'General Public';
  const targetRuntime = config?.total_show_runtime
    ? `${config.total_show_runtime} Minutes`
    : (config?.target_runtime || '1 Minute');

  return `You are CREAPD's senior broadcast producer, script editor, visual producer, and fact-checker.

Build one production-ready package from the approved research point below. The package must be usable by a human producer without another AI pass.

RESEARCH POINT
Title: ${trimText(point.title, 500)}
Topic: ${trimText(point.topic_title, 500)}
Type: ${trimText(point.point_type, 100)}
Content: ${trimText(point.content, 10000)}
Significance: ${trimText(point.significance, 2500)}
Suggested angle: ${trimText(point.suggested_angle, 2000)}
Suggested segment: ${trimText(point.suggested_segment, 1200)}
Key facts: ${compactJson(point.key_facts)}
Sources: ${compactJson(point.sources)}

PRODUCTION SETTINGS
Tone: ${tone}
Reading style: ${readingStyle}
Audience: ${audience}
Target runtime: ${targetRuntime}

REQUIREMENTS
- teleprompter_script: polished, broadcast-ready host copy with natural transitions; no markdown headings.
- story_summary: concise producer summary of the full story and why it matters.
- talking_points: host-ready bullets rendered as plain text lines.
- lower_third_text: 2-4 short lower-third options separated by new lines.
- headline_suggestions: 3 concise headline options separated by new lines.
- image_prompt: one detailed still-image prompt that accurately represents the story without fabricating events.
- thumbnail_prompt: one high-impact thumbnail prompt with a clear focal subject and room for title text.
- visual_suggestions: concise list of charts, documents, maps, graphics, or archival visuals that would strengthen the segment.
- broll_suggestions: concise B-roll shot list.
- social_caption: one ready-to-post caption that accurately reflects the research.
- fact_check_notes: verify important claims against the supplied sources and web research; clearly flag uncertainty or corrections.
- producer_notes: editorial cautions, pronunciation/context notes, and anything the producer should know before air.
- estimated_runtime: estimated spoken runtime for the teleprompter script.

Keep every field useful but compact. Do not invent quotes, statistics, sources, or eyewitness details. Return only the required JSON object.`;
}

export async function generateResearchProductionPackage({ sql, ownerUserId, point, config }) {
  if (!sql || !ownerUserId || !point?.id) {
    const error = new Error('Research package generation requires database, user, and point');
    error.code = 'RESEARCH_PACKAGE_INPUT_INVALID';
    throw error;
  }

  const gateway = await generateStructuredGatewayResponse({
    prompt: packagePrompt({ point, config }),
    schema: PACKAGE_SCHEMA,
    schemaName: 'creapd_research_package_v1',
    webSearch: true,
    maxOutputTokens: 2600,
    timeoutMs: 55000,
  });

  const now = new Date().toISOString();
  const existingPackageId = point.package_id ? String(point.package_id) : null;
  let existingPackage = null;

  if (existingPackageId) {
    [existingPackage] = await sql`
      SELECT *
      FROM creapd.production_packages
      WHERE id = ${existingPackageId}
        AND owner_user_id = ${ownerUserId}
      LIMIT 1
    `;
  }

  const generationCount = Number(existingPackage?.generation_count || 0) + 1;
  const fields = gateway.data || {};
  let pkg;

  if (existingPackage) {
    [pkg] = await sql`
      UPDATE creapd.production_packages
      SET
        teleprompter_script = ${fields.teleprompter_script || ''},
        story_summary = ${fields.story_summary || ''},
        talking_points = ${fields.talking_points || ''},
        lower_third_text = ${fields.lower_third_text || ''},
        headline_suggestions = ${fields.headline_suggestions || ''},
        image_prompt = ${fields.image_prompt || ''},
        thumbnail_prompt = ${fields.thumbnail_prompt || ''},
        visual_suggestions = ${fields.visual_suggestions || ''},
        broll_suggestions = ${fields.broll_suggestions || ''},
        social_caption = ${fields.social_caption || ''},
        fact_check_notes = ${fields.fact_check_notes || ''},
        producer_notes = ${fields.producer_notes || ''},
        estimated_runtime = ${fields.estimated_runtime || ''},
        tone = ${config?.tone || existingPackage.tone || 'professional'},
        reading_style = ${config?.reading_style || existingPackage.reading_style || 'broadcast_news'},
        audience = ${config?.target_audience || config?.audience || existingPackage.audience || 'General Public'},
        target_runtime = ${config?.total_show_runtime ? `${config.total_show_runtime} Minutes` : (config?.target_runtime || existingPackage.target_runtime || '1 Minute')},
        status = 'generated',
        generation_provider = ${gateway.model},
        generated_at = ${now},
        is_regenerated = true,
        generation_count = ${generationCount},
        source_system = 'creapd-neon-vercel',
        source_payload = ${JSON.stringify({
          gateway_auth_source: gateway.authSource,
          web_search_used: gateway.webSearchUsed,
          gateway_response_id: gateway.responseId,
          elapsed_ms: gateway.elapsedMs,
        })}::jsonb,
        updated_at = now()
      WHERE id = ${existingPackage.id}
        AND owner_user_id = ${ownerUserId}
      RETURNING *
    `;
  } else {
    const packageId = crypto.randomUUID();
    [pkg] = await sql`
      INSERT INTO creapd.production_packages (
        id,
        owner_user_id,
        production_profile,
        source_entity_type,
        source_entity_id,
        configuration_id,
        teleprompter_script,
        story_summary,
        talking_points,
        lower_third_text,
        headline_suggestions,
        image_prompt,
        thumbnail_prompt,
        visual_suggestions,
        broll_suggestions,
        social_caption,
        fact_check_notes,
        producer_notes,
        estimated_runtime,
        tone,
        reading_style,
        audience,
        target_runtime,
        status,
        generation_provider,
        generated_at,
        is_regenerated,
        generation_count,
        source_system,
        source_payload
      ) VALUES (
        ${packageId},
        ${ownerUserId},
        'news',
        'ResearchPoint',
        ${String(point.id)},
        ${String(point.configuration_id || '')},
        ${fields.teleprompter_script || ''},
        ${fields.story_summary || ''},
        ${fields.talking_points || ''},
        ${fields.lower_third_text || ''},
        ${fields.headline_suggestions || ''},
        ${fields.image_prompt || ''},
        ${fields.thumbnail_prompt || ''},
        ${fields.visual_suggestions || ''},
        ${fields.broll_suggestions || ''},
        ${fields.social_caption || ''},
        ${fields.fact_check_notes || ''},
        ${fields.producer_notes || ''},
        ${fields.estimated_runtime || ''},
        ${config?.tone || 'professional'},
        ${config?.reading_style || 'broadcast_news'},
        ${config?.target_audience || config?.audience || 'General Public'},
        ${config?.total_show_runtime ? `${config.total_show_runtime} Minutes` : (config?.target_runtime || '1 Minute')},
        'generated',
        ${gateway.model},
        ${now},
        false,
        1,
        'creapd-neon-vercel',
        ${JSON.stringify({
          gateway_auth_source: gateway.authSource,
          web_search_used: gateway.webSearchUsed,
          gateway_response_id: gateway.responseId,
          elapsed_ms: gateway.elapsedMs,
        })}::jsonb
      )
      RETURNING *
    `;
  }

  await sql`
    UPDATE creapd.research_points
    SET
      package_id = ${pkg.id},
      updated_at = now()
    WHERE id = ${String(point.id)}
      AND owner_user_id = ${ownerUserId}
  `;

  return {
    package: pkg,
    gateway: {
      model: gateway.model,
      auth_source: gateway.authSource,
      web_search_used: gateway.webSearchUsed,
      elapsed_ms: gateway.elapsedMs,
    },
  };
}
