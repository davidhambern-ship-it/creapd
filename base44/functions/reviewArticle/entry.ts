import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function addHistory(historyStr, event, details) {
  let history = [];
  try { history = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
  history.push({ event, timestamp: new Date().toISOString(), details });
  return JSON.stringify(history);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (e) {}

    const body = await req.json().catch(() => ({}));
    const articleId = body.article_id || body.event?.entity_id;
    if (!articleId) {
      return Response.json({ error: 'article_id required' }, { status: 400 });
    }

    const article = await base44.asServiceRole.entities.Article.get(articleId);
    if (!article) {
      return Response.json({ error: 'Article not found' }, { status: 404 });
    }

    // Build context for AI review
    const context = {
      title: article.title,
      summary: article.summary || '',
      source_name: article.source_name || '',
      url: article.url,
      category: article.category || '',
      content_type: article.content_type || 'unknown',
      has_transcript: !!article.transcript,
      transcript_excerpt: article.transcript ? article.transcript.substring(0, 2000) : null,
      full_text_excerpt: article.full_text_excerpt || '',
      why_it_matters: article.why_it_matters || '',
      key_facts: article.key_facts || '',
    };

    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are CREAPD's Content Intelligence AI. Review this news article and provide a production-ready analysis.

Article context:
${JSON.stringify(context, null, 2)}

Provide:
1. summary: A concise 2-3 paragraph summary. Use the transcript if available; otherwise use title/description.
2. suggested_angle: A unique, compelling angle for covering this story (1-2 sentences)
3. suggested_segment: One of: "Lead Story", "Quick Hit", "Feature", "Breaking", "Talking Points", "Fact Check", "B-Roll Package"
4. source_quality_score: 0-10 (source reliability/authority)
5. overall_story_score: 0-10 (newsworthiness, impact, timeliness combined)
6. safety_flags: Array of strings from: "unverified_claim", "sensitive_topic", "potential_bias", "breaking_unconfirmed", "opinion_content", "low_credibility_source". Empty array if no concerns.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          suggested_angle: { type: "string" },
          suggested_segment: { type: "string", enum: ["Lead Story", "Quick Hit", "Feature", "Breaking", "Talking Points", "Fact Check", "B-Roll Package"] },
          source_quality_score: { type: "number" },
          overall_story_score: { type: "number" },
          safety_flags: { type: "array", items: { type: "string" } }
        },
        required: ["summary", "suggested_angle", "suggested_segment", "source_quality_score", "overall_story_score", "safety_flags"]
      }
    });

    // Build history
    let history = addHistory(article.processing_history, 'reviewed', `AI review complete — score: ${llmRes.overall_story_score}/10, segment: ${llmRes.suggested_segment}`);

    // Low score safeguard
    const LOW_SCORE_THRESHOLD = 3;
    let newStatus = article.status;
    if ((llmRes.source_quality_score <= LOW_SCORE_THRESHOLD || llmRes.overall_story_score <= LOW_SCORE_THRESHOLD) &&
        (article.status === 'pending' || !article.status)) {
      newStatus = 'needs_review';
      history = addHistory(history, 'flagged', `Low score flagged for review (source=${llmRes.source_quality_score}, story=${llmRes.overall_story_score})`);
    }

    const update = {
      summary: llmRes.summary,
      suggested_angle: llmRes.suggested_angle,
      suggested_segment: llmRes.suggested_segment,
      source_quality_score: llmRes.source_quality_score,
      overall_story_score: llmRes.overall_story_score,
      safety_flags: JSON.stringify(llmRes.safety_flags || []),
      processing_history: history,
    };
    if (newStatus !== article.status) {
      update.status = newStatus;
    }

    await base44.asServiceRole.entities.Article.update(articleId, update);

    return Response.json({
      success: true,
      article_id: articleId,
      ...update,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});