/**
 * CREAPr Brain — Global AI Executive Producer Layer
 *
 * The Brain is the central reasoning, routing, memory, and orchestration layer.
 * It does NOT replace Department Controllers — it delegates to them.
 *
 * Processing Steps:
 *   1. Load CreapSettings
 *   2. Load producer/user context
 *   3. Load active ShowProfile
 *   4. Load active Production Profile (config)
 *   5. Load active project state
 *   6. Determine active department
 *   7. Interpret producer intent via InvokeLLM
 *   8. Route to the correct Department Controller
 *   9. Return final structured JSON
 *  10. Log the interaction to ActivityLog
 *
 * Gap fills addressed:
 *   - Context resolution: most-recently-updated is_default entity when no ID given
 *   - pageContext: defined as { route, entityCounts, pendingAction }
 *   - creapMode: enumerated (autopilot | hybrid | free)
 *   - Fallback behavior: graceful degradation on InvokeLLM failure
 *   - Event logging: persisted to ActivityLog entity
 *   - Controller resolution: via controllerRegistry
 */

import { base44 } from '@/api/base44Client';
import { DEFAULT_CREAP_SETTINGS } from '@/lib/creapSettings';
import { getController, VALID_DEPARTMENTS } from '@/lib/creapr/controllerRegistry';
import { deriveResearchPOCStage } from '@/lib/pocStageTracker';

// ─── Identity ───

const CREAPR_IDENTITY = `You are CREAPr — the AI Executive Producer and Studio Director of CREAPD.

CREAPr manages specialized AI departments inside Production Profiles.
CREAPr helps producers become production-ready.

CREAPr does NOT behave like generic ChatGPT.
CREAPr does NOT simply answer questions.
CREAPr interprets intent, guides workflow, delegates work, and protects the producer from unnecessary complexity.

You are currently operating within the Research Production Profile.

Available Departments:
- Lobby: Navigation, orientation, "where am I / what's next"
- Topics: Topic discovery, research assignment creation (CREAPr Library)
- Research: Deep investigation, fact gathering, source discovery
- Dossier: Organize findings into structured knowledge
- Develop: Generate scripts, media concepts, production assets
- Packet: Assemble, export, review, finalize the deliverable

Your job is to interpret the producer's message and decide:
1. What department should handle this?
2. Should you respond directly, ask for clarification, delegate, navigate, or wait?
3. What UI commands should the frontend execute?

Department Routing Rules:
- Defining/refining a topic → Topics
- Gathering facts, sources, research → Research
- Organizing findings → Dossier
- Creating scripts, media, assets → Develop
- Assembling, exporting, finalizing → Packet
- "Where am I", "what's next", navigation → Lobby

Rules:
- You may interpret intent, ask clarifying questions, route tasks, explain departments, recommend next steps, and trigger transitions.
- You may NOT claim work is complete unless a department confirms it.
- You may NOT generate final production assets directly.
- You may NOT bypass Department Controllers.
- You may NOT make final creative approvals without the producer.
- You may NOT treat every message like a generic chat question.`;

// ─── Types (documented for clarity) ───

/**
 * @typedef {Object} PageContext
 * @property {string} route - Current page route (e.g. "/research/topics")
 * @property {Object} entityCounts - { topics: N, points: N, packages: N, dossiers: N }
 * @property {string|null} pendingAction - What's currently pending
 */

/**
 * @typedef {'autopilot'|'hybrid'|'free'} CreapMode
 */

// ─── Context Loaders ───

async function _loadCreapSettings() {
  try {
    const settings = await base44.entities.CreapSettings.filter(
      { is_active: true },
      '-updated_date',
      1
    );
    return settings.length > 0 ? settings[0] : DEFAULT_CREAP_SETTINGS;
  } catch {
    return DEFAULT_CREAP_SETTINGS;
  }
}

async function _loadProducer(producerId) {
  try {
    // Prefer auth.me() — the Brain runs in the frontend as the current user
    const user = await base44.auth.me();
    if (user) return user;
  } catch {}
  if (producerId) {
    try {
      return await base44.entities.User.get(producerId);
    } catch {}
  }
  return null;
}

async function _loadShowProfile(showProfileId) {
  if (showProfileId) {
    try {
      return await base44.entities.ShowProfile.get(showProfileId);
    } catch {}
  }
  // Resolution strategy: most recently updated, fallback to is_favorite
  try {
    const profiles = await base44.entities.ShowProfile.filter({}, '-updated_date', 1);
    if (profiles.length > 0) return profiles[0];
  } catch {}
  return null;
}

async function _loadProductionConfig(activeProjectId) {
  if (activeProjectId) {
    try {
      return await base44.entities.ResearchProductionConfiguration.get(activeProjectId);
    } catch {}
  }
  // Resolution strategy: most recently updated
  try {
    const configs = await base44.entities.ResearchProductionConfiguration.filter(
      {},
      '-updated_date',
      1
    );
    if (configs.length > 0) return configs[0];
  } catch {}
  return null;
}

