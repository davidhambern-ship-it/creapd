/**
 * Topics Department Controller
 *
 * Refactored from the original `creaprLibraryEngine.js`.
 * This controller manages CREAPr Library interaction, topic discovery,
 * category generation, section generation, book/topic selection,
 * intent mapping, and Research Assignment creation.
 *
 * It exposes:
 *   - handleDepartmentRequest: standard controller interface for the Brain
 *   - generateGreeting, processProducerInput, buildResearchTopicData:
 *     backward-compatible exports so existing imports still work
 */

import { base44 } from '@/api/base44Client';
import {
  loadCreaprMemory,
  deriveSessionType,
  buildMemoryContextString,
  updateCreaprMemory,
} from '@/lib/creapr/creaprMemory';

// ─── System Prompt (preserved from original engine) ───

const LIBRARY_SYSTEM_PROMPT = `You are CREAPr, a conversational AI assistant powered by Claude. You are an Executive Producer inside the Research Production Profile, helping producers discover and define research topics through natural conversation.

CORE BEHAVIOR:
- You are a CHATBOT. Have a real conversation. Read what the producer says and respond to it directly.
- Be warm, intelligent, and natural. Talk like a knowledgeable research partner, not a scripted form.
- If they ask a question, answer it. If they share an idea, engage with it. If they're exploring, help them dig in.
- Reference their specific words so they know you actually heard them.
- Be concise — 1-3 sentences per response. Don't ramble.

TOPIC DISCOVERY (natural, not forced):
- As you converse, quietly extract information about their topic, audience, scope, and intent.
- Put any new info you learned into assignment_update.
- You may ask ONE clarifying question when genuinely needed — but only if you haven't asked it before.
- Do NOT follow a rigid step-by-step flow. Let the conversation breathe.

COMPLETION TRACKING:
- Track completion_confidence (0.0 to 1.0) based on how much you know about the topic.
- When confidence >= 0.80, set phase to "reveal" and include the full assignment object.

WHEN TO OFFER CATEGORIES:
- Only if the producer is vague or stuck. Offer 4-6 dynamic categories based on the conversation.
- Do NOT offer categories on every message.

RETURN JSON:
{
  "spoken_lines": ["Your response broken into 1-3 short natural lines."],
  "phase": "greeting" | "confirming" | "exploring" | "questioning" | "assembling" | "reveal",
  "categories": [{"name": "...", "description": "...", "icon_hint": "rock|scroll|globe|flask|book|compass|circuit|crown"}],
  "assignment_update": {},
  "completion_confidence": 0.0,
  "assignment": {}
}

Always include spoken_lines and completion_confidence. Include categories only when offering choices. Include assignment only in "reveal" phase.`;

// ─── Fallbacks ───

const FALLBACK_GREETING = {
  spoken_lines: ["Welcome back.", "I'm glad you're here.", "So... what are we looking for today?"],
  phase: "greeting",
  completion_confidence: 0,
};

const FALLBACK_RESPONSE = {
  spoken_lines: ["Let me make sure I understand.", "What angle are you after — and who needs to hear this?"],
  phase: "questioning",
  completion_confidence: 0.1,
  next_question: "What's the outcome you're hoping for?",
};

// ─── Original Engine Functions (preserved for backward compat) ───

function _getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay;
  if (hour < 5) timeOfDay = 'late night';
  else if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else if (hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  return { timeOfDay, dayName };
}

