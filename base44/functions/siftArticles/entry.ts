import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      // Batch: get articles with unknown/null content_type
      articlesToSift = await base44.asServiceRole.entities.Article.filter(
        { content_type: 'unknown' }, '-created_date', 50
      );
      // Also try articles where content_type might be null (created before sift existed)
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

    let classified = 0, videoCount = 0, textCount = 0;
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
        prompt: `You are CREAPD's Content Sift Engine — a classification AI for a news production system.

Classify each article as either "video" or "text" based on whether its primary content is a video or a written article.

VIDEO indicators:
- Title starts with "WATCH:", "VIDEO:", "LIVE:", "STREAM:"
- Title contains words like "watch", "video", "livestream", "live stream", "footage", "clip"
- URL path contains /video/, /watch/, /live/, /embed/
- Source is a video platform (YouTube, TikTok, Vimeo, Twitch)

TEXT indicators:
- Standard news headline with no video keywords
- Standard news source URL (e.g. /article/, /news/, /2024/)
- No video-related language

Articles to classify:
${JSON.stringify(batchData, null, 2)}

Return a JSON object with a "results" array. Each item must have "id" (the article ID) and "content_type" ("video" or "text").`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  content_type: { type: "string", enum: ["video", "text"] }
                },
                required: ["id", "content_type"]
              }
            }
          },
          required: ["results"]
        }
      });

      const results = llmRes?.results || [];
      for (const r of results) {
        try {
          const update = { content_type: r.content_type };
          // Set transcription_status when classifying as video for the first time
          if (r.content_type === 'video') {
            update.transcription_status = 'pending';
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
      errors: errors.length > 0 ? errors.join('; ') : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});