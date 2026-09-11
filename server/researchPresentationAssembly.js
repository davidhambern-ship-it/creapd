import { directResearchPresentation } from './researchPresentationDirector.js';

function presentationError(message, code, status = 400, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

export async function assembleResearchPresentation({ sql, ownerUserId, configurationId }) {
  const configId = String(configurationId || '').trim();
  if (!configId) {
    throw presentationError('Research configuration is required.', 'CONFIGURATION_ID_REQUIRED', 400);
  }

  const [configuration] = await sql`
    SELECT *
    FROM creapd.research_production_configurations
    WHERE id = ${configId}
      AND owner_user_id = ${String(ownerUserId)}
    LIMIT 1
  `;

  if (!configuration) {
    throw presentationError('Research configuration not found.', 'CONFIGURATION_NOT_FOUND', 404);
  }

  const packages = await sql`
    SELECT
      pkg.*,
      point.title AS source_point_title,
      point.display_order AS source_point_order
    FROM creapd.production_packages pkg
    LEFT JOIN creapd.research_points point
      ON point.id = pkg.source_entity_id
      AND point.owner_user_id = ${String(ownerUserId)}
    WHERE pkg.configuration_id = ${configId}
      AND pkg.owner_user_id = ${String(ownerUserId)}
      AND pkg.source_entity_type = 'ResearchPoint'
      AND pkg.status IN ('generated', 'edited', 'approved')
    ORDER BY point.display_order ASC NULLS LAST, pkg.created_at ASC
  `;

  if (!packages.length) {
    throw presentationError(
      'Generate approved Research production packages before assembling the presentation.',
      'PRESENTATION_PACKAGES_REQUIRED',
      409,
    );
  }

  const missingVoiceovers = packages
    .filter(pkg => !String(pkg.generated_audio_url || '').trim())
    .map(pkg => ({
      package_id: pkg.id,
      title: pkg.source_point_title || pkg.title || pkg.headline_suggestions || 'Research Story',
    }));

  if (missingVoiceovers.length) {
    throw presentationError(
      `Generate Kokoro voiceovers for all ${packages.length} production packages before assembly.`,
      'PRESENTATION_VOICEOVERS_REQUIRED',
      409,
      { missing_voiceovers: missingVoiceovers },
    );
  }

  const presentation = await directResearchPresentation({
    config: configuration,
    packages,
  });

  const payload = JSON.stringify({
    presentation_plan: presentation,
    presentation_assembly: {
      version: presentation.version,
      status: presentation.status,
      generated_at: presentation.generated_at,
      story_count: presentation.story_count,
      scene_count: presentation.scene_count,
      total_runtime_seconds: presentation.total_runtime_seconds,
      confidence_score: presentation.confidence_score,
      qa_result: presentation.qa_result,
      planner: presentation.planner,
    },
  });

  const [updatedConfiguration] = await sql`
    UPDATE creapd.research_production_configurations
    SET
      source_system = 'creapd-neon-vercel',
      source_payload = COALESCE(source_payload, '{}'::jsonb) || ${payload}::jsonb,
      updated_at = now()
    WHERE id = ${configId}
      AND owner_user_id = ${String(ownerUserId)}
    RETURNING *
  `;

  return {
    presentation,
    configuration: updatedConfiguration || configuration,
    packages,
  };
}