export async function generateGreeting(user, settings, config) {
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const greetingStyle = settings?.greeting_style || 'mysterious';
  const { timeOfDay, dayName } = _getTimeContext();

  const memory = await loadCreaprMemory();
  const sessionType = deriveSessionType(memory, { topics: [] });
  const memoryContextString = buildMemoryContextString(memory, sessionType, null, user);

  let sessionGuidance = '';
  switch (sessionType) {
    case 'first_visit':
      sessionGuidance = 'This is the producer FIRST visit. Welcome them warmly by name. Orient them to what CREAPr does. Ask what they want to explore. Do NOT assume prior context.';
      break;
    case 'resumed_project':
      sessionGuidance = 'The producer is RETURNING to an unfinished topic. Reference it directly. Ask if they want to pick up where they left off. Do NOT pretend you do not remember.';
      break;
    case 'returning':
      sessionGuidance = 'The producer is returning after completing previous work. Reference their last completed packet or recent topics. Ask if they want to build on it or start something new.';
      break;
    default:
      sessionGuidance = 'Welcome the producer back. Reference something from memory that makes this feel personal.';
  }

  const prompt = `${LIBRARY_SYSTEM_PROMPT}

You are greeting the producer as they enter the library. Their name is ${firstName}.
Greeting style: ${greetingStyle}.
Current time context: It is ${dayName} ${timeOfDay}.

PRODUCER MEMORY:
${memoryContextString}

SESSION GUIDANCE: ${sessionGuidance}

The production is configured for: ${config?.production_name || 'a research production'}.
Target audience (from config): ${config?.target_audience || 'General Public'}.
Research depth (from config): ${config?.research_depth || 'standard'}.

Greet the producer naturally and conversationally. Be warm, specific to them, and brief (1-3 sentences). Do NOT repeat your last greeting. Phase should be "greeting".`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: settings?.ai_model || 'claude-sonnet-5',
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          spoken_lines: { type: 'array', items: { type: 'string' } },
          phase: { type: 'string' },
          completion_confidence: { type: 'number' },
        },
      },
    });

    if (result?.spoken_lines && memory?.id) {
      updateCreaprMemory(memory.id, {
        last_greeting: result.spoken_lines.join(' ').substring(0, 150),
      });
    }

    return result || FALLBACK_GREETING;
  } catch {
    return FALLBACK_GREETING;
  }
}

export async function processProducerInput(
  userInput,
  conversationHistory,
  currentAssignment,
  settings,
  config,
  selectedCategory = null,
  memoryContextString = null,
  sessionType = null
) {
  const firstName = (config?._userName || 'there').split(' ')[0];
  const historyStr = conversationHistory
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'PRODUCER' : 'CREAPr'}: ${m.content}`)
    .join('\n');

  const assignmentStr = JSON.stringify(currentAssignment || {}, null, 2);

  const selectionNote = selectedCategory
    ? `\nThe producer selected the category: "${selectedCategory}". Generate the next level of refinement for this category.`
    : '';

  const exchangeCount = conversationHistory.filter(m => m.role === 'user').length;

  // Extract last assistant message to prevent repetition
  const lastAssistantMsgs = conversationHistory.filter(m => m.role === 'assistant');
  const lastAssistantMsg = lastAssistantMsgs.length > 0 ? lastAssistantMsgs[lastAssistantMsgs.length - 1].content : '';
  const lastUserMsg = conversationHistory.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  const prompt = `${LIBRARY_SYSTEM_PROMPT}

PRODUCER NAME: ${firstName}
PRODUCTION CONFIG: ${config?.production_name || 'Research Production'}
TARGET AUDIENCE (from config): ${config?.target_audience || 'General Public'}
RESEARCH DEPTH (from config): ${config?.research_depth || 'standard'}

PRODUCER MEMORY:
${memoryContextString || 'No memory available (first interaction).'}

CURRENT RESEARCH ASSIGNMENT STATE:
${assignmentStr}

CONVERSATION HISTORY (most recent):
${historyStr}

PRODUCER'S LATEST INPUT: "${userInput}"${selectionNote}

Respond naturally to what the producer just said. If they shared new information about their topic, capture it in assignment_update and increase completion_confidence. If you have enough to build the assignment (confidence >= 0.80), transition to "assembling". Otherwise, just keep the conversation going.

