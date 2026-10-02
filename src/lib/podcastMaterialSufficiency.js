const READY_STATUSES = new Set([
  'approved',
  'bernas_pick',
  'selected',
  'in_production',
  'package_generated',
  'edited',
  'ready_for_export',
]);

const FORMAT_RULES = [
  { match: /interview|celebrity interview/i, materialRatio: 0.68, avgItemMinutes: 7.5, avgSegmentMinutes: 16 },
  { match: /expert q&a/i, materialRatio: 0.72, avgItemMinutes: 7, avgSegmentMinutes: 14 },
  { match: /panel|roundtable/i, materialRatio: 0.82, avgItemMinutes: 6.5, avgSegmentMinutes: 12 },
  { match: /debate/i, materialRatio: 0.9, avgItemMinutes: 6.5, avgSegmentMinutes: 14 },
  { match: /call-in|audience participation/i, materialRatio: 0.75, avgItemMinutes: 6, avgSegmentMinutes: 10 },
  { match: /storytelling/i, materialRatio: 1.08, avgItemMinutes: 7.5, avgSegmentMinutes: 12 },
  { match: /educational/i, materialRatio: 1.12, avgItemMinutes: 7, avgSegmentMinutes: 10 },
  { match: /news discussion/i, materialRatio: 1.12, avgItemMinutes: 6, avgSegmentMinutes: 8 },
  { match: /solo commentary/i, materialRatio: 1.15, avgItemMinutes: 7, avgSegmentMinutes: 10 },
  { match: /late night|lifestyle/i, materialRatio: 1.0, avgItemMinutes: 6.5, avgSegmentMinutes: 9 },
];

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function words(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function list(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function formatRule(format) {
  return FORMAT_RULES.find(rule => rule.match.test(String(format || ''))) || {
    materialRatio: 1,
    avgItemMinutes: 6.5,
    avgSegmentMinutes: 10,
  };
}

function approvedMaterial(item) {
  if (item?.approved === true) return true;
  return READY_STATUSES.has(String(item?.status || '').toLowerCase());
}

function sourceWordCount(item) {
  if (Number.isFinite(Number(item?.word_count))) return Math.max(0, Number(item.word_count));
  return Math.max(
    words(item?.body_content),
    words(item?.transcript),
    words(item?.full_text_excerpt),
    words(item?.script),
    words(item?.summary),
  );
}

function hasValue(value) {
  return Boolean(String(value || '').trim());
}

function duplicateKey(item) {
  return String(item?.duplicate_group_id || '').trim();
}

export function estimatePodcastMaterialMinutes(item, seenDuplicateGroups = new Set()) {
  const wordCount = sourceWordCount(item);

  // Dense source material can support discussion beyond its literal reading time,
  // but one article should never be allowed to "fill" an entire episode.
  let minutes = Math.max(1.5, Math.min(11, wordCount / 185));

  if (hasValue(item?.key_facts)) minutes += 0.8;
  if (hasValue(item?.why_it_matters)) minutes += 0.5;
  if (hasValue(item?.timeline)) minutes += 0.5;
  if (hasValue(item?.talking_points)) minutes += 1.25;
  if (hasValue(item?.opposing_viewpoints || item?.counter_perspectives)) minutes += 0.75;
  if (hasValue(item?.fact_check_notes || item?.verification_notes)) minutes += 0.5;
  if (hasValue(item?.broll_suggestions)) minutes += 0.2;

  const duplicate = duplicateKey(item);
  if (duplicate) {
    if (seenDuplicateGroups.has(duplicate)) {
      minutes *= 0.38;
    } else {
      seenDuplicateGroups.add(duplicate);
    }
  }

  return Math.round(Math.min(12, minutes) * 10) / 10;
}

export function assessPodcastMaterialSufficiency(configuration = {}, material = []) {
  const totalRuntime = Math.max(5, number(configuration.total_show_runtime, 60));
  const intro = Math.max(0, number(configuration.intro_runtime, 2));
  const outro = Math.max(0, number(configuration.outro_runtime, 2));
  const sponsor = Math.max(0, number(configuration.commercial_sponsor_runtime, 0));
  const fixedMinutes = Math.min(totalRuntime - 1, intro + outro + sponsor);
  const editorialMinutes = Math.max(1, totalRuntime - fixedMinutes);

  const rule = formatRule(configuration.show_format);
  // The target already includes a modest research buffer so CREAPD has enough
  // material to cut, combine, and transition without manufacturing filler.
  const researchTargetMinutes = Math.max(
    4,
    Math.ceil(editorialMinutes * rule.materialRatio * 1.08),
  );

  const approved = (Array.isArray(material) ? material : []).filter(approvedMaterial);
  const seenDuplicateGroups = new Set();
  const contributions = approved.map(item => ({
    id: item?.id || null,
    title: item?.title || 'Untitled material',
    minutes: estimatePodcastMaterialMinutes(item, seenDuplicateGroups),
    category: item?.category || null,
  }));

  const approvedMinutes = Math.round(
    contributions.reduce((sum, item) => sum + item.minutes, 0) * 10,
  ) / 10;

  const remainingMinutes = Math.max(
    0,
    Math.round((researchTargetMinutes - approvedMinutes) * 10) / 10,
  );
  const progressPercent = researchTargetMinutes > 0
    ? Math.min(100, Math.round((approvedMinutes / researchTargetMinutes) * 100))
    : 100;

  const recommendedItemCount = Math.max(
    1,
    Math.ceil(researchTargetMinutes / rule.avgItemMinutes),
  );
  const recommendedSegmentCount = Math.max(
    1,
    Math.ceil(editorialMinutes / rule.avgSegmentMinutes),
  );
  const additionalItems = remainingMinutes > 0
    ? Math.max(1, Math.ceil(remainingMinutes / rule.avgItemMinutes))
    : 0;

  const configuredTopics = list(configuration.topics);
  const coveredTopics = new Set();
  for (const item of approved) {
    for (const topic of list(item?.matched_show_topics)) {
      coveredTopics.add(String(topic).toLowerCase());
    }
    if (item?.category) coveredTopics.add(String(item.category).toLowerCase());
  }
  const uncoveredTopics = configuredTopics.filter(
    topic => !coveredTopics.has(String(topic).toLowerCase()),
  );

  let state = 'not_enough';
  if (progressPercent >= 100) state = 'ready';
  else if (progressPercent >= 75) state = 'almost_ready';

  const message = state === 'ready'
    ? `Enough approved material is available to build a ${totalRuntime}-minute episode without relying on filler.`
    : state === 'almost_ready'
      ? `Almost ready. CREAPD estimates about ${remainingMinutes} more minute${remainingMinutes === 1 ? '' : 's'} of usable material would make the episode production-ready.`
      : `More approved research is needed. CREAPD estimates about ${remainingMinutes} additional minute${remainingMinutes === 1 ? '' : 's'} of usable material.`;

  return {
    state,
    message,
    total_runtime_minutes: totalRuntime,
    fixed_runtime_minutes: fixedMinutes,
    editorial_runtime_minutes: editorialMinutes,
    research_target_minutes: researchTargetMinutes,
    approved_material_minutes: approvedMinutes,
    remaining_minutes: remainingMinutes,
    progress_percent: progressPercent,
    approved_item_count: approved.length,
    discovered_item_count: Array.isArray(material) ? material.length : 0,
    recommended_item_count: recommendedItemCount,
    recommended_additional_items: additionalItems,
    recommended_segment_count: recommendedSegmentCount,
    show_format: configuration.show_format || 'Podcast',
    uncovered_topics: uncoveredTopics,
    contributions,
  };
}
