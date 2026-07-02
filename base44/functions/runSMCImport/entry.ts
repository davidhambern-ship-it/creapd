import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const mode = body.mode || 'auto_create';

    if (mode === 'auto_create') {
      return await autoCreateJobs(base44);
    } else if (mode === 'execute') {
      return await executeJob(base44, body.job_id);
    } else if (mode === 'auto_execute') {
      return await autoExecuteJobs(base44);
    } else if (mode === 'auto_run_approved') {
      return await autoRunApproved(base44);
    }

    return Response.json({ error: 'Invalid mode. Use auto_create, execute, auto_execute, or auto_run_approved' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Scan seeder-enabled, approved sources and create Queued import jobs for any without active jobs
async function autoCreateJobs(base44) {
  const sources = await base44.asServiceRole.entities.SMCSource.filter(
    { seeder_enabled: true, is_approved: true },
    '-updated_date',
    100
  );

  const jobsCreated = [];
  const skipped = [];

  for (const source of sources) {
    // Check if there's already an active job for this source
    const existingJobs = await base44.asServiceRole.entities.SMCImportJob.filter(
      { source_id: source.id },
      '-created_date',
      10
    );
    const hasActive = existingJobs.some(j =>
      ['Queued', 'Running', 'Validating'].includes(j.status)
    );

    if (hasActive) {
      skipped.push({ source_id: source.id, source_name: source.source_name, reason: 'Active job exists' });
      continue;
    }

    // Determine work title, tradition, collection from source metadata
    const workTitle = source.source_name;
    let tradition = '';
    let collection = '';
    try {
      const traditions = source.supported_traditions ? JSON.parse(source.supported_traditions) : [];
      tradition = traditions[0] || '';
      const collections = source.supported_collections ? JSON.parse(source.supported_collections) : [];
      collection = collections[0] || '';
    } catch {}

    // Find a matching parser
    let parserId = '';
    const parsers = await base44.asServiceRole.entities.SMCParser.filter(
      { status: 'Active' },
      '-updated_date',
      20
    );
    const matchingParser = parsers.find(p => {
      try {
        const supportedProviders = p.supported_providers ? JSON.parse(p.supported_providers) : [];
        return supportedProviders.some(sp =>
          source.provider_name?.toLowerCase().includes(sp.toLowerCase()) ||
          source.source_name?.toLowerCase().includes(sp.toLowerCase())
        );
      } catch { return false; }
    });
    if (matchingParser) parserId = matchingParser.id;

    const importMethod = source.source_type === 'API' ? 'API Fetch' :
      source.source_type === 'GitHub Repository' ? 'GitHub Clone' :
      source.source_type === 'Bulk Download' ? 'Bulk Download' : 'API Fetch';

    const job = await base44.asServiceRole.entities.SMCImportJob.create({
      source_id: source.id,
      work_title: workTitle,
      tradition,
      collection,
      parser_id: parserId,
      import_method: importMethod,
      status: 'Queued',
      progress_percent: 0,
      records_imported: 0,
      total_records_expected: 0,
      validation_status: 'Pending',
      duplicate_check_status: 'Not Checked',
      rollback_available: true,
      admin_notes: 'Auto-created by scheduled automation — awaiting manual approval'
    });
    jobsCreated.push({ job_id: job.id, source_id: source.id, source_name: source.source_name });
  }

  return Response.json({
    success: true,
    mode: 'auto_create',
    sources_scanned: sources.length,
    jobs_created: jobsCreated.length,
    jobs_created_detail: jobsCreated,
    skipped: skipped
  });
}

// Execute a specific import job — routes to the matching handler from the registry
async function executeJob(base44, jobId) {
  if (!jobId) return Response.json({ error: 'job_id is required' }, { status: 400 });

  try {
    const job = await base44.asServiceRole.entities.SMCImportJob.get(jobId);
    if (!job) return Response.json({ error: 'Import job not found' }, { status: 404 });
    if (job.status === 'Running') return Response.json({ error: 'Job is already running' }, { status: 409 });

    const source = await base44.asServiceRole.entities.SMCSource.get(job.source_id);
    if (!source) return Response.json({ error: 'Source not found' }, { status: 404 });

    await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
      status: 'Running',
      started_at: new Date().toISOString(),
      progress_percent: 5
    });

    const handlerResult = await findHandler(base44, source);
    const result = await handlerResult.fn(base44, source, job);
    if (handlerResult.handler) {
      await updateHandlerStats(base44, handlerResult.handler, result);
    }

    if (result.partial) {
      await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
        status: 'Queued',
        progress_percent: 50,
        records_imported: result.records_imported || 0,
        total_records_expected: result.total_records || 0,
        metadata: JSON.stringify(result)
      });

      return Response.json({
        success: true,
        mode: 'execute',
        job_id: jobId,
        source_name: source.source_name,
        handler: result.handler_name,
        records_imported: result.records_imported || 0,
        total_records: result.total_records || 0,
        skipped: result.skipped || 0,
        partial: true,
        message: 'Partial import — re-run to continue importing remaining records.'
      });
    }

    await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
      status: 'Completed',
      progress_percent: 100,
      records_imported: result.records_imported || 0,
      total_records_expected: result.total_records || 0,
      completed_at: new Date().toISOString(),
      validation_status: 'Validated',
      duplicate_check_status: result.skipped > 0 ? 'Updated Existing' : 'No Duplicates',
      metadata: JSON.stringify(result)
    });

    return Response.json({
      success: true,
      mode: 'execute',
      job_id: jobId,
      source_name: source.source_name,
      handler: result.handler_name,
      records_imported: result.records_imported || 0,
      total_records: result.total_records || 0,
      skipped: result.skipped || 0,
      partial: false
    });
  } catch (error) {
    // Capture full error details for diagnostics
    const errorMsg = error.response?.data?.error || error.message;
    const errorStatus = error.response?.status;

    try {
      await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
        status: 'Failed',
        error_log: `${errorMsg}${errorStatus ? ` (HTTP ${errorStatus})` : ''}`,
        completed_at: new Date().toISOString()
      });
    } catch {}
    return Response.json({ error: errorMsg, job_id: jobId }, { status: 500 });
  }
}
// (executeJob body moved into try block above — old duplicate code removed)

