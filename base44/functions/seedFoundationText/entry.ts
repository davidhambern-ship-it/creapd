import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const BIBLE_API_BASE = 'https://bible-api.com';

const BIBLE_BOOKS = {
  'genesis': { name: 'Genesis', chapters: 50, division: 'Old Testament' },
  'exodus': { name: 'Exodus', chapters: 40, division: 'Old Testament' },
  'leviticus': { name: 'Leviticus', chapters: 27, division: 'Old Testament' },
  'numbers': { name: 'Numbers', chapters: 36, division: 'Old Testament' },
  'deuteronomy': { name: 'Deuteronomy', chapters: 34, division: 'Old Testament' },
  'joshua': { name: 'Joshua', chapters: 24, division: 'Old Testament' },
  'judges': { name: 'Judges', chapters: 21, division: 'Old Testament' },
  'ruth': { name: 'Ruth', chapters: 4, division: 'Old Testament' },
  '1samuel': { name: '1 Samuel', chapters: 31, division: 'Old Testament' },
  '2samuel': { name: '2 Samuel', chapters: 24, division: 'Old Testament' },
  '1kings': { name: '1 Kings', chapters: 22, division: 'Old Testament' },
  '2kings': { name: '2 Kings', chapters: 25, division: 'Old Testament' },
  '1chronicles': { name: '1 Chronicles', chapters: 29, division: 'Old Testament' },
  '2chronicles': { name: '2 Chronicles', chapters: 36, division: 'Old Testament' },
  'ezra': { name: 'Ezra', chapters: 10, division: 'Old Testament' },
  'nehemiah': { name: 'Nehemiah', chapters: 13, division: 'Old Testament' },
  'esther': { name: 'Esther', chapters: 10, division: 'Old Testament' },
  'job': { name: 'Job', chapters: 42, division: 'Old Testament' },
  'psalms': { name: 'Psalms', chapters: 150, division: 'Old Testament' },
  'proverbs': { name: 'Proverbs', chapters: 31, division: 'Old Testament' },
  'ecclesiastes': { name: 'Ecclesiastes', chapters: 12, division: 'Old Testament' },
  'songofsolomon': { name: 'Song of Solomon', chapters: 8, division: 'Old Testament' },
  'isaiah': { name: 'Isaiah', chapters: 66, division: 'Old Testament' },
  'jeremiah': { name: 'Jeremiah', chapters: 52, division: 'Old Testament' },
  'lamentations': { name: 'Lamentations', chapters: 5, division: 'Old Testament' },
  'ezekiel': { name: 'Ezekiel', chapters: 48, division: 'Old Testament' },
  'daniel': { name: 'Daniel', chapters: 12, division: 'Old Testament' },
  'hosea': { name: 'Hosea', chapters: 14, division: 'Old Testament' },
  'joel': { name: 'Joel', chapters: 3, division: 'Old Testament' },
  'amos': { name: 'Amos', chapters: 9, division: 'Old Testament' },
  'obadiah': { name: 'Obadiah', chapters: 1, division: 'Old Testament' },
  'jonah': { name: 'Jonah', chapters: 4, division: 'Old Testament' },
  'micah': { name: 'Micah', chapters: 7, division: 'Old Testament' },
  'nahum': { name: 'Nahum', chapters: 3, division: 'Old Testament' },
  'habakkuk': { name: 'Habakkuk', chapters: 3, division: 'Old Testament' },
  'zephaniah': { name: 'Zephaniah', chapters: 3, division: 'Old Testament' },
  'haggai': { name: 'Haggai', chapters: 2, division: 'Old Testament' },
  'zechariah': { name: 'Zechariah', chapters: 14, division: 'Old Testament' },
  'malachi': { name: 'Malachi', chapters: 4, division: 'Old Testament' },
  'matthew': { name: 'Matthew', chapters: 28, division: 'New Testament' },
  'mark': { name: 'Mark', chapters: 16, division: 'New Testament' },
  'luke': { name: 'Luke', chapters: 24, division: 'New Testament' },
  'john': { name: 'John', chapters: 21, division: 'New Testament' },
  'acts': { name: 'Acts', chapters: 28, division: 'New Testament' },
  'romans': { name: 'Romans', chapters: 16, division: 'New Testament' },
  '1corinthians': { name: '1 Corinthians', chapters: 16, division: 'New Testament' },
  '2corinthians': { name: '2 Corinthians', chapters: 13, division: 'New Testament' },
  'galatians': { name: 'Galatians', chapters: 6, division: 'New Testament' },
  'ephesians': { name: 'Ephesians', chapters: 6, division: 'New Testament' },
  'philippians': { name: 'Philippians', chapters: 4, division: 'New Testament' },
  'colossians': { name: 'Colossians', chapters: 4, division: 'New Testament' },
  '1thessalonians': { name: '1 Thessalonians', chapters: 5, division: 'New Testament' },
  '2thessalonians': { name: '2 Thessalonians', chapters: 3, division: 'New Testament' },
  '1timothy': { name: '1 Timothy', chapters: 6, division: 'New Testament' },
  '2timothy': { name: '2 Timothy', chapters: 4, division: 'New Testament' },
  'titus': { name: 'Titus', chapters: 3, division: 'New Testament' },
  'philemon': { name: 'Philemon', chapters: 1, division: 'New Testament' },
  'hebrews': { name: 'Hebrews', chapters: 13, division: 'New Testament' },
  'james': { name: 'James', chapters: 5, division: 'New Testament' },
  '1peter': { name: '1 Peter', chapters: 5, division: 'New Testament' },
  '2peter': { name: '2 Peter', chapters: 3, division: 'New Testament' },
  '1john': { name: '1 John', chapters: 5, division: 'New Testament' },
  '2john': { name: '2 John', chapters: 1, division: 'New Testament' },
  '3john': { name: '3 John', chapters: 1, division: 'New Testament' },
  'jude': { name: 'Jude', chapters: 1, division: 'New Testament' },
  'revelation': { name: 'Revelation', chapters: 22, division: 'New Testament' }
};

