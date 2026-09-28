import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_VERCEL_MODEL = process.env.CREAPD_AI_MODEL || 'openai/gpt-5.4-mini';
const DEFAULT_GEMINI_MODEL = process.env.CREAPD_GEMINI_MODEL || 'gemini-3.5-flash-lite';
const AI_PROVIDER = String(process.env.CREAPD_AI_PROVIDER || 'auto').trim().toLowerCase();
const ALLOW_VERCEL_FALLBACK = String(process.env.CREAPD_AI_ALLOW_VERCEL_FALLBACK || '').toLowerCase() === 'true';
const GEMINI_SEARCH_GROUNDING_ENABLED =
  String(process.env.CREAPD_GEMINI_SEARCH_GROUNDING || '').toLowerCase() === 'true';

const RESEARCH_COMPACT_INSTRUCTION = `

OUTPUT SIZE CONTRACT — IMPORTANT:
Return the complete JSON object, but keep it compact enough to finish well before the output limit.
- executive_summary: at most 180 words.
- context_and_background: at most 160 words.
- key_facts: 5-7 concise items.
- key_people: at most 5 items.
- key_organizations: at most 5 items.
- timeline: at most 6 items.
- counter_arguments: at most 3 items.
- data_and_statistics: at most 4 items.
- coverage_angles: exactly 3 concise items.
- sources: 6-10 strong sources; do not duplicate the same URL.
- claim_confidence_scores: at most 6 important claims.
- critical_analysis_report: at most 3 gray areas, 3 logical gaps, 3 competing perspectives, and 3 open questions.
- organization_structure.themes: at most 4 themes.
- research_points: exactly 10. Keep each content field under 90 words, significance under 35 words, suggested_angle under 30 words, key_facts at most 2, and sources at most 2.
Do not add prose before or after the JSON. Completeness of valid JSON is more important than extra detail.`;

function configuredProvider() {
  // Free-first behavior: if a Gemini key exists, use it even if an older
  // CREAPD_AI_PROVIDER=vercel setting is still hanging around in Preview.
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (AI_PROVIDER === 'gemini') return 'gemini';
  if (AI_PROVIDER === 'vercel') return 'vercel';
  return 'vercel';
}

async function resolveGatewayCredential() {
  if (process.env.AI_GATEWAY_API_KEY) {
    return { token: process.env.AI_GATEWAY_API_KEY, source: 'api_key' };
  }

  let contextToken = null;
  try {
    contextToken = await getVercelOidcToken();
  } catch {}

  if (contextToken) {
    return { token: contextToken, source: 'vercel_oidc_context' };
  }

  if (process.env.VERCEL_OIDC_TOKEN) {
    return { token: process.env.VERCEL_OIDC_TOKEN, source: 'vercel_oidc_env' };
  }

  const error = new Error('AI Gateway authentication is not available');
  error.code = 'AI_GATEWAY_AUTH_NOT_AVAILABLE';
  throw error;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const block of Array.isArray(item?.content) ? item.content : []) {
      if ((block?.type === 'output_text' || block?.type === 'text') && typeof block?.text === 'string') {
        text.push(block.text);
      }
    }
  }
  return text.join('\n').trim();
}

function listOutputTypes(payload) {
  return (Array.isArray(payload?.output) ? payload.output : [])
    .map(item => item?.type)
    .filter(Boolean);
}

function isIncompleteResponse(payload) {
  return payload?.status === 'incomplete' || Boolean(payload?.incomplete_details);
}

function incompleteReason(payload) {
  return String(
    payload?.incomplete_details?.reason ||
    payload?.incomplete_details?.type ||
    payload?.status ||
    'incomplete',
  ).slice(0, 120);
}

function geminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map(part => typeof part?.text === 'string' ? part.text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function geminiSources(payload) {
  const chunks = payload?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set();
  const sources = [];
  for (const chunk of chunks) {
    const url = String(chunk?.web?.uri || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: String(chunk?.web?.title || '').trim(),
      url,
    });
  }
  return sources;
}

async function geminiRequest({
  model,
  body,
  timeoutMs,
  stage,
}) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured');
    error.code = 'GEMINI_API_KEY_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Gemini returned HTTP ${response.status}`;
    const error = new Error(String(message).slice(0, 300));
    error.code = 'GEMINI_REQUEST_FAILED';
    error.status = response.status;
    error.authSource = 'gemini_api_key';
    error.stage = stage;
    error.gatewayPayload = payload;
    throw error;
  }

  return payload;
}