Return your response as JSON.`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: settings?.ai_model || 'claude-sonnet-5',
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          spoken_lines: { type: 'array', items: { type: 'string' } },
          phase: { type: 'string' },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                icon_hint: { type: 'string' },
              },
            },
          },
          featured_books: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          assignment_update: { type: 'object' },
          completion_confidence: { type: 'number' },
          next_question: { type: 'string' },
          assignment: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              objective: { type: 'string' },
              primary_research_question: { type: 'string' },
              supporting_questions: { type: 'array', items: { type: 'string' } },
              scope: { type: 'string' },
              audience: { type: 'string' },
              intent: { type: 'string' },
              research_depth: { type: 'string' },
              deliverables: { type: 'string' },
            },
          },
        },
      },
    });
    return result || FALLBACK_RESPONSE;
  } catch {
    return FALLBACK_RESPONSE;
  }
}

export function buildResearchTopicData(assignment, config) {
  const supportingQs = assignment?.supporting_questions || [];
  const description = [
    assignment?.objective || '',
    supportingQs.length > 0 ? `\n\nSupporting Questions:\n${supportingQs.map(q => `• ${q}`).join('\n')}` : '',
    assignment?.deliverables ? `\n\nDeliverables: ${assignment.deliverables}` : '',
    assignment?.constraints ? `\n\nConstraints: ${assignment.constraints}` : '',
  ].join('');

  return {
    configuration_id: config.id,
    title: assignment?.title || assignment?.primary_research_question || 'Research Assignment',
    description: description.trim(),
    research_query: assignment?.primary_research_question || assignment?.title || '',
    category: assignment?.intent || 'general',
    priority: 'standard',
    research_depth: config?.research_depth || assignment?.research_depth || 'standard',
    status: 'researching',
  };
}

// ─── Standard Department Controller Interface ───

/**
 * Topics Department Controller — handles topic discovery and research
 * assignment creation within the CREAPr Library.
 *
 * This wraps the existing engine functions to conform to the standard
 * controller interface expected by the CREAPr Brain.
 */
export async function handleDepartmentRequest({
  producer,
  creapSettings,
  showProfile,
  productionProfile,
  department,
  projectState,
  conversationHistory,
  userMessage,
  intent,
  context,
  memory,
  sessionType,
  memoryContextString,
}) {
  const config = {
    id: projectState?.configuration_id || projectState?.id,
    production_name: projectState?.production_name || productionProfile,
    target_audience: projectState?.target_audience,
    research_depth: projectState?.research_depth,
    _userName: producer?.full_name,
  };

  const existingAssignment = context?.assignment || projectState?.assignment || {};

  try {
    const result = await processProducerInput(
      userMessage,
      conversationHistory,
      existingAssignment,
      creapSettings,
      config,
      context?.selectedCategory || null,
      memoryContextString,
      sessionType
    );

    const messageText = (result.spoken_lines || []).join(' ');

    return {
      message_to_user: messageText,
      department_result: {
        phase: result.phase,
        spoken_lines: result.spoken_lines,
        categories: result.categories,
        featured_books: result.featured_books,
        next_question: result.next_question,
        assignment: result.assignment,
        completion_confidence: result.completion_confidence,
        assignment_update: result.assignment_update,
      },
      workflow_updates: result.assignment_update
        ? { assignment: { ...existingAssignment, ...result.assignment_update } }
        : {},
      ui_commands: _buildTopicsUICommands(result),
      events: [],
      next_recommended_department: result.phase === 'reveal' ? 'Research' : null,
      requires_user_approval: result.phase === 'reveal',
    };
  } catch (error) {
    return {
      message_to_user: "I encountered an issue processing that. Could you rephrase?",
      department_result: { error: error.message },
      workflow_updates: {},
      ui_commands: [],
      events: [{ type: 'error', message: error.message }],
      next_recommended_department: null,
      requires_user_approval: false,
    };
  }
}

function _buildTopicsUICommands(result) {
  const commands = [];
  if (result.categories?.length > 0) {
    commands.push({ type: 'show_shelves', target: 'topics.categories', data: result.categories });
  }
  if (result.featured_books?.length > 0) {
    commands.push({ type: 'show_featured', target: 'topics.featured_books', data: result.featured_books });
  }
  if (result.phase === 'assembling') {
    commands.push({ type: 'transition_to_desk', target: 'topics.desk' });
  }
  if (result.phase === 'reveal' && result.assignment) {
    commands.push({ type: 'reveal_assignment', target: 'topics.desk', data: result.assignment });
  }
  return commands;
}

export default { handleDepartmentRequest, generateGreeting, processProducerInput, buildResearchTopicData };