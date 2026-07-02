import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────────────────────────────
// testSMCHandler — Tests a handler's ability to retrieve data from a source.
//
// Performs a standardized test:
//   1. Looks up the SMCHandler record
//   2. Optionally looks up an SMCSource for the test URL
//   3. Performs a timed fetch with timeout
//   4. Classifies any errors (network, auth, rate limit, timeout, etc.)
//   5. Builds the standardized response package
//   6. Updates handler stats (total_runs, success_rate, health_status, etc.)
//
// Returns the standardized response package for the admin UI.
// ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { handler_id, source_id } = body;
    if (!handler_id) return Response.json({ error: 'handler_id is required' }, { status: 400 });

    const handler = await base44.asServiceRole.entities.SMCHandler.get(handler_id);
    if (!handler) return Response.json({ error: 'Handler not found' }, { status: 404 });

    // Resolve test URL
    let source = null;
    let testUrl = '';
    let licenseRef = '';
    let citationRef = '';

    if (source_id) {
      source = await base44.asServiceRole.entities.SMCSource.get(source_id);
      testUrl = source?.api_base_url || source?.data_endpoint || source?.website || '';
      licenseRef = source?.license_status || '';
      citationRef = source?.citation_requirements || '';
    }

    if (!testUrl) {
      testUrl = getDefaultTestUrl(handler.handler_type);
    }

    const startTime = Date.now();
    const errors = [];
    const warnings = [];
    let retrievalStatus = 'pending';
    let detectedFormat = 'Unknown';
    let detectedLanguage = '';
    let rawData = '';
    let checksum = '';
    let contentType = '';
    let httpStatus = 0;
    let responseTimeMs = 0;

    // Perform the test fetch
    try {
      const controller = new AbortController();
      const timeoutMs = getTimeoutMs(handler.timeout_rules);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(testUrl, {
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      responseTimeMs = Date.now() - startTime;
      httpStatus = resp.status;
      contentType = resp.headers.get('content-type') || '';

      // Detect format from content-type
      detectedFormat = detectFormat(contentType, handler.handler_type);

      if (resp.ok) {
        const text = await resp.text();
        rawData = text.substring(0, 2000);

        // Compute checksum
        try {
          const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
          checksum = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
        } catch {}

        // Detect language from content sample
        detectedLanguage = detectLanguage(text, handler.handler_type);

        // Validate format matches handler expectations
        const supportedFormats = parseJsonArray(handler.supported_formats);
        if (supportedFormats.length > 0 && !supportedFormats.includes(detectedFormat) && detectedFormat !== 'Unknown') {
          warnings.push({ type: 'unsupported_format', message: `Detected format "${detectedFormat}" not in handler's supported formats: ${supportedFormats.join(', ')}` });
        }

        if (!text || text.trim().length === 0) {
          retrievalStatus = 'failed';
          errors.push({ type: 'malformed_response', message: 'Response body is empty' });
        } else {
          retrievalStatus = 'success';
        }
      } else if (resp.status === 401 || resp.status === 403) {
        retrievalStatus = 'failed';
        errors.push({ type: 'authentication_error', message: `HTTP ${resp.status}: Authentication required or failed` });
      } else if (resp.status === 429) {
        retrievalStatus = 'failed';
        errors.push({ type: 'rate_limit', message: 'HTTP 429: Rate limit exceeded' });
      } else if (resp.status === 404) {
        retrievalStatus = 'failed';
        errors.push({ type: 'missing_file', message: 'HTTP 404: Resource not found' });
      } else if (resp.status === 402 || resp.status === 451) {
        retrievalStatus = 'failed';
        errors.push({ type: 'license_blocked', message: `HTTP ${resp.status}: License or legal restriction` });
      } else if (resp.status >= 500) {
        retrievalStatus = 'failed';
        errors.push({ type: 'provider_unavailable', message: `HTTP ${resp.status}: Provider server error` });
      } else {
        retrievalStatus = 'failed';
        errors.push({ type: 'unknown_error', message: `HTTP ${resp.status}: ${resp.statusText}` });
      }
    } catch (fetchError) {
      responseTimeMs = Date.now() - startTime;
      if (fetchError.name === 'AbortError') {
        retrievalStatus = 'failed';
        errors.push({ type: 'timeout', message: `Request timed out after ${getTimeoutMs(handler.timeout_rules)}ms` });
      } else {
        retrievalStatus = 'failed';
        errors.push({ type: 'network_error', message: fetchError.message || 'Network request failed' });
      }
    }

    // Build standardized response package
    const responsePackage = {
      sourceId: source?.id || '',
      providerId: source?.provider_name || '',
      seedId: '',
      workTitle: source?.source_name || handler.handler_name,
      retrievalStatus,
      retrievedAt: new Date().toISOString(),
      sourceUrl: testUrl,
      files: [],
      rawData: rawData.substring(0, 1000),
      metadata: {
        handler_type: handler.handler_type,
        content_type: contentType,
        http_status: httpStatus,
        response_time_ms: responseTimeMs
      },
      checksum,
      detectedFormat,
      detectedLanguage,
      suggestedParser: getFirstParser(handler.compatible_parsers),
      errors,
      warnings,
      licenseReference: licenseRef,
      citationReference: citationRef
    };

    // Update handler stats
    const totalRuns = (handler.total_runs || 0) + 1;
    const successfulRuns = retrievalStatus === 'success' ? (handler.successful_runs || 0) + 1 : (handler.successful_runs || 0);
    const failedRuns = retrievalStatus !== 'success' ? (handler.failed_runs || 0) + 1 : (handler.failed_runs || 0);
    const prevAvgRuntime = handler.average_runtime_ms || 0;
    const prevTotalRuns = handler.total_runs || 0;
    const newAvgRuntime = Math.round(((prevAvgRuntime * prevTotalRuns) + responseTimeMs) / totalRuns);
    const successRate = Math.round((successfulRuns / totalRuns) * 100);
    const failureRate = Math.round((failedRuns / totalRuns) * 100);

    // Determine health status
    let healthStatus = 'Unknown';
    if (retrievalStatus === 'success') {
      healthStatus = 'Healthy';
    } else if (errors.some(e => e.type === 'timeout' || e.type === 'rate_limit')) {
      healthStatus = 'Warning';
    } else {
      healthStatus = 'Failing';
    }

    // Track specific event counts
    const rateLimitEvents = errors.some(e => e.type === 'rate_limit') ? (handler.rate_limit_events || 0) + 1 : (handler.rate_limit_events || 0);
    const timeoutEvents = errors.some(e => e.type === 'timeout') ? (handler.timeout_events || 0) + 1 : (handler.timeout_events || 0);

    await base44.asServiceRole.entities.SMCHandler.update(handler_id, {
      total_runs: totalRuns,
      successful_runs: successfulRuns,
      failed_runs: failedRuns,
      average_runtime_ms: newAvgRuntime,
      success_rate: successRate,
      failure_rate: failureRate,
      rate_limit_events: rateLimitEvents,
      timeout_events: timeoutEvents,
      last_tested_at: new Date().toISOString(),
      health_status: healthStatus
    });

    return Response.json({
      success: true,
      response_package: responsePackage,
      handler_stats: {
        total_runs: totalRuns,
        successful_runs: successfulRuns,
        failed_runs: failedRuns,
        success_rate: successRate,
        health_status: healthStatus,
        average_runtime_ms: newAvgRuntime
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Helper Functions ────────────────────────────────────────────────

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
  return urls[handlerType] || 'https://httpbin.org/get';
}

function getTimeoutMs(timeoutRules) {
  try {
    const rules = typeof timeoutRules === 'string' ? JSON.parse(timeoutRules) : timeoutRules;
    return rules?.default_ms || 15000;
  } catch {
    return 15000;
  }
}

function detectFormat(contentType, handlerType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('json')) return 'JSON';
  if (ct.includes('xml')) return 'XML';
  if (ct.includes('html')) return 'HTML';
  if (ct.includes('csv')) return 'CSV';
  if (ct.includes('tab-separated')) return 'TSV';
  if (ct.includes('text/plain')) return 'Plain Text';
  if (ct.includes('application/pdf')) return 'PDF';
  if (ct.includes('application/epub')) return 'EPUB';
  if (ct.includes('application/zip')) return 'ZIP';
  // Fallback based on handler type
  if (handlerType === 'JSON Feed') return 'JSON';
  if (handlerType === 'XML Feed') return 'XML';
  if (handlerType === 'RSS Feed') return 'XML';
  if (handlerType === 'CSV Feed') return 'CSV';
  return 'Unknown';
}

function detectLanguage(text, handlerType) {
  const sample = text.substring(0, 500).toLowerCase();
  if (handlerType === 'Quran API' || sample.match(/[\u0600-\u06FF]/)) return 'Arabic';
  if (handlerType === 'Bible API' || handlerType === 'Open Scripture API') {
    if (sample.match(/[\u0590-\u05FF]/)) return 'Hebrew';
    if (sample.match(/[\u0370-\u03FF]/)) return 'Greek';
    return 'English';
  }
  if (sample.match(/[\u0900-\u097F]/)) return 'Sanskrit/Devanagari';
  return 'English';
}

function parseJsonArray(str) {
  if (!str) return [];
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return []; }
}

function getFirstParser(compatibleParsers) {
  const parsers = parseJsonArray(compatibleParsers);
  return parsers[0] || '';
}