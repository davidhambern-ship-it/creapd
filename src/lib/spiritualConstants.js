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
  'World Scripture Library', 'Official Faith Resources', 'Historical References',
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
  { icon: 'Library', label: 'Library Home', path: '/spiritual/library' },
  { icon: 'BookOpen', label: 'Sacred Texts', path: '/spiritual/library?browse=collection' },
  { icon: 'Languages', label: 'Languages', path: '/spiritual/library/languages' },
  { icon: 'Columns2', label: 'Comparisons', path: '/spiritual/library/compare' },
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

// ===== World Scripture Library Collections =====

export const LIBRARY_COLLECTIONS = [
  { key: 'sacred_scriptures', label: 'Sacred Scriptures', icon: 'BookOpen', description: 'Primary sacred texts from all faith traditions' },
  { key: 'historical_documents', label: 'Historical Religious Documents', icon: 'ScrollText', description: 'Writings of early movements, church fathers, and reformers' },
  { key: 'ancient_manuscripts', label: 'Ancient Manuscripts', icon: 'FileText', description: 'Original and early manuscript sources with textual notes' },
  { key: 'apocryphal', label: 'Apocryphal & Deuterocanonical', icon: 'BookMarked', description: 'Secondary canonical texts and deuterocanonical books' },
  { key: 'original_languages', label: 'Original Language Resources', icon: 'Languages', description: 'Hebrew, Greek, Aramaic, Sanskrit, Pali, and Arabic source texts' },
  { key: 'lexicons', label: 'Lexicons & Dictionaries', icon: 'Library', description: 'Word study reference works for original languages' },
  { key: 'historical_maps', label: 'Historical Maps', icon: 'Map', description: 'Biblical and historical geography of the ancient world' },
  { key: 'timelines', label: 'Timelines', icon: 'Clock', description: 'Chronological frameworks for religious and biblical history' },
  { key: 'organization_publications', label: 'Organization Publications', icon: 'Building2', description: 'Official publications from faith organizations and institutions' },
  { key: 'reference_works', label: 'Reference Works', icon: 'BookOpen', description: 'Encyclopedias, dictionaries, companions, and study guides' },
  { key: 'language_learning', label: 'Language Learning', icon: 'GraduationCap', description: 'Tools and courses for learning original and scholarly languages' },
  { key: 'research_collections', label: 'Research Collections', icon: 'FolderOpen', description: 'Curated collections for specific research topics and themes' },
  { key: 'personal_collections', label: 'Personal Collections', icon: 'Star', description: 'Your saved texts, highlights, and curated collections' }
];

export const LIBRARY_LANGUAGES = [
  'Hebrew', 'Greek (Koine)', 'Aramaic', 'Latin', 'Sanskrit', 'Pali',
  'Arabic', 'Avestan', 'Classical Chinese', 'Tibetan', 'Coptic', 'English'
];

export const LIBRARY_HISTORICAL_PERIODS = [
  'Ancient (pre-500 BCE)', 'Classical (500 BCE–500 CE)', 'Medieval (500–1500 CE)',
  'Reformation (1500–1700)', 'Modern (1700–1900)', 'Contemporary (1900–present)'
];

export const LIBRARY_REGIONS = [
  'Middle East', 'Mediterranean', 'Europe', 'South Asia', 'East Asia',
  'Southeast Asia', 'Africa', 'Americas', 'Oceania'
];

// ===== World Scripture Library — Expanded Constants =====

export const BROWSE_CATEGORIES = [
  { key: 'tradition', label: 'Faith Tradition', icon: 'Globe' },
  { key: 'language', label: 'Language', icon: 'Languages' },
  { key: 'period', label: 'Historical Period', icon: 'Clock' },
  { key: 'region', label: 'Geographic Region', icon: 'MapPin' },
  { key: 'collection', label: 'Text Collection', icon: 'BookOpen' },
  { key: 'theme', label: 'Theme', icon: 'Sparkles' },
  { key: 'figure', label: 'Historical Figure', icon: 'User' },
  { key: 'place', label: 'Place', icon: 'Map' },
  { key: 'original_language', label: 'Original Language', icon: 'Languages' },
  { key: 'writing_system', label: 'Writing System', icon: 'PenTool' },
  { key: 'study_type', label: 'Study Type', icon: 'GraduationCap' },
  { key: 'discoveries', label: 'Recent Discoveries', icon: 'Search' }
];

export const VERIFICATION_LEVELS = {
  verified_primary_source: { label: 'Verified Primary Source', color: 'berna-emerald' },
  verified_historical_source: { label: 'Verified Historical Source', color: 'berna-emerald' },
  verified_academic_source: { label: 'Verified Academic Source', color: 'chart-2' },
  official_publisher: { label: 'Official Publisher', color: 'primary' },
  official_organization: { label: 'Official Organization', color: 'primary' },
  public_domain: { label: 'Public Domain', color: 'muted' },
  licensed_content: { label: 'Licensed Content', color: 'chart-2' },
  metadata_only: { label: 'Metadata Only', color: 'muted' },
  community_resource: { label: 'Community Resource', color: 'muted' }
};

export const ACCESS_LEVEL_LABELS = {
  full_text: 'Full Text Available',
  embedded_access: 'Official Embedded Access',
  external_link: 'External Official Link',
  metadata_only: 'Metadata Only'
};

export const LICENSE_LABELS = {
  public_domain: 'Public Domain',
  official_free_access: 'Official Free Access',
  licensed_integration: 'Licensed Integration',
  external_official_link: 'External Official Link',
  metadata_only: 'Metadata Only',
  unavailable: 'Unavailable'
};

