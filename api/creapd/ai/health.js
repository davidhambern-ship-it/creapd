import { requireCreapdUser } from '../../../server/creapdUser.js';
import {
  generateStructuredGatewayResponse,
  DEFAULT_MODEL,
  configuredProvider,
} from '../../../server/aiGateway.js';

export const config = {
  maxDuration: 60,
};

const TARGET_MODEL = DEFAULT_MODEL;

const canarySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fact: { type: 'string' },
    source_name: { type: 'string' },
    source_url: { type: 'string' },
  },
  required: ['fact', 'source_name', 'source_url'],
};

function safeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function providerReadiness() {
  const provider = configuredProvider();
  if (provider === 'gemini') {
    return {
      provider,
      configured: Boolean(process.env.GEMINI_API_KEY),
      auth_source: process.env.GEMINI_API_KEY ? 'gemini_api_key' : null,
      target_model: TARGET_MODEL,
      gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY),
      vercel_gateway_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
    };
  }

  return {
    provider,
    configured: Boolean(
      process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN,
    ),
    auth_source: process.env.AI_GATEWAY_API_KEY
      ? 'api_key'
      : process.env.VERCEL_OIDC_TOKEN
        ? 'vercel_oidc_env'
        : 'vercel_oidc_context_or_unavailable',
    target_model: TARGET_MODEL,
    gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY),
    vercel_gateway_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
  };
}

async function runHealth(response) {
  const readiness = providerReadiness();

  return response.status(readiness.configured || readiness.provider === 'vercel' ? 200 : 503).json({
    ok: readiness.configured || readiness.provider === 'vercel',
    service: 'creapd-ai',
    ...readiness,
    free_first_mode: readiness.provider === 'gemini',
    timestamp: new Date().toISOString(),
  });
}

async function runResearchCanary(request, response) {
  try {
    const { user, provider: authProvider } = await requireCreapdUser(request);
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_research_canary',
      schema: canarySchema,
      maxOutputTokens: 500,
      timeoutMs: 45000,
      prompt: [
        "You are testing CREAPD's research backend.",
        'Use live web search for this request.',
        "Find one factual statement from Vercel's current official documentation about AI Gateway.",
        'Return only a short fact, the official source name, and the exact https source URL.',
        'Use an official vercel.com source.',
      ].join('\n'),
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-ai-research-canary',
      authenticated: true,
      auth_provider: authProvider,
      ai_provider: result.provider || configuredProvider(),
      ai_auth_source: result.authSource,
      model: result.model,
      structured_json_valid: Boolean(result.data?.fact && result.data?.source_url),
      web_search_used: result.webSearchUsed,
      output_types: result.outputTypes,
      source_domain: safeDomain(result.data?.source_url),
      elapsed_ms: result.elapsedMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status) && ![
      'AI_GATEWAY_REQUEST_FAILED',
      'GEMINI_REQUEST_FAILED',
    ].includes(error?.code)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-ai-research-canary',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD AI RESEARCH CANARY]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-ai-research-canary',
      error: error?.code || 'research_canary_failed',
      ai_provider: configuredProvider(),
      ai_auth_source: error?.authSource || null,
      gemini_api_key_present: Boolean(process.env.GEMINI_API_KEY),
      vercel_gateway_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
      diagnostic: {
        error_name: error?.name || null,
        error_code: error?.code || null,
        provider_status: error?.status || null,
        stage: error?.stage || null,
        safe_message: String(error?.message || 'research_canary_failed').slice(0, 220),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method === 'GET') {
    return runHealth(response);
  }

  if (request.method === 'POST') {
    const body = request.body && typeof request.body === 'object' ? request.body : {};
    if (body.action !== 'research_canary') {
      return response.status(400).json({ ok: false, error: 'invalid_action' });
    }
    return runResearchCanary(request, response);
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ ok: false, error: 'method_not_allowed' });
}
