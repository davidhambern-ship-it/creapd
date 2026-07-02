// Seed Manifest — Foundation Collection Roadmap
// Defines every foundational work Producer intends to import into the World Scripture Library.
// Based on the Foundation Seeder specification Section 2.

export const FOUNDATION_CATEGORIES = [
  'Abrahamic Scriptures',
  'Biblical Resources',
  'Islamic Resources',
  'Jewish Literature',
  'LDS Scriptures',
  'Apocrypha',
  'Deuterocanonical Books',
  'Nag Hammadi',
  'Dead Sea Scrolls',
  'Church Fathers',
  'Early Christian Writings',
  'Ancient Near Eastern Texts',
  'Greek Philosophy',
  'Roman Philosophy',
  'Hindu Scriptures',
  'Buddhist Scriptures',
  'Taoist Scriptures',
  'Confucian Classics',
  'Sikh Scriptures',
  'Jain Scriptures',
  'Mysticism',
  'Comparative Religion',
  'Historical Sources',
  'Academic Theology',
  'Language Resources',
  'Lexicons',
  'Dictionaries',
  'Concordances',
  'Reference Works',
  'Maps',
  'Manuscripts',
];

export const IMPORTANCE_LEVELS = [
  'Essential', 'Foundational', 'Major', 'Supporting',
  'Reference', 'Specialized', 'Historical', 'Supplemental', 'Experimental'
];

export const SEED_STATUSES = [
  'Missing', 'Source Needed', 'Source Found', 'Approved Source Available',
  'Ready to Import', 'Queued', 'Importing', 'Imported', 'Indexed',
  'Published', 'Failed', 'Needs Review', 'License Blocked', 'Parser Missing',
  'Update Available'
];

