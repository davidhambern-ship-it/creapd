import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────────────────────────────
// syncHandlerRegistry — The automated sync engine that keeps the
// Handler Registry, Source Management Center, and Foundation Seeder
// running as a single synchronized pipeline.
//
// Each run performs 5 phases:
//   1. Handler Health Sweep  — test active handlers not tested in 24h
//   2. Handler→Source Sync   — propagate handler health to linked sources
//   3. Auto-Link Sources     — match approved sources to handlers by provider
//   4. Execute Queued Imports — pick up Queued jobs and run them through handlers
//   5. Foundation Pipeline   — acquire sources for "Source Needed" works,
//                              trigger imports for "Ready to Import" works
//
// Designed to run every 6 hours via scheduled automation.
// ─────────────────────────────────────────────────────────────────────

const STALE_HANDLER_HOURS = 24;
const MAX_HANDLER_TESTS = 10;
const MAX_IMPORT_EXECUTIONS = 3;
const MAX_FOUNDATION_WORKS = 3;
const FETCH_TIMEOUT_MS = 15000;

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const phase = body.phase || 'all';

    const results = {
      sync_time: new Date().toISOString(),
      handler_health: null,
      source_sync: null,
      auto_link: null,
      import_execution: null,
      foundation_pipeline: null
    };

    // Phase 1: Handler Health Sweep
    if (phase === 'all' || phase === 'handler_health') {
      results.handler_health = await sweepHandlerHealth(base44);
    }

    // Phase 2: Handler → Source Sync
    if (phase === 'all' || phase === 'source_sync') {
      results.source_sync = await syncHandlerToSource(base44);
    }

    // Phase 3: Auto-Link Sources to Handlers
    if (phase === 'all' || phase === 'auto_link') {
      results.auto_link = await autoLinkSources(base44);
    }

    // Phase 4: Execute Queued Imports
    if (phase === 'all' || phase === 'import_execution') {
      results.import_execution = await executeQueuedImports(base44);
    }

    // Phase 5: Foundation Work Pipeline
    if (phase === 'all' || phase === 'foundation_pipeline') {
      results.foundation_pipeline = await processFoundationWorks(base44);
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Phase 1: Handler Health Sweep ───────────────────────────────────

async function sweepHandlerHealth(base44) {
  const handlers = await base44.asServiceRole.entities.SMCHandler.filter(
    { status: 'Active' },
    '-updated_date',
    50
  );

  const now = Date.now();
  const staleCutoff = now - (STALE_HANDLER_HOURS * 60 * 60 * 1000);
  const stale = handlers.filter(h => {
    if (!h.last_tested_at) return true;
    return new Date(h.last_tested_at).getTime() < staleCutoff;
  });

  const toTest = stale.slice(0, MAX_HANDLER_TESTS);
  const testResults = [];

  for (const handler of toTest) {
    const testUrl = getDefaultTestUrl(handler.handler_type);
    if (!testUrl) {
      testResults.push({ handler: handler.handler_name, status: 'skipped', reason: 'No test URL' });
      continue;
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const resp = await fetch(testUrl, {
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;
      const success = resp.ok;
      let healthStatus = 'Healthy';
      if (!success) {
        if (resp.status === 429) healthStatus = 'Warning';
        else if (resp.status >= 500) healthStatus = 'Failing';
        else healthStatus = 'Failing';
      } else if (responseTime > 5000) {
        healthStatus = 'Warning';
      }

      const totalRuns = (handler.total_runs || 0) + 1;
      const successfulRuns = success ? (handler.successful_runs || 0) + 1 : (handler.successful_runs || 0);
      const failedRuns = !success ? (handler.failed_runs || 0) + 1 : (handler.failed_runs || 0);
      const prevAvg = handler.average_runtime_ms || 0;
      const prevTotal = handler.total_runs || 0;
      const newAvg = Math.round(((prevAvg * prevTotal) + responseTime) / totalRuns);

      await base44.asServiceRole.entities.SMCHandler.update(handler.id, {
        total_runs: totalRuns,
        successful_runs: successfulRuns,
        failed_runs: failedRuns,
        average_runtime_ms: newAvg,
        success_rate: Math.round((successfulRuns / totalRuns) * 100),
        failure_rate: Math.round((failedRuns / totalRuns) * 100),
        rate_limit_events: resp.status === 429 ? (handler.rate_limit_events || 0) + 1 : (handler.rate_limit_events || 0),
        timeout_events: 0,
        last_tested_at: new Date().toISOString(),
        health_status: healthStatus
      });

      testResults.push({
        handler: handler.handler_name,
        type: handler.handler_type,
        status: success ? 'healthy' : 'unhealthy',
        health_status: healthStatus,
        response_time_ms: responseTime,
        http_status: resp.status
      });
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const totalRuns = (handler.total_runs || 0) + 1;
      const failedRuns = (handler.failed_runs || 0) + 1;

      await base44.asServiceRole.entities.SMCHandler.update(handler.id, {
        total_runs: totalRuns,
        failed_runs: failedRuns,
        success_rate: Math.round(((handler.successful_runs || 0) / totalRuns) * 100),
        failure_rate: Math.round((failedRuns / totalRuns) * 100),
        timeout_events: isTimeout ? (handler.timeout_events || 0) + 1 : (handler.timeout_events || 0),
        last_tested_at: new Date().toISOString(),
        health_status: isTimeout ? 'Warning' : 'Failing'
      });

      testResults.push({
        handler: handler.handler_name,
        type: handler.handler_type,
        status: 'failed',
        health_status: isTimeout ? 'Warning' : 'Failing',
        error: err.message
      });
    }
  }

  return {
    total_active: handlers.length,
    stale_found: stale.length,
    tested: toTest.length,
    results: testResults
  };
}

// ─── Phase 2: Handler → Source Sync ──────────────────────────────────

async function syncHandlerToSource(base44) {
  // Find all sources with a handler_id
  const sources = await base44.asServiceRole.entities.SMCSource.filter(
    { approval_status: 'Approved' },
    '-updated_date',
    200
  );

  const linkedSources = sources.filter(s => s.handler_id);
  let updated = 0;
  const updates = [];

  for (const source of linkedSources) {
    try {
      const handler = await base44.asServiceRole.entities.SMCHandler.get(source.handler_id);
      if (!handler) continue;

      // Map handler health to source health
      const healthMap = {
        'Healthy': 'Healthy',
        'Warning': 'Slow Response',
        'Failing': 'Connection Failed',
        'Deprecated': 'Deprecated',
        'Disabled': 'Offline',
        'Needs Update': 'Schema Changed',
        'Unknown': 'Unknown'
      };

      const newHealthStatus = healthMap[handler.health_status] || 'Unknown';

      // Only update if changed
      if (source.health_status !== newHealthStatus) {
        // Map handler success rate to source health score
        const handlerSuccessRate = handler.success_rate || 0;
        let newHealthScore = source.health_score || 0;
        if (handler.health_status === 'Healthy') {
          newHealthScore = Math.min(100, newHealthScore + 5);
        } else if (handler.health_status === 'Failing') {
          newHealthScore = Math.max(0, newHealthScore - 15);
        } else if (handler.health_status === 'Warning') {
          newHealthScore = Math.max(0, newHealthScore - 5);
        }

        await base44.asServiceRole.entities.SMCSource.update(source.id, {
          health_status: newHealthStatus,
          health_score: newHealthScore,
          current_response_time_ms: handler.average_runtime_ms || source.current_response_time_ms,
          last_checked_at: new Date().toISOString()
        });

        updates.push({
          source: source.source_name,
          old_health: source.health_status,
          new_health: newHealthStatus,
          handler: handler.handler_name,
          handler_health: handler.health_status
        });
        updated++;
      }
    } catch (err) {
      // Handler might have been deleted
      updates.push({
        source: source.source_name,
        error: `Handler lookup failed: ${err.message}`
      });
    }
  }

  return {
    linked_sources: linkedSources.length,
    updated,
    updates
  };
}

// ─── Phase 3: Auto-Link Sources to Handlers ──────────────────────────

async function autoLinkSources(base44) {
  const sources = await base44.asServiceRole.entities.SMCSource.filter(
    { approval_status: 'Approved', seeder_enabled: true },
    '-updated_date',
    200
  );

  const unlinked = sources.filter(s => !s.handler_id);
  const handlers = await base44.asServiceRole.entities.SMCHandler.filter(
    { status: 'Active' },
    '-updated_date',
    50
  );

  const linked = [];

  for (const source of unlinked) {
    const matchedHandler = matchSourceToHandler(source, handlers);
    if (matchedHandler) {
      await base44.asServiceRole.entities.SMCSource.update(source.id, { handler_id: matchedHandler.id });
      linked.push({
        source: source.source_name,
        handler: matchedHandler.handler_name,
        match_type: matchedHandler._match_type
      });
    }
  }

  return {
    unlinked_sources: unlinked.length,
    linked: linked.length,
    links: linked
  };
}

function matchSourceToHandler(source, handlers) {
  const sourceName = (source.source_name || '').toLowerCase();
  const providerName = (source.provider_name || '').toLowerCase();
  const sourceType = source.source_type || '';

  // Match by supported providers
  for (const h of handlers) {
    const providers = parseJsonArray(h.supported_providers);
    for (const p of providers) {
      if (p && (sourceName.includes(p.toLowerCase()) || providerName.includes(p.toLowerCase()))) {
        h._match_type = 'provider';
        return h;
      }
    }
  }

  // Match by supported source types
  for (const h of handlers) {
    const sourceTypes = parseJsonArray(h.supported_source_types);
    if (sourceTypes.includes(sourceType)) {
      h._match_type = 'source_type';
      return h;
    }
  }

  return null;
}

// ─── Phase 4: Execute Queued Imports ─────────────────────────────────

async function executeQueuedImports(base44) {
  const queuedJobs = await base44.asServiceRole.entities.SMCImportJob.filter(
    { status: 'Queued' },
    'created_date',
    MAX_IMPORT_EXECUTIONS * 2
  );

  const executed = [];

  for (const job of queuedJobs.slice(0, MAX_IMPORT_EXECUTIONS)) {
    try {
      await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
        status: 'Running',
        started_at: new Date().toISOString()
      });

      const result = await base44.asServiceRole.functions.invoke('runSMCImport', {
        mode: 'execute',
        job_id: job.id
      });

      executed.push({
        job_id: job.id,
        work_title: job.work_title,
        status: 'completed',
        records_imported: result?.records_imported || 0
      });
    } catch (err) {
      await base44.asServiceRole.entities.SMCImportJob.update(job.id, {
        status: 'Failed',
        error_log: err.message,
        completed_at: new Date().toISOString()
      }).catch(() => {});

      executed.push({
        job_id: job.id,
        work_title: job.work_title,
        status: 'failed',
        error: err.message
      });
    }
  }

  return {
    queued_found: queuedJobs.length,
    executed: executed.length,
    results: executed
  };
}

// ─── Phase 5: Foundation Work Pipeline ──────────────────────────────

async function processFoundationWorks(base44) {
  const works = await base44.asServiceRole.entities.SMCFoundationWork.list('-priority_score', 200);

  // Works that need sources
  const needSource = works.filter(w =>
    ['Missing', 'Source Needed'].includes(w.roadmap_status)
  ).slice(0, MAX_FOUNDATION_WORKS);

  // Works ready to import
  const readyToImport = works.filter(w =>
    ['Ready to Import', 'Approved Source Available'].includes(w.roadmap_status)
  ).slice(0, MAX_FOUNDATION_WORKS);

  const results = {
    need_source: { found: needSource.length, processed: [] },
    ready_to_import: { found: readyToImport.length, processed: [] }
  };

  // Acquire sources for works that need them
  for (const work of needSource) {
    try {
      const acquireResult = await base44.asServiceRole.functions.invoke('acquireFoundationSource', {
        work_id: work.id
      });
      results.need_source.processed.push({
        work: work.work_title,
        source_found: acquireResult?.source_found || false,
        new_status: acquireResult?.new_status || 'Unknown'
      });
    } catch (err) {
      results.need_source.processed.push({
        work: work.work_title,
        error: err.message
      });
    }
  }

  // Trigger imports for works that are ready
  for (const work of readyToImport) {
    try {
      // Check if the work has a linked source
      if (work.source_id) {
        const existingJobs = await base44.asServiceRole.entities.SMCImportJob.filter(
          { source_id: work.source_id },
          '-created_date',
          5
        );
        const hasActive = existingJobs.some(j => ['Queued', 'Running', 'Validating'].includes(j.status));

        if (!hasActive) {
          const job = await base44.asServiceRole.entities.SMCImportJob.create({
            source_id: work.source_id,
            work_title: work.work_title,
            tradition: work.tradition || '',
            collection: work.collection_category || '',
            import_method: 'API Fetch',
            status: 'Queued',
            progress_percent: 0,
            records_imported: 0,
            total_records_expected: 0,
            validation_status: 'Pending',
            duplicate_check_status: 'Not Checked',
            rollback_available: true,
            admin_notes: 'Auto-created by syncHandlerRegistry — Foundation pipeline'
          });

          await base44.asServiceRole.entities.SMCFoundationWork.update(work.id, {
            roadmap_status: 'Queued',
            import_job_id: job.id
          });

          results.ready_to_import.processed.push({
            work: work.work_title,
            job_created: true,
            job_id: job.id
          });
        } else {
          results.ready_to_import.processed.push({
            work: work.work_title,
            job_created: false,
            reason: 'Active job already exists'
          });
        }
      } else {
        // Try direct seed for known sources (Bible/Quran)
        const manifestEntry = await findManifestEntry(base44, work.work_title);
        if (manifestEntry) {
          await base44.asServiceRole.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Importing' });
          await base44.asServiceRole.functions.invoke('seedFoundationText', { source: manifestEntry });
          await base44.asServiceRole.entities.SMCFoundationWork.update(work.id, { roadmap_status: 'Imported' });
          results.ready_to_import.processed.push({
            work: work.work_title,
            direct_seed: true
          });
        } else {
          results.ready_to_import.processed.push({
            work: work.work_title,
            skipped: true,
            reason: 'No source linked and no direct seed available'
          });
        }
      }
    } catch (err) {
      results.ready_to_import.processed.push({
        work: work.work_title,
        error: err.message
      });
    }
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getDefaultTestUrl(handlerType) {
  const urls = {
    'Bible API': 'https://bible-api.com/john%203:16',
    'Quran API': 'https://api.alquran.cloud/v1/surah/1',
    'SuttaCentral API': 'https://suttacentral.net/api/suttas?limit=1',
    'Open Scripture API': 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js',
    'Project Gutenberg': 'https://www.gutenberg.org/files/1342/1342-0.txt',
    'Internet Archive': 'https://archive.org/metadata/waybackquotes',
    'Wikisource': 'https://en.wikisource.org/w/api.php?action=query&list=search&srsearch=Bible&format=json',
    'GitHub Repository': 'https://api.github.com/repos/openscriptures/strongs',
    'Generic REST API': 'https://httpbin.org/get',
    'JSON Feed': 'https://httpbin.org/json',
    'XML Feed': 'https://httpbin.org/xml',
    'RSS Feed': 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'CSV Feed': 'https://raw.githubusercontent.com/cs109/2014_data/master/countries.csv',
    'HTML Page': 'https://httpbin.org/html',
    'OAI-PMH': 'https://www.openarchives.org/OAI/2.0/',
    'IIIF': 'https://iiif.io/api/image/3.0/example.json',
    'Bulk Download': 'https://httpbin.org/bytes/1024',
    'ZIP Archive': 'https://httpbin.org/bytes/1024',
    'EPUB Source': 'https://www.gutenberg.org/ebooks/1342.epub.images',
    'PDF Source': 'https://www.gutenberg.org/files/1342/1342-pdf.pdf',
    'Manual Upload': '',
    'Future Custom Handler': ''
  };
  return urls[handlerType] || '';
}

function parseJsonArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return []; }
}

async function findManifestEntry(base44, workTitle) {
  // Known direct-seed sources
  const directSeeds = {
    'The Holy Bible (KJV)': 'bible',
    'The Bible': 'bible',
    'The Quran': 'quran',
    'The Holy Quran': 'quran',
    'Quran': 'quran'
  };
  return directSeeds[workTitle] || null;
}