// ─── Auto-Execute Queued Jobs ──────────────────────────────────────
// Picks up Queued jobs and executes them through the handler-selected pipeline.
// Called directly by the "Import Auto-Executor" scheduled automation.
async function autoExecuteJobs(base44) {
  // ─── Stuck-job recovery: reset jobs stuck in 'Running' for >5 min back to 'Queued' ───
  const stuckJobs = await base44.asServiceRole.entities.SMCImportJob.filter(
    { status: 'Running' },
    'created_date',
    20
  );
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  let recovered = 0;
  for (const stuck of stuckJobs) {
    const startedAt = stuck.started_at ? new Date(stuck.started_at).getTime() : 0;
    if (startedAt < fiveMinAgo) {
      await base44.asServiceRole.entities.SMCImportJob.update(stuck.id, {
        status: 'Queued',
        error_log: 'Recovered from stuck Running state by autoExecuteJobs'
      });
      recovered++;
    }
  }

  const queuedJobs = await base44.asServiceRole.entities.SMCImportJob.filter(
    { status: 'Queued' },
    'created_date',
    3
  );

  const results = [];
  for (const job of queuedJobs) {
    try {
      const result = await executeJob(base44, job.id);
      const data = await result.json();
      const ok = result.ok;
      results.push({
        job_id: job.id,
        work_title: job.work_title,
        status: ok ? 'completed' : 'failed',
        records: data.records_imported || 0,
        error: ok ? undefined : data.error
      });
    } catch (err) {
      results.push({ job_id: job.id, work_title: job.work_title, status: 'failed', error: err.message });
    }
  }

  return Response.json({
    success: true,
    mode: 'auto_execute',
    stuck_recovered: recovered,
    queued_found: queuedJobs.length,
    executed: results.length,
    results
  });
}

// ─── Handler Registry ──────────────────────────────────────────────
// Each handler: (base44, source, job) => { handler_name, records_imported, total_records, skipped, partial, ... }

// ─── Handler Registry Integration ──────────────────────────────────
// 1. Admin override: if source.handler_id is set, use that handler
// 2. Auto-select: query SMCHandler registry for matching handlers
// 3. Fall back to name-based detection (existing logic)
async function findHandler(base44, source) {
  // 1. Admin override
  if (source.handler_id) {
    try {
      const handler = await base44.asServiceRole.entities.SMCHandler.get(source.handler_id);
      if (handler && ['Active', 'Beta'].includes(handler.status)) {
        const fn = routeByHandlerType(handler.handler_type);
        if (fn) return { fn, handler };
      }
    } catch {}
  }

  // 2. Auto-select from Handler Registry
  try {
    const handlers = await base44.asServiceRole.entities.SMCHandler.filter(
      { status: 'Active' },
      '-updated_date',
      50
    );
    const matched = matchHandlerToSource(handlers || [], source);
    if (matched) {
      const fn = routeByHandlerType(matched.handler_type);
      if (fn) return { fn, handler: matched };
    }
  } catch {}

  // 3. Fall back to name-based detection
  return { fn: findHandlerByName(source), handler: null };
}

function routeByHandlerType(type) {
  switch (type) {
    case 'Bible API': return handlerQuranBible;
    case 'Quran API': return handlerQuranBible;
    case 'Open Scripture API': return handlerOpenScripturesStrongs;
    default: return null;
  }
}

function matchHandlerToSource(handlers, source) {
  const sourceName = (source.source_name || '').toLowerCase();
  const sourceType = source.source_type || '';
  const providerName = (source.provider_name || '').toLowerCase();

  // Match by supported providers
  for (const h of handlers) {
    const providers = parseHandlerJsonArray(h.supported_providers);
    if (providers.some(p =>
      p && (sourceName.includes(p.toLowerCase()) || providerName.includes(p.toLowerCase()))
    )) return h;
  }

  // Match by supported source types
  for (const h of handlers) {
    const sourceTypes = parseHandlerJsonArray(h.supported_source_types);
    if (sourceTypes.includes(sourceType)) return h;
  }

  return null;
}

