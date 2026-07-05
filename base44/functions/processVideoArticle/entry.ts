import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function addHistory(historyStr, event, details) {
  let history = [];
  try { history = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
  history.push({ event, timestamp: new Date().toISOString(), details });
  return JSON.stringify(history);
}

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

async function loadActiveShowProfile(base44) {
  try {
    const profiles = await base44.asServiceRole.entities.ShowProfile.filter({ is_active: true }, '-created_date', 1);
    if (profiles.length > 0) return profiles[0];
  } catch (e) {}
  return null;
}

function buildShowContext(profile) {
  if (!profile) return '';
  const preferredTopics = safeParse(profile.preferred_topics, []);
  const excludedTopics = safeParse(profile.excluded_topics, []);
  const focusAreas = safeParse(profile.focus_areas, []);

  return `\n\nSHOW PROFILE CONTEXT:
- Show: ${profile.show_name || 'Unnamed'}
- Audience: ${profile.audience || 'General Public'}
- Tone: ${profile.default_tone || 'professional'}
- Region Focus: ${profile.region_local_focus || 'National'}
- Preferred Topics: ${preferredTopics.length > 0 ? preferredTopics.join(', ') : 'Any'}
- Excluded Topics: ${excludedTopics.length > 0 ? excludedTopics.join(', ') : 'None'}
- Controversy Tolerance: ${profile.controversy_tolerance || 'medium'}
- Entertainment Level: ${profile.entertainment_level ?? 5}/10
- Educational Level: ${profile.educational_level ?? 5}/10
- Focus Areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'General'}

Summarize this video in a way that is relevant to THIS SHOW's audience and tone.`;
}

function extractVideoUrls(html, articleUrl) {
  const results = [];

  // YouTube URLs
  const ytPatterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
    /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
  ];
  const seenYt = new Set();
  for (const pattern of ytPatterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      if (!seenYt.has(m[1])) {
        seenYt.add(m[1]);
        results.push({ type: 'youtube', id: m[1], url: `https://www.youtube.com/watch?v=${m[1]}` });
      }
    }
  }

  // Direct video/audio file URLs in <source>, <video>, <audio> tags
  const mediaTagRe = /<(?:source|video|audio)[^>]+src=["']([^"']+)["']/gi;
  let mt;
  while ((mt = mediaTagRe.exec(html)) !== null) {
    let url = mt[1];
    if (url.match(/\.(mp4|webm|mp3|wav|ogg|oga|m4a|mpeg|mpga|flac)(\?|$)/i)) {
      if (url.startsWith('//')) url = 'https:' + url;
      else if (url.startsWith('/')) {
        try { url = new URL(url, articleUrl).href; } catch (e) { continue; }
      }
      results.push({ type: 'direct', url });
    }
  }

  // Bare media URLs in JSON or data attributes
  const bareMediaRe = /["'](https?:\/\/[^"']+\.(?:mp4|webm|mp3|wav|ogg|oga|m4a|mpeg|mpga|flac)[^"']*)["']/gi;
  const seenDirect = new Set();
  let bm;
  while ((bm = bareMediaRe.exec(html)) !== null) {
    let url = bm[1];
    if (!seenDirect.has(url)) {
      seenDirect.add(url);
      results.push({ type: 'direct', url });
    }
  }

  return results;
}

async function extractYouTubeTranscript(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    let tracks;
    try { tracks = JSON.parse(captionMatch[1]); } catch (e) { return null; }
    if (!tracks || tracks.length === 0) return null;

    const track = tracks.find(t => t.languageCode?.startsWith('en')) || tracks[0];
    if (!track.baseUrl) return null;

    const capRes = await fetch(track.baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!capRes.ok) return null;
    const capXml = await capRes.text();

    const textMatches = capXml.match(/<text[^>]*>([\s\S]*?)<\/text>/gi) || [];
    const transcript = textMatches
      .map(t => t.replace(/<[^>]*>/g, ''))
      .map(t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' '))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return transcript || null;
  } catch (e) {
    return null;
  }
}

async function transcribeDirectMedia(base44, mediaUrl) {
  // Try passing the URL directly to TranscribeAudio first
  try {
    const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: mediaUrl });
    if (transcript) return transcript;
  } catch (e) {
    // Fallback: download, upload, then transcribe
  }

  // Download and upload
  try {
    const mediaRes = await fetch(mediaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CREAPD/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!mediaRes.ok) throw new Error(`Download failed: ${mediaRes.status}`);

    const contentLength = parseInt(mediaRes.headers.get('content-length') || '0');
    if (contentLength > 25 * 1024 * 1024) {
      throw new Error('Media file exceeds 25MB transcription limit');
    }

    const blob = await mediaRes.blob();
    const fileName = 'media.' + (blob.type.split('/')[1] || 'mp4');
    const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const transcript = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: file_url });
    return transcript;
  } catch (e) {
    throw e;
  }
}

