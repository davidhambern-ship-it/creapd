// Spiritual Production Configuration Options

export const FAITH_TRADITIONS = [
  'Christianity', 'Judaism', 'Islam', 'Hinduism', 'Buddhism',
  'Sikhism', "Bahá'í", 'Jainism', 'Taoism', 'Confucianism',
  'Shinto', 'Pagan Traditions', 'Indigenous Traditions',
  'Spiritual but Not Religious', 'Comparative Religion',
  'Philosophy', 'Interfaith', 'Custom'
];

export const DENOMINATIONS_BY_TRADITION = {
  Christianity: ['No Preference', 'Catholic', 'Eastern Orthodox', 'Protestant', 'Baptist', 'Methodist', 'Lutheran', 'Presbyterian', 'Anglican/Episcopal', 'Pentecostal', 'Evangelical', 'Non-Denominational', 'Adventist', 'Reformed', 'Wesleyan', 'Quaker', 'Mennonite', 'Amish', 'Custom'],
  Judaism: ['No Preference', 'Orthodox', 'Conservative', 'Reform', 'Reconstructionist', 'Hasidic', 'Sephardic', 'Ashkenazi', 'Kabbalistic', 'Custom'],
  Islam: ['No Preference', 'Sunni', 'Shia', 'Sufi', 'Ahmadiyya', 'Ibadi', 'Custom'],
  Hinduism: ['No Preference', 'Vaishnavism', 'Shaivism', 'Shaktism', 'Smartism', 'Vedanta', 'Bhakti', 'Custom'],
  Buddhism: ['No Preference', 'Theravada', 'Mahayana', 'Vajrayana', 'Zen', 'Pure Land', 'Tibetan', 'Custom'],
  Sikhism: ['No Preference', 'Khalsa', 'Sahajdhari', 'Namdhari', 'Custom'],
  "Bahá'í": ['No Preference', 'Custom'],
  Jainism: ['No Preference', 'Digambara', 'Svetambara', 'Custom'],
  Taoism: ['No Preference', 'Quanzhen', 'Zhengyi', 'Custom'],
  Confucianism: ['No Preference', 'Classical', 'Neo-Confucian', 'New Confucian', 'Custom'],
  Shinto: ['No Preference', 'Shrine Shinto', 'Sect Shinto', 'Folk Shinto', 'Custom'],
  'Pagan Traditions': ['No Preference', 'Wicca', 'Druidry', 'Heathenry', 'Hellenic', 'Roman', 'Celtic', 'Slavic', 'Custom'],
  'Indigenous Traditions': ['No Preference', 'Native American', 'African Traditional', 'Aboriginal', 'Pacific Islander', 'Custom'],
  'Spiritual but Not Religious': ['No Preference', 'Meditation', 'Mindfulness', 'New Age', 'Custom'],
  'Comparative Religion': ['No Preference', 'Custom'],
  Philosophy: ['No Preference', 'Stoicism', 'Existentialism', 'Humanism', 'Ethics', 'Metaphysics', 'Epistemology', 'Custom'],
  Interfaith: ['No Preference', 'Christian-Jewish', 'Abrahamic', 'Eastern-Western', 'Universalist', 'Custom'],
  Custom: ['No Preference', 'Custom']
};

export const PRODUCTION_TYPE_OPTIONS = [
  'Sermon', 'Bible Study', 'Devotional', 'Teaching Series', 'Podcast',
  'Livestream', 'Prayer Meeting', 'Study Group', 'Youth Lesson',
  "Children's Lesson", 'Sunday School', 'Educational Presentation',
  'Conference Message', 'Retreat Session', 'Discussion Panel',
  'Q&A Session', 'Meditation Session', 'Scripture Reading',
  'Worship Service', 'Holiday Production', 'Memorial Service',
  'Wedding Ceremony', 'Funeral Message', 'Community Event',
  'Custom Production'
];

export const AUDIENCE_OPTIONS = [
  'General Audience', 'Adults', 'Young Adults', 'Teenagers',
  'Children', 'Families', 'Leaders', 'New Believers',
  'Long-Time Members', 'Visitors', 'Interfaith Audience',
  'Academic Audience', 'Community Outreach', 'Online Audience',
  'Private Study', 'Custom Audience'
];

