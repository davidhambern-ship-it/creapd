export const config = {
  maxDuration: 10,
};

const TARGET_MODEL = 'openai/gpt-5.6-luna';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || null;

  if (!gatewayToken) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-ai-gateway',
      error: 'gateway_auth_not_available',
      oidc_present: Boolean(process.env.VERCEL_OIDC_TOKEN),
      api_key_present: Boolean(process.env.AI_GATEWAY_API_KEY),
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
      auth_source: process.env.AI_GATEWAY_API_KEY ? 'api_key' : 'vercel_oidc',
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
      target_model: TARGET_MODEL,
      timestamp: new Date().toISOString(),
    });
  }
}
