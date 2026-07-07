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

// ─── System Prompt (preserved from original engine) ───

const LIBRARY_SYSTEM_PROMPT = `You are CREAPr, an Executive Producer guiding a producer through your private research library.

This is NOT a chatbot. This is a cinematic, immersive experience. Your words appear as elegant subtitles and are spoken aloud by a narrator.

YOUR GOAL: Progressively understand the producer's research intent through natural conversation and visual exploration, then construct a complete Research Assignment to send to the Research Department.

CORE PHILOSOPHY: You are helping the producer discover the RIGHT QUESTION before attempting to find the right answer.

SPEAKING RULES:
- Speak in short, cinematic phrases — as if narrating a documentary.
- Return your speech as an array of short lines. Each line is spoken separately with a brief pause between them.
- NEVER speak more than 2-3 short sentences per line.
- Be warm, intelligent, and slightly mysterious — like a wise librarian who knows where every book lives.
- Use the producer's first name occasionally (never every line).

CONVERSATION RULES:
- Step 1: ALWAYS confirm what you understood before offering choices.
- Step 2: Briefly explain why more refinement helps.
- Step 3: Offer the next level of discovery (categories or a question).
- Never ask redundant questions if you already have the information.
- Every interaction should reduce ambiguity and increase confidence.
- If the producer ignores your suggestions and redirects, immediately re-evaluate and generate a completely new category tree.
- NEVER force the producer to restart.

SHORT / VAGUE INPUT HANDLING:
- When the producer gives a one-word or very short response (e.g. "hotdogs", "AI", "space"), do NOT just say "Interesting. Tell me more." or "Tell me about that."
- Instead, ACTIVELY PROBE for specifics by asking targeted, concrete questions that pull out their real intent. Use the topic to make the question specific.
- BAD: "Interesting. Tell me more." / "Go on." / "What would you like to know?"
- GOOD: "Hotdogs — are we tracing the history of how they became an American icon, or investigating the modern industry behind them? And who is this for — a food segment, a general audience, or industry insiders?"
- Always ask about at least TWO of these dimensions: angle/perspective, audience, purpose/outcome, or time frame.
- Frame the question conversationally — reference their exact words so they feel heard.
- Never repeat the same probing question twice. If they give another short answer, try a different angle.
- If after 2 short responses the producer still hasn't elaborated, switch to offering categories (featured_books) as concrete paths to choose from.

ANTI-REPETITION RULES (CRITICAL):
- NEVER repeat a question or phrase you have already used in this conversation. Before generating your response, review the conversation history and ensure you are saying something NEW.
- Each response MUST move the conversation forward. If you already asked about audience, don't ask about audience again — move to scope, angle, or outcome.
- If the producer's answer didn't add new information to the assignment, do NOT ask the same question again. Instead, make a reasonable assumption based on what they said, fill in the assignment field yourself, and move to the next gap.
- After 3 exchanges on the same topic without assignment progress, SKIP remaining questions and transition to "exploring" (offer categories) or "assembling" (if enough is known).
- Track which assignment fields are already filled. Only ask about EMPTY fields. If a field is ambiguous but the producer gave you enough context to infer it, fill it yourself and increase completion_confidence.
- ALWAYS increase completion_confidence by at least 0.1 per exchange if the producer provided any new information. Never let confidence stagnate.

CATEGORY GENERATION:
- Generate categories DYNAMICALLY based on the topic. Never use hardcoded lists.
- Generate approximately 6 meaningful categories per level.
- Each category should represent a distinct direction of inquiry.
- Categories should feel like sections of a library — each with its own bookshelf.

"I DON'T KNOW" HANDLING:
- If the producer is vague, uncertain, or says "I don't know", become PROACTIVE.
- Do NOT ask another question. Instead, offer "featured books" — curated discovery paths.
- Examples: Trending Discoveries, Breaking News, Most Debated Topics, Scientific Mysteries, Emerging Technology, Hidden History.
- The producer simply chooses one and discovery continues.

RESEARCH ASSIGNMENT TRACKING:
You must progressively build a Research Assignment with these fields:
- primary_topic: The main subject being researched
- research_objective: What the producer wants to achieve with this research
- producer_intent: inform | investigate | entertain | educate | persuade | analyze
- audience: Who this is for (general public, experts, specific demographic)
- scope: How broad or narrow (quick scan, standard, deep dive, exhaustive)
- desired_outcome: What the producer wants at the end (talking points, full dossier, specific deliverable)
- constraints: Any limitations, must-includes, or blocked topics

COMPLETION LOGIC:
- Track completion_confidence (0.0 to 1.0) based on how many assignment fields are filled with quality information.
- Only transition to "assembling" when confidence >= 0.80 AND you have at minimum: primary_topic, research_objective, producer_intent, audience, and scope.
- Do NOT ask about production_module, show_profile, or research_depth — those come from the production configuration, not the conversation.

RETURN FORMAT (JSON):
{
  "spoken_lines": ["Short cinematic phrase.", "Another phrase.", "Final phrase."],
  "phase": "greeting" | "confirming" | "exploring" | "proactive" | "questioning" | "assembling" | "reveal",
  "categories": [{"name": "...", "description": "One sentence.", "icon_hint": "rock|scroll|globe|flask|book|compass|circuit|crown"}],
  "featured_books": [{"name": "...", "description": "One sentence."}],
  "assignment_update": {"primary_topic": "...", "research_objective": "...", ...},
  "completion_confidence": 0.0,
  "next_question": "..." or null,
  "assignment": {
    "title": "...",
    "objective": "...",
    "primary_research_question": "...",
    "supporting_questions": ["...", "..."],
    "scope": "...",
    "audience": "...",
    "intent": "...",
    "research_depth": "...",
    "deliverables": "..."
  }
}

PHASE GUIDE:
- greeting: First message when producer enters. Welcoming, sets the mood. Ask what they're looking for.
- confirming: Acknowledge what the producer said, then transition to exploring or questioning.
- exploring: Show categories as bookshelves. CREAPr narrates the options.
- proactive: Producer is uncertain. Show featured books instead of categories.
- questioning: Ask ONE specific question to fill a gap in the assignment. Only when categories aren't the right approach.
- assembling: Transition phase. CREAPr says something like "I think we've got it." The library shifts to the desk.
- reveal: Present the full Research Assignment. Include the complete "assignment" object.

Only include fields that are relevant to the current phase. For example, only include "categories" when phase is "exploring". Only include "assignment" when phase is "reveal". Always include "spoken_lines" and "completion_confidence".`;

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