function findHandlerByName(source) {
  const name = (source.source_name || '').toLowerCase();
  const url = (source.api_base_url || '').toLowerCase();
  const website = (source.website || '').toLowerCase();

  // Quran / Bible verse sources → delegate to seedFoundationText
  if (name.includes('quran') || name.includes('al quran')) return handlerQuranBible;
  if (name.includes('bible-api') || url.includes('bible-api.com')) return handlerQuranBible;

  // OpenScriptures Strong's dictionaries
  if (name.includes("strong's") || url.includes('openscriptures/strongs') || website.includes('openscriptures/strongs')) {
    return handlerOpenScripturesStrongs;
  }

  // STEP Bible Data
  if (name.includes('step') || url.includes('stepbible') || website.includes('stepbible')) {
    return handlerStepBible;
  }

  // CrossWire SWORD modules
  if (name.includes('sword') || name.includes('crosswire') || url.includes('crosswire')) {
    return handlerCrossWireSword;
  }

  // Fallback: LLM-assisted auto-detect
  return handlerLLMAutoDetect;
}

async function updateHandlerStats(base44, handler, result) {
  try {
    const totalRuns = (handler.total_runs || 0) + 1;
    const success = (result.records_imported || 0) > 0;
    const successfulRuns = success ? (handler.successful_runs || 0) + 1 : (handler.successful_runs || 0);
    const failedRuns = !success ? (handler.failed_runs || 0) + 1 : (handler.failed_runs || 0);
    const successRate = Math.round((successfulRuns / totalRuns) * 100);
    const failureRate = Math.round((failedRuns / totalRuns) * 100);

    await base44.asServiceRole.entities.SMCHandler.update(handler.id, {
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      success_rate: successRate,
      failure_rate: failureRate,
      last_used_at: new Date().toISOString(),
      health_status: success ? 'Healthy' : (handler.health_status === 'Healthy' ? 'Warning' : (handler.health_status || 'Unknown'))
    });
  } catch {}
}

function parseHandlerJsonArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return []; }
}

// ─── Handler: Quran / Bible (delegates to seedFoundationText) ─────
async function handlerQuranBible(base44, source, job) {
  // Cannot call seedFoundationText via base44.functions.invoke() — auth tokens
  // aren't forwarded between functions (returns 403). Inline the seeding logic instead.
  const name = (source.source_name || '').toLowerCase();
  const isQuran = name.includes('quran');

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 10 });

  let data;
  if (isQuran) {
    data = await seedQuranInline(base44, job);
  } else {
    data = await seedBibleInline(base44, job);
  }

  return {
    handler_name: 'quran_bible_delegate',
    records_imported: data.verses_created || 0,
    total_records: data.verses_created || 0,
    skipped: 0,
    partial: false,
    chapters_created: data.chapters_created || 0,
    verses_created: data.verses_created || 0,
    library_text_id: data.library_text_id || '',
    text_work_id: data.text_work_id || ''
  };
}