async function _loadProjectState(config) {
  if (!config?.id) return null;
  try {
    const topics = await base44.entities.ResearchTopic.filter(
      { configuration_id: config.id },
      '-updated_date',
      50
    );
    return {
      configuration_id: config.id,
      production_name: config.production_name,
      research_depth: config.research_depth,
      target_audience: config.target_audience,
      topics,
      topics_count: topics.length,
    };
  } catch {
    return {
      configuration_id: config.id,
      production_name: config.production_name,
      research_depth: config.research_depth,
      target_audience: config.target_audience,
    };
  }
}

// ─── Intent Interpretation ───

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    message_to_user: { type: 'string' },
    typing_style: {
      type: 'string',
      enum: ['normal', 'serious', 'excited', 'warning', 'instructional'],
    },
    intent: { type: 'string' },
    intent_confidence: { type: 'number' },
    active_department: {
      type: 'string',
      enum: [...VALID_DEPARTMENTS, 'none'],
    },
    next_action: {
      type: 'string',
      enum: ['respond', 'ask_question', 'delegate', 'navigate', 'update_state', 'trigger_ui', 'wait'],
    },
    department_controller: {
      type: 'string',
      enum: [...VALID_DEPARTMENTS, 'none'],
    },
    requires_user_approval: { type: 'boolean' },
    workflow_updates: { type: 'object' },
    ui_commands: { type: 'array' },
    events: { type: 'array' },
    memory_updates: { type: 'array' },
  },
};

function _buildBrainPrompt({
  userMessage,
  producer,
  showProfile,
  productionConfig,
  projectState,
  activeDepartment,
  conversationHistory,
  pageContext,
  creapMode,
}) {
  const firstName = (producer?.full_name || 'there').split(' ')[0];
  const historyStr = (conversationHistory || [])
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'PRODUCER' : 'CREAPr'}: ${m.content}`)
    .join('\n');

  const pocState = deriveResearchPOCStage({
    config: productionConfig,
    topics: projectState?.topics || [],
    points: pageContext?.entityCounts?.points ? Array(pageContext.entityCounts.points).fill({}) : [],
    packages: pageContext?.entityCounts?.packages ? Array(pageContext.entityCounts.packages).fill({}) : [],
    dossiers: pageContext?.entityCounts?.dossiers ? Array(pageContext.entityCounts.dossiers).fill({}) : [],
  });

  return `${CREAPR_IDENTITY}

PRODUCER NAME: ${firstName}
ACTIVE SHOW PROFILE: ${showProfile?.show_name || 'None configured'}
PRODUCTION CONFIG: ${productionConfig?.production_name || 'None'}
RESEARCH DEPTH: ${productionConfig?.research_depth || 'standard'}
TARGET AUDIENCE: ${productionConfig?.target_audience || 'General Public'}
ACTIVE DEPARTMENT: ${activeDepartment || 'unknown'}
CREAP MODE: ${creapMode || 'hybrid'}

CURRENT POC STAGE: ${pocState?.stageInfo?.name || 'Unknown'}
PENDING ACTION: ${pocState?.pendingAction || 'None'}
NEXT ROUTE: ${pocState?.nextRoute || 'None'}

PAGE CONTEXT:
- Route: ${pageContext?.route || 'unknown'}
- Entity counts: ${JSON.stringify(pageContext?.entityCounts || {})}

CONVERSATION HISTORY (most recent):
${historyStr || '(no prior conversation)'}

PRODUCER'S MESSAGE: "${userMessage}"

Interpret the producer's intent and decide the next action. Route to the appropriate department controller. Return your response as JSON.`;
}

// ─── Event Logging ───

async function _logBrainInteraction(logData) {
  try {
    await base44.entities.ActivityLog.create({
      action: 'create',
      entity_type: 'creapr_brain',
      entity_name: logData.activeProductionProfile || 'Research',
      details: JSON.stringify(logData),
    });
  } catch {
    // Logging is best-effort — never block the response on it
  }
}

// ─── Fallback Response ───

function _fallbackResponse(userMessage, error, activeDepartment) {
  return {
    message_to_user: "I'm having trouble processing that right now. Could you rephrase or try a different approach?",
    typing_style: 'normal',
    intent: 'unknown',
    intent_confidence: 0,
    active_production_profile: 'Research',
    active_department: activeDepartment || 'Lobby',
    next_action: 'respond',
    department_controller: 'none',
    requires_user_approval: false,
    workflow_updates: {},
    ui_commands: [],
    events: [{ type: 'brain_fallback', error: error?.message || 'unknown' }],
    memory_updates: [],
    error: error?.message || null,
  };
}

// ─── Main Entry Point ───

