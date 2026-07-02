import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  let body;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const job_id = body.job_id;

    if (job_id) {
      // Run a specific discovery job
      const job = await base44.entities.SMCDiscoveryJob.get(job_id);
      if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

      await base44.entities.SMCDiscoveryJob.update(job_id, { status: 'Running', last_run: new Date().toISOString() });

      // Use LLM to discover sources based on the job query
      const prompt = `You are a source discovery engine. Search for trusted APIs, datasets, repositories, and archives that provide knowledge about: "${job.query || job.discovery_type}".
      ${job.target_tradition ? `Focus on: ${job.target_tradition}` : ''}
      ${job.target_collection ? `Collection type: ${job.target_collection}` : ''}
      ${job.target_format ? `Preferred format: ${job.target_format}` : ''}

      Find real, existing sources that are publicly available. For each source found, provide:
      - source_name: Name of the API/dataset/repository
      - provider_name: Organization providing it
      - provider_type: One of (Official Religious Organization, University, Museum, Government, Publisher, Digital Library, Academic Journal, Research Institute, Historical Society, Open Source Project, Public Domain Repository, Open Access Repository, Archive, Individual Scholar, Community Project, Unknown)
      - source_type: One of (API, Structured Dataset, Bulk Download, Metadata Feed, Digital Archive, Repository, Publisher Portal, Official Organization Library, Museum Collection, University Collection, Government Collection, RSS Feed, OAI-PMH Endpoint, IIIF Endpoint, GitHub Repository, Manual Source, Unknown)
      - website: URL to the source
      - documentation_url: URL to API docs or data documentation
      - api_base_url: API base URL if available
      - sample_endpoint: Example endpoint if available
      - detected_formats: Array of formats (JSON, XML, CSV, etc.)
      - supported_collections: Array of collections provided (Bible, Quran, etc.)
      - supported_traditions: Array of traditions
      - supported_languages: Array of languages
      - authentication_required: boolean
      - api_key_required: boolean
      - license_summary: Brief license summary
      - redistribution_notes: Notes on redistribution rights
      - commercial_use_notes: Notes on commercial use
      - evidence_links: Array of URLs showing evidence of the source
      - confidence_score: 0-100 confidence this is a real, usable source
      - trust_score: 0-100 trust score based on provider reputation
      - recommended_use: One of (Seeder Ready, CAE Ready, Research Only, Metadata Only, Manual Review Required, License Review Required, Not Recommended)

      Return a JSON object with key "candidates" containing an array of 3-8 candidate sources found.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            candidates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source_name: { type: 'string' },
                  provider_name: { type: 'string' },
                  provider_type: { type: 'string' },
                  source_type: { type: 'string' },
                  website: { type: 'string' },
                  documentation_url: { type: 'string' },
                  api_base_url: { type: 'string' },
                  sample_endpoint: { type: 'string' },
                  detected_formats: { type: 'array', items: { type: 'string' } },
                  supported_collections: { type: 'array', items: { type: 'string' } },
                  supported_traditions: { type: 'array', items: { type: 'string' } },
                  supported_languages: { type: 'array', items: { type: 'string' } },
                  authentication_required: { type: 'boolean' },
                  api_key_required: { type: 'boolean' },
                  license_summary: { type: 'string' },
                  redistribution_notes: { type: 'string' },
                  commercial_use_notes: { type: 'string' },
                  evidence_links: { type: 'array', items: { type: 'string' } },
                  confidence_score: { type: 'number' },
                  trust_score: { type: 'number' },
                  recommended_use: { type: 'string' }
                },
                required: ['source_name', 'provider_name', 'provider_type', 'source_type', 'website', 'documentation_url', 'api_base_url', 'sample_endpoint', 'detected_formats', 'supported_collections', 'supported_traditions', 'supported_languages', 'authentication_required', 'api_key_required', 'license_summary', 'redistribution_notes', 'commercial_use_notes', 'evidence_links', 'confidence_score', 'trust_score', 'recommended_use']
              }
            }
          },
          required: ['candidates']
        },
        model: 'gemini_3_flash'
      });

      const candidates = result.candidates || [];
      let created = 0;
      for (const c of candidates) {
        // Duplicate detection: check if source with same name or website already exists
        const existing = await base44.entities.SMCCandidateSource.filter({ source_name: c.source_name });
        if (existing && existing.length > 0) continue;

        await base44.entities.SMCCandidateSource.create({
          ...c,
          discovery_job_id: job_id,
          detected_formats: JSON.stringify(c.detected_formats || []),
          supported_collections: JSON.stringify(c.supported_collections || []),
          supported_traditions: JSON.stringify(c.supported_traditions || []),
          supported_languages: JSON.stringify(c.supported_languages || []),
          evidence_links: JSON.stringify(c.evidence_links || []),
          review_status: 'New',
          discovery_method: job.discovery_type
        });
        created++;
      }

      // Auto-approve if enabled and scores meet thresholds
      if (job.auto_approve) {
        const newCandidates = await base44.entities.SMCCandidateSource.filter({ discovery_job_id: job_id, review_status: 'New' });
        for (const c of newCandidates) {
          if (c.trust_score >= (job.min_trust_threshold || 80) && c.confidence_score >= (job.min_confidence_threshold || 80) && !c.api_key_required) {
            const source = await base44.entities.SMCSource.create({
              source_name: c.source_name, provider_name: c.provider_name, provider_type: c.provider_type, source_type: c.source_type,
              website: c.website, documentation_url: c.documentation_url, api_base_url: c.api_base_url,
              api_key_required: c.api_key_required, license_status: c.license_summary || 'Unknown',
              approval_status: 'Approved', is_approved: true, trust_score: c.trust_score, confidence_score: c.confidence_score,
              recommended_use: c.recommended_use, health_status: 'Unknown', evidence_links: c.evidence_links,
              discovery_method: c.discovery_method, authentication_type: c.authentication_required ? 'API Key' : 'Anonymous'
            });
            await base44.entities.SMCCandidateSource.update(c.id, { review_status: 'Approved', converted_to_source_id: source.id });
          }
        }
      }

      await base44.entities.SMCDiscoveryJob.update(job_id, {
        status: 'Completed',
        results_found: candidates.length,
        candidates_created: created,
        next_run: job.frequency !== 'On Demand' ? new Date(Date.now() + 86400000).toISOString() : null
      });

      return Response.json({ success: true, job_id, results_found: candidates.length, candidates_created: created });
    }

    return Response.json({ error: 'job_id is required' }, { status: 400 });
  } catch (error) {
    if (base44 && body && body.job_id) {
      try { await base44.entities.SMCDiscoveryJob.update(body.job_id, { status: 'Failed', errors: error.message }); } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});