import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    // Check for duplicate
    const existing = await base44.asServiceRole.entities.Article.filter({ url });
    if (existing.length > 0) {
      return Response.json({ error: 'Story already imported', article: existing[0] }, { status: 409 });
    }

    // Fetch the article
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Producer/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return Response.json({ error: `Failed to fetch article: HTTP ${res.status}` }, { status: 400 });
    const html = await res.text();
    const text = stripHtml(html).substring(0, 12000);

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const htmlTitle = titleMatch ? titleMatch[1].trim() : '';

    // Use LLM to analyze
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this news article for a broadcast production team. Extract key information and generate production-ready content.

Article URL: ${url}
Page title: ${htmlTitle}

Article content (first 12000 chars):
${text}

Provide a structured analysis with: a clean headline, a 2-3 sentence summary, the most appropriate category from: top_story, politics, world, national, state, local, business, markets, ai_business, ai, technology, science, health, environment, education, entertainment, sports, weather, crime_safety, military, food_agriculture, small_business, entrepreneurship, skilled_trades, hiring, creator_economy, good_news, fact_check, community, opinion, manufacturing, reshoring, supply_chain, state_economy, infrastructure, general. Also provide key facts, why it matters for the audience, talking points for broadcast, the source name (publication), and fact-check notes.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          category: { type: "string" },
          key_facts: { type: "string" },
          why_it_matters: { type: "string" },
          talking_points: { type: "string" },
          source_name: { type: "string" },
          fact_check_notes: { type: "string" },
        }
      }
    });

    const article = await base44.entities.Article.create({
      title: analysis.title || htmlTitle || 'Imported Story',
      url: url,
      summary: analysis.summary || '',
      source_name: analysis.source_name || new URL(url).hostname.replace('www.', ''),
      category: analysis.category || 'general',
      key_facts: analysis.key_facts || '',
      why_it_matters: analysis.why_it_matters || '',
      status: 'approved',
      credibility_score: 3,
    });

    return Response.json({ article, analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});