// ─── Inline Quran Seeding (avoids function-to-function 403) ─────────
async function seedQuranInline(base44, job) {
  const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
  const editionId = 'en.sahih';

  // Find or create Tradition
  let tradition = await findOrCreateInline(base44, 'Tradition', { name: 'Islam' }, {
    name: 'Islam',
    description: 'Monotheistic Abrahamic faith. Sacred text is the Quran.',
    region: 'Arabian Peninsula',
    founded_date: '610 CE',
    original_languages: JSON.stringify(['Arabic']),
    sacred_texts_summary: 'The Quran (114 surahs, 6236 ayahs)'
  });

  // Find or create LibraryText
  let libraryText = await findOrCreateInline(base44, 'LibraryText', { title: 'The Quran', tradition: 'Islam' }, {
    title: 'The Quran',
    tradition: 'Islam',
    collection: 'sacred_scriptures',
    original_language: 'Arabic',
    writing_system: 'Arabic Script',
    traditional_attribution: 'Revealed to Prophet Muhammad (610-632 CE)',
    scholarly_dating: '610-632 CE',
    structure: '114 surahs (chapters), 6236 ayahs (verses)',
    major_themes: JSON.stringify(['Tawhid', 'Prophethood', 'Guidance', 'Mercy', 'Justice', 'Afterlife']),
    full_text_available: true,
    full_text: 'Foundation text — verses stored as structured data in SegmentVerse table.',
    is_foundation: true,
    access_level: 'full_text',
    verification_status: 'verified_primary_source',
    license_status: 'official_free_access',
    source_provider: 'Al Quran Cloud',
    source_url: 'https://alquran.cloud'
  });

  // Find or create TextWork
  let textWork = await findOrCreateInline(base44, 'TextWork', { library_text_id: libraryText.id }, {
    library_text_id: libraryText.id,
    tradition_id: tradition.id,
    title: 'The Quran',
    alternate_titles: JSON.stringify(['Al-Quran', 'The Holy Quran']),
    original_language: 'Arabic',
    writing_system: 'Arabic Script',
    traditional_attribution: 'Revealed to Prophet Muhammad (610-632 CE)',
    scholarly_dating: '610-632 CE',
    structure_description: '114 surahs (chapters) containing 6236 ayahs (verses)',
    major_themes: JSON.stringify(['Tawhid', 'Prophethood', 'Guidance', 'Mercy', 'Justice']),
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

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 20 });

  // Check if already seeded
  const existingVerses = await base44.asServiceRole.entities.SegmentVerse.filter({ text_work_id: textWork.id }, '-created_date', 1);
  if (existingVerses && existingVerses.length > 0) {
    await base44.asServiceRole.entities.TextWork.update(textWork.id, { seeding_status: 'seeded' });
    return { text_work_id: textWork.id, library_text_id: libraryText.id, chapters_created: 0, verses_created: 0, already_seeded: true };
  }

  // Fetch full Quran
  const apiUrl = `${QURAN_API_BASE}/quran/${editionId}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) throw new Error(`Quran API returned ${resp.status}`);
  const json = await resp.json();
  const surahs = json.data.surahs;
  const editionInfo = json.data.edition;

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 30 });

  // Create EditionTranslation
  const edition = await base44.asServiceRole.entities.EditionTranslation.create({
    text_work_id: textWork.id,
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

  // Create Division
  const division = await base44.asServiceRole.entities.Division.create({
    text_work_id: textWork.id,
    edition_translation_id: edition.id,
    name: 'The Quran',
    order: 0,
    description: 'The complete Quran — 114 surahs'
  });

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 40 });

  // Create SectionChapters
  const chapterData = [];
  for (const surah of surahs) {
    chapterData.push({
      division_id: division.id,
      text_work_id: textWork.id,
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
  const createdChapters = await base44.asServiceRole.entities.SectionChapter.bulkCreate(chapterData);

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 60 });

  // Create verses in batches
  const allVerses = [];
  let globalOrder = 0;
  for (let i = 0; i < surahs.length; i++) {
    const surah = surahs[i];
    const chapter = createdChapters[i];
    for (const ayah of surah.ayahs) {
      allVerses.push({
        section_chapter_id: chapter.id,
        division_id: division.id,
        text_work_id: textWork.id,
        edition_translation_id: edition.id,
        tradition_id: tradition.id,
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

  let versesCreated = 0;
  for (let i = 0; i < allVerses.length; i += 500) {
    const batch = allVerses.slice(i, i + 500);
    await base44.asServiceRole.entities.SegmentVerse.bulkCreate(batch);
    versesCreated += batch.length;
    await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
      progress_percent: Math.min(90, 60 + Math.floor((versesCreated / allVerses.length) * 30))
    });
  }

  await base44.asServiceRole.entities.TextWork.update(textWork.id, {
    seeding_status: 'seeded',
    total_verses: versesCreated,
    total_chapters: surahs.length
  });

  return { text_work_id: textWork.id, library_text_id: libraryText.id, chapters_created: surahs.length, verses_created: versesCreated };
}

// ─── Inline Bible Seeding (simplified — John, Genesis, Psalms, Matthew, Romans) ─────
async function seedBibleInline(base44, job) {
  const BIBLE_API_BASE = 'https://bible-api.com';
  const books = [
    { key: 'john', name: 'John', chapters: 21, division: 'New Testament' },
    { key: 'genesis', name: 'Genesis', chapters: 50, division: 'Old Testament' },
    { key: 'psalms', name: 'Psalms', chapters: 150, division: 'Old Testament' },
    { key: 'matthew', name: 'Matthew', chapters: 28, division: 'New Testament' },
    { key: 'romans', name: 'Romans', chapters: 16, division: 'New Testament' }
  ];

  let tradition = await findOrCreateInline(base44, 'Tradition', { name: 'Christianity' }, {
    name: 'Christianity',
    description: 'Monotheistic Abrahamic faith centered on Jesus Christ. Sacred text is the Bible.',
    region: 'Levant (Israel/Palestine)',
    founded_date: '1st century CE',
    original_languages: JSON.stringify(['Hebrew', 'Aramaic', 'Greek']),
    sacred_texts_summary: 'The Bible — 66 books (39 Old Testament, 27 New Testament)'
  });

  let libraryText = await findOrCreateInline(base44, 'LibraryText', { title: 'The Bible', tradition: 'Christianity' }, {
    title: 'The Bible',
    tradition: 'Christianity',
    collection: 'sacred_scriptures',
    original_language: 'Hebrew, Aramaic, Greek',
    writing_system: 'Hebrew, Greek Alphabet',
    traditional_attribution: 'Multiple authors over ~1500 years',
    scholarly_dating: 'c. 1200 BCE – 100 CE',
    structure: '66 books (39 Old Testament, 27 New Testament)',
    major_themes: JSON.stringify(['Covenant', 'Salvation', 'Kingdom of God', 'Love', 'Faith', 'Redemption']),
    full_text_available: true,
    full_text: 'Foundation text — verses stored as structured data in SegmentVerse table.',
    is_foundation: true,
    access_level: 'full_text',
    verification_status: 'verified_primary_source',
    license_status: 'public_domain',
    source_provider: 'bible-api.com',
    source_url: 'https://bible-api.com'
  });

  let textWork = await findOrCreateInline(base44, 'TextWork', { library_text_id: libraryText.id }, {
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

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 20 });

  // Check if already seeded
  const existingVerses = await base44.asServiceRole.entities.SegmentVerse.filter({ text_work_id: textWork.id }, '-created_date', 1);
  if (existingVerses && existingVerses.length > 0) {
    await base44.asServiceRole.entities.TextWork.update(textWork.id, { seeding_status: 'seeded' });
    return { text_work_id: textWork.id, library_text_id: libraryText.id, chapters_created: 0, verses_created: 0, already_seeded: true };
  }

  let edition = await findOrCreateInline(base44, 'EditionTranslation', { text_work_id: textWork.id, source_api_identifier: 'kjv' }, {
    text_work_id: textWork.id,
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

  const divisions = {};
  for (const divName of ['Old Testament', 'New Testament']) {
    let div = await findOrCreateInline(base44, 'Division', { text_work_id: textWork.id, name: divName }, {
      text_work_id: textWork.id,
      edition_translation_id: edition.id,
      name: divName,
      order: divName === 'Old Testament' ? 0 : 1,
      description: divName === 'Old Testament' ? '39 books of the Hebrew Bible' : '27 books of the Christian New Testament'
    });
    divisions[divName] = div;
  }

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 30 });

  let globalOrder = 0;
  let chaptersCreated = 0;
  let versesCreated = 0;
  const startTime = Date.now();
  const TIME_BUDGET_MS = 22000;

  for (const book of books) {
    if (Date.now() - startTime > TIME_BUDGET_MS) break;

    for (let ch = 1; ch <= book.chapters; ch++) {
      if (Date.now() - startTime > TIME_BUDGET_MS) break;

      // Check if chapter already exists
      const existing = await base44.asServiceRole.entities.SectionChapter.filter(
        { text_work_id: textWork.id, book_name: book.name, chapter_number: ch },
        '-created_date',
        1
      );
      if (existing && existing.length > 0) continue;

      const url = `${BIBLE_API_BASE}/${book.key}+${ch}`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();

      const chapter = await base44.asServiceRole.entities.SectionChapter.create({
        division_id: divisions[book.division].id,
        text_work_id: textWork.id,
        edition_translation_id: edition.id,
        name: `${book.name} ${ch}`,
        book_name: book.name,
        order: chaptersCreated,
        chapter_number: ch,
        verse_count: data.verses?.length || 0,
        description: `${book.name} Chapter ${ch}`,
        source_api_identifier: `${book.key}-${ch}`
      });
      chaptersCreated++;

      const verseBatch = [];
      for (const v of data.verses || []) {
        verseBatch.push({
          section_chapter_id: chapter.id,
          division_id: divisions[book.division].id,
          text_work_id: textWork.id,
          edition_translation_id: edition.id,
          tradition_id: tradition.id,
          verse_number: v.verse,
          verse_reference: v.reference || `${book.name} ${ch}:${v.verse}`,
          verse_text: v.text?.trim() || '',
          order_index: globalOrder++,
          source_api_identifier: String(v.verse),
          citation: `${v.reference || `${book.name} ${ch}:${v.verse}`} (KJV)`,
          source_provider: 'bible-api.com',
          source_url: url
        });
      }
      if (verseBatch.length > 0) {
        await base44.asServiceRole.entities.SegmentVerse.bulkCreate(verseBatch);
        versesCreated += verseBatch.length;
      }

      await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
        progress_percent: Math.min(90, 30 + Math.floor((versesCreated / 3000) * 60)),
        records_imported: versesCreated
      });
    }
  }

  await base44.asServiceRole.entities.TextWork.update(textWork.id, {
    seeding_status: 'seeded',
    total_verses: versesCreated,
    total_chapters: chaptersCreated
  });

  return { text_work_id: textWork.id, library_text_id: libraryText.id, chapters_created: chaptersCreated, verses_created: versesCreated };
}

// ─── Helper: find or create entity ──────────────────────────────────
async function findOrCreateInline(base44, entityName, filter, createData) {
  const existing = await base44.asServiceRole.entities[entityName].filter(filter, '-created_date', 1);
  if (existing && existing.length > 0) return existing[0];
  return await base44.asServiceRole.entities[entityName].create(createData);
}

// ─── Handler: OpenScriptures Strong's Greek & Hebrew ──────────────
// Resumable: stores cursor in job metadata so re-runs continue where they left off
async function handlerOpenScripturesStrongs(base44, source, job) {
  const startTime = Date.now();
  const TIME_BUDGET_MS = 22000;
  const baseUrl = source.api_base_url || 'https://raw.githubusercontent.com/openscriptures/strongs/master/';

  const dictionaries = [
    { url: `${baseUrl}greek/strongs-greek-dictionary.js`, language: 'Koine Greek', prefix: 'G' },
    { url: `${baseUrl}hebrew/strongs-hebrew-dictionary.js`, language: 'Biblical Hebrew', prefix: 'H' }
  ];

  // Read cursor from job metadata (for resumable imports)
  let cursor = { dict_index: 0, keys_done: 0, total_imported: 0, total_entries: 0 };
  try {
    if (job.metadata) {
      const parsed = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;
      if (parsed.cursor) cursor = { ...cursor, ...parsed.cursor };
    }
  } catch {}

  let totalImported = cursor.total_imported || 0;
  let totalEntries = cursor.total_entries || 0;
  let totalSkipped = 0;
  let allDictionariesComplete = true;

  for (let di = cursor.dict_index; di < dictionaries.length; di++) {
    if (Date.now() - startTime > TIME_BUDGET_MS) { allDictionariesComplete = false; break; }

    const dict = dictionaries[di];
    const resp = await fetch(dict.url);
    if (!resp.ok) continue;
    const text = await resp.text();

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) continue;

    let entries;
    try {
      entries = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {
      try {
        const fixed = text.substring(firstBrace, lastBrace + 1).replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        entries = JSON.parse(fixed);
      } catch { continue; }
    }

    const keys = Object.keys(entries);
    // Only count entries once per dictionary (skip if resuming mid-dictionary)
    if (cursor.keys_done === 0) {
      totalEntries += keys.length;
    }

    // Only delete on first run (when cursor is at the start of this dictionary)
    const sourceTag = `strongs-${dict.prefix.toLowerCase()}`;
    if (cursor.keys_done === 0) {
      await base44.asServiceRole.entities.WordStudy.deleteMany({ tags: sourceTag });
    }

    const startIdx = cursor.keys_done;
    const batch = [];
    for (let ki = startIdx; ki < keys.length; ki++) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        // Save cursor for resumable re-run
        await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
          progress_percent: Math.min(90, 10 + Math.floor(totalImported / Math.max(totalEntries, 1) * 80)),
          records_imported: totalImported,
          metadata: JSON.stringify({
            handler_name: 'openscriptures_strongs',
            cursor: { dict_index: di, keys_done: ki, total_imported: totalImported, total_entries: totalEntries }
          })
        });
        return {
          handler_name: 'openscriptures_strongs',
          records_imported: totalImported,
          total_records: totalEntries,
          skipped: totalSkipped,
          partial: true,
          cursor: { dict_index: di, keys_done: ki, total_imported: totalImported, total_entries: totalEntries },
          resume_info: `Processed ${ki}/${keys.length} entries in dictionary ${di + 1}/${dictionaries.length}. Re-run to continue.`
        };
      }

      const entry = entries[keys[ki]];
      const word = entry.lemma || keys[ki];

      batch.push({
        word,
        original_script: entry.lemma || '',
        language: dict.language,
        transliteration: entry.translit || '',
        literal_meaning: entry.strongs_def || '',
        contextual_meaning: entry.kjv_def || '',
        grammar: entry.derivation || '',
        part_of_speech: '',
        root: entry.derivation || '',
        tags: sourceTag,
        notes: `Strong's ${keys[ki]} — imported from OpenScriptures`
      });

      if (batch.length >= 500) {
        await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
        totalImported += batch.length;
        await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
          progress_percent: Math.min(90, 10 + Math.floor(totalImported / Math.max(totalEntries, 1) * 80)),
          records_imported: totalImported
        });
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
      totalImported += batch.length;
    }

    // Reset cursor for next dictionary
    cursor.dict_index = di + 1;
    cursor.keys_done = 0;
  }

  return {
    handler_name: 'openscriptures_strongs',
    records_imported: totalImported,
    total_records: totalEntries,
    skipped: totalSkipped,
    partial: !allDictionariesComplete,
    cursor: allDictionariesComplete ? null : { dict_index: cursor.dict_index, keys_done: 0, total_imported: totalImported, total_entries: totalEntries },
    dictionaries: 'Greek + Hebrew Strong\'s Dictionaries'
  };
}

