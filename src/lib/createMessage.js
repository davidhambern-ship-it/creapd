import { base44 } from '@/api/base44Client';
import { DEFAULT_AI_AUTOMATION } from '@/lib/spiritualConstants';

/**
 * Creates a complete spiritual production from any context (study, research, library, topic).
 * Uses saved defaults from the most recent configuration. Automatically triggers the full
 * build pipeline (script, slides, voice, assets, package) and returns the new config ID.
 *
 * @param {Object} context - { title, research_session_id, topic, faith_tradition, branch_denomination, sacred_texts, study_topics }
 * @returns {Promise<string>} The new configuration ID
 */
export async function createMessageFromContext(context) {
  // Load saved defaults from most recent config
  let defaults = {};
  try {
    const configs = await base44.entities.SpiritualProductionConfiguration.list('-created_date', 1);
    if (configs && configs.length > 0) {
      const c = configs[0];
      defaults = {
        faith_tradition: c.faith_tradition,
        branch_denomination: c.branch_denomination,
        sacred_texts: c.sacred_texts,
        research_sources: c.research_sources,
        default_translation: c.default_translation,
        speaker_name: c.speaker_name,
        organization_name: c.organization_name,
        speaker_tone: c.speaker_tone,
        target_runtime: c.target_runtime,
        audience: c.audience,
        production_type: c.production_type,
        location: c.location,
      };
    }
  } catch {}

  const title = context.title || context.topic || 'New Production';

  const configData = {
    production_name: title,
    production_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    live_or_recorded: 'live',
    faith_tradition: context.faith_tradition || defaults.faith_tradition || 'Christianity',
    branch_denomination: context.branch_denomination || defaults.branch_denomination || 'No Preference',
    production_type: defaults.production_type || 'Sermon',
    audience: defaults.audience || 'General Audience',
    speaker_tone: defaults.speaker_tone || 'Inspirational',
    target_runtime: defaults.target_runtime || '30 Minutes',
    speaker_name: defaults.speaker_name || '',
    organization_name: defaults.organization_name || '',
    location: defaults.location || '',
    sacred_texts: context.sacred_texts || defaults.sacred_texts || JSON.stringify([]),
    research_sources: defaults.research_sources || JSON.stringify([]),
    study_topics: JSON.stringify(context.study_topics || [title]),
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    source_research_session_id: context.research_session_id || null,
    current_events_enabled: true,
    multiple_perspectives: true,
    status: 'building',
    is_default: true,
  };

  const savedConfig = await base44.entities.SpiritualProductionConfiguration.create(configData);

  // Update user defaults
  try {
    await base44.auth.updateMe({
      default_production_type: 'spiritual',
      default_production_config_id: savedConfig.id,
    });
  } catch {}

  // Fire the build — generates everything automatically
  base44.functions.invoke('buildSpiritualProduction', {
    configuration_id: savedConfig.id,
    research_session_id: context.research_session_id || null,
  }).catch(() => {});

  return savedConfig.id;
}