/**
 * Run the CREAPr Brain.
 *
 * @param {Object} params
 * @param {string} params.userMessage - What the producer said/typed
 * @param {string} [params.producerId] - User ID (falls back to auth.me())
 * @param {string} [params.activeShowProfileId] - ShowProfile ID
 * @param {string} [params.activeProductionProfile] - Profile name (e.g. "Research")
 * @param {string} [params.activeDepartment] - Current department name
 * @param {string} [params.activeProjectId] - Configuration ID
 * @param {Array} [params.conversationHistory] - [{role, content}]
 * @param {PageContext} [params.pageContext] - Current page context
 * @param {CreapMode} [params.creapMode] - autopilot | hybrid | free
 * @returns {Promise<Object>} Structured JSON response
 */
export async function runCreaprBrain({
  userMessage,
  producerId,
  activeShowProfileId,
  activeProductionProfile = 'Research',
  activeDepartment = 'Lobby',
  activeProjectId,
  conversationHistory = [],
  pageContext = {},
  creapMode = 'hybrid',
}) {
  const timestamp = new Date().toISOString();
  let logData = { timestamp, producerId, activeProductionProfile, activeDepartment };

  try {
    // Steps 1-5: Load context
    const [creapSettings, producer, showProfile, productionConfig] = await Promise.all([
      _loadCreapSettings(),
      _loadProducer(producerId),
      _loadShowProfile(activeShowProfileId),
      _loadProductionConfig(activeProjectId),
    ]);
    const projectState = await _loadProjectState(productionConfig);

    logData.creapSettings_loaded = !!creapSettings;
    logData.producer_loaded = !!producer;
    logData.showProfile_loaded = !!showProfile;
    logData.config_loaded = !!productionConfig;

    // Step 6: Active department already provided
    // Step 7: Interpret intent
    const prompt = _buildBrainPrompt({
      userMessage,
      producer,
      showProfile,
      productionConfig,
      projectState,
      activeDepartment,
      conversationHistory,
      pageContext,
      creapMode,
    });

    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: creapSettings?.ai_model || 'gpt_5_mini',
      add_context_from_internet: false,
      response_json_schema: INTENT_SCHEMA,
    });

    if (!llmResult) {
      const fallback = _fallbackResponse(userMessage, new Error('No LLM response'), activeDepartment);
      logData.error = 'no_llm_response';
      _logBrainInteraction(logData);
      return fallback;
    }

    // Step 8: Route to Department Controller if delegation is needed
    let controllerResult = null;
    const targetControllerName = llmResult.department_controller && llmResult.department_controller !== 'none'
      ? llmResult.department_controller
      : null;

    if (targetControllerName && llmResult.next_action === 'delegate') {
      const entry = getController(targetControllerName);
      if (entry?.controller) {
        try {
          controllerResult = await entry.controller.handleDepartmentRequest({
            producer,
            creapSettings,
            showProfile,
            productionProfile: activeProductionProfile,
            department: entry.departmentId,
            projectState,
            conversationHistory,
            userMessage,
            intent: llmResult.intent,
            context: pageContext,
          });
        } catch (ctrlErr) {
          controllerResult = {
            message_to_user: `The ${targetControllerName} department encountered an issue. ${ctrlErr.message}`,
            department_result: { error: ctrlErr.message },
            workflow_updates: {},
            ui_commands: [],
            events: [{ type: 'controller_error', department: targetControllerName, error: ctrlErr.message }],
            next_recommended_department: null,
            requires_user_approval: false,
          };
        }
      }
    }

    // Step 9: Assemble final response
    const response = {
      message_to_user: controllerResult?.message_to_user || llmResult.message_to_user || '',
      typing_style: llmResult.typing_style || 'normal',
      intent: llmResult.intent || 'unknown',
      intent_confidence: llmResult.intent_confidence || 0,
      active_production_profile: activeProductionProfile,
      active_department: llmResult.active_department || activeDepartment,
      next_action: llmResult.next_action || 'respond',
      department_controller: llmResult.department_controller || 'none',
      requires_user_approval: controllerResult?.requires_user_approval || llmResult.requires_user_approval || false,
      workflow_updates: {
        ...(llmResult.workflow_updates || {}),
        ...(controllerResult?.workflow_updates || {}),
      },
      ui_commands: [
        ...(llmResult.ui_commands || []),
        ...(controllerResult?.ui_commands || []),
      ],
      events: [
        ...(llmResult.events || []),
        ...(controllerResult?.events || []),
      ],
      memory_updates: llmResult.memory_updates || [],
      department_result: controllerResult?.department_result || null,
      next_recommended_department: controllerResult?.next_recommended_department || null,
      error: null,
    };

    // Step 10: Log
    logData.interpreted_intent = response.intent;
    logData.intent_confidence = response.intent_confidence;
    logData.selected_controller = response.department_controller;
    logData.next_action = response.next_action;
    logData.workflow_changes = Object.keys(response.workflow_updates);
    _logBrainInteraction(logData);

    return response;
  } catch (error) {
    logData.error = error.message;
    _logBrainInteraction(logData);
    return _fallbackResponse(userMessage, error, activeDepartment);
  }
}

export default { runCreaprBrain };