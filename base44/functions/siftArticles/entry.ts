import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function addHistory(historyStr, event, details) {
  let history = [];
  try { history = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
  history.push({ event, timestamp: new Date().toISOString(), details });
  return JSON.stringify(history);
}

Deno.serve(async (req) => {
  const startTime = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (e) {}

    const body = await req.json().catch(() => ({}));
    const manual = body.manual || false;

    // Check automation setting (skip if automated and setting is off)
    if (!manual) {
      const settings = await base44.asServiceRole.entities.ProducerSettings.filter({}, '-created_date', 1);
      if (settings.length > 0 && settings[0].auto_sift_content === false) {
        return Response.json({ skipped: true, reason: 'Auto-sift is disabled in settings' });
      }
    }

    // Determine which articles to process
    let articlesToSift = [];
    const targetId = body.article_id || body.event?.entity_id;
    if (targetId) {
      const article = await base44.asServiceRole.entities.Article.get(targetId);
      if (article) articlesToSift.push(article);
    } else {
      articlesToSift = await base44.asServiceRole.entities.Article.filter(
        { content_type: 'unknown' }, '-created_date', 50
      );
      const allRecent = await base44.asServiceRole.entities.Article.list('-created_date', 100);
      for (const a of allRecent) {
        if (!a.content_type && !articlesToSift.find(x => x.id === a.id)) {
          articlesToSift.push(a);
        }
      }
    }

    // Filter to only unclassified articles
    articlesToSift = articlesToSift.filter(a => a && (!a.content_type || a.content_type === 'unknown'));
    if (articlesToSift.length === 0) {
      return Response.json({ classified: 0, message: 'No articles to classify' });
    }

    let classified = 0, videoCount = 0, textCount = 0, needsReviewCount = 0;
    const errors = [];

    // Process in batches of 10
    for (let i = 0; i < articlesToSift.length; i += 10) {
      const batch = articlesToSift.slice(i, i + 10);
      const batchData = batch.map(a => ({
        id: a.id,
        title: a.title,
        summary: (a.summary || '').substring(0, 300),
        url: a.url,
        source_name: a.source_name
      }));

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are CREAPD's Content Intelligence Engine. For each article, classify it AND provide a production-ready review.

CLASSIFICATION:
- content_type: "video" or "text" (based on whether primary content is video or written article)

VIDEO indicators: Title starts with "WATCH:", "VIDEO:", "LIVE:", "STREAM:"; contains "watch", "video", "livestream", "footage", "clip"; URL has /video/, /watch/, /live/, /embed/
TEXT indicators: Standard news headline, standard news source URL, no video-related language

PRODUCTION REVIEW:
- suggested_angle: A unique, compelling angle for covering this story (1-2 sentences)
- suggested_segment: One of: "Lead Story", "Quick Hit", "Feature", "Breaking", "Talking Points", "Fact Check", "B-Roll Package"
- source_quality_score: 0-10 (source reliability and authority — major outlets 7-10, regional 5-7, blogs/aggregators 3-5)
- overall_story_score: 0-10 (newsworthiness, impact, timeliness combined)
- safety_flags: Array of strings from: "unverified_claim", "sensitive_topic", "potential_bias", "breaking_unconfirmed", "opinion_content", "low_credibility_source". Empty array if no concerns.

Articles:
${JSON.stringify(batchData, null, 2)}`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  content_type: { type: "string", enum: ["video", "text"] },
                  suggested_angle: { type: "string" },
                  suggested_segment: { type: "string", enum: ["Lead Story", "Quick Hit", "Feature", "Breaking", "Talking Points", "Fact Check", "B-Roll Package"] },
                  source_quality_score: { type: "number" },
                  overall_story_score: { type: "number" },
                  safety_flags: { type: "array", items: { type: "string" } }
                },
                required: ["id", "content_type", "suggested_angle", "suggested_segment", "source_quality_score", "overall_story_score", "safety_flags"]
              }
            }
          },
          required: ["results"]
        }
      });

      const results = llmRes?.results || [];
      for (const r of results) {
        try {
          const article = articlesToSift.find(a => a.id === r.id);
          const update = { content_type: r.content_type };

          // Set transcription_status when classifying as video
          if (r.content_type === 'video') {
            update.transcription_status = 'pending';
          }

          // Add review fields
          update.suggested_angle = r.suggested_angle || '';
          update.suggested_segment = r.suggested_segment || 'Quick Hit';
          update.source_quality_score = r.source_quality_score ?? 5;
          update.overall_story_score = r.overall_story_score ?? 5;
          update.safety_flags = JSON.stringify(r.safety_flags || []);

          // History: sifted + reviewed
          let history = addHistory(article?.processing_history, 'sifted', `Classified as ${r.content_type}`);
          history = addHistory(history, 'reviewed', `AI review — score: ${r.overall_story_score}/10, segment: ${r.suggested_segment}`);
          update.processing_history = history;

          // Low score safeguard: flag for review
          const LOW_SCORE = 3;
          if ((r.source_quality_score <= LOW_SCORE || r.overall_story_score <= LOW_SCORE) &&
              (article?.status === 'pending' || !article?.status)) {
            update.status = 'needs_review';
            update.processing_history = addHistory(history, 'flagged', `Low score — needs producer review (source=${r.source_quality_score}, story=${r.overall_story_score})`);
            needsReviewCount++;
          }

          await base44.asServiceRole.entities.Article.update(r.id, update);
          classified++;
          if (r.content_type === 'video') videoCount++;
          else textCount++;
        } catch (e) {
          errors.push(`Failed to update ${r.id}: ${e.message}`);
        }
      }
    }

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Content Sift Engine',
      started_at: startTime,
      ended_at: new Date().toISOString(),
      status: errors.length === articlesToSift.length && articlesToSift.length > 0 ? 'failed' : (errors.length > 0 ? 'partial' : 'success'),
      sources_checked: articlesToSift.length,
      articles_pulled: classified,
      articles_selected: videoCount,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });

    return Response.json({
      classified,
      video_count: videoCount,
      text_count: textCount,
      needs_review_count: needsReviewCount,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});