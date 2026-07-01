export const STUDY_TYPE_LABELS = {
  passage: 'Passage Study',
  topic: 'Topic Study',
  question: 'Question Study',
  doctrine: 'Doctrine Study',
  original_language: 'Original Language Study',
  word: 'Word Study',
  character: 'Character Study',
  biography: 'Biography Study',
  place: 'Place Study',
  historical_event: 'Historical Event Study',
  comparative: 'Comparative Study',
  current_event: 'Current Event Study',
  apologetics: 'Apologetics Study',
  theme: 'Theme Study',
  timeline: 'Timeline Study',
  cultural: 'Cultural Study',
  philosophy: 'Philosophy Study',
  tradition: 'Tradition Study',
  custom: 'Custom Research'
};

export const STUDY_TYPE_ICONS = {
  passage: 'BookOpen',
  topic: 'Lightbulb',
  question: 'HelpCircle',
  doctrine: 'Scroll',
  original_language: 'Languages',
  word: 'Type',
  character: 'User',
  biography: 'UserSquare',
  place: 'MapPin',
  historical_event: 'Landmark',
  comparative: 'GitCompare',
  current_event: 'Newspaper',
  apologetics: 'Shield',
  theme: 'Palette',
  timeline: 'Clock',
  cultural: 'Globe',
  philosophy: 'Brain',
  tradition: 'Church',
  custom: 'Compass'
};

export const RESEARCH_STEPS = [
  'Determining Study Type',
  'Selecting Research Pipeline',
  'Loading Approved Sources',
  'Searching Primary Sources',
  'Analyzing Original Language',
  'Searching Historical Sources',
  'Building Timeline',
  'Comparative Analysis',
  'Multiple Perspectives',
  'Generating Citations',
  'Preparing Research Summary'
];

export const PRODUCTION_TYPES_FROM_RESEARCH = [
  'Sermon',
  'Bible Study',
  'Devotional',
  'Podcast',
  'Livestream',
  'Lesson',
  'Discussion Guide',
  'Educational Presentation',
  'Article',
  'Custom Production'
];

export function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  if (Array.isArray(str) || typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return fallback; }
}