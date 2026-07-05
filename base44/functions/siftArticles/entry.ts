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
  if (!profile) return null;

  const preferredTopics = safeParse(profile.preferred_topics, []);
  const excludedTopics = safeParse(profile.excluded_topics, []);
  const preferredSources = safeParse(profile.preferred_sources, []);
  const blockedSources = safeParse(profile.blocked_sources, []);
  const contentTypesAllowed = safeParse(profile.content_types_allowed, ['text', 'video']);
  const allowedCategories = safeParse(profile.allowed_categories, []);
  const rejectedCategories = safeParse(profile.rejected_categories, []);
  const focusAreas = safeParse(profile.focus_areas, []);

  return `ACTIVE SHOW PROFILE:
- Show Name: ${profile.show_name || 'Unnamed Show'}
- Target Audience: ${profile.audience || 'General Public'}
- Content Domain: ${profile.content_domain || 'news'}
- Tone: ${profile.default_tone || 'professional'}
- Region/Local Focus: ${profile.region_local_focus || 'National'}
- Preferred Topics: ${preferredTopics.length > 0 ? preferredTopics.join(', ') : 'Any relevant topic'}
- Excluded Topics: ${excludedTopics.length > 0 ? excludedTopics.join(', ') : 'None specified'}
- Allowed Content Types: ${contentTypesAllowed.join(', ')}
- Allowed Categories: ${allowedCategories.length > 0 ? allowedCategories.join(', ') : 'All categories'}
- Rejected Categories: ${rejectedCategories.length > 0 ? rejectedCategories.join(', ') : 'None'}
- Preferred Sources: ${preferredSources.length > 0 ? preferredSources.join(', ') : 'All sources'}
- Blocked Sources: ${blockedSources.length > 0 ? blockedSources.join(', ') : 'None blocked'}
- Political/Cultural Balance: ${profile.political_cultural_balance || 'balanced'}
- Controversy Tolerance: ${profile.controversy_tolerance || 'medium'}
- Entertainment Level: ${profile.entertainment_level ?? 5}/10
- Educational Level: ${profile.educational_level ?? 5}/10
- Focus Areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'General'}
- Minimum Story Score: ${profile.minimum_story_score ?? 5}/10
- Freshness Window: ${profile.freshness_window_hours ?? 48} hours
- Story Priority Rules: ${profile.story_priority_rules || 'Default priority'}`;
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

    // Load the active Show Profile — this is the key change
    const showProfile = await loadActiveShowProfile(base44);
    const showContext = buildShowContext(showProfile);

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

    let classified = 0, videoCount = 0, textCount = 0, needsReviewCount = 0, rejectedByProfileCount = 0;
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

      const showPromptSection = showContext
        ? `${showContext}

You are evaluating articles for THIS SPECIFIC SHOW. Every article must be assessed not just for general newsworthiness but for whether it fits this show's audience, topics, tone, and content strategy.

SHOW FIT EVALUATION:
- show_fit_score: 0-10 (how well this article fits the active Show Profile — considers topic relevance, audience match, regional focus, content type, category alignment)
- matched_show_topics: Array of strings — which preferred topics from the Show Profile this article matches (empty array if none)
- rejected_by_show_profile: true/false — true if the article should be rejected because it violates the Show Profile (blocked source, rejected category, excluded topic, content type not allowed, or show_fit_score below minimum)
- rejection_reason: String explaining why the article was rejected by the Show Profile (empty string if not rejected)

REJECTION RULES:
- If the source is in the Blocked Sources list → rejected_by_show_profile = true
- If the category is in the Rejected Categories list → rejected_by_show_profile = true
- If the article matches an Excluded Topic → rejected_by_show_profile = true
- If the content_type is not in Allowed Content Types → rejected_by_show_profile = true
- If show_fit_score is below Minimum Story Score → rejected_by_show_profile = true
- Otherwise → rejected_by_show_profile = false

Articles:`
        : `Articles:`;

      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are CREAPD's Content Intelligence Engine. For each article, classify it AND provide a production-ready review.