export const SACRED_TEXTS_BY_TRADITION = {
  Christianity: ['Holy Bible', 'King James Version (KJV)', 'New International Version (NIV)', 'English Standard Version (ESV)', 'New American Standard Bible (NASB)', 'New Living Translation (NLT)', 'Christian Standard Bible (CSB)', 'Revised Standard Version (RSV)', 'The Message (MSG)'],
  Judaism: ['Tanakh (Hebrew Bible)', 'Torah', 'Nevi\'im', 'Ketuvim', 'Talmud', 'Mishnah', 'Midrash', 'JPS Tanakh', 'Artscroll Siddur'],
  Islam: ['Quran', 'Quran (Sahih International)', 'Quran (Yusuf Ali)', 'Quran (Pickthall)', 'Hadith (Sahih Bukhari)', 'Hadith (Sahih Muslim)', 'Tafsir Ibn Kathir'],
  Hinduism: ['Bhagavad Gita', 'Vedas', 'Upanishads', 'Ramayana', 'Mahabharata', 'Puranas', 'Yoga Sutras', 'Dhammapada'],
  Buddhism: ['Dhammapada', 'Tipitaka (Pali Canon)', 'Diamond Sutra', 'Heart Sutra', 'Lotus Sutra', 'Tibetan Book of the Dead', 'Dogen\'s Shobogenzo'],
  Sikhism: ['Guru Granth Sahib', 'Dasam Granth', 'Janamsakhis'],
  "Bahá'í": ['Kitáb-i-Aqdas', 'Kitáb-i-Íqán', 'Hidden Words', 'Some Answered Questions'],
  Jainism: ['Agamas', 'Tattvartha Sutra', 'Kalpa Sutra'],
  Taoism: ['Tao Te Ching', 'Zhuangzi', 'I Ching', 'Daozang'],
  Confucianism: ['Analects', 'Mencius', 'Great Learning', 'Doctrine of the Mean', 'Book of Rites'],
  Shinto: ['Kojiki', 'Nihon Shoki', 'Engishiki'],
  'Pagan Traditions': ['Wheel of the Year', 'Book of Shadows', 'Custom Sacred Texts'],
  'Indigenous Traditions': ['Oral Traditions', 'Tribal Stories', 'Custom Sacred Texts'],
  'Spiritual but Not Religious': ['Custom Texts', 'Meditation Guides', 'Mindfulness Texts'],
  'Comparative Religion': ['All Selected Traditions'],
  Philosophy: ['Philosophical Texts', 'Ethics Treatises', 'Custom Texts'],
  Interfaith: ['Selected Sacred Texts from Multiple Traditions'],
  Custom: ['Custom Sacred Texts']
};

export const STUDY_RESOURCE_OPTIONS = [
  'Original Language Studies', 'Lexicons', 'Concordances', 'Commentaries',
  'Historical References', 'Archaeology', 'Maps', 'Timelines',
  'Cross References', 'Topical Indexes', 'Biographies',
  'Historical Documents', 'Religious Publications', 'Educational Resources',
  'Academic Journals', 'Faith Organization Resources', 'Language Tools',
  'Geography', 'Custom Resources'
];

export const STUDY_TOPIC_OPTIONS = [
  'Prayer', 'Faith', 'Love', 'Grace', 'Mercy', 'Justice', 'Forgiveness',
  'Hope', 'Salvation', 'Leadership', 'Family', 'Marriage', 'Parenting',
  'Discipleship', 'Evangelism', 'Mission Work', 'Service', 'Wisdom',
  'Humility', 'Generosity', 'Stewardship', 'Spiritual Growth', 'Prophecy',
  'History', 'Ethics', 'Current Events', 'Apologetics', 'Philosophy',
  'Character Studies', 'Topical Studies', 'Word Studies', 'Holiday Studies',
  'Comparative Studies', 'Q&A', 'Current Issues', 'Youth Topics',
  "Children's Topics", 'Mental Health', 'Community Outreach', 'Custom Topics'
];

export const RESEARCH_SOURCE_OPTIONS = [
  'Sacred Text Library', 'Official Faith Resources', 'Historical References',
  'Academic References', 'Language Resources', 'Maps', 'Archaeology',
  'Current News', 'Educational Publications', 'Organization Publications',
  'Libraries', 'Museums', 'Universities', 'Public Domain Resources',
  'Custom Websites', 'Custom RSS', 'Manual Research'
];

export const SPEAKER_TONE_OPTIONS = [
  'Inspirational', 'Pastoral', 'Academic', 'Conversational', 'Prophetic',
  'Devotional', 'Teaching', 'Evangelistic', 'Counseling', 'Celebratory',
  'Solemn', 'Encouraging', 'Challenging', 'Storytelling', 'Meditative'
];

