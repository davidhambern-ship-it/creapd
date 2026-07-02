import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────────────────────────────
// acquireFoundationSource — Automated SMC source acquisition pipeline
// Triggered from the Foundation Seeder when a work's status is "Source Needed"
//
// Pipeline:
//   1. Read the SMCFoundationWork (title, tradition, category)
//   2. Create an SMCDiscoveryJob targeted at that work (auto_approve=true)
//   3. Run LLM-powered web discovery for real, publicly available sources
//   4. Create SMCCandidateSource records for each result
//   5. Auto-approve the highest-scoring candidate (trust + confidence >= 60)
//      → creates an SMCSource with seeder_enabled=true
//   6. Link the approved source back to the foundation work
//      → sets roadmap_status to "Approved Source Available" + source_id
//
// If no source meets thresholds, the work stays at "Source Needed" with
// a note directing the admin to review candidates in the SMC Discovery tab.
// ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const mode = body.mode || 'single';

    if (mode === 'auto_acquire') {
      return await autoAcquireWorks(base44);
    }

    const work_id = body.work_id;
    if (!work_id) return Response.json({ error: 'work_id is required' }, { status: 400 });
    return await acquireWorkSource(base44, work_id);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Auto-acquire sources for all "Source Needed" works ────────────
async function autoAcquireWorks(base44) {
  const works = await base44.asServiceRole.entities.SMCFoundationWork.filter(
    { roadmap_status: 'Source Needed' },
    '-priority_score',
    5
  );

  const results = [];
  for (const work of works) {
    try {
      const result = await acquireWorkSource(base44, work.id);
      const data = await result.json();
      results.push({ work_id: work.id, work_title: work.work_title, ...data });
    } catch (err) {
      results.push({ work_id: work.id, work_title: work.work_title, error: err.message });
    }
  }

  return Response.json({ success: true, mode: 'auto_acquire', works_processed: results.length, results });
}