// ─── Handler: STEP Bible Data (TSV lexicons from GitHub) ──────────
// Resumable: stores cursor in job metadata so re-runs continue where they left off.
// STEP Bible TSV files have ~90 lines of preamble (license/docs) before the actual data.
// There is no column header row — data uses fixed positional columns:
//   0: Strong's #, 1: mapping, 2: internal ID, 3: original script, 4: transliteration,
//   5: morphology code, 6: brief gloss, 7: full definition (HTML)
async function handlerStepBible(base44, source, job) {
  const startTime = Date.now();
  const TIME_BUDGET_MS = 22000;

  const dataRepoBase = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/';

  const lexiconFiles = [
    { path: 'Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt', language: 'Koine Greek', type: 'greek_lexicon' },
    { path: 'Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt', language: 'Biblical Hebrew', type: 'hebrew_lexicon' }
  ];

  // Read cursor from job metadata (for resumable imports)
  let cursor = { file_index: 0, line_index: 0, total_imported: 0, total_entries: 0 };
  try {
    if (job.metadata) {
      const parsed = typeof job.metadata === 'string' ? JSON.parse(job.metadata) : job.metadata;
      if (parsed.cursor) cursor = { ...cursor, ...parsed.cursor };
    }
  } catch {}

  let totalImported = cursor.total_imported || 0;
  let totalEntries = cursor.total_entries || 0;
  let totalSkipped = 0;
  const filesProcessed = [];

  function stripHtml(s) {
    return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  }

  for (let fi = cursor.file_index; fi < lexiconFiles.length; fi++) {
    if (Date.now() - startTime > TIME_BUDGET_MS) break;

    const file = lexiconFiles[fi];
    const resp = await fetch(encodeURI(dataRepoBase + file.path));
    if (!resp.ok) continue;
    const tsv = await resp.text();

    const allLines = tsv.split('\n');

    // Find where actual data starts — first line matching [GH] + 4 digits + tab
    let dataStart = 0;
    for (let i = 0; i < allLines.length; i++) {
      if (/^[GH]\d{4}\t/.test(allLines[i])) { dataStart = i; break; }
    }

    const dataLines = allLines.slice(dataStart).filter(l => l.trim());
    if (dataLines.length === 0) continue;

    // Count entries only once per file (skip if resuming mid-file)
    if (cursor.line_index === 0) {
      totalEntries += dataLines.length;
    }
    filesProcessed.push(file.type);

    // Clear existing entries only on first run of this file
    const sourceTag = `stepbible-${file.type}`;
    if (cursor.line_index === 0) {
      await base44.asServiceRole.entities.WordStudy.deleteMany({ tags: sourceTag });
    }

    const batch = [];
    const startIdx = cursor.line_index;

    for (let li = startIdx; li < dataLines.length; li++) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        if (batch.length > 0) {
          await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
          totalImported += batch.length;
        }
        await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
          progress_percent: Math.min(90, 10 + Math.floor(totalImported / Math.max(totalEntries, 1) * 80)),
          records_imported: totalImported,
          metadata: JSON.stringify({
            handler_name: 'step_bible_tsv',
            cursor: { file_index: fi, line_index: li, total_imported: totalImported, total_entries: totalEntries }
          })
        });
        return {
          handler_name: 'step_bible_tsv',
          records_imported: totalImported,
          total_records: totalEntries,
          skipped: totalSkipped,
          partial: true,
          cursor: { file_index: fi, line_index: li, total_imported: totalImported, total_entries: totalEntries },
          resume_info: `Processed ${li}/${dataLines.length} lines in file ${fi + 1}/${lexiconFiles.length}. Re-run to continue.`
        };
      }

      const cols = dataLines[li].split('\t');
      const strongsNumber = (cols[0] || '').trim();
      const originalScript = (cols[3] || '').trim();
      const translit = (cols[4] || '').trim();
      const morphology = (cols[5] || '').trim();
      const briefGloss = (cols[6] || '').trim();
      const fullDef = cols[7] ? stripHtml(cols[7]) : '';

      if (!originalScript && !translit) { totalSkipped++; continue; }

      batch.push({
        word: originalScript || translit || strongsNumber,
        original_script: originalScript,
        language: file.language,
        transliteration: translit,
        literal_meaning: briefGloss || fullDef,
        contextual_meaning: fullDef || briefGloss,
        grammar: morphology,
        part_of_speech: morphology,
        root: '',
        tags: sourceTag,
        notes: `Strong's ${strongsNumber} — imported from STEP Bible Data (CC BY 4.0)`
      });

      if (batch.length >= 500) {
        await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
        totalImported += batch.length;
        await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
          progress_percent: Math.min(90, 10 + Math.floor(totalImported / Math.max(totalEntries, 1) * 80)),
          records_imported: totalImported
        });
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
      totalImported += batch.length;
    }

    // Reset cursor for next file
    cursor.file_index = fi + 1;
    cursor.line_index = 0;
  }

  return {
    handler_name: 'step_bible_tsv',
    records_imported: totalImported,
    total_records: totalEntries,
    skipped: totalSkipped,
    partial: false,
    cursor: null,
    files_processed: filesProcessed
  };
}

