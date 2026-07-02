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
    } else if (mode === 'auto_run_approved') {
      return await autoRunApproved(base44);
    }

    return Response.json({ error: 'Invalid mode. Use auto_create, execute, or auto_run_approved' }, { status: 400 });
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

// Execute a specific import job — delegates to seedFoundationText for known sources
async function executeJob(base44, jobId) {
  if (!jobId) return Response.json({ error: 'job_id is required' }, { status: 400 });

  const job = await base44.asServiceRole.entities.SMCImportJob.get(jobId);
  if (!job) return Response.json({ error: 'Import job not found' }, { status: 404 });
  if (job.status === 'Running') return Response.json({ error: 'Job is already running' }, { status: 409 });

  const source = await base44.asServiceRole.entities.SMCSource.get(job.source_id);
  if (!source) return Response.json({ error: 'Source not found' }, { status: 404 });

  // Mark as running
  await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
    status: 'Running',
    started_at: new Date().toISOString(),
    progress_percent: 5
  });

  try {
    // Map source to seedFoundationText source type
    const sourceName = (source.source_name || '').toLowerCase();
    const supportedCollections = (() => {
      try { return JSON.parse(source.supported_collections || '[]'); } catch { return []; }
    })();
    const collectionsStr = supportedCollections.join(' ').toLowerCase();

    let seedSource = null;
    if (sourceName.includes('quran') || collectionsStr.includes('quran')) {
      seedSource = 'quran';
    } else if (sourceName.includes('bible') || collectionsStr.includes('bible')) {
      seedSource = 'bible';
    }

    if (!seedSource) {
      throw new Error(`No import handler available for source "${source.source_name}". Only Quran and Bible sources are supported for auto-import.`);
    }

    await base44.asServiceRole.entities.SMCImportJob.update(jobId, { progress_percent: 10 });

    // Delegate to seedFoundationText
    const seedResult = await base44.asServiceRole.functions.invoke('seedFoundationText', {
      source: seedSource
    });
    const data = seedResult.data || seedResult;

    await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
      status: 'Completed',
      progress_percent: 100,
      records_imported: data.verses_created || 0,
      total_records_expected: data.verses_created || 0,
      completed_at: new Date().toISOString(),
      validation_status: 'Validated',
      duplicate_check_status: 'No Duplicates',
      metadata: JSON.stringify({
        text_work_id: data.text_work_id,
        library_text_id: data.library_text_id,
        tradition_id: data.tradition_id,
        edition_id: data.edition_id,
        chapters_created: data.chapters_created,
        verses_created: data.verses_created,
        seed_source: seedSource
      })
    });

    return Response.json({
      success: true,
      mode: 'execute',
      job_id: jobId,
      source_name: source.source_name,
      chapters_created: data.chapters_created,
      verses_created: data.verses_created,
      library_text_id: data.library_text_id
    });
  } catch (error) {
    await base44.asServiceRole.entities.SMCImportJob.update(jobId, {
      status: 'Failed',
      error_log: error.message,
      completed_at: new Date().toISOString()
    });
    return Response.json({ error: error.message, job_id: jobId }, { status: 500 });
  }
}