// ─── Acquire source for a single foundation work ───────────────────
async function acquireWorkSource(base44, work_id) {
  try {
    // 1. Read the foundation work
    const work = await base44.asServiceRole.entities.SMCFoundationWork.get(work_id);
    if (!work) return Response.json({ error: 'Foundation work not found' }, { status: 404 });

    // If already has a source linked, just return it
    if (work.source_id) {
      const existingSource = await base44.asServiceRole.entities.SMCSource.get(work.source_id);
      if (existingSource) {
        return Response.json({
          success: true,
          work_id,
          source_found: true,
          already_linked: true,
          source_id: existingSource.id,
          source_name: existingSource.source_name,
          message: `Source "${existingSource.source_name}" is already linked to this work.`
        });
      }
    }

    // Mark as "discovering" so the UI shows progress
    const timestamp = new Date().toISOString();
    await base44.asServiceRole.entities.SMCFoundationWork.update(work_id, {
      roadmap_status: 'Source Found',
      admin_notes: (work.admin_notes || '') + `\n[${timestamp}] SMC acquisition started — discovering sources...`
    });

    // 2. Create an SMCDiscoveryJob targeted at this work
    const job = await base44.asServiceRole.entities.SMCDiscoveryJob.create({
      job_name: `Acquire: ${work.work_title}`,
      discovery_type: 'targeted_search',
      query: work.work_title,
      target_tradition: work.tradition,
      target_collection: work.collection_category,
      target_format: 'JSON',
      frequency: 'On Demand',
      status: 'Running',
      last_run: timestamp,
      auto_approve: true,
      min_trust_threshold: 60,
      min_confidence_threshold: 60,
      is_active: true
    });

    // 3. Run LLM-powered web discovery
    const discoveryPrompt = buildDiscoveryPrompt(work);

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: discoveryPrompt,
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

    const candidates = llmResult.candidates || [];

    // 4. Create candidate sources (dedup against existing SMCSource + SMCCandidateSource)
    let candidatesCreated = 0;
    let candidatesSkipped = 0;

    for (const c of candidates) {
      // Skip if already exists as an approved SMCSource
      const existingSource = await base44.asServiceRole.entities.SMCSource.filter({ source_name: c.source_name }, '-created_date', 5);
      if (existingSource && existingSource.length > 0) {
        candidatesSkipped++;
        continue;
      }

      // Skip if already exists as a candidate
      const existingCandidate = await base44.asServiceRole.entities.SMCCandidateSource.filter({ source_name: c.source_name }, '-created_date', 5);
      if (existingCandidate && existingCandidate.length > 0) {
        candidatesSkipped++;
        continue;
      }

      await base44.asServiceRole.entities.SMCCandidateSource.create({
        discovery_job_id: job.id,
        source_name: c.source_name,
        provider_name: c.provider_name,
        provider_type: c.provider_type || 'Unknown',
        source_type: c.source_type || 'Unknown',
        website: c.website || '',
        documentation_url: c.documentation_url || '',
        api_base_url: c.api_base_url || '',
        sample_endpoint: c.sample_endpoint || '',
        detected_formats: JSON.stringify(c.detected_formats || []),
        supported_collections: JSON.stringify(c.supported_collections || []),
        supported_traditions: JSON.stringify(c.supported_traditions || []),
        supported_languages: JSON.stringify(c.supported_languages || []),
        authentication_required: c.authentication_required || false,
        api_key_required: c.api_key_required || false,
        license_summary: c.license_summary || '',
        redistribution_notes: c.redistribution_notes || '',
        commercial_use_notes: c.commercial_use_notes || '',
        evidence_links: JSON.stringify(c.evidence_links || []),
        discovery_method: 'foundation_seeder_auto',
        confidence_score: c.confidence_score || 0,
        trust_score: c.trust_score || 0,
        recommended_use: c.recommended_use || 'Manual Review Required',
        review_status: 'New'
      });
      candidatesCreated++;
    }

    // 5. Auto-approve the best candidate
    const newCandidates = await base44.asServiceRole.entities.SMCCandidateSource.filter(
      { discovery_job_id: job.id, review_status: 'New' },
      '-created_date',
      20
    );

    // Sort by combined trust + confidence score (descending)
    const sortedCandidates = newCandidates.sort((a, b) =>
      ((b.trust_score || 0) + (b.confidence_score || 0)) - ((a.trust_score || 0) + (a.confidence_score || 0))
    );

    let approvedSource = null;

    for (const candidate of sortedCandidates) {
      const combinedScore = (candidate.trust_score || 0) + (candidate.confidence_score || 0);

      // Require a minimum combined score of 120 (60+60) for auto-approval
      if (combinedScore < 120) continue;

      // Skip sources that require API keys — seeder needs anonymous/public sources
      if (candidate.api_key_required) continue;

      const source = await base44.asServiceRole.entities.SMCSource.create({
        source_name: candidate.source_name,
        provider_name: candidate.provider_name,
        provider_type: candidate.provider_type,
        source_type: candidate.source_type,
        website: candidate.website,
        documentation_url: candidate.documentation_url,
        api_base_url: candidate.api_base_url,
        data_endpoint: candidate.sample_endpoint || candidate.api_base_url || '',
        api_key_required: false,
        account_required: candidate.authentication_required || false,
        authentication_type: candidate.authentication_required ? 'API Key' : 'Anonymous',
        license_status: candidate.license_summary || 'Unknown',
        approval_status: 'Approved',
        is_approved: true,
        trust_score: candidate.trust_score,
        confidence_score: candidate.confidence_score,
        health_status: 'Unknown',
        health_score: 0,
        recommended_use: candidate.recommended_use || 'Seeder Ready',
        evidence_links: candidate.evidence_links,
        discovery_method: candidate.discovery_method,
        seeder_enabled: true,
        seeder_compatible: true,
        cae_enabled: false,
        research_enabled: true,
        library_enabled: false,
        supported_collections: candidate.supported_collections,
        supported_traditions: candidate.supported_traditions,
        supported_languages: candidate.supported_languages,
        supported_formats: candidate.detected_formats,
        last_checked_at: timestamp,
        admin_notes: `Auto-approved by Foundation Seeder for "${work.work_title}"`
      });

      // Mark candidate as approved + linked
      await base44.asServiceRole.entities.SMCCandidateSource.update(candidate.id, {
        review_status: 'Approved',
        converted_to_source_id: source.id,
        admin_notes: `Auto-approved and linked to foundation work: ${work.work_title}`
      });

      approvedSource = source;
      break; // Take the best qualifying candidate
    }

    // 6. Update the discovery job
    await base44.asServiceRole.entities.SMCDiscoveryJob.update(job.id, {
      status: 'Completed',
      results_found: candidates.length,
      candidates_created: candidatesCreated,
      next_run: null
    });

    // 7. Link the source to the foundation work (or report no source found)
    if (approvedSource) {
      await base44.asServiceRole.entities.SMCFoundationWork.update(work_id, {
        roadmap_status: 'Approved Source Available',
        source_id: approvedSource.id,
        provider_name: approvedSource.provider_name,
        preferred_provider: approvedSource.provider_name,
        admin_notes: (work.admin_notes || '') +
          `\n[${timestamp}] SMC acquisition complete — source "${approvedSource.source_name}" approved and linked (trust: ${approvedSource.trust_score}, confidence: ${approvedSource.confidence_score}). Ready to import.`
      });

      return Response.json({
        success: true,
        work_id,
        source_found: true,
        source_id: approvedSource.id,
        source_name: approvedSource.source_name,
        provider_name: approvedSource.provider_name,
        trust_score: approvedSource.trust_score,
        confidence_score: approvedSource.confidence_score,
        candidates_found: candidates.length,
        candidates_created: candidatesCreated,
        candidates_skipped: candidatesSkipped,
        discovery_job_id: job.id,
        message: `Source "${approvedSource.source_name}" discovered, approved, and linked. Ready to import.`
      });
    } else {
      // No source met thresholds — revert to Source Needed and point admin to SMC
      await base44.asServiceRole.entities.SMCFoundationWork.update(work_id, {
        roadmap_status: 'Source Needed',
        admin_notes: (work.admin_notes || '') +
          `\n[${timestamp}] SMC discovery completed — ${candidates.length} candidates found but none met auto-approval thresholds (requires trust+confidence >= 120, no API key). Review candidates in SMC → Discovery tab.`
      });

      return Response.json({
        success: true,
        work_id,
        source_found: false,
        candidates_found: candidates.length,
        candidates_created: candidatesCreated,
        candidates_skipped: candidatesSkipped,
        discovery_job_id: job.id,
        message: candidates.length > 0
          ? `${candidates.length} candidate(s) discovered but none met auto-approval thresholds. Review them in the SMC Discovery tab.`
          : 'No sources found during discovery. Try adjusting the work title or tradition in the foundation work record.'
      });
    }
  } catch (error) {
    if (work_id) {
      try {
        await base44.asServiceRole.entities.SMCFoundationWork.update(work_id, {
          roadmap_status: 'Source Needed',
          admin_notes: `\n[${new Date().toISOString()}] SMC acquisition FAILED: ${error.message}`
        });
      } catch {}
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Discovery prompt builder — generates a targeted LLM prompt for finding
// real, publicly available sources for a specific foundation work.
// ─────────────────────────────────────────────────────────────────────

function buildDiscoveryPrompt(work) {
  return `You are a source discovery engine for a spiritual/religious text platform. Search for trusted APIs, datasets, repositories, and archives that provide the full text of: "${work.work_title}".

Context:
- Tradition: ${work.tradition || 'Unknown'}
- Collection Category: ${work.collection_category || 'Unknown'}
- Preferred Provider: ${work.provider_name || 'Any'}

Find REAL, EXISTING sources that are publicly available right now. Prioritize:
1. Official APIs (REST/JSON endpoints)
2. GitHub repositories with structured data (JSON, XML, CSV, TSV)
3. Digital libraries with bulk download or API access
4. Open access archives

For each source found, provide:
- source_name: Name of the API/dataset/repository
- provider_name: Organization providing it
- provider_type: One of (Official Religious Organization, University, Museum, Government, Publisher, Digital Library, Academic Journal, Research Institute, Historical Society, Open Source Project, Public Domain Repository, Open Access Repository, Archive, Individual Scholar, Community Project, Unknown)
- source_type: One of (API, Structured Dataset, Bulk Download, Metadata Feed, Digital Archive, Repository, Publisher Portal, Official Organization Library, Museum Collection, University Collection, Government Collection, RSS Feed, OAI-PMH Endpoint, IIIF Endpoint, GitHub Repository, Manual Source, Unknown)
- website: URL to the source homepage
- documentation_url: URL to API docs or data documentation
- api_base_url: API base URL if available (e.g. https://api.example.com/v1)
- sample_endpoint: Example endpoint if available (e.g. /texts/genesis/1)
- detected_formats: Array of formats (JSON, XML, CSV, TSV, HTML, Plain Text, etc.)
- supported_collections: Array of collections provided (e.g. ["Bible", "Quran", "Bhagavad Gita"])
- supported_traditions: Array of traditions (e.g. ["Christianity", "Islam"])
- supported_languages: Array of languages (e.g. ["English", "Hebrew", "Greek"])
- authentication_required: boolean (true if API key or account needed)
- api_key_required: boolean (true if API key is required for access)
- license_summary: Brief license summary (e.g. "Public Domain", "CC BY 4.0", "Open Access", "MIT License")
- redistribution_notes: Notes on redistribution rights
- commercial_use_notes: Notes on commercial use
- evidence_links: Array of URLs showing evidence the source exists and is accessible
- confidence_score: 0-100 confidence this is a real, usable, accessible source RIGHT NOW
- trust_score: 0-100 trust score based on provider reputation and data quality
- recommended_use: One of (Seeder Ready, CAE Ready, Research Only, Metadata Only, Manual Review Required, License Review Required, Not Recommended)

IMPORTANT:
- Only return sources you are confident ACTUALLY EXIST and are ACCESSIBLE.
- Prefer sources that do NOT require API keys (anonymous/public access).
- If you cannot find any real sources, return an empty candidates array.
- Return 1-5 candidates, ranked by quality (best first).`;
}