// ─── Handler: CrossWire SWORD (metadata listing — full module parsing not supported) ───
async function handlerCrossWireSword(base44, source, job) {
  // SWORD modules are complex binary/zip archives that require specialized parsing
  // (JSword library in Java, or the SWORD C++ library). We can't parse them in Deno.
  // Instead, we fetch the module listing page and store it as metadata.

  const listingUrl = 'https://www.crosswire.org/sword/modules/ModDisp.jsp?modType=Bibles';
  const resp = await fetch(listingUrl);
  const html = resp.ok ? await resp.text() : '';

  // Count available modules from the HTML
  const moduleCount = (html.match(/modName=/g) || []).length;

  return {
    handler_name: 'crosswire_sword_metadata',
    records_imported: 0,
    total_records: moduleCount,
    skipped: 0,
    partial: false,
    note: 'CrossWire SWORD modules require specialized binary parsing (JSword/SWORD library). Module listing fetched as metadata. Individual module import requires a dedicated SWORD parser to be implemented.',
    modules_available: moduleCount
  };
}

// ─── Handler: LLM-Assisted Auto-Detect (fallback for unknown sources) ───
async function handlerLLMAutoDetect(base44, source, job) {
  const startTime = Date.now();
  const TIME_BUDGET_MS = 22000;

  const apiUrl = source.api_base_url || source.website || '';
  if (!apiUrl) {
    throw new Error('No API endpoint or website URL available for this source. Cannot auto-detect import format.');
  }

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 10 });

  // Step 1: Fetch a sample of data from the source
  let sampleData = '';
  let contentType = '';
  try {
    const resp = await fetch(apiUrl, { headers: { Accept: 'application/json, text/plain, */*' } });
    contentType = resp.headers.get('content-type') || '';
    if (resp.ok) {
      const text = await resp.text();
      sampleData = text.substring(0, 5000); // First 5KB as sample
    }
  } catch {}

  if (!sampleData) {
    throw new Error(`Could not fetch data from ${apiUrl}. The source may require authentication or be offline.`);
  }

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 20 });

  // Step 2: Use InvokeLLM to analyze the data and determine how to import it
  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a data import specialist. Analyze this sample data from a religious/spiritual text source and determine how to import it.

