const DEFAULT_NEON_AUTH_URL = 'https://ep-green-king-awdola9h.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL;

export const config = {
  maxDuration: 10,
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const jwksUrl = `${NEON_AUTH_URL}/.well-known/jwks.json`;

  try {
    const result = await fetch(jwksUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    let body = null;
    try {
      body = await result.json();
    } catch {
      body = null;
    }

    return response.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      service: 'creapd-auth-jwks',
      neon_auth_host: new URL(NEON_AUTH_URL).host,
      jwks_http_status: result.status,
      key_count: Array.isArray(body?.keys) ? body.keys.length : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-auth-jwks',
      error: 'jwks_fetch_failed',
      error_name: error?.name || null,
      timestamp: new Date().toISOString(),
    });
  }
}
