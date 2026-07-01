import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let stats = { discovered: 0, imported: 0, published: 0, failed: 0, providersChecked: 0, errors: [] };

    // 1. Get or create engine config
    let configResults = await base44.asServiceRole.entities.CAEEngineConfig.list();
    let config = configResults[0];

    if (!config) {
      config = await base44.asServiceRole.entities.CAEEngineConfig.create({
        engine_name: 'Content Acquisition Engine',
        engine_status: 'running',
        operating_mode: 'passive',
        started_at: now,
        last_run: now,
        next_scheduled_run: new Date(Date.now() + 30 * 60000).toISOString(),
        cae_identity_email: 'cae@producer.com',
        cae_identity_name: 'Producer Content Acquisition Engine',
        wallet_balance: 0,
        scan_interval_minutes: 30
      });
    }

    // Check if engine should run
    if (config.engine_status === 'paused' || config.engine_status === 'offline' || config.engine_status === 'maintenance') {
      return Response.json({ status: 'skipped', reason: `Engine is ${config.engine_status}` });
    }

    // 2. Update subsystem statuses to running
    const subsystems = await base44.asServiceRole.entities.CAESubsystemStatus.list();
    if (subsystems.length === 0) {
      const SUBSYSTEM_NAMES = [
        'source_discovery', 'metadata_harvester', 'rights_licensing', 'source_verification',
        'duplicate_detection', 'translation_discovery', 'edition_discovery', 'manuscript_discovery',
        'import_engine', 'ocr_text_processing', 'search_index', 'ai_classification',
        'registry_sync', 'opportunity_engine', 'budget_acquisition', 'account_provider_manager',
        'live_library_publisher', 'admin_review_center', 'monitoring_health'
      ];
      for (const name of SUBSYSTEM_NAMES) {
        await base44.asServiceRole.entities.CAESubsystemStatus.create({
          subsystem_name: name,
          status: 'running',
          last_run: now,
          health_score: 100
        });
      }
    }

    // 3. Get active mission (if expedition mode)
    let missionContext = '';
    if (config.operating_mode === 'expedition' && config.current_mission_id) {
      const mission = await base44.asServiceRole.entities.CAEMission.get(config.current_mission_id);
      if (mission) {
        missionContext = ` Active mission: ${mission.name}. Target collections: ${mission.target_collections || 'all'}. Target traditions: ${mission.target_traditions || 'all'}. Target resource types: ${mission.target_resource_types || 'all'}.`;
      }
    }

    // 4. Get approved providers
    const providers = await base44.asServiceRole.entities.CAESourceProvider.filter({ approval_state: 'approved', is_archived: false });
    const providerNames = providers.map(p => p.name).join(', ') || 'general open-access repositories';

    // 5. DISCOVERY PHASE — Use LLM with web search to discover new resources
    try {
      const discoveryPrompt = `You are the Content Acquisition Engine for a World Scripture Library. Your mission is to discover legally obtainable, free knowledge resources that can be added to the library.

Search the internet for recently available or newly discovered:
- Public domain sacred texts and religious texts
- Open-access academic papers about religion, theology, and spirituality
- Newly digitized ancient manuscripts
- Public domain translations of religious texts
- Open-access dissertations and theses on religious studies
- Museum digital collections related to religious artifacts
- University repository additions in theology and religious studies
- Government archive releases of historical religious documents
- New open-access journals in theology and religious studies
- Public domain books on religion, spirituality, and philosophy

Focus on resources that are:
- Legally free (public domain, open license, creative commons, or official free access)
- Relevant to world scripture, religious studies, theology, or spirituality
- From trustworthy sources (universities, museums, governments, established archives)

Provider context: The following providers are already connected: ${providerNames}.${missionContext}

Return exactly 5 new discoveries as a JSON array. Each discovery must have:
- title: The title of the resource
- author: Author or organization
- source_url: Direct URL to the resource
- resource_type: One of: book, sacred_text, historical_document, ancient_manuscript, journal_article, research_paper, dissertation, lexicon, commentary, devotional, reference_work
- rights: One of: public_domain, open_license, creative_commons, official_free_access, free_with_registration
- tradition: Faith tradition (Christianity, Judaism, Islam, Hinduism, Buddhism, etc.)
- language: Primary language
- description: Brief description of the resource (2-3 sentences)
- provider_name: Name of the source organization or repository
- provider_website: Website of the source
- provider_type: One of: university, museum, government_archive, digital_library, publisher, research_institute, religious_organization, historical_society, repository, open_access_archive, public_domain_library
- collection_suggestion: Suggested collection name for this resource
- priority_score: 0-100 based on educational value, foundational importance, and collection gap`;

      const discoveryResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: discoveryPrompt,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            discoveries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  author: { type: 'string' },
                  source_url: { type: 'string' },
                  resource_type: { type: 'string' },
                  rights: { type: 'string' },
                  tradition: { type: 'string' },
                  language: { type: 'string' },
                  description: { type: 'string' },
                  provider_name: { type: 'string' },
                  provider_website: { type: 'string' },
                  provider_type: { type: 'string' },
                  collection_suggestion: { type: 'string' },
                  priority_score: { type: 'number' }
                }
              }
            }
          }
        }
      });

      const discoveries = discoveryResponse.discoveries || [];

      // 6. PROCESS DISCOVERIES
      for (const disc of discoveries) {
        try {
          // Check for duplicates
          const existing = await base44.asServiceRole.entities.CAEDiscovery.filter({ title: disc.title });
          if (existing.length > 0) {
            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: 'duplicate_detected',
              resource_title: disc.title,
              source_provider: disc.provider_name,
              status: 'warning',
              details: 'Duplicate discovery detected and skipped',
              discovered_at: now
            });
            continue;
          }

          // Check for existing registry record
          const existingRegistry = await base44.asServiceRole.entities.WorldScriptureRegistry.filter({ title: disc.title });

          // Create or update provider
          let provider = providers.find(p => p.name === disc.provider_name);
          if (!provider) {
            // Create new provider as under_review
            provider = await base44.asServiceRole.entities.CAESourceProvider.create({
              name: disc.provider_name,
              organization: disc.provider_name,
              website: disc.provider_website || '',
              provider_type: disc.provider_type || 'digital_library',
              discovery_layer: 'intelligent_exploration',
              pipeline: 'open_access',
              approval_state: 'under_review',
              relationship_status: 'discovered',
              trust_score: 50,
              total_resources_discovered: 1,
              last_crawl: now,
              last_verification: now
            });
          } else {
            await base44.asServiceRole.entities.CAESourceProvider.update(provider.id, {
              total_resources_discovered: (provider.total_resources_discovered || 0) + 1,
              last_crawl: now
            });
          }

          // Create discovery record
          const discovery = await base44.asServiceRole.entities.CAEDiscovery.create({
            title: disc.title,
            source_provider_id: provider.id,
            source_provider_name: provider.name,
            source_url: disc.source_url,
            resource_type: disc.resource_type,
            file_format: 'native_digital_text',
            discovery_stage: 'discovered',
            rights_classification: disc.rights,
            recommended_strategy: 'acquire_immediately',
            acquisition_priority_score: disc.priority_score || 50,
            metadata_harvested: JSON.stringify({
              title: disc.title,
              author: disc.author,
              language: disc.language,
              tradition: disc.tradition,
              description: disc.description,
              collection_suggestion: disc.collection_suggestion
            }),
            collection_assignments: JSON.stringify([disc.collection_suggestion].filter(Boolean)),
            duplicate_check_status: 'unique',
            discovered_at: now,
            mission_id: config.current_mission_id || undefined
          });
          stats.discovered++;

          // Log discovery event
          await base44.asServiceRole.entities.CAEActivityEvent.create({
            event_type: 'new_discovery',
            resource_title: disc.title,
            source_provider: provider.name,
            status: 'info',
            details: `Discovered: ${disc.title} — ${disc.description?.substring(0, 100) || ''}`,
            discovery_id: discovery.id,
            provider_id: provider.id,
            is_public: false
          });

          // Process free resources immediately
          const freeRights = ['public_domain', 'open_license', 'creative_commons', 'official_free_access', 'free_with_registration'];
          if (freeRights.includes(disc.rights)) {
            // Update discovery to importing
            await base44.asServiceRole.entities.CAEDiscovery.update(discovery.id, {
              discovery_stage: 'importing'
            });

            // Create or update World Scripture Registry record
            const registryData = {
              title: disc.title,
              tradition: disc.tradition || 'Unknown',
              collection: 'sacred_scriptures',
              source_type: disc.resource_type === 'sacred_text' ? 'sacred_text' : 'reference_work',
              original_language: disc.language || 'Unknown',
              description: disc.description || '',
              source_provider: provider.name,
              source_url: disc.source_url,
              access_status: 'available_through_official_link',
              license_status: disc.rights === 'public_domain' ? 'public_domain' : 'open_license',
              copyright_status: disc.rights === 'public_domain' ? 'public_domain' : 'creative_commons',
              verification_status: 'source_verified',
              confidence_level: 'medium',
              last_verified_at: now,
              import_status: 'imported',
              full_text_available: false,
              search_indexed: false
            };

            let registryRecord;
            if (existingRegistry.length > 0) {
              registryRecord = await base44.asServiceRole.entities.WorldScriptureRegistry.update(existingRegistry[0].id, registryData);
            } else {
              registryRecord = await base44.asServiceRole.entities.WorldScriptureRegistry.create(registryData);
            }

            // Update discovery with registry link and mark as published
            await base44.asServiceRole.entities.CAEDiscovery.update(discovery.id, {
              discovery_stage: 'published',
              registry_record_id: registryRecord.id,
              published_to_library: true,
              processed_at: now,
              ai_classification: JSON.stringify({
                resource_type: disc.resource_type,
                tradition: disc.tradition,
                language: disc.language,
                themes: [disc.collection_suggestion].filter(Boolean),
                suggested_collections: [disc.collection_suggestion].filter(Boolean)
              })
            });

            stats.imported++;
            stats.published++;

            // Log import and publish events
            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: disc.rights === 'public_domain' ? 'public_domain_imported' : 'open_license_imported',
              resource_title: disc.title,
              source_provider: provider.name,
              status: 'success',
              details: `Imported and published: ${disc.title}`,
              discovery_id: discovery.id,
              is_public: true,
              category: disc.resource_type === 'ancient_manuscript' ? 'new_manuscript' : disc.resource_type === 'historical_document' ? 'new_historical_document' : disc.rights === 'public_domain' ? 'new_public_domain_book' : 'new_open_access_publication',
              tradition: disc.tradition,
              source_type: disc.resource_type,
              availability: 'available'
            });

            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: 'published_to_library',
              resource_title: disc.title,
              source_provider: provider.name,
              status: 'success',
              details: `Published to World Scripture Library: ${disc.title}`,
              discovery_id: discovery.id,
              is_public: true
            });
          } else {
            // Blocked — license or permission required
            await base44.asServiceRole.entities.CAEDiscovery.update(discovery.id, {
              discovery_stage: 'blocked',
              blocker_type: 'license_required'
            });

            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: 'license_required',
              resource_title: disc.title,
              source_provider: provider.name,
              status: 'warning',
              details: `License or permission required for: ${disc.title}`,
              discovery_id: discovery.id
            });
          }

          // Log operation
          await base44.asServiceRole.entities.CAEOperationLog.create({
            operation_type: 'discovery',
            description: `Processed discovery: ${disc.title}`,
            provider: provider.name,
            resource_title: disc.title,
            outcome: 'success',
            subsystem: 'source_discovery'
          });

        } catch (discError) {
          stats.failed++;
          stats.errors.push(discError.message);
          await base44.asServiceRole.entities.CAEOperationLog.create({
            operation_type: 'failure',
            description: `Failed to process discovery: ${disc.title}`,
            resource_title: disc.title,
            outcome: 'failure',
            error_message: discError.message,
            subsystem: 'source_discovery'
          });
        }
      }
    } catch (discoveryError) {
      stats.errors.push(`Discovery phase: ${discoveryError.message}`);
      await base44.asServiceRole.entities.CAEOperationLog.create({
        operation_type: 'failure',
        description: 'Discovery phase failed',
        outcome: 'failure',
        error_message: discoveryError.message,
        subsystem: 'source_discovery'
      });
    }

    // 7. Update engine config
    await base44.asServiceRole.entities.CAEEngineConfig.update(config.id, {
      last_run: now,
      next_scheduled_run: new Date(Date.now() + (config.scan_interval_minutes || 30) * 60000).toISOString(),
      total_discoveries: (config.total_discoveries || 0) + stats.discovered,
      total_imports: (config.total_imports || 0) + stats.imported,
      total_published: (config.total_published || 0) + stats.published,
      queue_depth: stats.discovered,
      current_job: null,
      error_rate: stats.failed > 0 ? Math.round((stats.failed / (stats.discovered || 1)) * 100) : 0
    });

    // 8. Update monitoring subsystem
    const monitoringSub = await base44.asServiceRole.entities.CAESubsystemStatus.filter({ subsystem_name: 'monitoring_health' });
    if (monitoringSub.length > 0) {
      await base44.asServiceRole.entities.CAESubsystemStatus.update(monitoringSub[0].id, {
        last_run: now,
        success_count: (monitoringSub[0].success_count || 0) + 1,
        health_score: stats.errors.length > 0 ? 75 : 100
      });
    }

    // 9. Update collection goals progress
    const goals = await base44.asServiceRole.entities.CAECollectionGoal.filter({ status: 'active' });
    for (const goal of goals) {
      if (goal.target_count > 0) {
        const newAcquired = (goal.resources_acquired || 0) + stats.published;
        const pct = Math.min(100, Math.round((newAcquired / goal.target_count) * 100));
        await base44.asServiceRole.entities.CAECollectionGoal.update(goal.id, {
          resources_acquired: newAcquired,
          resources_remaining: Math.max(0, goal.target_count - newAcquired),
          completion_percentage: pct,
          collection_strength: pct >= 80 ? 'comprehensive' : pct >= 50 ? 'strong' : pct >= 20 ? 'developing' : 'minimal'
        });

        if (pct !== goal.completion_percentage) {
          await base44.asServiceRole.entities.CAEActivityEvent.create({
            event_type: 'collection_goal_progress',
            resource_title: goal.name,
            status: 'info',
            details: `${goal.name}: ${pct}% complete (${newAcquired}/${goal.target_count})`,
            mission_id: goal.id
          });
        }
      }
    }

    // 10. Update mission progress
    if (config.current_mission_id) {
      const mission = await base44.asServiceRole.entities.CAEMission.get(config.current_mission_id);
      if (mission && mission.status === 'active') {
        const newAcquired = (mission.resources_acquired || 0) + stats.published;
        await base44.asServiceRole.entities.CAEMission.update(mission.id, {
          resources_acquired: newAcquired,
          resources_remaining: Math.max(0, (mission.resources_target || 0) - newAcquired)
        });
      }
    }

    return Response.json({
      status: 'completed',
      run_at: now,
      stats,
      next_run: new Date(Date.now() + (config.scan_interval_minutes || 30) * 60000).toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});