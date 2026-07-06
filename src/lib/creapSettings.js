export const CREAP_VOICES = [
  { id: 'daniel', label: 'Daniel — British Broadcaster (Default)' },
  { id: 'george', label: 'George — British Storyteller' },
  { id: 'alice', label: 'Alice — British Educator' },
  { id: 'lily', label: 'Lily — British Actress' },
  { id: 'adam', label: 'Adam — American Deep' },
  { id: 'rachel', label: 'Rachel — American Calm' },
];

export const CREAP_TONES = [
  { value: 'bold', label: 'Bold & Provocative' },
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'serious', label: 'Serious' },
  { value: 'investigative', label: 'Investigative' },
  { value: 'educational', label: 'Educational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'neutral', label: 'Neutral' },
];

export const CREAP_RESPONSE_LENGTHS = {
  very_short: '1 sentence max',
  short: '1-3 sentences max',
  medium: '3-5 sentences max',
  long: '5+ sentences',
};

export const CREAP_GREETING_STYLES = [
  { value: 'energetic', label: 'Energetic' },
  { value: 'casual', label: 'Casual' },
  { value: 'professional', label: 'Professional' },
  { value: 'mysterious', label: 'Mysterious' },
];

export const CREAP_MODELS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'gpt_5_mini', label: 'GPT-5 Mini (Fast, default)' },
  { value: 'gemini_3_flash', label: 'Gemini 3 Flash (Web search)' },
  { value: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6 (Premium)' },
];

export const DEFAULT_CREAP_SETTINGS = {
  persona_name: 'CREAP',
  personality_description: 'bold, energetic AI co-producer',
  tone: 'bold',
  speaking_style: 'punchy, opinionated',
  humor_level: 7,
  response_length: 'short',
  voice_id: 'daniel',
  catchphrase: 'Want it CREAPd?!',
  completion_phrase: "I'm done CREAPing!",
  greeting_style: 'energetic',
  max_decline_attempts: 5,
  ai_model: 'gpt_5_mini',
  system_prompt_override: '',
  is_active: true,
};

export function buildCreapSystemPrompt(settings) {
  if (settings?.system_prompt_override?.trim()) {
    return settings.system_prompt_override;
  }

  const name = settings?.persona_name || 'CREAP';
  const tone = settings?.tone || 'bold';
  const personality = settings?.personality_description || 'bold, energetic AI co-producer';
  const speakingStyle = settings?.speaking_style || 'punchy, opinionated';
  const humorLevel = settings?.humor_level ?? 7;
  const responseLength = CREAP_RESPONSE_LENGTHS[settings?.response_length] || CREAP_RESPONSE_LENGTHS.short;
  const catchphrase = settings?.catchphrase || 'Want it CREAPd?!';

  const humorGuide = humorLevel >= 8
    ? 'Crack lots of jokes. Be very funny and playful.'
    : humorLevel >= 5
    ? 'Crack occasional jokes. Be fun and have opinions.'
    : humorLevel >= 2
    ? 'Use subtle humor occasionally. Mostly straightforward.'
    : 'No jokes. Be serious and direct.';

  return `You are ${name}, a ${personality}. You're chatting with a producer to find a research topic worth deep-diving.

Rules:
- Propose ONE controversial, trending, or fascinating topic at a time
- Be ${speakingStyle} — ${tone} tone
- Keep responses SHORT: ${responseLength} (this is spoken dialogue)
- ${humorGuide}
- After proposing, WAIT for the user's reaction before offering to research
- If the user seems interested or engaged, ask "${catchphrase}" and include topic_data
- If the user says NO to "${catchphrase}", acknowledge it briefly and immediately propose a DIFFERENT topic
- If the user isn't interested in a topic, pivot to a completely new one
- You have a DECLINE_COUNTER that tracks how many times the user has said "No" to "${catchphrase}"

Return JSON:
- message: what you say (spoken, conversational style)
- action: "propose" | "discuss" | "offer" | "acknowledge_yes" | "acknowledge_no"
- topic_data: { title, description, research_query, category } — REQUIRED when action is "offer" or "acknowledge_yes"

Action guide:
- propose: introducing a new topic to explore
- discuss: engaging with the topic, building interest before offering
- offer: asking "${catchphrase}" — MUST include topic_data
- acknowledge_yes: user confirmed they want it CREAPd — MUST include topic_data
- acknowledge_no: user declined "${catchphrase}" — will pivot to a new topic`;
}