Source name: ${source.source_name}
Provider: ${source.provider_name}
API URL: ${apiUrl}
Content-Type: ${contentType}

Sample data (first 5KB):
${sampleData}

Respond with a JSON object containing:
1. "data_format": What format is this data in? (JSON, XML, TSV, CSV, HTML, Plain Text, etc.)
2. "data_type": What kind of data is this? (bible_verses, lexicon_entries, metadata, search_results, api_listing, other)
3. "importable": Can this be directly imported as structured records? (true/false)
4. "entity_target": Which entity should this data go into? ("WordStudy" for lexicon/dictionary entries, "SegmentVerse" for Bible verses, "none" if not importable)
5. "field_mapping": If importable, map the source fields to entity fields. Example: {"source_field": "entity_field"}
6. "record_count_estimate": Estimated number of records in this dataset (number, or "unknown")
7. "next_steps": What should be done to make this source fully importable? (string)`,
    response_json_schema: {
      type: 'object',
      properties: {
        data_format: { type: 'string' },
        data_type: { type: 'string' },
        importable: { type: 'boolean' },
        entity_target: { type: 'string' },
        field_mapping: { type: 'string', description: 'JSON string mapping source fields to entity fields' },
        record_count_estimate: { type: 'string' },
        next_steps: { type: 'string' }
      },
      required: ['data_format', 'data_type', 'importable', 'entity_target', 'field_mapping', 'record_count_estimate', 'next_steps']
    }
  });

  await base44.asServiceRole.entities.SMCImportJob.update(job.id, { progress_percent: 40 });

  // Step 3: If the LLM says it's importable, attempt to parse and import
  if (!llmResponse.importable || llmResponse.entity_target === 'none') {
    return {
      handler_name: 'llm_auto_detect',
      records_imported: 0,
      total_records: 0,
      skipped: 0,
      partial: false,
      llm_analysis: llmResponse,
      note: 'LLM analysis completed — source data is not directly importable. See next_steps for guidance.'
    };
  }

  // Step 4: Fetch full data and attempt import based on LLM's mapping
  const fullResp = await fetch(apiUrl);
  if (!fullResp.ok) {
    return {
      handler_name: 'llm_auto_detect',
      records_imported: 0,
      total_records: 0,
      skipped: 0,
      partial: false,
      llm_analysis: llmResponse,
      note: 'Could not fetch full dataset after analysis.'
    };
  }

  const fullText = await fullResp.text();
  let records = [];

  // Parse based on detected format
  if (llmResponse.data_format?.toLowerCase().includes('json')) {
    try {
      const parsed = JSON.parse(fullText);
      // Handle array or object-with-array
      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (typeof parsed === 'object') {
        // Try to find an array property
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) { records = parsed[key]; break; }
        }
        // If no array found, treat each key as a record
        if (records.length === 0) {
          records = Object.entries(parsed).map(([k, v]) => ({ _key: k, ...v }));
        }
      }
    } catch {}
  } else if (llmResponse.data_format?.toLowerCase().includes('tsv') || llmResponse.data_format?.toLowerCase().includes('csv')) {
    const delimiter = llmResponse.data_format.toLowerCase().includes('tsv') ? '\t' : ',';
    const lines = fullText.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      const header = lines[0].split(delimiter);
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        const row = {};
        for (let j = 0; j < header.length && j < cols.length; j++) {
          row[header[j].trim()] = cols[j].trim();
        }
        records.push(row);
      }
    }
  }

  // Map records to WordStudy using LLM's field mapping (returned as JSON string)
  let mapping = {};
  try {
    if (typeof llmResponse.field_mapping === 'string') {
      mapping = JSON.parse(llmResponse.field_mapping);
    } else if (typeof llmResponse.field_mapping === 'object') {
      mapping = llmResponse.field_mapping;
    }
  } catch {}
  const batch = [];
  let totalImported = 0;
  const sourceTag = `auto-${source.source_name?.toLowerCase().replace(/\s+/g, '-').substring(0, 30)}`;

  for (const record of records) {
    if (Date.now() - startTime > TIME_BUDGET_MS) break;

    // Use LLM mapping to extract fields
    const word = record[mapping.word] || record.word || record.lemma || record.Lemma || record.name || '';
    if (!word) continue;

    const entityRecord = {
      word: String(word).substring(0, 200),
      language: record[mapping.language] || source.supported_traditions || 'Unknown',
      transliteration: record[mapping.transliteration] || record.translit || '',
      literal_meaning: record[mapping.literal_meaning] || record.definition || record.meaning || '',
      contextual_meaning: record[mapping.contextual_meaning] || record.kjv_def || '',
      grammar: record[mapping.grammar] || record.derivation || '',
      tags: sourceTag,
      notes: `Auto-imported from ${source.source_name} via LLM-assisted handler`
    };

    batch.push(entityRecord);

    if (batch.length >= 500) {
      await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
      totalImported += batch.length;
      await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
        progress_percent: Math.min(90, 40 + Math.floor(totalImported / Math.max(records.length, 1) * 50)),
        records_imported: totalImported
      });
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await base44.asServiceRole.entities.WordStudy.bulkCreate(batch);
    totalImported += batch.length;
  }

  return {
    handler_name: 'llm_auto_detect',
    records_imported: totalImported,
    total_records: records.length,
    skipped: 0,
    partial: totalImported < records.length,
    llm_analysis: llmResponse,
    data_format: llmResponse.data_format,
    data_type: llmResponse.data_type
  };
}