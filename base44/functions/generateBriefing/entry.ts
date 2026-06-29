import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth optional — works for both user-initiated and scheduled calls
    try { await base44.auth.me(); } catch (e) {}

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

    // Format articles for LLM
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

    // Call LLM to rate, select, and generate briefing
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the Producer AI for the TexasNomad Network, a daily news show hosted by Berna. The show focuses on American innovation, manufacturing, reshoring, small business, AI/technology, skilled trades, agriculture, and the creator economy — with an optimistic, pro-American tone.

Here are ${articleList.length} pending news articles from today's sources. Rate each one, select the best stories for today's briefing, and generate a complete briefing.

ARTICLES:
${JSON.stringify(articleList, null, 2)}

INSTRUCTIONS:
1. Rate each article: opportunity_score (1-5), freshness_score (1-5), usefulness_score (1-5)
2. Select the best 10-15 stories for the briefing (set "selected": true). Prioritize: breaking news, American manufacturing/reshoring, small business success, AI/tech innovation, skilled trades, agriculture, creator economy, and positive economic news.
3. Pick ONE story as "Berna's Pick" — the most important/compelling story of the day
4. Generate a complete briefing:
   - theme: 2-4 word theme (e.g., "American Innovation & Opportunity")
   - energy: emotional energy (e.g., "Optimistic & Energized")
   - mission: one sentence describing today's mission
   - monologue: 60-90 second opening monologue in Berna's voice — conversational, optimistic, pro-American, referencing the top stories
   - poll: chat poll question with 3-4 options labeled A) B) C) D)
   - graphic_stat: one striking statistic worth showing on screen
   - broll: suggested B-roll footage ideas (comma-separated)
   - cta: call to action for the audience
   - conversation_starters: 3-4 conversation starter questions (numbered)
   - fact_check: key fact-checking notes for the selected stories
   - tomorrow_watch: what to watch for tomorrow
   - estimated_read_time: estimated total read time (e.g., "12 min")
   - top_3_stories: the top 3 story headlines (comma-separated)

Use the "id" field from the articles above for article_id and berna_pick_id.`,
      response_json_schema: {
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
          berna_pick_id: { type: "string" },
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
      }
    });

    // Validate article IDs against actual articles, deduplicate
    const validIds = new Set(recent.map(a => a.id));
    const seenIds = new Set();
    const ratedArticles = (result.rated_articles || []).filter(r => {
      if (!validIds.has(r.article_id) || seenIds.has(r.article_id)) return false;
      seenIds.add(r.article_id);
      return true;
    });
    let selectedIds = ratedArticles.filter(r => r.selected).map(r => r.article_id);
    // Fallback: if LLM selected too few, auto-select top-rated by opportunity_score
    if (selectedIds.length < 5) {
      const sorted = [...ratedArticles].sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
      selectedIds = sorted.slice(0, 12).map(r => r.article_id);
    }
    const bernaPick = recent.find(a => a.id === result.berna_pick_id);

    // Bulk update article scores (status stays "pending")
    if (ratedArticles.length > 0) {
      const updates = ratedArticles.map(r => ({
        id: r.article_id,
        opportunity_score: r.opportunity_score,
        freshness_score: r.freshness_score,
        usefulness_score: r.usefulness_score,
      }));
      await base44.asServiceRole.entities.Article.bulkUpdate(updates);
    }

    // Create the briefing
    const today = new Date().toISOString().split('T')[0];
    const briefing = await base44.asServiceRole.entities.Briefing.create({
      date: today,
      title: `Good Morning, Berna — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`,
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
      berna_pick_id: result.berna_pick_id || '',
      berna_pick_title: bernaPick?.title || '',
      berna_pick_summary: bernaPick?.summary || '',
      article_ids: JSON.stringify(selectedIds),
      source_library: [...new Set(recent.map(a => a.source_name))].join(', '),
      status: 'ready',
    });

    return Response.json({
      briefing,
      articles_rated: ratedArticles.length,
      articles_selected: selectedIds.length,
      berna_pick_id: result.berna_pick_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});