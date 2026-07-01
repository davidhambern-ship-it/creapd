import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const now = new Date().toISOString();
    let stats = { discovered: 0, imported: 0, published: 0, failed: 0, providersChecked: 0, processed: 0, errors: [] };

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
        next_scheduled_run: new Date(Date.now() + 5 * 60000).toISOString(),
        cae_identity_email: 'cae@producer.com',
        cae_identity_name: 'Producer Content Acquisition Engine',
        wallet_balance: 0,
        scan_interval_minutes: 5,
        processing_rate: 0,
        max_concurrent_jobs: 10
      });
    }

    // Check if engine should run
    if (config.engine_status === 'paused' || config.engine_status === 'offline' || config.engine_status === 'maintenance') {
      return Response.json({ status: 'skipped', reason: `Engine is ${config.engine_status}` });
    }

    // Mark engine as actively running
    await base44.asServiceRole.entities.CAEEngineConfig.update(config.id, {
      current_job: 'Mining cycle in progress',
      last_run: now
    });

    // 2. Initialize subsystems if needed
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
    const providers = await base44.asServiceRole.entities.CAESourceProvider.filter({ is_archived: false });
    const approvedProviders = providers.filter(p => p.approval_state === 'approved');
    const providerNames = approvedProviders.map(p => p.name).join(', ') || 'general open-access repositories';

    // 5. VARY DISCOVERY TOPICS — rotate through search focus areas each cycle to avoid duplicates
    const DISCOVERY_FOCUSES = [
      'public domain sacred texts and holy books from all world religions',
      'newly digitized ancient manuscripts from museums and university archives',
      'open-access academic dissertations and theses in theology and religious studies',
      'public domain translations of the Bible, Quran, Torah, Vedas, Sutras, and other scriptures',
      'open-access journal articles in biblical studies, comparative religion, and theology',
      'public domain church fathers writings, patristic texts, and early Christian literature',
      'open-access resources on indigenous spiritual traditions and oral histories',
      'public domain historical documents related to religious movements and religious freedom',
      'newly available open-access archaeological reports related to biblical and sacred sites',
      'public domain lexicons, concordances, and dictionaries for ancient languages (Hebrew, Greek, Aramaic, Sanskrit, Pali, Arabic)',
      'open-access museum digital collections featuring religious artifacts and sacred manuscripts',
      'public domain books on philosophy of religion, spirituality, and mysticism',
      'open-access resources on Eastern religions — Buddhism, Hinduism, Taoism, Confucianism, Jainism, Sikhism',
      'public domain devotional literature, prayer books, and liturgical texts from all traditions',
      'open-access resources on Dead Sea Scrolls, Nag Hammadi codices, and apocryphal texts',
      'public domain texts on Islamic theology, Hadith studies, and Quranic commentary',
      'open-access resources on Jewish rabbinic literature, Talmud, Midrash, and Kabbalah',
      'newly released government archive documents on religious history and church-state relations',
      'open-access language learning resources for ancient and liturgical languages',
      'public domain reference works on world religions, religious history, and comparative theology'
    ];
    const focusIndex = Math.floor(Date.now() / (5 * 60000)) % DISCOVERY_FOCUSES.length;
    const currentFocus = DISCOVERY_FOCUSES[focusIndex];

    // 6. DISCOVERY PHASE — Use LLM with web search to discover new resources
    try {
      const discoveryPrompt = `You are the Content Acquisition Engine for a World Scripture Library. You are a 24/7 autonomous data miner that constantly discovers and acquires legally free knowledge resources.

THIS CYCLE'S MINING FOCUS: ${currentFocus}

Search the internet for resources matching this focus. Prioritize:
- Resources that are legally free (public domain, open license, creative commons, official free access, free with registration)
- Resources relevant to world scripture, religious studies, theology, spirituality, or ancient texts
- Trustworthy sources (universities, museums, governments, established digital archives, repositories)
- Resources NOT already commonly known or already in typical library collections

Provider context: Connected providers: ${providerNames}.${missionContext}

Return exactly 10 new discoveries as a JSON array. Each discovery must have:
- title: The title of the resource
- author: Author or organization
- source_url: Direct URL to the resource
- resource_type: One of: book, sacred_text, historical_document, ancient_manuscript, journal_article, research_paper, dissertation, thesis, lexicon, dictionary, concordance, commentary, study_guide, language_resource, devotional, reference_work
- rights: One of: public_domain, open_license, creative_commons, official_free_access, free_with_registration
- tradition: Faith tradition (Christianity, Judaism, Islam, Hinduism, Buddhism, etc.)
- language: Primary language
- description: Brief description of the resource (2-3 sentences)
- provider_name: Name of the source organization or repository
- provider_website: Website of the source
- provider_type: One of: university, museum, government_archive, digital_library, publisher, research_institute, religious_organization, historical_society, repository, open_access_archive, public_domain_library, community_archive, api_provider
- collection_suggestion: Suggested collection name for this resource
- priority_score: 0-100 based on educational value, foundational importance, and collection gap
- historical_period: Approximate era or century if applicable
- region: Geographic origin if applicable`;

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
                  priority_score: { type: 'number' },
                  historical_period: { type: 'string' },
                  region: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const discoveries = discoveryResponse.discoveries || [];

      // 7. PROCESS DISCOVERIES
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
              collection_suggestion: disc.collection_suggestion,
              historical_period: disc.historical_period,
              region: disc.region
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
            is_public: false,
            tradition: disc.tradition,
            source_type: disc.resource_type
          });

          // Process free resources immediately
          const freeRights = ['public_domain', 'open_license', 'creative_commons', 'official_free_access', 'free_with_registration'];
          if (freeRights.includes(disc.rights)) {
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
                suggested_collections: [disc.collection_suggestion].filter(Boolean),
                historical_period: disc.historical_period,
                geographic_region: disc.region
              })
            });

            // Create LibraryText record so the resource appears in the World Scripture Library
            const existingLibraryText = await base44.asServiceRole.entities.LibraryText.filter({ title: disc.title });
            if (existingLibraryText.length === 0) {
              const collectionMap = {
                sacred_text: 'sacred_scriptures',
                historical_document: 'historical_documents',
                ancient_manuscript: 'ancient_manuscripts',
                lexicon: 'lexicons',
                dictionary: 'lexicons',
                concordance: 'lexicons',
                commentary: 'reference_works',
                study_guide: 'reference_works',
                reference_work: 'reference_works',
                language_resource: 'language_learning',
                devotional: 'sacred_scriptures'
              };
              const accessLevel = disc.rights === 'public_domain' ? 'external_link' : 'external_link';
              const licenseStatus = disc.rights === 'public_domain' ? 'public_domain' : 'official_free_access';
              const verificationStatus = disc.rights === 'public_domain' ? 'public_domain' : 'official_organization';

              await base44.asServiceRole.entities.LibraryText.create({
                title: disc.title,
                tradition: disc.tradition || 'Unknown',
                collection: collectionMap[disc.resource_type] || 'reference_works',
                original_language: disc.language || 'Unknown',
                source_url: disc.source_url,
                source_provider: provider.name,
                publisher: disc.provider_name,
                full_text: '',
                full_text_available: false,
                access_level: accessLevel,
                license_status: licenseStatus,
                verification_status: verificationStatus,
                last_verification: now,
                confidence_notes: `Auto-acquired by CAE from ${provider.name}. Rights: ${disc.rights}.`,
                major_themes: JSON.stringify([disc.collection_suggestion].filter(Boolean)),
                historical_context: disc.description || '',
                geographic_origin: disc.region || ''
              });
            }

            stats.imported++;
            stats.published++;

            await base44.asServiceRole.entities.CAEActivityEvent.create({
              event_type: disc.rights === 'public_domain' ? 'public_domain_imported' : 'open_license_imported',
              resource_title: disc.title,
              source_provider: provider.name,
              status: 'success',
              details: `Imported and published: ${disc.title}`,
              discovery_id: discovery.id,
              is_public: true,
              category: disc.resource_type === 'ancient_manuscript' ? 'new_manuscript' : disc.resource_type === 'historical_document' ? 'new_historical_document' : disc.resource_type === 'language_resource' || disc.resource_type === 'lexicon' ? 'new_language_resource' : disc.rights === 'public_domain' ? 'new_public_domain_book' : 'new_open_access_publication',
              tradition: disc.tradition,
              source_type: disc.resource_type,
              availability: 'available'
            });
          } else {
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

    // 8. PROCESS STUCK DISCOVERIES — pick up items left in intermediate stages
    try {
      const stuckDiscoveries = await base44.asServiceRole.entities.CAEDiscovery.filter({ discovery_stage: 'discovered' });
      for (const stuck of stuckDiscoveries.slice(0, 10)) {
        try {
          const metadata = stuck.metadata_harvested ? JSON.parse(stuck.metadata_harvested) : {};
          const freeRights = ['public_domain', 'open_license', 'creative_commons', 'official_free_access', 'free_with_registration'];
          if (freeRights.includes(stuck.rights_classification)) {
            await base44.asServiceRole.entities.CAEDiscovery.update(stuck.id, { discovery_stage: 'importing' });

            const existingRegistry = await base44.asServiceRole.entities.WorldScriptureRegistry.filter({ title: stuck.title });
            const registryData = {
              title: stuck.title,
              tradition: metadata.tradition || 'Unknown',
              collection: 'sacred_scriptures',
              source_type: 'reference_work',
              original_language: metadata.language || 'Unknown',
              description: metadata.description || '',
              source_provider: stuck.source_provider_name,
              source_url: stuck.source_url,
              access_status: 'available_through_official_link',
              license_status: stuck.rights_classification === 'public_domain' ? 'public_domain' : 'open_license',
              copyright_status: stuck.rights_classification === 'public_domain' ? 'public_domain' : 'creative_commons',
              verification_status: 'source_verified',
              confidence_level: 'medium',
              last_verified_at: now,
              import_status: 'imported'
            };

            let registryRecord;
            if (existingRegistry.length > 0) {
              registryRecord = await base44.asServiceRole.entities.WorldScriptureRegistry.update(existingRegistry[0].id, registryData);
            } else {
              registryRecord = await base44.asServiceRole.entities.WorldScriptureRegistry.create(registryData);
            }

            await base44.asServiceRole.entities.CAEDiscovery.update(stuck.id, {
              discovery_stage: 'published',
              registry_record_id: registryRecord.id,
              published_to_library: true,
              processed_at: now
            });

            // Also create LibraryText if it doesn't exist
            const existingLibText = await base44.asServiceRole.entities.LibraryText.filter({ title: stuck.title });
            if (existingLibText.length === 0) {
              await base44.asServiceRole.entities.LibraryText.create({
                title: stuck.title,
                tradition: metadata.tradition || 'Unknown',
                collection: 'reference_works',
                original_language: metadata.language || 'Unknown',
                source_url: stuck.source_url,
                source_provider: stuck.source_provider_name,
                publisher: stuck.source_provider_name,
                full_text: '',
                full_text_available: false,
                access_level: 'external_link',
                license_status: stuck.rights_classification === 'public_domain' ? 'public_domain' : 'official_free_access',
                verification_status: stuck.rights_classification === 'public_domain' ? 'public_domain' : 'official_organization',
                last_verification: now,
                confidence_notes: `Auto-acquired by CAE from ${stuck.source_provider_name}.`,
                historical_context: metadata.description || ''
              });
            }

            stats.processed++;
            stats.published++;
          }
        } catch (e) {
          // skip individual stuck item errors
        }
      }
    } catch (e) {
      stats.errors.push(`Stuck processing: ${e.message}`);
    }

    // 9. Update engine config
    const totalProcessedThisRun = stats.discovered + stats.processed;
    await base44.asServiceRole.entities.CAEEngineConfig.update(config.id, {
      last_run: now,
      next_scheduled_run: new Date(Date.now() + (config.scan_interval_minutes || 5) * 60000).toISOString(),
      total_discoveries: (config.total_discoveries || 0) + stats.discovered,
      total_imports: (config.total_imports || 0) + stats.imported,
      total_published: (config.total_published || 0) + stats.published,
      queue_depth: stats.discovered,
      current_job: null,
      processing_rate: Math.round(totalProcessedThisRun * 12), // per hour estimate (12 runs per hour at 5-min intervals)
      error_rate: stats.failed > 0 ? Math.round((stats.failed / (stats.discovered || 1)) * 100) : 0
    });

    // 10. Update monitoring subsystem
    const monitoringSub = await base44.asServiceRole.entities.CAESubsystemStatus.filter({ subsystem_name: 'monitoring_health' });
    if (monitoringSub.length > 0) {
      await base44.asServiceRole.entities.CAESubsystemStatus.update(monitoringSub[0].id, {
        last_run: now,
        success_count: (monitoringSub[0].success_count || 0) + 1,
        health_score: stats.errors.length > 0 ? 75 : 100
      });
    }

    // 11. Update collection goals progress
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

    // 12. Update mission progress
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
      next_run: new Date(Date.now() + (config.scan_interval_minutes || 5) * 60000).toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});