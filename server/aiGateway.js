import { getVercelOidcToken } from '@vercel/oidc';

const GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_MODEL = process.env.CREAPD_AI_MODEL || 'openai/gpt-5.4-mini';

async function resolveGatewayCredential() {
  // Direct AI Gateway REST requests are most deterministic with the explicit
  // AI_GATEWAY_API_KEY. Keep Vercel OIDC as a secretless fallback only.
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
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content?.text === 'string') {
        text.push(content.text);
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

export async function generateStructuredGatewayResponse({
  prompt,
  schema,
  schemaName = 'creapd_output',
  model = DEFAULT_MODEL,
  webSearch = false,
  maxOutputTokens = 1800,
  timeoutMs = 55000,
}) {
  if (!prompt || !schema) {
    const error = new Error('Prompt and schema are required');
    error.code = 'AI_GATEWAY_REQUEST_INVALID';
    throw error;
  }

  const credential = await resolveGatewayCredential();
  const requestBody = {
    model,
    input: [
      {
        type: 'message',
        role: 'user',
        content: prompt,
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
    const error = new Error('AI Gateway structured output was not valid JSON');
    error.code = 'AI_GATEWAY_INVALID_JSON';
    error.authSource = credential.source;
    throw error;
  }

  const outputTypes = listOutputTypes(payload);

  return {
    data,
    model: payload?.model || model,
    authSource: credential.source,
    elapsedMs: Date.now() - startedAt,
    outputTypes,
    webSearchUsed: outputTypes.some(type => String(type).includes('web_search')),
    responseId: payload?.id || null,
  };
}

export { DEFAULT_MODEL };