async function processSingleArticle(base44, article, showProfile) {
  let transcript = null;
  let videoUrl = null;

  // Fetch the article page and extract video URLs
  if (article.url) {
    try {
      const pageRes = await fetch(article.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CREAPD/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const videoUrls = extractVideoUrls(html, article.url);

        // Try YouTube first
        const ytVideo = videoUrls.find(v => v.type === 'youtube');
        if (ytVideo) {
          videoUrl = ytVideo.url;
          transcript = await extractYouTubeTranscript(ytVideo.id);
        }

        // Try direct media files
        if (!transcript) {
          const directVideo = videoUrls.find(v => v.type === 'direct');
          if (directVideo) {
            videoUrl = directVideo.url;
            try {
              transcript = await transcribeDirectMedia(base44, directVideo.url);
            } catch (e) {
              // Transcription failed, will fall back to LLM summary
            }
          }
        }
      }
    } catch (e) {
      // Page fetch failed, will fall back to LLM summary
    }
  }

  // Generate summary using LLM — now with Show Profile context
  const hasTranscript = !!transcript;
  const showContext = buildShowContext(showProfile);

  const llmInput = hasTranscript
    ? `Based on this video transcript, provide a concise news summary:\n\nTitle: ${article.title}\nSource: ${article.source_name || 'Unknown'}\nTranscript: ${transcript.substring(0, 4000)}`
    : `This article was classified as video content but no transcript could be extracted. Based on the title and description, provide a concise news summary of what this video likely covers:\n\nTitle: ${article.title}\nDescription: ${article.summary || 'N/A'}\nSource: ${article.source_name || 'Unknown'}`;

  const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are CREAPD's Content Intelligence AI. ${llmInput}\n\nProvide a 2-3 paragraph summary of the key information. If a transcript is available, focus on the main facts and newsworthy points discussed. If no transcript is available, summarize based on the title and description, noting that this is a video article.${showContext}`,
  });
  const summary = typeof llmRes === 'string' ? llmRes : (llmRes?.response || JSON.stringify(llmRes));

  // Determine transcription status
  const transcriptionStatus = hasTranscript ? 'transcribed' : 'metadata_only';

  // Build history
  let history = addHistory(article.processing_history, 'processed',
    hasTranscript
      ? `Video transcribed via ${videoUrl?.includes('youtube') ? 'YouTube captions' : 'Whisper'} — ${transcript.length} chars`
      : 'No transcript extracted — AI summary generated from metadata only'
  );

  if (showProfile) {
    history = addHistory(history, 'show_profile_applied', `Summarized using Show Profile: ${showProfile.show_name}`);
  }

  // Update article — include show_profile_id if available
  const update = {
    transcript: transcript || null,
    video_url: videoUrl,
    transcription_status: transcriptionStatus,
    summary: summary || article.summary,
    full_text_excerpt: transcript
      ? transcript.substring(0, 500)
      : (summary || article.summary || '').substring(0, 500),
    processing_history: history,
  };

  if (showProfile && !article.show_profile_id) {
    update.show_profile_id = showProfile.id;
  }

  await base44.asServiceRole.entities.Article.update(article.id, update);

  return { hasTranscript, videoUrl, summary, transcriptionStatus };
}

Deno.serve(async (req) => {
  const startTime = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    try { await base44.auth.me(); } catch (e) {}

    const body = await req.json().catch(() => ({}));
    const manual = body.manual || false;

    // Check automation setting
    if (!manual) {
      const settings = await base44.asServiceRole.entities.ProducerSettings.filter({}, '-created_date', 1);
      if (settings.length > 0 && settings[0].auto_transcribe_videos === false) {
        return Response.json({ skipped: true, reason: 'Auto-transcribe is disabled in settings' });
      }
    }

    // Load the active Show Profile — key change
    const showProfile = await loadActiveShowProfile(base44);

    // Get article(s) to process
    let articlesToProcess = [];
    const targetId = body.article_id || body.event?.entity_id;
    if (targetId) {
      const article = await base44.asServiceRole.entities.Article.get(targetId);
      if (article) articlesToProcess.push(article);
    } else {
      articlesToProcess = await base44.asServiceRole.entities.Article.filter(
        { content_type: 'video', transcription_status: 'pending' }, '-created_date', 5
      );
    }

    if (articlesToProcess.length === 0) {
      return Response.json({ processed: 0, message: 'No video articles to process' });
    }

    const results = [];
    let processed = 0, transcribed = 0, summarized = 0;
    const errors = [];

    for (const article of articlesToProcess) {
      try {
        // Set processing status + history
        const procHistory = addHistory(article.processing_history, 'transcription_started', 'Video transcription processing started');
        await base44.asServiceRole.entities.Article.update(article.id, {
          transcription_status: 'processing',
          processing_history: procHistory,
        });

        const result = await processSingleArticle(base44, { ...article, processing_history: procHistory }, showProfile);

        if (result.hasTranscript) transcribed++;
        else summarized++;
        processed++;

        results.push({
          id: article.id,
          title: article.title,
          status: result.transcriptionStatus,
          has_transcript: result.hasTranscript,
        });
      } catch (e) {
        errors.push(`${article.title}: ${e.message}`);
        try {
          const failHistory = addHistory(article.processing_history, 'transcription_failed', e.message);
          await base44.asServiceRole.entities.Article.update(article.id, {
            transcription_status: 'failed',
            processing_history: failHistory,
          });
        } catch (e2) {}
      }
    }

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Video Transcription Engine',
      started_at: startTime,
      ended_at: new Date().toISOString(),
      status: errors.length === articlesToProcess.length ? 'failed' : (errors.length > 0 ? 'partial' : 'success'),
      sources_checked: articlesToProcess.length,
      articles_pulled: processed,
      articles_selected: transcribed,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });

    return Response.json({
      processed,
      transcribed,
      summarized,
      show_profile: showProfile ? showProfile.show_name : null,
      results,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});