async function generateGeminiStructuredResponse({
  prompt,
  schema,
  schemaName,
  webSearch,
  maxOutputTokens,
  timeoutMs,
}) {
  const model = DEFAULT_GEMINI_MODEL;
  const startedAt = Date.now();
  const effectivePrompt = schemaName === 'creapd_research_v1'
    ? `${prompt}${RESEARCH_COMPACT_INSTRUCTION}`
    : prompt;

  let groundedText = '';
  let sources = [];
  let searchUsed = false;
  const useGrounding = Boolean(webSearch && GEMINI_SEARCH_GROUNDING_ENABLED);

  // Gemini 3.x text generation can run on the free tier, but Google Search
  // grounding is not available on the free tier. Keep grounding opt-in only.
  // Default free-first mode uses one structured generation call and explicitly
  // avoids pretending that model knowledge is live web research.
  if (useGrounding) {
    const researchBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                effectivePrompt,
                '',
                'RESEARCH PASS ONLY:',
                '- Use Google Search grounding for current facts.',
                '- Prefer primary, official, academic, and reputable reporting sources.',
                '- Include the factual material needed to answer the request.',
                '- Do not invent URLs or sources.',
                '- Keep this research pass concise enough to feed a second structured pass.',
              ].join('\n'),
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: Math.max(1200, Math.min(5000, Number(maxOutputTokens || 1800) * 2)),
      },
    };

    const researchPayload = await geminiRequest({
      model,
      body: researchBody,
      timeoutMs: Math.max(15000, Math.min(timeoutMs, 50000)),
      stage: 'grounded_research',
    });

    groundedText = geminiText(researchPayload);
    sources = geminiSources(researchPayload);
    searchUsed = Boolean(
      groundedText ||
      researchPayload?.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length,
    );

    if (!groundedText) {
      const error = new Error('Gemini grounding returned no research text');
      error.code = 'GEMINI_GROUNDING_EMPTY';
      error.authSource = 'gemini_api_key';
      throw error;
    }
  }

  const sourceAppendix = sources.length
    ? sources.map((source, index) => `${index + 1}. ${source.title || 'Source'} — ${source.url}`).join('\n')
    : 'No source URL metadata was returned. Do not invent URLs.';

  const structuredPrompt = useGrounding
    ? [
        effectivePrompt,
        '',
        'GROUNDED RESEARCH MATERIAL:',
        groundedText,
        '',
        'GROUNDING SOURCES:',
        sourceAppendix,
        '',
        'STRUCTURING PASS:',
        'Return only JSON matching the required response schema.',
        'Use the grounded research above as the factual basis.',
        'Do not invent sources or URLs that are not present in the grounded material/source list.',
      ].join('\n')
    : webSearch
      ? [
          effectivePrompt,
          '',
          'CREAPD FREE MODE OVERRIDE:',
          '- Live Google Search grounding is disabled because it is not available on the Gemini free tier.',
          '- Do not claim that you performed live web verification.',
          '- Use your existing knowledge conservatively.',
          '- If a source URL cannot be confidently supplied from known information, return an empty string rather than inventing one.',
          '- Mark uncertain/current claims as mixed, unverified, or warning as appropriate.',
          '- Still return the complete requested structured object.',
        ].join('\n')
      : effectivePrompt;

  const structuredBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: structuredPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: Number(maxOutputTokens || 1800),
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  };

  const structuredPayload = await geminiRequest({
    model,
    body: structuredBody,
    timeoutMs: Math.max(15000, Math.min(timeoutMs, 50000)),
    stage: 'structured_output',
  });

  const outputText = geminiText(structuredPayload);
  if (!outputText) {
    const error = new Error('Gemini returned no structured text output');
    error.code = 'GEMINI_EMPTY_OUTPUT';
    error.authSource = 'gemini_api_key';
    throw error;
  }

  let data;
  try {
    data = JSON.parse(outputText);
  } catch {
    const error = new Error(`Gemini structured output was not valid JSON (${outputText.length} chars)`);
    error.code = 'GEMINI_INVALID_JSON';
    error.authSource = 'gemini_api_key';
    error.outputLength = outputText.length;
    throw error;
  }

  return {
    data,
    model,
    authSource: 'gemini_api_key',
    provider: 'gemini',
    elapsedMs: Date.now() - startedAt,
    outputTypes: useGrounding
      ? ['google_search', 'structured_output']
      : ['structured_output'],
    webSearchUsed: searchUsed,
    responseId: null,
    sources,
  };
}

