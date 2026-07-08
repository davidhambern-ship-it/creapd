import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Auto-Build Presentation — Topics Department
 *
 * Takes a natural-language prompt from the producer, interprets it via CREAPr,
 * infers audience / tone / scope / presentation goal, and creates:
 *   - ResearchProductionConfiguration (with inferred settings)
 *   - ResearchTopic (with research_query, description, etc.)
 *
 * If confidence is low and skip_confirmation is false, returns a clarification
 * question instead of proceeding.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt: producer_message, skip_confirmation } = await req.json();
    if (!producer_message || !producer_message.trim()) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    // ── Step 1: Interpret the producer's intent ──
    const intentPrompt = `You are CREAPr, the AI Executive Producer in the CREAPD Research Production Profile.

A producer wants to auto-build a presentation. They said:

"${producer_message}"

Interpret this request and infer ALL of the following fields:

- title: A clear, professional title for the research topic (e.g. "The Impact of Volcanic Ash Clouds on Global Climate")
- research_query: A refined search query that captures the essence of what needs to be researched
- description: A detailed description (2-3 sentences) of what the research should cover
- category: A broad category (science, technology, health, policy, economics, history, environment, society, culture, etc.)
- target_audience: Who is this presentation for? (e.g. "General Public", "Policy Makers", "Scientists", "Students")
- tone: The appropriate tone from: professional, conversational, energetic, serious, investigative, educational, inspirational, neutral, urgent, humorous
- reading_style: How should the script be read? From: broadcast_news, podcast, documentary, educational_presentation, storytelling
- research_depth: How deep should the research go? From: quick_scan, standard, deep_dive, exhaustive
- production_name: A short name for this production session (e.g. "Volcanic Ash Climate Study")
- presentation_goal: What is the goal of this presentation? (1 sentence)
- confidence: 0-100 how confident you are in these inferences

If confidence is below 75, include a clarification_question that asks the producer for the most critical missing information.

Rules:
- You do NOT perform research. You define WHAT will be researched.
- Keep the scope focused and achievable for a 6-10 slide presentation.
- The title should be engaging but professional.
- The research_query should be detailed enough for deep research.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: intentPrompt,
      model: 'gpt_5_mini',
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          research_query: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          target_audience: { type: 'string' },
          tone: { type: 'string' },
          reading_style: { type: 'string' },
          research_depth: { type: 'string' },
          production_name: { type: 'string' },
          presentation_goal: { type: 'string' },
          confidence: { type: 'number' },
          clarification_question: { type: 'string' },
        },
      },
    });

    // ── Step 2: If confidence is low and no skip, ask for confirmation ──
    if (!skip_confirmation && (result.confidence || 0) < 75 && result.clarification_question) {
      return Response.json({
        requires_confirmation: true,
        clarification_question: result.clarification_question,
        inferred_params: result,
      });
    }

    // ── Step 3: Create ResearchProductionConfiguration ──
    const config = await base44.entities.ResearchProductionConfiguration.create({
      production_name: result.production_name || result.title || 'Auto-Built Production',
      show_date: new Date().toISOString().split('T')[0],
      target_audience: result.target_audience || 'General Public',
      tone: result.tone || 'educational',
      reading_style: result.reading_style || 'documentary',
      research_depth: result.research_depth || 'standard',
      max_points_per_topic: 8,
      status: 'configuring',
      is_default: true,
    });

    // ── Step 4: Create ResearchTopic ──
    const topic = await base44.entities.ResearchTopic.create({
      configuration_id: config.id,
      title: result.title || 'Untitled Research Topic',
      description: result.description || '',
      research_query: result.research_query || result.title || '',
      category: result.category || 'general',
      research_depth: result.research_depth || 'standard',
      priority: 'standard',
      status: 'pending',
      pipeline_stage: 'idle',
      confidence_score: result.confidence || 0,
    });

    return Response.json({
      topic_id: topic.id,
      configuration_id: config.id,
      inferred_params: result,
      message: `Research Assignment created: "${result.title}"`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});