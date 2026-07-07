import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, research_question, category, key_questions } = await req.json();

    if (!research_question) {
      return Response.json({ error: 'research_question is required' }, { status: 400 });
    }

    const promptParts = [
      `You are a research analyst at a professional research institute.`,
      `Conduct thorough research on the following topic: "${research_question}".`,
    ];
    if (category) promptParts.push(`Focus area/category: ${category}.`);
    if (key_questions && key_questions.length > 0) {
      promptParts.push(`Address these specific questions:\n${key_questions.map(q => `- ${q}`).join('\n')}`);
    }
    promptParts.push(`\nProvide comprehensive findings including verified facts, a timeline of key events, important people and their roles, relevant organizations, statistics with context, areas of debate or competing viewpoints, and a list of credible sources.`);

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: promptParts.join('\n\n'),
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Overall research summary' },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fact: { type: 'string' },
                context: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
          timeline: {
            type: 'array',
            items: {
              type: 'object',
              properties: { date: { type: 'string' }, event: { type: 'string' } },
            },
          },
          key_people: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, role: { type: 'string' }, context: { type: 'string' } },
            },
          },
          organizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, description: { type: 'string' } },
            },
          },
          statistics: {
            type: 'array',
            items: {
              type: 'object',
              properties: { figure: { type: 'string' }, context: { type: 'string' } },
            },
          },
          areas_of_debate: { type: 'array', items: { type: 'string' } },
          sources: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    if (project_id) {
      const topicTitle = category || research_question.slice(0, 60);
      await base44.entities.ResearchTopic.create({
        project_id,
        title: topicTitle,
        category: category || 'General',
        description: research_question,
        research_assignment: JSON.stringify({ research_question, key_questions: key_questions || [] }),
        key_questions: JSON.stringify(key_questions || []),
        status: 'completed',
      });

      const existing = await base44.entities.ResearchProject.filter({ id: project_id });
      if (existing && existing.length > 0) {
        const proj = existing[0];
        await base44.entities.ResearchProject.update(project_id, {
          status: 'dossier_pending',
          progress_research: Math.min(100, (proj.progress_research || 0) + 50),
        });
      }
    }

    return Response.json({ research: llmRes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});