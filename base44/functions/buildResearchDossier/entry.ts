import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await base44.entities.ResearchProject.get(project_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const topics = await base44.entities.ResearchTopic.filter({ project_id });

    const researchData = topics.length > 0
      ? topics.map(t => ({ title: t.title, assignment: t.research_assignment })).join('\n\n')
      : project.research_question || project.production_name;

    await base44.entities.ResearchProject.update(project_id, { status: 'dossier_pending' });

    const existingDossiers = await base44.entities.ResearchDossier.filter({ project_id });
    if (existingDossiers && existingDossiers.length > 0) {
      await base44.entities.ResearchDossier.delete(existingDossiers[0].id);
    }

    const dossier = await base44.entities.ResearchDossier.create({
      project_id,
      status: 'drafting',
    });

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a research analyst at an executive briefing room. Take the following raw research data and structure it into a comprehensive Research Dossier.\n\nResearch data:\n${researchData}\n\nStructure the dossier with:\n1. Executive Summary — a concise overview of the entire research\n2. Background — historical context and setting\n3. Timeline — key events in chronological order\n4. Key Facts — verified facts with context\n5. Important People — key figures and their roles\n6. Organizations — relevant organizations and their involvement\n7. Statistics — supporting data with context\n8. Verified Sources — list of credible sources\n9. Areas of Debate — competing viewpoints and uncertainties\n10. Supporting Documents — references to documents\n11. Related Topics — areas for further exploration\n12. Confidence Score — your confidence in the research 0-100`,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          background: { type: 'string' },
          timeline: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, event: { type: 'string' } } } },
          key_facts: { type: 'array', items: { type: 'object', properties: { fact: { type: 'string' }, context: { type: 'string' } } } },
          important_people: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, role: { type: 'string' }, context: { type: 'string' } } } },
          organizations: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' } } } },
          statistics: { type: 'array', items: { type: 'object', properties: { figure: { type: 'string' }, context: { type: 'string' } } } },
          verified_sources: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' } } } },
          areas_of_debate: { type: 'array', items: { type: 'string' } },
          supporting_documents: { type: 'array', items: { type: 'string' } },
          related_topics: { type: 'array', items: { type: 'string' } },
          confidence_score: { type: 'number' },
        },
      },
    });

    const updated = await base44.entities.ResearchDossier.update(dossier.id, {
      executive_summary: llmRes.executive_summary || '',
      background: llmRes.background || '',
      timeline: JSON.stringify(llmRes.timeline || []),
      key_facts: JSON.stringify(llmRes.key_facts || []),
      important_people: JSON.stringify(llmRes.important_people || []),
      organizations: JSON.stringify(llmRes.organizations || []),
      statistics: JSON.stringify(llmRes.statistics || []),
      verified_sources: JSON.stringify(llmRes.verified_sources || []),
      areas_of_debate: JSON.stringify(llmRes.areas_of_debate || []),
      supporting_documents: JSON.stringify(llmRes.supporting_documents || []),
      related_topics: JSON.stringify(llmRes.related_topics || []),
      confidence_score: llmRes.confidence_score || 0,
      status: 'drafting',
    });

    await base44.entities.ResearchProject.update(project_id, {
      progress_dossier: 50,
    });

    return Response.json({ dossier: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});