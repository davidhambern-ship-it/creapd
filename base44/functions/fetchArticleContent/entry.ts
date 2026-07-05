import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Fetches the full article body text from the source URL and stores it natively.
 * If body_content already exists, returns it immediately (cached).
 * Supports an optional force_refresh to re-fetch.
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

    // Extract readable article content from the HTML
    const bodyText = extractReadableContent(html);

    if (!bodyText || bodyText.length < 200) {
      return Response.json({
        error: 'Could not extract readable content from this page',
        fallback_url: article.url,
      }, { status: 422 });
    }

    // Truncate to a reasonable max (store up to 50k chars)
    const truncated = bodyText.substring(0, 50000);

    // Save to article
    await base44.entities.Article.update(article_id, {
      body_content: truncated,
      body_fetched_at: new Date().toISOString(),
    });

    return Response.json({
      body_content: truncated,
      cached: false,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Extracts readable article content from raw HTML.
 * Strips scripts, styles, nav, headers, footers, ads.
 * Collects paragraph text and headline text in order.
 */
function extractReadableContent(html) {
  // Remove non-content sections
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract article, main, or section content if present (prefer semantic tags)
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/gi);
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/gi);
  let contentArea = '';
  if (articleMatch && articleMatch.length > 0) {
    contentArea = articleMatch.join(' ');
  } else if (mainMatch && mainMatch.length > 0) {
    contentArea = mainMatch.join(' ');
  } else {
    contentArea = cleaned;
  }

  // Extract paragraphs and headings in order
  const blockRegex = /<(?:p|h2|h3|h4|blockquote|li)[^>]*>([\s\S]*?)<\/(?:p|h2|h3|h4|blockquote|li)>/gi;
  const paragraphs = [];
  let match;
  while ((match = blockRegex.exec(contentArea)) !== null) {
    let text = match[1]
      .replace(/<[^>]*>/g, '') // strip inner tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 30) {
      // Detect heading tags to prefix
      const tagMatch = match[0].match(/^<(h2|h3|h4|blockquote)/i);
      if (tagMatch) {
        paragraphs.push({ type: tagMatch[1].toLowerCase(), text });
      } else {
        paragraphs.push({ type: 'p', text });
      }
    }
  }

  // Build formatted text output
  const parts = paragraphs.map(p => {
    if (p.type === 'h2' || p.type === 'h3' || p.type === 'h4') {
      return `\n\n## ${p.text}\n`;
    } else if (p.type === 'blockquote') {
      return `\n> ${p.text}\n`;
    }
    return `\n${p.text}`;
  });

  return parts.join('\n').trim();
}