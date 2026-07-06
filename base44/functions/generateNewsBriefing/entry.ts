import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (e) {}

    const body = await req.json().catch(() => ({}));

    // Get pending articles from last 48 hours, most recent first
    const allPending = await base44.asServiceRole.entities.Article.filter({ status: 'pending' });
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const recent = allPending
      .filter(a => new Date(a.created_date).getTime() > twoDaysAgo)
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
      .slice(0, 50);

    if (recent.length === 0) {
      return Response.json({ error: 'No pending articles found. Run "Fetch Stories" first to pull stories from your sources.' }, { status: 400 });
    }

    const articleList = recent.map((a, i) => ({
      index: i,
      id: a.id,
      title: a.title,
      summary: (a.summary || '').substring(0, 200),
      source: a.source_name || 'Unknown',
      category: a.category || 'general',
      published: a.published_at || a.created_date,
      credibility: a.credibility_score || 3,
    }));

    // News-dedicated briefing prompt
    const prompt = `You are the Producer AI for a daily news show. Here are ${articleList.length} pending items from today's sources. Rate each one, select the best stories for today's briefing, and generate a complete briefing.

ARTICLES:
${JSON.stringify(articleList, null, 2)}

INSTRUCTIONS:
1. Rate each article: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 stories for the briefing (set "selected": true).
3. Pick ONE story as the host's top pick
4. Generate a complete briefing with: theme, energy, mission, monologue, poll, graphic_stat, broll, cta, conversation_starters, fact_check, tomorrow_watch, estimated_read_time, top_3_stories

Use the "id" field from the articles above for article_id and host_pick_id.`;

    const responseSchema = {
      type: "object",
      properties: {
        rated_articles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              article_id: { type: "string" },
              opportunity_score: { type: "number" },
              freshness_score: { type: "number" },
              usefulness_score: { type: "number" },
              selected: { type: "boolean" }
            }
          }
        },
        host_pick_id: { type: "string" },
        theme: { type: "string" },
        energy: { type: "string" },
        mission: { type: "string" },
        monologue: { type: "string" },
        poll: { type: "string" },
        graphic_stat: { type: "string" },
        broll: { type: "string" },
        cta: { type: "string" },
        conversation_starters: { type: "string" },
        fact_check: { type: "string" },
        tomorrow_watch: { type: "string" },
        estimated_read_time: { type: "string" },
        top_3_stories: { type: "string" }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: responseSchema });

    // Validate article IDs
    const validIds = new Set(recent.map(a => a.id));
    const seenIds = new Set();
    const ratedArticles = (result.rated_articles || []).filter(r => {
      if (!validIds.has(r.article_id) || seenIds.has(r.article_id)) return false;
      seenIds.add(r.article_id);
      return true;
    });
    let selectedIds = ratedArticles.filter(r => r.selected).map(r => r.article_id);
    if (selectedIds.length < 5) {
      const sorted = [...ratedArticles].sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
      selectedIds = sorted.slice(0, 12).map(r => r.article_id);
    }

    const hostPickId = result.host_pick_id || result.berna_pick_id;
    const hostPick = recent.find(a => a.id === hostPickId);

    // Bulk update article scores
    if (ratedArticles.length > 0) {
      const updates = ratedArticles.map(r => ({
        id: r.article_id,
        opportunity_score: r.opportunity_score,
        freshness_score: r.freshness_score,
        usefulness_score: r.usefulness_score,
      }));
      await base44.asServiceRole.entities.Article.bulkUpdate(updates);
    }

    const today = new Date().toISOString().split('T')[0];
    const briefing = await base44.asServiceRole.entities.Briefing.create({
      date: today,
      title: `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
      briefing_type: 'daily',
      theme: result.theme,
      energy: result.energy,
      mission: result.mission,
      monologue: result.monologue,
      poll: result.poll,
      graphic_stat: result.graphic_stat,
      broll: result.broll,
      cta: result.cta,
      conversation_starters: result.conversation_starters,
      fact_check: result.fact_check,
      tomorrow_watch: result.tomorrow_watch,
      estimated_read_time: result.estimated_read_time || '12 min',
      top_3_stories: result.top_3_stories,
      berna_pick_id: hostPickId || '',
      berna_pick_title: hostPick?.title || '',
      berna_pick_summary: hostPick?.summary || '',
      article_ids: JSON.stringify(selectedIds),
      source_library: [...new Set(recent.map(a => a.source_name))].join(', '),
      status: 'ready',
    });

    return Response.json({
      briefing,
      articles_rated: ratedArticles.length,
      articles_selected: selectedIds.length,
      host_pick_id: hostPickId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});