${showPromptSection}

${JSON.stringify(batchData, null, 2)}

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

${showContext ? 'SHOW FIT EVALUATION (as described above):' : 'If no Show Profile is active, set show_fit_score to the same as overall_story_score, matched_show_topics to [], rejected_by_show_profile to false, and rejection_reason to "".'}

Return a JSON object with exactly these keys for each article: id, content_type, suggested_angle, suggested_segment, source_quality_score, overall_story_score, safety_flags, show_fit_score, matched_show_topics, rejected_by_show_profile, rejection_reason.`,
        response_json_schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  content_type: { type: "string", "enum": ["video", "text"] },
                  suggested_angle: { type: "string" },
                  suggested_segment: { type: "string", "enum": ["Lead Story", "Quick Hit", "Feature", "Breaking", "Talking Points", "Fact Check", "B-Roll Package"] },
                  source_quality_score: { type: "number" },
                  overall_story_score: { type: "number" },
                  safety_flags: { type: "array", items: { type: "string" } },
                  show_fit_score: { type: "number" },
                  matched_show_topics: { type: "array", items: { type: "string" } },
                  rejected_by_show_profile: { type: "boolean" },
                  rejection_reason: { type: "string" }
                },
                required: ["id", "content_type", "suggested_angle", "suggested_segment", "source_quality_score", "overall_story_score", "safety_flags", "show_fit_score", "matched_show_topics", "rejected_by_show_profile", "rejection_reason"]
              }
            }
          },
          required: ["results"]
        }
      });

      const results = llmRes?.results || [];
      const minScore = showProfile?.minimum_story_score ?? 5;

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

          // Store Show Profile fit evaluation
          if (showProfile) {
            update.show_profile_id = showProfile.id;
          }
          update.show_fit_score = r.show_fit_score ?? r.overall_story_score ?? 5;
          update.matched_show_topics = JSON.stringify(r.matched_show_topics || []);
          update.rejected_by_show_profile = r.rejected_by_show_profile || false;
          update.rejection_reason = r.rejection_reason || '';

          // History: sifted + reviewed
          let history = addHistory(article?.processing_history, 'sifted', `Classified as ${r.content_type}`);
          history = addHistory(history, 'reviewed', `AI review — story score: ${r.overall_story_score}/10, show fit: ${r.show_fit_score ?? 'N/A'}/10, segment: ${r.suggested_segment}`);

          // Show Profile rejection logic
          if (showProfile && r.rejected_by_show_profile) {
            update.status = 'rejected';
            update.rejection_reason = `Show Profile: ${r.rejection_reason || 'Does not match show criteria'}`;
            history = addHistory(history, 'rejected_by_show_profile', `Rejected — ${r.rejection_reason || 'Does not match show criteria'}`);
            rejectedByProfileCount++;
          } else if (showProfile && (r.show_fit_score ?? 10) < minScore) {
            // Below minimum score but not explicitly rejected — flag for review
            if (article?.status === 'pending' || !article?.status) {
              update.status = 'needs_review';
              update.rejection_reason = `Show fit score ${r.show_fit_score} below minimum ${minScore}`;
              history = addHistory(history, 'flagged', `Show fit score ${r.show_fit_score}/${minScore} — needs producer review`);
              needsReviewCount++;
            }
          } else {
            // Low score safeguard: flag for review
            const LOW_SCORE = 3;
            if ((r.source_quality_score <= LOW_SCORE || r.overall_story_score <= LOW_SCORE) &&
                (article?.status === 'pending' || !article?.status)) {
              update.status = 'needs_review';
              update.processing_history = addHistory(history, 'flagged', `Low score — needs producer review (source=${r.source_quality_score}, story=${r.overall_story_score})`);
              needsReviewCount++;
            }
          }

          update.processing_history = history;

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
      rejected_by_show_profile_count: rejectedByProfileCount,
      show_profile: showProfile ? showProfile.show_name : null,
      errors: errors.length > 0 ? errors.join('; ') : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});