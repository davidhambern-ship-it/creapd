import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Fetches the full article body text from the source URL and stores it natively.
 * Uses LLM-based extraction to isolate the actual article content from
 * navigation, sidebars, video playlists, and other non-article page elements.
 * Also extracts video URLs (YouTube embeds, direct media) for video articles.
 * Caches the extracted text on the Article entity for instant subsequent reads.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { article_id, force_refresh } = await req.json();
    if (!article_id) return Response.json({ error: 'article_id is required' }, { status: 400 });

    const article = await base44.entities.Article.get(article_id);
    if (!article) return Response.json({ error: 'Article not found' }, { status: 404 });
    if (!article.url) return Response.json({ error: 'Article has no source URL' }, { status: 400 });

    // Return cached content if available and not forcing refresh
    if (article.body_content && !force_refresh) {
      return Response.json({
        body_content: article.body_content,
        video_url: article.video_url || null,
        cached: true,
        fetched_at: article.body_fetched_at,
      });
    }

    // Fetch the article page
    const res = await fetch(article.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CREAPD/1.0; +https://creapd.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return Response.json({
        error: `Could not fetch article (HTTP ${res.status})`,
        fallback_url: article.url,
      }, { status: 502 });
    }

    const html = await res.text();
    const rawText = stripHtml(html).substring(0, 15000);
    const videoUrl = extractVideoUrl(html, article.url);

    if (rawText.length < 200) {
      // Save video_url even if text extraction fails
      if (videoUrl) {
        await base44.entities.Article.update(article_id, { video_url: videoUrl });
      }
      return Response.json({
        error: 'Page has too little text content to extract',
        video_url: videoUrl,
        fallback_url: article.url,
      }, { status: 422 });
    }

    // Use LLM to extract ONLY the actual article body
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are CREAPD's Article Extraction Engine. Extract the FULL article body text from this web page.

CRITICAL RULES:
- Extract ONLY the actual article content — the main story/report text
- IGNORE: video playlist titles, video durations, sidebar widgets, navigation menus, related story links, ad text, social media embeds, "Live" badges, show segment listings, author bios (unless part of the article)
- IGNORE: site headers, footers, cookie notices, subscription prompts
- If this page is primarily a VIDEO page (no written article body), return an empty body_content and set is_video_page=true
- Preserve the natural reading order of the article
- Format headings as ## Heading, preserve blockquotes as > text, keep paragraphs separated
- Do NOT add any commentary — output ONLY the extracted article text

Article title (for reference): ${article.title}
Source: ${article.source_name || 'Unknown'}

Page text content:
${rawText}`,
      response_json_schema: {
        type: "object",
        properties: {
          body_content: { type: "string", description: "The full article body text, formatted with markdown headings and paragraphs. Empty string if this is a video page with no article text." },
          is_video_page: { type: "boolean", description: "True if this page is primarily a video player with no written article body" },
          word_count: { type: "number", description: "Approximate word count of the extracted article body" }
        },
        required: ["body_content", "is_video_page"]
      }
    });

    const bodyContent = (llmRes?.body_content || '').trim();
    const isVideoPage = llmRes?.is_video_page || false;

    // Save video_url regardless of body content status
    if (videoUrl) {
      await base44.entities.Article.update(article_id, { video_url: videoUrl });
    }

    if (!bodyContent || bodyContent.length < 100 || isVideoPage) {
      return Response.json({
        error: isVideoPage
          ? 'This is a video page with no written article to display'
          : 'Could not extract readable article content from this page',
        is_video_page: isVideoPage,
        video_url: videoUrl,
        fallback_url: article.url,
      }, { status: 422 });
    }

    // Save body content + video_url
    const updateFields = {
      body_content: bodyContent,
      body_fetched_at: new Date().toISOString(),
    };
    if (videoUrl) updateFields.video_url = videoUrl;

    await base44.entities.Article.update(article_id, updateFields);

    return Response.json({
      body_content: bodyContent,
      video_url: videoUrl,
      cached: false,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

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

function extractVideoUrl(html, articleUrl) {
  // YouTube embeds
  const ytPatterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];
  for (const pattern of ytPatterns) {
    const m = html.match(pattern);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  }

  // Direct media files in <source>, <video>, <audio> tags
  const mediaTagRe = /<(?:source|video|audio)[^>]+src=["']([^"']+)["']/gi;
  let mt;
  while ((mt = mediaTagRe.exec(html)) !== null) {
    let url = mt[1];
    if (url.match(/\.(mp4|webm|mp3|wav|ogg|oga|m4a|mpeg|mpga|flac)(\?|$)/i)) {
      if (url.startsWith('//')) url = 'https:' + url;
      else if (url.startsWith('/')) {
        try { url = new URL(url, articleUrl).href; } catch (e) { continue; }
      }
      return url;
    }
  }

  // Bare media URLs in JSON or data attributes
  const bareMediaRe = /["'](https?:\/\/[^"']+\.(?:mp4|webm|mp3|wav|ogg|oga|m4a|mpeg|mpga|flac)[^"']*)["']/i;
  const bm = html.match(bareMediaRe);
  if (bm) return bm[1];

  return null;
}