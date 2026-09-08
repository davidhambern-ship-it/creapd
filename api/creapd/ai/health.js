import { getVercelOidcToken } from '@vercel/oidc';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { generateStructuredGatewayResponse } from '../../../server/aiGateway.js';

export const config = {
  maxDuration: 30,
};

const TARGET_MODEL = 'openai/gpt-5.6-luna';

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

async function runGatewayHealth(response) {
  let contextOidcToken = null;
  let oidcErrorName = null;

  try {
    contextOidcToken = await getVercelOidcToken();
  } catch (error) {
    oidcErrorName = error?.name || 'OidcTokenError';
  }

  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY ||
    contextOidcToken ||
    process.env.VERCEL_OIDC_TOKEN ||
    null;

  const authSource = process.env.AI_GATEWAY_API_KEY
    ? 'api_key'
    : contextOidcToken
      ? 'vercel_oidc_context'
      : process.env.VERCEL_OIDC_TOKEN
        ? 'vercel_oidc_env'
        : null;

  if (!gatewayToken) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-ai-gateway',
      error: 'gateway_auth_not_available',
      oidc_context_present: Boolean(contextOidcToken),
      oidc_env_present: Boolean(process.env.VERCEL_OIDC_TOKEN),
      api_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
      oidc_error_name: oidcErrorName,
      target_model: TARGET_MODEL,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const gatewayResponse = await fetch('https://ai-gateway.vercel.sh/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    const payload = await gatewayResponse.json().catch(() => null);
    const models = Array.isArray(payload?.data) ? payload.data : [];
    const targetAvailable = models.some(model => model?.id === TARGET_MODEL);

    return response.status(gatewayResponse.ok ? 200 : 503).json({
      ok: gatewayResponse.ok,
      service: 'creapd-ai-gateway',
      gateway_http_status: gatewayResponse.status,
      auth_source: authSource,
      api_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
      oidc_context_present: Boolean(contextOidcToken),
      target_model: TARGET_MODEL,
      target_model_available: targetAvailable,
      model_count: models.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-ai-gateway',
      error: 'gateway_connection_failed',
      error_name: error?.name || null,
      safe_message: String(error?.message || 'gateway_connection_failed').slice(0, 180),
      auth_source: authSource,
      api_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
      target_model: TARGET_MODEL,
      timestamp: new Date().toISOString(),
    });
  }
}

async function runResearchCanary(request, response) {
  try {
    const { user, provider } = await requireCreapdUser(request);
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_research_canary',
      schema: canarySchema,
      maxOutputTokens: 500,
      timeoutMs: 25000,
      prompt: [
        "You are testing CREAPD's research backend.",
        'Use live web search for this request.',
        "Find one factual statement from Vercel's current official documentation about AI Gateway web search or AI Gateway models.",
        'Return only a short fact, the official source name, and the exact https source URL.',
        'Use an official vercel.com source.',
      ].join('\n'),
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-ai-research-canary',
      authenticated: true,
      auth_provider: provider,
      creapd_user_resolved: Boolean(user?.id),
      gateway_auth_source: result.authSource,
      model: result.model,
      structured_json_valid: Boolean(result.data?.fact && result.data?.source_url),
      web_search_used: result.webSearchUsed,
      output_types: result.outputTypes,
      source_domain: safeDomain(result.data?.source_url),
      elapsed_ms: result.elapsedMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403].includes(error?.status) && error?.code !== 'AI_GATEWAY_REQUEST_FAILED') {
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
      gateway_auth_source: error?.authSource || null,
      api_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
      diagnostic: {
        error_name: error?.name || null,
        error_code: error?.code || null,
        gateway_status: error?.status || null,
        safe_message: String(error?.message || 'research_canary_failed').slice(0, 220),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method === 'GET') {
    return runGatewayHealth(response);
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
