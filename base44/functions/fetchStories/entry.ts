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

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*?\\s${attr}=["']([^"']*)["']`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function parseFeed(xml) {
  const items = [];
  const itemRe = /<item[\s\S]*?>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description');
    const date = extractTag(block, 'pubDate') || extractTag(block, 'published');
    if (title && link) items.push({ title: stripHtml(title), link: link.trim(), description: stripHtml(desc), pubDate: date });
  }
  const entryRe = /<entry[\s\S]*?>([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const desc = extractTag(block, 'summary') || extractTag(block, 'content');
    const date = extractTag(block, 'published') || extractTag(block, 'updated');
    if (title && link) items.push({ title: stripHtml(title), link: link.trim(), description: stripHtml(desc), pubDate: date });
  }
  return items;
}

function titleSimilarity(a, b) {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.min(wa.size, wb.size);
}

Deno.serve(async (req) => {
  const startTime = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (e) {} // Auth optional — works for scheduled calls

    const body = await req.json().catch(() => ({}));
    const layerFilter = body.source_layer;

    let sources = await base44.asServiceRole.entities.Source.filter({ enabled: true });
    if (layerFilter) sources = sources.filter(s => s.source_layer === layerFilter);
    const feedSources = sources.filter(s => s.feed_url);

    const existing = await base44.asServiceRole.entities.Article.list('-created_date', 500);
    const urlSet = new Set(existing.map(a => a.url).filter(Boolean));
    const titles = existing.map(a => (a.title || '').toLowerCase().trim()).filter(Boolean);

    let fetched = 0, created = 0, dupes = 0;
    const errors = [];

    for (const src of feedSources) {
      try {
        const res = await fetch(src.feed_url, {
          headers: { 'User-Agent': 'Producer/1.0 (+https://producer.app)' },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) { errors.push(`${src.name}: HTTP ${res.status}`); continue; }
        const xml = await res.text();
        const items = parseFeed(xml);
        fetched += items.length;

        for (const item of items.slice(0, 20)) {
          if (urlSet.has(item.link)) { dupes++; continue; }
          const tl = (item.title || '').toLowerCase().trim();
          if (tl && titles.some(t => t === tl || titleSimilarity(t, tl) > 0.85)) { dupes++; continue; }

          await base44.asServiceRole.entities.Article.create({
            title: item.title,
            url: item.link,
            summary: (item.description || '').substring(0, 500),
            source_name: src.name,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            category: src.category || 'general',
            status: 'pending',
            credibility_score: src.trust_rating || 3,
          });
          urlSet.add(item.link);
          if (tl) titles.push(tl);
          created++;
        }

        await base44.asServiceRole.entities.Source.update(src.id, { last_checked: new Date().toISOString() });
      } catch (e) {
        errors.push(`${src.name}: ${e.message}`);
      }
    }

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Story Source Engine Fetch',
      started_at: startTime,
      ended_at: new Date().toISOString(),
      status: errors.length === feedSources.length && feedSources.length > 0 ? 'failed' : (errors.length > 0 ? 'partial' : 'success'),
      sources_checked: feedSources.length,
      articles_pulled: fetched,
      duplicates_removed: dupes,
      articles_selected: created,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });

    return Response.json({
      sources_checked: feedSources.length,
      articles_pulled: fetched,
      articles_created: created,
      duplicates_removed: dupes,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});