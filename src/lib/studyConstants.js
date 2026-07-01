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

const VALID_PRODUCTION_TYPES = [
  'Sermon', 'Bible Study', 'Devotional', 'Teaching Series', 'Podcast',
  'Livestream', 'Prayer Meeting', 'Study Group', 'Youth Lesson',
  "Children's Lesson", 'Sunday School', 'Educational Presentation',
  'Conference Message', 'Retreat Session', 'Discussion Panel',
  'Q&A Session', 'Meditation Session', 'Scripture Reading',
  'Worship Service', 'Holiday Production', 'Memorial Service',
  'Wedding Ceremony', 'Funeral Message', 'Community Event',
  'Custom Production'
];

const VALID_RUNTIMES = ['10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes', '45 Minutes', '60 Minutes', '90 Minutes', 'Custom'];

const VALID_AUDIENCES = [
  'General Audience', 'Adults', 'Young Adults', 'Teenagers',
  'Children', 'Families', 'Leaders', 'New Believers',
  'Long-Time Members', 'Visitors', 'Interfaith Audience',
  'Academic Audience', 'Community Outreach', 'Online Audience',
  'Private Study', 'Custom Audience'
];

const VALID_TONES = [
  'Inspirational', 'Pastoral', 'Academic', 'Conversational', 'Prophetic',
  'Devotional', 'Teaching', 'Evangelistic', 'Counseling', 'Celebratory',
  'Solemn', 'Encouraging', 'Challenging', 'Storytelling', 'Meditative'
];

export function mapProductionType(type) {
  if (!type) return 'Custom Production';
  const exact = VALID_PRODUCTION_TYPES.find(t => t.toLowerCase() === type.toLowerCase());
  if (exact) return exact;
  const lower = type.toLowerCase();
  if (lower.includes('sermon')) return 'Sermon';
  if (lower.includes('bible study')) return 'Bible Study';
  if (lower.includes('devotion')) return 'Devotional';
  if (lower.includes('teaching')) return 'Teaching Series';
  if (lower.includes('podcast')) return 'Podcast';
  if (lower.includes('livestream') || lower.includes('live stream')) return 'Livestream';
  if (lower.includes('prayer')) return 'Prayer Meeting';
  if (lower.includes('youth')) return 'Youth Lesson';
  if (lower.includes('children')) return "Children's Lesson";
  if (lower.includes('education') || lower.includes('presentation')) return 'Educational Presentation';
  if (lower.includes('conference')) return 'Conference Message';
  if (lower.includes('retreat')) return 'Retreat Session';
  if (lower.includes('discussion') || lower.includes('panel')) return 'Discussion Panel';
  if (lower.includes('q&a') || lower.includes('qa') || lower.includes('question')) return 'Q&A Session';
  if (lower.includes('meditat')) return 'Meditation Session';
  if (lower.includes('scripture') || lower.includes('reading')) return 'Scripture Reading';
  if (lower.includes('worship')) return 'Worship Service';
  if (lower.includes('article') || lower.includes('blog')) return 'Custom Production';
  if (lower.includes('lesson')) return 'Educational Presentation';
  return 'Custom Production';
}

export function mapRuntime(runtime) {
  if (!runtime) return '30 Minutes';
  const exact = VALID_RUNTIMES.find(t => t.toLowerCase() === runtime.toLowerCase());
  if (exact) return exact;
  const lower = runtime.toLowerCase();
  const match = lower.match(/(\d+)\s*(min|minute)/);
  if (match) {
    const num = parseInt(match[1]);
    const closest = VALID_RUNTIMES.find(t => t.startsWith(num + ' '));
    if (closest) return closest;
  }
  return '30 Minutes';
}

export function mapAudience(audience) {
  if (!audience) return 'General Audience';
  const exact = VALID_AUDIENCES.find(t => t.toLowerCase() === audience.toLowerCase());
  if (exact) return exact;
  const lower = audience.toLowerCase();
  if (lower.includes('general')) return 'General Audience';
  if (lower.includes('adult') && !lower.includes('young')) return 'Adults';
  if (lower.includes('young adult')) return 'Young Adults';
  if (lower.includes('teen')) return 'Teenagers';
  if (lower.includes('child')) return 'Children';
  if (lower.includes('family')) return 'Families';
  if (lower.includes('leader')) return 'Leaders';
  if (lower.includes('new believer')) return 'New Believers';
  if (lower.includes('online')) return 'Online Audience';
  if (lower.includes('academic')) return 'Academic Audience';
  if (lower.includes('interfaith')) return 'Interfaith Audience';
  if (lower.includes('private') || lower.includes('personal')) return 'Private Study';
  return 'General Audience';
}

export function mapTone(tone) {
  if (!tone) return 'Inspirational';
  const exact = VALID_TONES.find(t => t.toLowerCase() === tone.toLowerCase());
  if (exact) return exact;
  const lower = tone.toLowerCase();
  if (lower.includes('inspir')) return 'Inspirational';
  if (lower.includes('pastor')) return 'Pastoral';
  if (lower.includes('academ')) return 'Academic';
  if (lower.includes('convers')) return 'Conversational';
  if (lower.includes('prophet')) return 'Prophetic';
  if (lower.includes('devot')) return 'Devotional';
  if (lower.includes('teach')) return 'Teaching';
  if (lower.includes('evangel')) return 'Evangelistic';
  if (lower.includes('counsel')) return 'Counseling';
  if (lower.includes('celebr')) return 'Celebratory';
  if (lower.includes('solemn')) return 'Solemn';
  if (lower.includes('encourag')) return 'Encouraging';
  if (lower.includes('challeng')) return 'Challenging';
  if (lower.includes('story')) return 'Storytelling';
  if (lower.includes('meditat')) return 'Meditative';
  return 'Inspirational';
}

export function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  if (Array.isArray(str) || typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return fallback; }
}