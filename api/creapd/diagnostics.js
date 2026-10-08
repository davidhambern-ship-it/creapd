import { getSql, hasDatabaseConfig } from '../../server/db.js';
import { requireCreapdUser } from '../../server/creapdUser.js';
import {
  generateStructuredGatewayResponse,
  DEFAULT_MODEL,
  configuredProvider,
} from '../../server/aiGateway.js';

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

function inspectDatabaseUrl() {
  const value = process.env.DATABASE_URL || '';
  const summary = {
    present: Boolean(value),
    protocol_valid: false,
    parseable: false,
    neon_host: false,
    database_name_present: false,
    role_name: null,
    password_present: false,
    password_length: 0,
    password_looks_masked: false,
    sslmode: null,
    contains_whitespace: /\s/.test(value),
  };

  if (!value) return summary;

  summary.protocol_valid =
    value.startsWith('postgresql://') || value.startsWith('postgres://');

  try {
    const parsed = new URL(value);
    const password = decodeURIComponent(parsed.password || '');

    summary.parseable = true;
    summary.neon_host = parsed.hostname.endsWith('.neon.tech');
    summary.database_name_present = Boolean(parsed.pathname && parsed.pathname !== '/');
    summary.role_name = parsed.username || null;
    summary.password_present = Boolean(password);
    summary.password_length = password.length;
    summary.password_looks_masked = Boolean(password) && /^\*+$/.test(password);
    summary.sslmode = parsed.searchParams.get('sslmode');
  } catch {
    // Never expose the connection string.
  }

  return summary;
}

function safeDatabaseDiagnostic(error) {
  const code = typeof error?.code === 'string' ? error.code : null;
  const name = typeof error?.name === 'string' ? error.name : 'Error';
  const rawMessage = typeof error?.message === 'string' ? error.message : '';
  const message = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s'"@]+@/gi, 'postgresql://***:***@')
    .replace(/password=[^\s&]+/gi, 'password=***')
    .slice(0, 240);

  let category = 'unknown_connection_error';

  if (code === 'ERR_INVALID_URL' || /invalid url/i.test(rawMessage)) {
    category = 'invalid_database_url';
  } else if (code === '28P01' || /password authentication failed/i.test(rawMessage)) {
    category = 'authentication_failed';
  } else if (code === '3D000' || /database .* does not exist/i.test(rawMessage)) {
    category = 'database_not_found';
  } else if (/fetch failed|network|connect|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(rawMessage)) {
    category = 'network_or_transport_failed';
  } else if (/ssl|certificate|tls/i.test(rawMessage)) {
    category = 'ssl_or_tls_failed';
  }

  return {
    category,
    error_name: name,
    error_code: code,
    safe_message: message || null,
    database_url: inspectDatabaseUrl(),
  };
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
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
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

async function backendHealth(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  return response.status(200).json({
    ok: true,
    service: 'creapd-backend',
    runtime: 'vercel-function',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    deployment: process.env.VERCEL_URL || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    timestamp: new Date().toISOString(),
  });
}

async function databaseHealth(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-database',
      error: 'database_not_configured',
      required_environment_variable: 'DATABASE_URL',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const sql = getSql();
    const [result] = await sql`
      SELECT
        1 AS connected,
        NOW() AS database_time
    `;

    return response.status(200).json({
      ok: result?.connected === 1,
      service: 'creapd-database',
      connected: result?.connected === 1,
      database_time: result?.database_time || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CREAPD DB HEALTH]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-database',
      error: 'database_connection_failed',
      diagnostic: safeDatabaseDiagnostic(error),
      timestamp: new Date().toISOString(),
    });
  }
}

async function runAiHealth(response) {
  const readiness = providerReadiness();

  return response
    .status(readiness.configured || readiness.provider === 'vercel' ? 200 : 503)
    .json({
      ok: readiness.configured || readiness.provider === 'vercel',
      service: 'creapd-ai',
      ...readiness,
      free_first_mode: readiness.provider === 'gemini',
      timestamp: new Date().toISOString(),
    });
}

async function runResearchCanary(request, response) {
  try {
    const { provider: authProvider } = await requireCreapdUser(request);
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
    if (
      [400, 401, 403].includes(error?.status) &&
      !['AI_GATEWAY_REQUEST_FAILED', 'GEMINI_REQUEST_FAILED'].includes(error?.code)
    ) {
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

async function aiHealth(request, response) {
  if (request.method === 'GET') {
    return runAiHealth(response);
  }

  if (request.method === 'POST') {
    const body =
      request.body && typeof request.body === 'object' ? request.body : {};

    if (body.action !== 'research_canary') {
      return response.status(400).json({ ok: false, error: 'invalid_action' });
    }

    return runResearchCanary(request, response);
  }

  response.setHeader('Allow', 'GET, POST');
  return response.status(405).json({ ok: false, error: 'method_not_allowed' });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  const probe = String(request.query?.probe || 'backend').toLowerCase();

  if (probe === 'backend') return backendHealth(request, response);
  if (probe === 'db') return databaseHealth(request, response);
  if (probe === 'ai') return aiHealth(request, response);

  return response.status(404).json({
    ok: false,
    error: 'unknown_diagnostic_probe',
  });
}
