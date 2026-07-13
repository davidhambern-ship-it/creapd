import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ════════════════════════════════════════════════════════
// CPE-AI-001: Presentation Editor Controller
// Coordinates Design Specialist → Operator → Quality Specialist
// Workers never communicate directly; all routing through Controller.
// ════════════════════════════════════════════════════════

const MAX_REVISIONS = 5;
const CANVAS_W = 1280;
const CANVAS_H = 720;

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, presentation_data, revision_context, revision_count } = body;
    const currentRevision = revision_count || 0;

    // ── Prevent infinite revision loops ──
    if (currentRevision >= MAX_REVISIONS) {
      return Response.json({
        error: 'Maximum revision limit reached (5). Escalating to producer review.',
        escalation: true,
        revision_count: currentRevision,
      });
    }

    if (action === 'improve') {
      // ═══ Phase 1: Design Specialist ═══
      const designReport = await runDesignSpecialist(presentation_data, revision_context, base44);

      // ═══ Phase 2: Operator ═══
      const commandPlan = await runOperator(designReport, presentation_data, revision_context, base44);

      return Response.json({
        design_report: designReport,
        command_plan: commandPlan,
        revision_count: currentRevision,
        max_revisions: MAX_REVISIONS,
      });
    }

    if (action === 'review') {
      // ═══ Phase 3: Quality Specialist ═══
      const qualityReport = await runQualitySpecialist(presentation_data, revision_context, base44);

      return Response.json({
        quality_report: qualityReport,
        revision_count: currentRevision,
        max_revisions: MAX_REVISIONS,
      });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ════════════════════════════════════════════════════════
// Worker 1: Presentation Design Specialist
// Determines HOW the presentation should look.
// Never edits slides. Produces a Design Direction Report.
// ════════════════════════════════════════════════════════
async function runDesignSpecialist(presentationData, revisionContext, base44) {
  const revisionBlock = revisionContext
    ? `\n## PRODUCER DIRECTIVE — Director's Critique (HIGHEST PRIORITY)\nThe producer has reviewed the presentation and provided the following per-slide feedback.\nYou MUST address every item before applying global design rules.\n\n${JSON.stringify(revisionContext, null, 1)}\n`
    : '';

  const prompt = `You are the Presentation Design Specialist for the CREAPD Presentation Editor (CPE).

Your role: determine HOW the presentation should look.
You NEVER edit slides directly. You create a Design Direction Report for the Operator Worker.

Your expertise: presentation design, typography, visual hierarchy, color theory, composition,
layout design, grid systems, animation principles, transition principles, storytelling,
presentation psychology, accessibility, brand design, motion design, CREAPD Design Language.

The canvas is ${CANVAS_W}x${CANVAS_H} pixels (16:9).
${revisionBlock}
Analyze this presentation and create a comprehensive Design Direction Report:

${JSON.stringify(presentationData, null, 1)}

Create a Design Direction Report that includes:
- visual_intent: A clear statement of the visual direction
- layout_instructions: Array of objects with slide_index and specific layout instructions
- typography_instructions: Font sizes, weights, families for titles/body/etc
- color_instructions: Background, text, accent colors (as hex or rgba)
- animation_instructions: Entrance animation types and durations for elements
- transition_instructions: Transition types between slides
- timing_recommendations: Duration in ms for slides and elements
- operator_instructions: Array of specific instructions for the Operator Worker
- asset_recommendations: Array of recommended assets (images, icons, etc.)
- design_rationale: Why these design decisions were made`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        visual_intent: { type: 'string' },
        layout_instructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              slide_index: { type: 'number' },
              instructions: { type: 'string' },
            },
          },
        },
        typography_instructions: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            caption: { type: 'string' },
          },
        },
        color_instructions: {
          type: 'object',
          properties: {
            background: { type: 'string' },
            text: { type: 'string' },
            accent: { type: 'string' },
          },
        },
        animation_instructions: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            duration_ms: { type: 'number' },
          },
        },
        transition_instructions: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            duration_ms: { type: 'number' },
          },
        },
        timing_recommendations: {
          type: 'object',
          properties: {
            slide_duration_ms: { type: 'number' },
            element_stagger_ms: { type: 'number' },
          },
        },
        operator_instructions: {
          type: 'array',
          items: { type: 'string' },
        },
        asset_recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
        design_rationale: { type: 'string' },
      },
    },
    model: 'gpt_5_mini',
  });

  return response;
}

