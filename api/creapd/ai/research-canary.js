import { requireCreapdUser } from '../../../server/creapdUser.js';
import { generateStructuredGatewayResponse } from '../../../server/aiGateway.js';

export const config = {
  maxDuration: 60,
};

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

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const { user, provider } = await requireCreapdUser(request);
    const result = await generateStructuredGatewayResponse({
      webSearch: true,
      schemaName: 'creapd_research_canary',
      schema: canarySchema,
      maxOutputTokens: 500,
      prompt: [
        'You are testing CREAPD\'s research backend.',
        'Use live web search for this request.',
        'Find one factual statement from Vercel\'s current official documentation about AI Gateway web search or AI Gateway models.',
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
    if ([400, 401, 403].includes(error?.status)) {
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