Deno.serve(async (req) => {
  let base44;
  let textWorkId;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const source = body.source;
    if (!source || !['quran', 'bible'].includes(source)) {
      return Response.json({ error: 'source must be "quran" or "bible"' }, { status: 400 });
    }

    if (source === 'quran') {
      return await seedQuran(base44, body);
    } else {
      return await seedBible(base44, body);
    }
  } catch (error) {
    try {
      if (base44 && textWorkId) {
        await base44.entities.TextWork.update(textWorkId, { seeding_status: 'failed' });
      }
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function seedQuran(base44, body) {
  const editionId = body.edition || 'en.sahih';

  // 1. Create or find Tradition
  let tradition = await findOrCreate(base44, 'Tradition', { name: 'Islam' }, {
    name: 'Islam',
    description: 'Monotheistic Abrahamic faith founded in the 7th century CE. Sacred text is the Quran, revealed to Prophet Muhammad.',
    region: 'Arabian Peninsula',
    founded_date: '610 CE',
    original_languages: JSON.stringify(['Arabic']),
    sacred_texts_summary: 'The Quran (114 surahs, 6236 ayahs)'
  });

  // 2. Create or find LibraryText
  let libraryText = await findOrCreate(base44, 'LibraryText', { title: 'The Quran', tradition: 'Islam' }, {
    title: 'The Quran',
    tradition: 'Islam',
    collection: 'sacred_scriptures',
    original_language: 'Arabic',
    writing_system: 'Arabic Script',
    traditional_attribution: 'Revealed to Prophet Muhammad (610-632 CE)',
    scholarly_dating: '610-632 CE',
    structure: '114 surahs (chapters), 6236 ayahs (verses)',
    major_themes: JSON.stringify(['Tawhid (Oneness of God)', 'Prophethood', 'Guidance', 'Mercy', 'Justice', 'Afterlife']),
    full_text_available: true,
    full_text: 'Foundation text — verses stored as structured data in SegmentVerse table.',
    is_foundation: true,
    access_level: 'full_text',
    verification_status: 'verified_primary_source',
    license_status: 'official_free_access',
    source_provider: 'Al Quran Cloud',
    source_url: 'https://alquran.cloud'
  });
  // Ensure foundation flags are always set (even if LibraryText already existed)
  if (!libraryText.is_foundation || !libraryText.full_text_available) {
    await base44.entities.LibraryText.update(libraryText.id, {
      is_foundation: true,
      full_text_available: true,
      access_level: 'full_text',
      full_text: 'Foundation text — verses stored as structured data in SegmentVerse table.',
      source_provider: 'Al Quran Cloud',
      source_url: 'https://alquran.cloud'
    });
  }

  // 3. Create or find TextWork
  let textWork = await findOrCreate(base44, 'TextWork', { library_text_id: libraryText.id }, {
    library_text_id: libraryText.id,
    tradition_id: tradition.id,
    title: 'The Quran',
    alternate_titles: JSON.stringify(['Al-Quran', 'The Holy Quran', 'القرآن']),
    original_language: 'Arabic',
    writing_system: 'Arabic Script',
    traditional_attribution: 'Revealed to Prophet Muhammad (610-632 CE)',
    scholarly_dating: '610-632 CE',
    structure_description: '114 surahs (chapters) containing 6236 ayahs (verses)',
    major_themes: JSON.stringify(['Tawhid', 'Prophethood', 'Guidance', 'Mercy', 'Justice', 'Afterlife']),
    geographic_origin: 'Mecca and Medina, Arabian Peninsula',
    is_foundation: true,
    source_provider: 'Al Quran Cloud',
    source_url: 'https://alquran.cloud',
    source_api_endpoint: QURAN_API_BASE,
    citation_template: 'Quran {surah}:{ayah} ({edition})',
    license_status: 'official_free_access',
    verification_status: 'source_verified',
    seeding_status: 'seeding'
  });
  const textWorkId = textWork.id;
  const traditionId = tradition.id;

  // 4. Clean up old data if re-seeding
  await deleteByWork(base44, textWorkId);

  // 5. Fetch full Quran from Al Quran Cloud API
  const apiUrl = `${QURAN_API_BASE}/quran/${editionId}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error(`Quran API returned ${resp.status}`);
  const json = await resp.json();
  if (json.code !== 200) throw new Error(`Quran API error: ${json.status}`);
  const quranData = json.data;
  const surahs = quranData.surahs;
  const editionInfo = quranData.edition;

  // 6. Create EditionTranslation
  const edition = await base44.entities.EditionTranslation.create({
    text_work_id: textWorkId,
    edition_name: editionInfo.name || 'Saheeh International',
    translator: editionInfo.englishName || 'Saheeh International',
    language: editionInfo.language || 'en',
    source_provider: 'Al Quran Cloud',
    source_url: 'https://alquran.cloud',
    source_api_identifier: editionInfo.identifier || editionId,
    license_status: 'official_free_access',
    is_default: true,
    citation: `${editionInfo.name || 'Saheeh International'}. Quran. https://alquran.cloud`
  });

  // 7. Create single Division (the Quran as one division)
  const division = await base44.entities.Division.create({
    text_work_id: textWorkId,
    edition_translation_id: edition.id,
    name: 'The Quran',
    order: 0,
    description: 'The complete Quran — 114 surahs'
  });

  // 8. Create SectionChapters (surahs) and SegmentVerses (ayahs)
  let globalOrder = 0;
  const chapterData = [];
  for (const surah of surahs) {
    chapterData.push({
      division_id: division.id,
      text_work_id: textWorkId,
      edition_translation_id: edition.id,
      name: `${surah.englishName} — ${surah.englishNameTranslation}`,
      book_name: surah.englishName,
      order: surah.number,
      chapter_number: surah.number,
      verse_count: surah.numberOfAyahs,
      description: `${surah.revelationType} surah, ${surah.numberOfAyahs} ayahs`,
      source_api_identifier: String(surah.number)
    });
  }
  const createdChapters = await base44.entities.SectionChapter.bulkCreate(chapterData);

  // Create verses in batches of 500
  const allVerses = [];
  for (let i = 0; i < surahs.length; i++) {
    const surah = surahs[i];
    const chapter = createdChapters[i];
    for (const ayah of surah.ayahs) {
      allVerses.push({
        section_chapter_id: chapter.id,
        division_id: division.id,
        text_work_id: textWorkId,
        edition_translation_id: edition.id,
        tradition_id: traditionId,
        verse_number: ayah.numberInSurah,
        verse_reference: `${surah.number}:${ayah.numberInSurah}`,
        verse_text: ayah.text,
        order_index: globalOrder++,
        source_api_identifier: String(ayah.number),
        citation: `Quran ${surah.number}:${ayah.numberInSurah} (${editionInfo.name || 'Saheeh International'})`,
        source_provider: 'Al Quran Cloud',
        source_url: `https://alquran.cloud/${surah.number}:${ayah.numberInSurah}`
      });
    }
  }

  // Batch create verses
  let versesCreated = 0;
  for (let i = 0; i < allVerses.length; i += 500) {
    const batch = allVerses.slice(i, i + 500);
    await base44.entities.SegmentVerse.bulkCreate(batch);
    versesCreated += batch.length;
  }

  // 9. Update TextWork with counts
  await base44.entities.TextWork.update(textWorkId, {
    seeding_status: 'seeded',
    total_verses: versesCreated,
    total_chapters: surahs.length
  });

  return Response.json({
    success: true,
    source: 'quran',
    text_work_id: textWorkId,
    library_text_id: libraryText.id,
    tradition_id: traditionId,
    edition_id: edition.id,
    chapters_created: surahs.length,
    verses_created: versesCreated
  });
}

async function seedBible(base44, body) {
  const requestedBooks = body.books || ['john', 'genesis', 'psalms', 'matthew', 'romans'];
  const startTime = Date.now();
  const TIME_BUDGET_MS = 25000;

  // 1. Create or find Tradition
  let tradition = await findOrCreate(base44, 'Tradition', { name: 'Christianity' }, {
    name: 'Christianity',
    description: 'Monotheistic Abrahamic faith centered on the life and teachings of Jesus Christ. Sacred text is the Bible (Old and New Testaments).',
    region: 'Levant (Israel/Palestine)',
    founded_date: '1st century CE',
    original_languages: JSON.stringify(['Hebrew', 'Aramaic', 'Greek']),
    sacred_texts_summary: 'The Bible — 66 books (39 Old Testament, 27 New Testament)'
  });

  // 2. Create or find LibraryText
  let libraryText = await findOrCreate(base44, 'LibraryText', { title: 'The Bible', tradition: 'Christianity' }, {
    title: 'The Bible',
    tradition: 'Christianity',
    collection: 'sacred_scriptures',
    original_language: 'Hebrew, Aramaic, Greek',
    writing_system: 'Hebrew, Greek Alphabet',
    traditional_attribution: 'Multiple authors over ~1500 years',
    scholarly_dating: 'c. 1200 BCE – 100 CE',
    structure: '66 books (39 Old Testament, 27 New Testament)',
    major_themes: JSON.stringify(['Covenant', 'Salvation', 'Kingdom of God', 'Love', 'Faith', 'Redemption', 'Grace']),
    full_text_available: true,
    full_text: 'Foundation text — verses stored as structured data in SegmentVerse table.',
    is_foundation: true,
    access_level: 'full_text',
    verification_status: 'verified_primary_source',
    license_status: 'public_domain',
    source_provider: 'bible-api.com',
    source_url: 'https://bible-api.com'
  });

  // 3. Create or find TextWork
  let textWork = await findOrCreate(base44, 'TextWork', { library_text_id: libraryText.id }, {
    library_text_id: libraryText.id,
    tradition_id: tradition.id,
    title: 'The Bible',
    alternate_titles: JSON.stringify(['The Holy Bible', 'Scripture']),
    original_language: 'Hebrew, Aramaic, Greek',
    writing_system: 'Hebrew, Greek Alphabet',
    traditional_attribution: 'Multiple authors (prophets, apostles, kings)',
    scholarly_dating: 'c. 1200 BCE – 100 CE',
    structure_description: '66 books across 2 divisions (Old Testament, New Testament)',
    major_themes: JSON.stringify(['Covenant', 'Salvation', 'Kingdom of God', 'Love', 'Faith', 'Redemption']),
    geographic_origin: 'Levant, Mediterranean',
    is_foundation: true,
    source_provider: 'bible-api.com',
    source_url: 'https://bible-api.com',
    source_api_endpoint: BIBLE_API_BASE,
    citation_template: '{book} {chapter}:{verse} (KJV)',
    license_status: 'public_domain',
    verification_status: 'source_verified',
    seeding_status: 'seeding'
  });
  const textWorkId = textWork.id;
  const traditionId = tradition.id;

  // 4. Skip-existing logic handles re-seeding automatically — no destructive cleanup needed.
  //    The per-chapter existence check below ensures idempotent, resumable seeding.

  // 5. Create EditionTranslation
  let edition = await findOrCreate(base44, 'EditionTranslation', { text_work_id: textWorkId, source_api_identifier: 'kjv' }, {
    text_work_id: textWorkId,
    edition_name: 'King James Version',
    translator: 'Commissioned by King James I (1611)',
    language: 'en',
    source_provider: 'bible-api.com',
    source_url: 'https://bible-api.com',
    source_api_identifier: 'kjv',
    license_status: 'public_domain',
    is_default: true,
    citation: 'King James Version (KJV). Public domain. https://bible-api.com'
  });

  // 6. Create Divisions
  const divisions = {};
  for (const divName of ['Old Testament', 'New Testament']) {
    let div = await findOrCreate(base44, 'Division', { text_work_id: textWorkId, name: divName }, {
      text_work_id: textWorkId,
      edition_translation_id: edition.id,
      name: divName,
      order: divName === 'Old Testament' ? 0 : 1,
      description: divName === 'Old Testament' ? '39 books of the Hebrew Bible' : '27 books of the Christian New Testament'
    });
    divisions[divName] = div;
  }

  // 7. Fetch and create chapters + verses for each requested book
  let globalOrder = 0;
  let chaptersCreated = 0;
  let versesCreated = 0;
  const completedBooks = [];
  const remainingBooks = [];

  for (const bookKey of requestedBooks) {
    // Time budget check — return remaining books if we're approaching the timeout
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      remainingBooks.push(bookKey);
      continue;
    }

    const bookInfo = BIBLE_BOOKS[bookKey];
    if (!bookInfo) continue;

    const division = divisions[bookInfo.division];
    let bookFullySeeded = true;

    for (let chapterNum = 1; chapterNum <= bookInfo.chapters; chapterNum++) {
      // Time budget check mid-book
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        bookFullySeeded = false;
        break;
      }

      // Check if chapter already exists (skip if already seeded)
      const existingCh = await base44.entities.SectionChapter.filter({ text_work_id: textWorkId, book_name: bookInfo.name, chapter_number: chapterNum }, '-updated_date', 1);
      if (existingCh && existingCh.length > 0) continue;

      const apiUrl = `${BIBLE_API_BASE}/${bookKey}+${chapterNum}`;
      let data = null;
      for (let attempt = 0; attempt < 4 && !data; attempt++) {
        if (attempt > 0) await sleep(2000);
        try {
          const resp = await fetch(apiUrl);
          if (resp.ok) {
            data = await resp.json();
            if (!data.verses || data.verses.length === 0) data = null;
          }
        } catch {}
      }
      if (!data) continue;

      const chapter = await base44.entities.SectionChapter.create({
        division_id: division.id,
        text_work_id: textWorkId,
        edition_translation_id: edition.id,
        name: `${bookInfo.name} ${chapterNum}`,
        book_name: bookInfo.name,
        order: chapterNum,
        chapter_number: chapterNum,
        verse_count: data.verses.length,
        source_api_identifier: `${bookKey}+${chapterNum}`
      });
      chaptersCreated++;

      const verseBatch = data.verses.map(v => ({
        section_chapter_id: chapter.id,
        division_id: division.id,
        text_work_id: textWorkId,
        edition_translation_id: edition.id,
        tradition_id: traditionId,
        verse_number: v.verse,
        verse_reference: `${bookInfo.name} ${chapterNum}:${v.verse}`,
        verse_text: v.text.trim(),
        order_index: globalOrder++,
        citation: `${bookInfo.name} ${chapterNum}:${v.verse} (KJV)`,
        source_provider: 'bible-api.com',
        source_url: `https://bible-api.com/${bookKey}+${chapterNum}:${v.verse}`
      }));
      await base44.entities.SegmentVerse.bulkCreate(verseBatch);
      versesCreated += verseBatch.length;
    }

    if (bookFullySeeded) {
      completedBooks.push(bookKey);
    } else {
      remainingBooks.push(bookKey);
    }
  }

  // 8. Update TextWork with counts
  const existingChapters = await base44.entities.SectionChapter.filter({ text_work_id: textWorkId });
  const existingVerses = await base44.entities.SegmentVerse.filter({ text_work_id: textWorkId });
  await base44.entities.TextWork.update(textWorkId, {
    seeding_status: 'seeded',
    total_verses: existingVerses.length,
    total_chapters: existingChapters.length
  });

  return Response.json({
    success: true,
    source: 'bible',
    text_work_id: textWorkId,
    library_text_id: libraryText.id,
    tradition_id: traditionId,
    edition_id: edition.id,
    books_seeded: completedBooks,
    books_remaining: remainingBooks,
    chapters_created: chaptersCreated,
    verses_created: versesCreated,
    partial: remainingBooks.length > 0
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findOrCreate(base44, entityName, filter, createData) {
  const existing = await base44.entities[entityName].filter(filter, '-updated_date', 1);
  if (existing && existing.length > 0) {
    return existing[0];
  }
  return await base44.entities[entityName].create(createData);
}

async function deleteByWork(base44, textWorkId) {
  try {
    const verses = await base44.entities.SegmentVerse.filter({ text_work_id: textWorkId });
    if (verses.length > 0) await base44.entities.SegmentVerse.deleteMany({ text_work_id: textWorkId });
    const chapters = await base44.entities.SectionChapter.filter({ text_work_id: textWorkId });
    if (chapters.length > 0) await base44.entities.SectionChapter.deleteMany({ text_work_id: textWorkId });
    await base44.entities.Division.deleteMany({ text_work_id: textWorkId });
    await base44.entities.EditionTranslation.deleteMany({ text_work_id: textWorkId });
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}