// The Seed Manifest — every planned foundation work
export const SEED_MANIFEST = [
  // ─── Abrahamic Scriptures ───
  { title: 'The Bible (King James Version)', tradition: 'Christianity', category: 'Abrahamic Scriptures', importance: 'Essential', priority: 100, provider: 'bible-api.com', source_key: 'bible', license: 'Public Domain', estimated_records: 31102, languages: ['English'], dependencies: [], import_notes: 'KJV — 66 books, 1189 chapters. Already seeder-ready.' },
  { title: 'The Quran (Saheeh International)', tradition: 'Islam', category: 'Abrahamic Scriptures', importance: 'Essential', priority: 100, provider: 'Al Quran Cloud API', source_key: 'quran', license: 'Official Free Access', estimated_records: 6236, languages: ['Arabic', 'English'], dependencies: [], import_notes: '114 surahs. Already seeder-ready.' },

  // ─── LDS Scriptures ───
  { title: 'Book of Mormon', tradition: 'Latter-day Saints', category: 'LDS Scriptures', importance: 'Essential', priority: 90, provider: 'Gospel Library API', source_key: null, license: 'Official Free Access', estimated_records: 6604, languages: ['English'], dependencies: [], import_notes: 'Needs source approval and parser.' },
  { title: 'Doctrine and Covenants', tradition: 'Latter-day Saints', category: 'LDS Scriptures', importance: 'Foundational', priority: 85, provider: 'Gospel Library API', source_key: null, license: 'Official Free Access', estimated_records: 422, languages: ['English'], dependencies: [], import_notes: 'Needs source approval and parser.' },
  { title: 'Pearl of Great Price', tradition: 'Latter-day Saints', category: 'LDS Scriptures', importance: 'Foundational', priority: 80, provider: 'Gospel Library API', source_key: null, license: 'Official Free Access', estimated_records: 164, languages: ['English'], dependencies: [], import_notes: 'Needs source approval and parser.' },

  // ─── Hindu Scriptures ───
  { title: 'Bhagavad Gita', tradition: 'Hinduism', category: 'Hindu Scriptures', importance: 'Essential', priority: 90, provider: 'SuttaCentral / Gita Supersite', source_key: null, license: 'Public Domain', estimated_records: 700, languages: ['Sanskrit', 'English'], dependencies: [], import_notes: '18 chapters, 700 verses. Needs source approval.' },
  { title: 'Dhammapada', tradition: 'Buddhism', category: 'Buddhist Scriptures', importance: 'Essential', priority: 90, provider: 'SuttaCentral', source_key: null, license: 'Public Domain', estimated_records: 423, languages: ['Pali', 'English'], dependencies: [], import_notes: '423 verses. Needs source approval.' },
  { title: 'Tao Te Ching', tradition: 'Taoism', category: 'Taoist Scriptures', importance: 'Essential', priority: 88, provider: 'Chinese Text Project', source_key: null, license: 'Public Domain', estimated_records: 81, languages: ['Classical Chinese', 'English'], dependencies: [], import_notes: '81 chapters. Needs source approval.' },
  { title: 'Upanishads', tradition: 'Hinduism', category: 'Hindu Scriptures', importance: 'Foundational', priority: 85, provider: 'Gita Supersite', source_key: null, license: 'Public Domain', estimated_records: 1080, languages: ['Sanskrit', 'English'], dependencies: [], import_notes: '13 principal Upanishads. Needs source approval.' },
  { title: 'Vedas (Rig Veda selections)', tradition: 'Hinduism', category: 'Hindu Scriptures', importance: 'Major', priority: 75, provider: 'Gita Supersite', source_key: null, license: 'Public Domain', estimated_records: 10000, languages: ['Sanskrit', 'English'], dependencies: [], import_notes: 'Where legally available. Needs source approval.' },

  // ─── Language Resources ───
  { title: "Strong's Greek Dictionary", tradition: 'Christianity', category: 'Lexicons', importance: 'Foundational', priority: 92, provider: 'OpenScriptures', source_key: 'strongs-g', license: 'Public Domain', estimated_records: 5600, languages: ['Koine Greek'], dependencies: [], import_notes: 'Already imported via SMC.' },
  { title: "Strong's Hebrew Dictionary", tradition: 'Judaism', category: 'Lexicons', importance: 'Foundational', priority: 92, provider: 'OpenScriptures', source_key: 'strongs-h', license: 'Public Domain', estimated_records: 8700, languages: ['Biblical Hebrew'], dependencies: [], import_notes: 'Already imported via SMC.' },
  { title: 'STEP Bible Greek Lexicon (TBESG)', tradition: 'Christianity', category: 'Lexicons', importance: 'Foundational', priority: 90, provider: 'STEP Bible (CC BY 4.0)', source_key: 'stepbible-greek_lexicon', license: 'Creative Commons', estimated_records: 12000, languages: ['Koine Greek'], dependencies: [], import_notes: 'Already imported via SMC.' },
  { title: 'STEP Bible Hebrew Lexicon (TBESH)', tradition: 'Judaism', category: 'Lexicons', importance: 'Foundational', priority: 90, provider: 'STEP Bible (CC BY 4.0)', source_key: 'stepbible-hebrew_lexicon', license: 'Creative Commons', estimated_records: 11000, languages: ['Biblical Hebrew'], dependencies: [], import_notes: 'Already imported via SMC.' },

  // ─── Apocrypha / Deuterocanonical ───
  { title: 'Apocrypha (Deuterocanonical Books)', tradition: 'Christianity', category: 'Apocrypha', importance: 'Major', priority: 70, provider: 'bible-api.com / SBL API', source_key: null, license: 'Public Domain', estimated_records: 4000, languages: ['English'], dependencies: ['The Bible (King James Version)'], import_notes: 'Tobit, Judith, Wisdom, Sirach, Baruch, 1-2 Maccabees. Needs parser.' },

  // ─── Nag Hammadi ───
  { title: 'Nag Hammadi Library', tradition: 'Gnosticism', category: 'Nag Hammadi', importance: 'Major', priority: 65, provider: 'Gnostic Society Library', source_key: null, license: 'Open Access', estimated_records: 1200, languages: ['Coptic', 'English'], dependencies: [], import_notes: '52 texts. Where legally available. Needs source approval.' },

  // ─── Dead Sea Scrolls ───
  { title: 'Dead Sea Scrolls (Non-Biblical)', tradition: 'Judaism', category: 'Dead Sea Scrolls', importance: 'Major', priority: 68, provider: 'Leon Levy DSS Library', source_key: null, license: 'Open Access', estimated_records: 900, languages: ['Hebrew', 'Aramaic', 'English'], dependencies: [], import_notes: 'Community Rule, War Scroll, Hodayot, etc. Needs source approval.' },

  // ─── Church Fathers ───
  { title: 'Ante-Nicene Fathers (ANF)', tradition: 'Christianity', category: 'Church Fathers', importance: 'Major', priority: 72, provider: 'CCEL / New Advent', source_key: null, license: 'Public Domain', estimated_records: 5000, languages: ['English', 'Greek', 'Latin'], dependencies: [], import_notes: '10 volumes. Clement, Ignatius, Justin Martyr, Irenaeus, Tertullian, Origen, etc.' },
  { title: 'Nicene and Post-Nicene Fathers (NPNF)', tradition: 'Christianity', category: 'Church Fathers', importance: 'Major', priority: 70, provider: 'CCEL / New Advent', source_key: null, license: 'Public Domain', estimated_records: 8000, languages: ['English', 'Greek', 'Latin'], dependencies: ['Ante-Nicene Fathers (ANF)'], import_notes: '28 volumes. Augustine, Chrysostom, Athanasius, Jerome, Gregory of Nyssa, etc.' },

  // ─── Jewish Literature ───
  { title: 'Mishnah', tradition: 'Judaism', category: 'Jewish Literature', importance: 'Major', priority: 65, provider: 'Sefaria API', source_key: null, license: 'Open License', estimated_records: 4000, languages: ['Hebrew', 'English'], dependencies: [], import_notes: '63 tractates. Needs source approval.' },
  { title: 'Talmud (Bavli) Index', tradition: 'Judaism', category: 'Jewish Literature', importance: 'Supporting', priority: 55, provider: 'Sefaria API', source_key: null, license: 'Open License', estimated_records: 5000, languages: ['Aramaic', 'Hebrew', 'English'], dependencies: ['Mishnah'], import_notes: '37 tractates, ~2.5M words. Structured metadata first.' },

  // ─── Historical Sources ───
  { title: 'Josephus: Jewish Antiquities', tradition: 'Judaism', category: 'Historical Sources', importance: 'Major', priority: 60, provider: 'Perseus Digital Library', source_key: null, license: 'Public Domain', estimated_records: 2000, languages: ['Greek', 'English'], dependencies: [], import_notes: '20 books. Needs source approval.' },
  { title: 'Josephus: Jewish War', tradition: 'Judaism', category: 'Historical Sources', importance: 'Major', priority: 60, provider: 'Perseus Digital Library', source_key: null, license: 'Public Domain', estimated_records: 1200, languages: ['Greek', 'English'], dependencies: [], import_notes: '7 books. Needs source approval.' },
  { title: 'Philo of Alexandria: Works', tradition: 'Judaism', category: 'Historical Sources', importance: 'Supporting', priority: 50, provider: 'Perseus / CCEL', source_key: null, license: 'Public Domain', estimated_records: 1500, languages: ['Greek', 'English'], dependencies: [], import_notes: '~40 treatises. Needs source approval.' },

  // ─── Greek Philosophy ───
  { title: 'Plato: Complete Dialogues', tradition: 'Greek Philosophy', category: 'Greek Philosophy', importance: 'Supporting', priority: 45, provider: 'Perseus Digital Library', source_key: null, license: 'Public Domain', estimated_records: 3000, languages: ['Greek', 'English'], dependencies: [], import_notes: 'Needs source approval.' },

  // ─── Confucian Classics ───
  { title: 'Analects of Confucius', tradition: 'Confucianism', category: 'Confucian Classics', importance: 'Major', priority: 70, provider: 'Chinese Text Project', source_key: null, license: 'Public Domain', estimated_records: 512, languages: ['Classical Chinese', 'English'], dependencies: [], import_notes: '20 books. Needs source approval.' },

  // ─── Buddhist Scriptures ───
  { title: 'Digha Nikaya', tradition: 'Buddhism', category: 'Buddhist Scriptures', importance: 'Foundational', priority: 75, provider: 'SuttaCentral', source_key: null, license: 'Public Domain', estimated_records: 34, languages: ['Pali', 'English'], dependencies: [], import_notes: '34 long discourses. Needs source approval.' },
  { title: 'Majjhima Nikaya', tradition: 'Buddhism', category: 'Buddhist Scriptures', importance: 'Foundational', priority: 75, provider: 'SuttaCentral', source_key: null, license: 'Public Domain', estimated_records: 152, languages: ['Pali', 'English'], dependencies: [], import_notes: '152 middle-length discourses. Needs source approval.' },
  { title: 'Samyutta Nikaya', tradition: 'Buddhism', category: 'Buddhist Scriptures', importance: 'Foundational', priority: 73, provider: 'SuttaCentral', source_key: null, license: 'Public Domain', estimated_records: 2889, languages: ['Pali', 'English'], dependencies: [], import_notes: 'Connected discourses. Needs source approval.' },
  { title: 'Anguttara Nikaya', tradition: 'Buddhism', category: 'Buddhist Scriptures', importance: 'Foundational', priority: 73, provider: 'SuttaCentral', source_key: null, license: 'Public Domain', estimated_records: 9557, languages: ['Pali', 'English'], dependencies: [], import_notes: 'Numerical discourses. Needs source approval.' },

  // ─── Reference Works ───
  { title: 'Bible Concordance (KJV)', tradition: 'Christianity', category: 'Concordances', importance: 'Major', priority: 68, provider: 'OpenScriptures', source_key: null, license: 'Public Domain', estimated_records: 31000, languages: ['English'], dependencies: ['The Bible (King James Version)'], import_notes: 'Strong\'s Concordance. Needs source approval.' },
];

// Coverage targets by tradition (for gap analysis)
export const COVERAGE_TARGETS = {
  'Christianity': { target: 15, description: 'Bible, translations, commentaries, Church Fathers, lexicons' },
  'Islam': { target: 5, description: 'Quran editions and translations' },
  'Judaism': { target: 8, description: 'Tanakh, Mishnah, Talmud index, Josephus, Philo' },
  'Latter-day Saints': { target: 4, description: 'Book of Mormon, D&C, Pearl of Great Price' },
  'Hinduism': { target: 5, description: 'Bhagavad Gita, Upanishads, Vedas' },
  'Buddhism': { target: 6, description: 'Dhammapada, Nikayas' },
  'Taoism': { target: 2, description: 'Tao Te Ching' },
  'Confucianism': { target: 2, description: 'Analects, Four Books' },
  'Gnosticism': { target: 1, description: 'Nag Hammadi Library' },
  'Greek Philosophy': { target: 2, description: 'Plato dialogues' },
};