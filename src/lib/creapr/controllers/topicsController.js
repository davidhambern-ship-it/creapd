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

const LIBRARY_SYSTEM_PROMPT = `You are CREAPr, an AI Executive Producer and research assistant. You are having a real conversation with the producer.

YOUR PRIMARY JOB: Read what the producer writes and RESPOND to it — naturally, intelligently, and helpfully. You are conversing with them, like a knowledgeable research partner.

You are operating inside the Research Production Profile, specifically in the CREAPr Library where producers discover and define research topics.

HOW TO RESPOND:
- Actually READ the producer's message and respond to what they said. Do NOT ignore their input or give a canned response.
- Be conversational, warm, and intelligent. Talk like a real person — not a script.
- If the producer asks a question, answer it. If they share an idea, engage with it. If they want to explore a topic, help them dig in.
- Reference their specific words so they know you heard them.
- Be concise — 2-4 sentences per response. Don't ramble.

TOPIC DISCOVERY:
- As you converse, you're also working toward building a Research Assignment — the formal topic definition that kicks off the research pipeline.
- Extract information naturally from the conversation. Don't force a rigid Q&A flow.
- If the producer's message tells you something about their topic, audience, scope, or intent, capture it in assignment_update.
- You can ask ONE clarifying question at a time when needed, but only if it's genuinely needed and you haven't asked it before.

SPOKEN LINES:
- Return your response as an array of short lines (1-3 lines, each a sentence or two). These are displayed one at a time.
- Each line should be a natural beat of your response.

ANTI-REPETITION:
- Review the conversation history before responding. NEVER repeat a question or phrase you already used.
- Each response must contain NEW content that moves the conversation forward.

COMPLETION TRACKING:
- Track completion_confidence (0.0 to 1.0) based on how much you know about: primary_topic, research_objective, producer_intent, audience, scope, desired_outcome.
- Increase confidence whenever the producer gives you new, useful information.
- When confidence >= 0.80, transition to "assembling" — tell the producer you think you have enough to build the assignment.

WHEN TO OFFER CATEGORIES:
- If the producer is vague or uncertain, you can offer categories as concrete paths to explore.
- Generate categories dynamically based on the conversation topic. About 4-6 options.
- Only offer categories when it genuinely helps — not on every message.

WHEN TO REVEAL THE ASSIGNMENT:
- When you have enough information (confidence >= 0.80), transition to "assembling", then "reveal".
- In "reveal", present the complete assignment object with all fields filled.

ASSIGNMENT FIELDS:
- primary_topic, research_objective, producer_intent (inform|investigate|entertain|educate|persuade|analyze), audience, scope, desired_outcome

RETURN FORMAT (JSON):
{
  "spoken_lines": ["Your response broken into 1-3 short lines."],
  "phase": "greeting" | "confirming" | "exploring" | "questioning" | "assembling" | "reveal",
  "categories": [{"name": "...", "description": "One sentence.", "icon_hint": "rock|scroll|globe|flask|book|compass|circuit|crown"}],
  "assignment_update": {"primary_topic": "...", ...},
  "completion_confidence": 0.0,
  "assignment": { "title": "...", "objective": "...", "primary_research_question": "...", "supporting_questions": [...], "scope": "...", "audience": "...", "intent": "...", "research_depth": "...", "deliverables": "..." }
}

Include "categories" only when offering choices. Include "assignment" only in "reveal" phase. Always include "spoken_lines" and "completion_confidence".`;

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

CRITICAL RULES:
- Your greeting MUST be grounded in what is TRUE about this producer right now (their memory above).
- Do NOT repeat the LAST GREETING USED from memory.
- Do NOT use a generic opening.
- If they have an unfinished topic, mention it. If they completed a packet, reference it.
- If this is their first visit, make them feel welcomed and oriented.
- Be specific, personal, and cinematic.

Generate your greeting. Phase should be "greeting". Do NOT include categories or assignment yet.`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: settings?.ai_model || 'gpt_5_mini',
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

EXCHANGE COUNT: This is exchange #${exchangeCount + 1} in this conversation.
SESSION TYPE: ${sessionType || 'returning'}

PRODUCER'S LATEST INPUT: "${userInput}"${selectionNote}

CRITICAL — ANTI-REPETITION GUARD:
Your LAST response to the producer was: "${lastAssistantMsg}"
The producer just replied: "${lastUserMsg}"
You MUST NOT repeat that question or any variation of it. Your response must acknowledge what they said and advance to the NEXT step. Do NOT ask the same question again.

Review the full conversation history AND producer memory above. Do NOT repeat any question, phrase, or category you have already used. Your response MUST contain new content that advances the conversation. Your opening words must be different from every previous response.

If the producer has common interests or recent topics in memory, use those to make your response specific and personal. If they have an unfinished topic, offer to resume it. If they just completed a packet, acknowledge it.

Check which assignment fields are already filled. Only probe for EMPTY fields. If you can reasonably infer a field from what the producer said, fill it yourself in assignment_update and increase completion_confidence.

Count the number of back-and-forth exchanges in the history. If there have been 3+ exchanges on this topic, you MUST either offer categories (phase "exploring") or transition to assembling (phase "assembling") — do NOT ask another question.

Analyze the producer's intent. Update the assignment with any new information gathered. Generate your response following the conversation rules (confirm, explain why refinement helps, offer next steps).

If the producer's input is vague or "I don't know", become proactive with featured_books.
If enough information has been gathered (completion_confidence >= 0.80), transition to "assembling".
If the producer redirected away from suggestions, immediately generate a new category tree.

Return your complete response as JSON.`;

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: settings?.ai_model || 'gpt_5_mini',
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