async function generateVercelGatewayResponse({
  prompt,
  schema,
  schemaName,
  model,
  webSearch,
  maxOutputTokens,
  timeoutMs,
}) {
  const credential = await resolveGatewayCredential();
  const effectivePrompt = schemaName === 'creapd_research_v1'
    ? `${prompt}${RESEARCH_COMPACT_INSTRUCTION}`
    : prompt;

  const requestBody = {
    model,
    input: [
      {
        type: 'message',
        role: 'user',
        content: effectivePrompt,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema,
      },
    },
    max_output_tokens: maxOutputTokens,
    providerOptions: {
      gateway: {
        disallowPromptTraining: true,
      },
    },
  };

  if (webSearch) {
    requestBody.tools = [{ type: 'web_search' }];
  }

  const startedAt = Date.now();
  const gatewayResponse = await fetch(`${GATEWAY_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const payload = await gatewayResponse.json().catch(() => null);
  if (!gatewayResponse.ok) {
    const error = new Error(
      String(payload?.error?.message || payload?.message || `AI Gateway returned HTTP ${gatewayResponse.status}`).slice(0, 220),
    );
    error.code = 'AI_GATEWAY_REQUEST_FAILED';
    error.status = gatewayResponse.status;
    error.authSource = credential.source;
    error.gatewayPayload = payload;
    throw error;
  }

  if (isIncompleteResponse(payload)) {
    const reason = incompleteReason(payload);
    const error = new Error(`AI Gateway output was incomplete (${reason})`);
    error.code = 'AI_GATEWAY_OUTPUT_INCOMPLETE';
    error.authSource = credential.source;
    error.incompleteReason = reason;
    throw error;
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    const error = new Error('AI Gateway returned no structured text output');
    error.code = 'AI_GATEWAY_EMPTY_OUTPUT';
    error.authSource = credential.source;
    throw error;
  }

  let data;
  try {
    data = JSON.parse(outputText);
  } catch {
    const error = new Error(`AI Gateway structured output was not valid JSON (${outputText.length} chars)`);
    error.code = 'AI_GATEWAY_INVALID_JSON';
    error.authSource = credential.source;
    error.outputLength = outputText.length;
    throw error;
  }

  const outputTypes = listOutputTypes(payload);

  return {
    data,
    model: payload?.model || model,
    authSource: credential.source,
    provider: 'vercel',
    elapsedMs: Date.now() - startedAt,
    outputTypes,
    webSearchUsed: outputTypes.some(type => String(type).includes('web_search')),
    responseId: payload?.id || null,
    sources: [],
  };
}

export async function generateStructuredGatewayResponse({
  prompt,
  schema,
  schemaName = 'creapd_output',
  model = DEFAULT_VERCEL_MODEL,
  webSearch = false,
  maxOutputTokens = 1800,
  timeoutMs = 55000,
}) {
  if (!prompt || !schema) {
    const error = new Error('Prompt and schema are required');
    error.code = 'AI_GATEWAY_REQUEST_INVALID';
    throw error;
  }

  const provider = configuredProvider();

  if (provider === 'gemini') {
    try {
      return await generateGeminiStructuredResponse({
        prompt,
        schema,
        schemaName,
        webSearch,
        maxOutputTokens,
        timeoutMs,
      });
    } catch (error) {
      if (!ALLOW_VERCEL_FALLBACK) throw error;
      console.warn('[CREAPD AI] Gemini failed; using explicitly enabled Vercel fallback', {
        code: error?.code || null,
        message: String(error?.message || '').slice(0, 160),
      });
    }
  }

  return generateVercelGatewayResponse({
    prompt,
    schema,
    schemaName,
    model,
    webSearch,
    maxOutputTokens,
    timeoutMs,
  });
}

const DEFAULT_MODEL = configuredProvider() === 'gemini'
  ? DEFAULT_GEMINI_MODEL
  : DEFAULT_VERCEL_MODEL;

export {
  DEFAULT_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_VERCEL_MODEL,
  configuredProvider,
};