export const AI_AUTOMATION_OPTIONS = [
  { key: 'Generate Study Workspace', label: 'Generate Study Workspace' },
  { key: 'Generate Message Outline', label: 'Generate Message Outline' },
  { key: 'Generate Full Message', label: 'Generate Full Message' },
  { key: 'Generate Devotional', label: 'Generate Devotional' },
  { key: 'Generate Discussion Questions', label: 'Generate Discussion Questions' },
  { key: 'Generate Presentation Slides', label: 'Generate Presentation Slides' },
  { key: 'Generate Graphics', label: 'Generate Graphics' },
  { key: 'Generate Image Prompts', label: 'Generate Image Prompts' },
  { key: 'Generate AI Images', label: 'Generate AI Images' },
  { key: 'Generate Video Prompts', label: 'Generate Video Prompts' },
  { key: 'Generate Social Captions', label: 'Generate Social Captions' },
  { key: 'Generate Reading Plan', label: 'Generate Reading Plan' },
  { key: 'Generate Prayer Guide', label: 'Generate Prayer Guide' },
  { key: 'Generate Speaker Notes', label: 'Generate Speaker Notes' },
  { key: 'Generate Study Notes', label: 'Generate Study Notes' },
  { key: 'Generate Production Notes', label: 'Generate Production Notes' },
  { key: 'Generate Production Package', label: 'Generate Production Package' },
  { key: 'Generate Export Files', label: 'Generate Export Files' }
];

export const DEFAULT_AI_AUTOMATION = [
  'Generate Study Workspace',
  'Generate Message Outline',
  'Generate Full Message',
  'Generate Discussion Questions',
  'Generate Presentation Slides',
  'Generate Prayer Guide',
  'Generate Speaker Notes',
  'Generate Social Captions',
  'Generate Production Notes',
  'Generate Production Package'
];

export const RUNTIME_OPTIONS = ['10 Minutes', '15 Minutes', '20 Minutes', '30 Minutes', '45 Minutes', '60 Minutes', '90 Minutes', 'Custom'];

export const SPIRITUAL_NAV_ITEMS = [
  { icon: 'LayoutDashboard', label: 'Dashboard', path: '/spiritual/dashboard' },
  { icon: 'Settings2', label: 'Configuration', path: '/spiritual/configure' },
  { icon: 'Search', label: 'Research', path: '/spiritual/research' },
  { icon: 'BookOpen', label: 'Sacred Text Library', path: '/spiritual/library' },
  { icon: 'GraduationCap', label: 'Study Workspace', path: '/spiritual/study' },
  { icon: 'PenTool', label: 'Message Builder', path: '/spiritual/message' },
  { icon: 'Sparkles', label: 'AI Assets', path: '/spiritual/assets' },
  { icon: 'Package', label: 'Production Package', path: '/spiritual/package' },
  { icon: 'Download', label: 'Export', path: '/spiritual/export' },
  { icon: 'Settings', label: 'Settings', path: '/settings/default-production' }
];

export const ASSET_TYPE_LABELS = {
  title_slide: 'Title Slide',
  scripture_slide: 'Scripture Slide',
  quote_slide: 'Quote Slide',
  historical_slide: 'Historical Slide',
  map_slide: 'Map Slide',
  biography_slide: 'Biography Slide',
  word_study_slide: 'Word Study Slide',
  comparison_slide: 'Comparison Slide',
  teaching_diagram: 'Teaching Diagram',
  ai_image: 'AI Image',
  image_prompt: 'Image Prompt',
  video_prompt: 'Video Prompt',
  social_graphic: 'Social Graphic',
  thumbnail: 'Thumbnail',
  lower_third: 'Lower Third',
  handout: 'Handout',
  discussion_guide: 'Discussion Guide',
  reading_plan: 'Reading Plan',
  prayer_guide: 'Prayer Guide',
  speaker_notes: 'Speaker Notes',
  study_notes: 'Study Notes',
  production_notes: 'Production Notes',
  call_to_action_slide: 'Call to Action Slide',
  closing_slide: 'Closing Slide',
  announcement_graphic: 'Announcement Graphic'
};

export const SECTION_TYPE_LABELS = {
  opening: 'Opening',
  introduction: 'Introduction',
  main_section: 'Main Section',
  supporting_reference: 'Supporting Reference',
  illustration: 'Illustration',
  application: 'Application',
  discussion_question: 'Discussion Question',
  closing: 'Closing',
  call_to_action: 'Call to Action',
  prayer: 'Prayer',
  announcements: 'Announcements',
  closing_notes: 'Closing Notes'
};

export const SOURCE_TYPE_LABELS = {
  primary_source: 'Primary Source',
  secondary_source: 'Secondary Source',
  historical_reference: 'Historical Reference',
  language_study: 'Language Study',
  current_event: 'Current Event',
  ai_suggestion: 'AI Suggestion'
};

export const PACKAGE_ITEM_LABELS = {
  message: 'Message',
  study: 'Study Material',
  presentation: 'Presentation',
  graphic: 'Graphic',
  handout: 'Handout',
  discussion: 'Discussion Material',
  research: 'Research',
  citation: 'Citation',
  speaker_resource: 'Speaker Resource',
  prayer: 'Prayer Guide',
  reading_plan: 'Reading Plan'
};

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function estimateSpeakingTime(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.round((words / 130) * 60);
}