export const HIGHLIGHT_CATEGORIES = [
  { key: 'important', label: 'Important', color: 'bg-yellow-500/20 text-yellow-400' },
  { key: 'question', label: 'Question', color: 'bg-blue-500/20 text-blue-400' },
  { key: 'research', label: 'Research', color: 'bg-purple-500/20 text-purple-400' },
  { key: 'language', label: 'Language', color: 'bg-cyan-500/20 text-cyan-400' },
  { key: 'historical', label: 'Historical', color: 'bg-amber-600/20 text-amber-500' },
  { key: 'production_idea', label: 'Production Idea', color: 'bg-accent/20 text-accent' },
  { key: 'personal_insight', label: 'Personal Insight', color: 'bg-pink-500/20 text-pink-400' },
  { key: 'prayer', label: 'Prayer', color: 'bg-indigo-500/20 text-indigo-400' },
  { key: 'teaching_point', label: 'Teaching Point', color: 'bg-green-500/20 text-green-400' },
  { key: 'application', label: 'Application', color: 'bg-teal-500/20 text-teal-400' }
];

export const READING_MODES = [
  { key: 'reading', label: 'Reading', icon: 'BookOpen' },
  { key: 'research', label: 'Research', icon: 'Search' },
  { key: 'study', label: 'Study', icon: 'GraduationCap' },
  { key: 'language', label: 'Language', icon: 'Languages' },
  { key: 'comparison', label: 'Comparison', icon: 'Columns2' },
  { key: 'focus', label: 'Focus', icon: 'Eye' }
];

export const COMPARISON_TYPES = [
  { key: 'scripture_vs_scripture', label: 'Scripture vs Scripture' },
  { key: 'passage_vs_passage', label: 'Passage vs Passage' },
  { key: 'book_vs_book', label: 'Book vs Book' },
  { key: 'word_vs_word', label: 'Word vs Word' },
  { key: 'theme_vs_theme', label: 'Theme vs Theme' },
  { key: 'doctrine_vs_doctrine', label: 'Doctrine vs Doctrine' },
  { key: 'tradition_vs_tradition', label: 'Tradition vs Tradition' },
  { key: 'translation_vs_translation', label: 'Translation vs Translation' },
  { key: 'language_vs_language', label: 'Language vs Language' },
  { key: 'figure_vs_figure', label: 'Historical Figure vs Figure' },
  { key: 'place_vs_place', label: 'Place vs Place' },
  { key: 'custom_comparison', label: 'Custom Comparison' }
];

export const SUPPORTED_LEARNING_LANGUAGES = [
  { key: 'biblical_hebrew', label: 'Biblical Hebrew', script: 'Hebrew', tradition: 'Judaism/Christianity' },
  { key: 'koine_greek', label: 'Koine Greek', script: 'Greek', tradition: 'Christianity' },
  { key: 'biblical_aramaic', label: 'Biblical Aramaic', script: 'Aramaic', tradition: 'Judaism/Christianity' },
  { key: 'classical_arabic', label: 'Classical Arabic', script: 'Arabic', tradition: 'Islam' },
  { key: 'sanskrit', label: 'Sanskrit', script: 'Devanagari', tradition: 'Hinduism/Buddhism' },
  { key: 'pali', label: 'Pali', script: 'Sinhala/Burmese', tradition: 'Buddhism' },
  { key: 'gurmukhi', label: 'Gurmukhi', script: 'Gurmukhi', tradition: 'Sikhism' },
  { key: 'classical_chinese', label: 'Classical Chinese', script: 'Chinese', tradition: 'Taoism/Confucianism' },
  { key: 'latin', label: 'Latin', script: 'Latin', tradition: 'Christianity' },
  { key: 'geez', label: "Ge'ez", script: 'Ge\'ez', tradition: 'Ethiopian Orthodox' },
  { key: 'avestan', label: 'Avestan', script: 'Avestan', tradition: 'Zoroastrianism' }
];

export const BRIDGE_TYPE_LABELS = {
  direct_translation: 'Direct Translation',
  closest_translation: 'Closest Translation',
  conceptual_parallel: 'Conceptual Parallel',
  related_theme: 'Related Theme',
  shared_root: 'Shared Root',
  no_direct_equivalent: 'No Direct Equivalent'
};

export const COMPARISON_MATRIX_ROWS = [
  'Major Themes',
  'Historical Context',
  'Original Language',
  'Key Teachings',
  'Terminology',
  'Important Figures',
  'Timeline',
  'Geography',
  'Related Concepts',
  'Supporting References'
];

export const QUICK_ACTIONS = [
  { label: 'Open Study Workspace', icon: 'GraduationCap', path: '/spiritual/study' },
  { label: 'Open Current Research', icon: 'Search', path: '/spiritual/research' },
  { label: 'Browse Languages', icon: 'Languages', path: '/spiritual/library/languages' },
  { label: 'Browse Traditions', icon: 'Globe', path: '/spiritual/library?browse=tradition' },
  { label: 'Browse Sacred Texts', icon: 'BookOpen', path: '/spiritual/library?browse=collection' },
  { label: 'Compare Texts', icon: 'Columns2', path: '/spiritual/library/compare' },
  { label: 'Continue Language Learning', icon: 'GraduationCap', path: '/spiritual/library/languages' },
  { label: 'Create Research Project', icon: 'FileText', path: '/spiritual/study' },
  { label: 'Open Message Builder', icon: 'PenTool', path: '/spiritual/message' },
  { label: 'Create Production', icon: 'Sparkles', path: '/spiritual/configure' }
];