// ════════════════════════════════════════════════════════
// Worker 2: Presentation Editor Operator
// Converts Design Direction into executable editor commands.
// Never decides what looks good. Executes via CPE Command API only.
// ════════════════════════════════════════════════════════
async function runOperator(designReport, presentationData, revisionContext, base44) {
  const revisionBlock = revisionContext
    ? `\n## PRODUCER DIRECTIVE — Director's Critique (HIGHEST PRIORITY)\nThe producer has flagged the following per-slide issues. Every command you generate MUST resolve these.\n\n${JSON.stringify(revisionContext, null, 1)}\n`
    : '';

  const prompt = `You are the Presentation Editor Operator Worker for the CREAPD Presentation Editor (CPE).

Your role: convert Design Direction into executable editor commands.
You NEVER decide what looks good. You EXECUTE the design specialist's direction.
You communicate EXCLUSIVELY through the CPE Command API.

Canvas: ${CANVAS_W}x${CANVAS_H} pixels (16:9).
${revisionBlock}
## Design Direction Report
${JSON.stringify(designReport, null, 1)}

## Current Presentation State
${JSON.stringify(presentationData, null, 1)}

## CPE Command API
You may use these operations:
- update_text: { text: "string" }
- move_element: { x: number, y: number }
- resize_element: { width: number, height: number }
- rotate_element: { rotation: number }
- apply_typography: { fontSize: number, fontFamily: "string", color: "hex", bold: boolean, align: "left|center|right" }
- apply_color: { color: "hex", backgroundColor: "rgba/string" }
- apply_transition: { type: "fade|slide_left|slide_right|zoom|dissolve|none" }
- apply_animation: { type: "fade_in|slide_in|zoom_in|dissolve_in", duration_ms: number, delay_ms: number }
- update_timing: { start_ms: number, end_ms: number }
- update_speaker_notes: { notes: "string" }
- replace_image: { url: "string" }
- replace_icon: { icon: "string" }
- add_slide: {}
- delete_slide: { slide_index: number }
- duplicate_slide: { slide_index: number }
- reorder_slide: { from: number, to: number }
- run_preview: {}
- run_qa: {}

IMPORTANT RULES:
1. Reference elements by their actual "id" from the Current Presentation State.
2. Use target_element for element-level operations.
3. Do NOT overwrite producer edits — make targeted improvements, not full regeneration.
4. Every command must have: operation, parameters, reason, expected_result.
5. If revision_context is provided, focus on fixing the issues identified.

Create an Editor Command Plan — an array of commands that implement the design direction.
Focus on the ACTIVE SLIDE (index ${presentationData.active_slide_index}) and its elements.
Make practical, targeted improvements based on the design direction.`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target_slide: { type: 'string' },
              target_element: { type: 'string' },
              operation: { type: 'string' },
              parameters: { type: 'string' },
              reason: { type: 'string' },
              expected_result: { type: 'string' },
            },
            required: ['target_slide', 'target_element', 'operation', 'parameters', 'reason', 'expected_result'],
          },
        },
      },
      required: ['commands'],
    },
    model: 'gpt_5_mini',
  });

  // Operator returns parameters as a JSON string — parse for the frontend
  return (response.commands || []).map(cmd => ({
    ...cmd,
    parameters: typeof cmd.parameters === 'string' ? safeJsonParse(cmd.parameters) : cmd.parameters || {},
  }));
}

// ════════════════════════════════════════════════════════
// Worker 3: Presentation Quality Specialist
// Evaluates the finished presentation. Never edits slides.
// Produces a Quality Review Report.
// ════════════════════════════════════════════════════════
async function runQualitySpecialist(presentationData, revisionContext, base44) {
  const revisionNote = revisionContext
    ? `\n## Previous Revision Context\n${JSON.stringify(revisionContext, null, 1)}\n`
    : '';

  const prompt = `You are the Presentation Quality Specialist for the CREAPD Presentation Editor (CPE).

Your role: evaluate the finished presentation against CREAPD quality standards.
You NEVER edit slides. You REVIEW and produce a Quality Review Report.

Your expertise: typography, visual hierarchy, accessibility, layout, animation, transitions,
timing, safe areas, color harmony, theme consistency, brand consistency, presentation flow,
playback, media quality, professional presentation standards.

Canvas: ${CANVAS_W}x${CANVAS_H} pixels (16:9).
Safe margins: 60px from edges.

## Presentation State
${JSON.stringify(presentationData, null, 1)}
${revisionNote}

Evaluate the presentation on these criteria:
- Typography (font sizes readable, hierarchy clear)
- Spacing (elements not cramped, breathing room)
- Alignment (elements aligned to grid)
- Safe margins (elements within 60px of edges)
- Color consistency (colors harmonious, contrast readable)
- Theme consistency (style matches production profile)
- Animation timing (smooth, not jarring)
- Transition timing (appropriate between slides)
- Element overlap (no unintended overlaps)
- Presentation flow (logical progression)
- Overall polish

Produce a Quality Review Report.`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        overall_score: { type: 'number' },
        pass_fail: { type: 'string', enum: ['pass', 'fail'] },
        rubric_scores: {
          type: 'object',
          properties: {
            typography: { type: 'number' },
            spacing: { type: 'number' },
            alignment: { type: 'number' },
            safe_margins: { type: 'number' },
            color_consistency: { type: 'number' },
            theme_consistency: { type: 'number' },
            animation: { type: 'number' },
            transitions: { type: 'number' },
            overlap: { type: 'number' },
            flow: { type: 'number' },
            polish: { type: 'number' },
          },
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              responsible_worker: { type: 'string', enum: ['design_specialist', 'operator', 'asset_worker'] },
              recommended_fix: { type: 'string' },
            },
          },
        },
        revision_required: { type: 'boolean' },
        responsible_worker: { type: 'string' },
        approval_recommendation: { type: 'string' },
      },
    },
    model: 'gpt_5_mini',
  });

  return response;
}