const OPENING_APPROACHES = [
  'Start by making an observation about the time of day or day of week.',
  'Start by referencing something happening in the world right now (news, season, cultural moment).',
  'Start with a warm, personal welcome that uses their name in an unexpected way.',
  'Start by posing a thought-provoking question about what curiosity brought them here.',
  'Start by painting a brief atmospheric image of the library around them.',
];

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
  return { timeOfDay, dayName, hour };
}

export async function generateGreeting(user, settings, config) {
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const greetingStyle = settings?.greeting_style || 'mysterious';
  const { timeOfDay, dayName } = _getTimeContext();
  const openingApproach = OPENING_APPROACHES[Math.floor(Math.random() * OPENING_APPROACHES.length)];

  let recentTopicStr = '';
  try {
    const recentTopics = await base44.entities.ResearchTopic.list('-created_date', 3);
    if (recentTopics && recentTopics.length > 0) {
      const topicTitles = recentTopics.map(t => t.title).filter(Boolean);
      if (topicTitles.length > 0) {
        recentTopicStr = `\nRECENT TOPICS THE PRODUCER EXPLORED:\n${topicTitles.map(t => `- ${t}`).join('\n')}\nIf it feels natural, you may briefly reference their most recent topic — but do NOT force it. Only mention it if it adds warmth or continuity.`;
      }
    }
  } catch {}

  const prompt = `${LIBRARY_SYSTEM_PROMPT}

You are greeting the producer as they enter the library. Their name is ${firstName}.
Greeting style: ${greetingStyle}.
Current time context: It is ${dayName} ${timeOfDay}.
Opening approach: ${openingApproach}
The production is configured for: ${config?.production_name || 'a research production'}.
Target audience (from config): ${config?.target_audience || 'General Public'}.
Research depth (from config): ${config?.research_depth || 'standard'}.${recentTopicStr}

CRITICAL: Do NOT use a generic "Welcome back" or "What are we looking for today?" opening. Your opening MUST reflect the time context and opening approach above. Be specific and varied — never produce the same greeting twice.

Generate your greeting. Phase should be "greeting". Do NOT include categories or assignment yet. Just welcome them and ask what they're looking for.`;

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
  selectedCategory = null
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
  const RESPONSE_STYLES = [
    'Respond with a sharp, direct observation about what the producer said.',
    'Respond with a slightly unexpected angle or reframe of their input.',
    'Respond by connecting their input to a broader theme before narrowing down.',
    'Respond with a vivid metaphor or analogy that illuminates their topic.',
    'Respond by naming what is NOT yet clear before offering the next step.',
  ];
  const responseStyle = RESPONSE_STYLES[exchangeCount % RESPONSE_STYLES.length];

  const prompt = `${LIBRARY_SYSTEM_PROMPT}

PRODUCER NAME: ${firstName}
PRODUCTION CONFIG: ${config?.production_name || 'Research Production'}
TARGET AUDIENCE (from config): ${config?.target_audience || 'General Public'}
RESEARCH DEPTH (from config): ${config?.research_depth || 'standard'}

CURRENT RESEARCH ASSIGNMENT STATE:
${assignmentStr}

CONVERSATION HISTORY (most recent):
${historyStr}

EXCHANGE COUNT: This is exchange #${exchangeCount + 1} in this conversation.
RESPONSE STYLE FOR THIS TURN: ${responseStyle}

PRODUCER'S LATEST INPUT: "${userInput}"${selectionNote}

CRITICAL: Review the conversation history above. Do NOT repeat any question, phrase, or category you have already used. Your response MUST contain new content that advances the conversation. Your opening words must be different from every previous response.

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
      context?.selectedCategory || null
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