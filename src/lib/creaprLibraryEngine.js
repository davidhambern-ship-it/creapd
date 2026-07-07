import { base44 } from '@/api/base44Client';

/**
 * CREAPr Library Engine
 * Handles all LLM interactions for the immersive library experience.
 * CREAPr progressively understands the producer's intent through conversation
 * and builds a structured Research Assignment.
 */

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

const FALLBACK_ASSIGNMENT = {
  spoken_lines: ["I think we've got it.", "Here's what I'm sending to Research."],
  phase: "reveal",
  completion_confidence: 1.0,
  assignment: {
    title: "Research Assignment",
    objective: "Deep research on the producer's chosen topic",
    primary_research_question: "",
    supporting_questions: [],
    scope: "Standard",
    audience: "General Public",
    intent: "investigate",
    research_depth: "standard",
    deliverables: "Research points with sources and analysis",
  },
};

/**
 * Generate CREAPr's initial greeting when the producer enters the library.
 */
export async function generateGreeting(user, settings, config) {
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const greetingStyle = settings?.greeting_style || 'mysterious';
  const prompt = `${LIBRARY_SYSTEM_PROMPT}

You are greeting the producer as they enter the library. Their name is ${firstName}.
Greeting style: ${greetingStyle}.
The production is configured for: ${config?.production_name || 'a research production'}.
Target audience (from config): ${config?.target_audience || 'General Public'}.
Research depth (from config): ${config?.research_depth || 'standard'}.

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

/**
 * Process the producer's input (voice or text) and generate CREAPr's response.
 * @param {string} userInput - What the producer said/typed
 * @param {Array} conversationHistory - Array of {role, content} messages
 * @param {Object} currentAssignment - Current state of the research assignment
 * @param {Object} settings - CREAP settings
 * @param {Object} config - ResearchProductionConfiguration
 * @param {string} selectedCategory - The category the producer clicked (if any)
 */
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

  const prompt = `${LIBRARY_SYSTEM_PROMPT}

PRODUCER NAME: ${firstName}
PRODUCTION CONFIG: ${config?.production_name || 'Research Production'}
TARGET AUDIENCE (from config): ${config?.target_audience || 'General Public'}
RESEARCH DEPTH (from config): ${config?.research_depth || 'standard'}

CURRENT RESEARCH ASSIGNMENT STATE:
${assignmentStr}

CONVERSATION HISTORY (most recent):
${historyStr}

PRODUCER'S LATEST INPUT: "${userInput}"${selectionNote}

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

/**
 * Build a ResearchTopic entity from the completed Research Assignment.
 */
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