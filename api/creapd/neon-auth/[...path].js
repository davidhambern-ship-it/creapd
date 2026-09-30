const CREAPD_NEON_AUTH_URL =
  process.env.NEON_AUTH_URL ||
  'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

function rewriteCookie(cookie) {
  const raw = String(cookie || '');
  if (!raw) return raw;

  let next = raw
    .replace(/;\s*Domain=[^;]+/ig, '')
    .replace(/;\s*Path=[^;]+/ig, '; Path=/');

  if (!/;\s*Path=/i.test(next)) next += '; Path=/';
  return next;
}

function rawBody(request) {
  if (request.body == null) return undefined;
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

export const config = {
  maxDuration: 10,
};

export default async function handler(request, response) {
  const pathParts = Array.isArray(request.query?.path)
    ? request.query.path
    : [request.query?.path].filter(Boolean);

  const suffix = '/' + pathParts.map((part) => encodeURIComponent(String(part))).join('/');
  const upstreamUrl = new URL(CREAPD_NEON_AUTH_URL + suffix);

  for (const [key, value] of Object.entries(request.query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) {
      for (const item of value) upstreamUrl.searchParams.append(key, String(item));
    } else if (value != null) {
      upstreamUrl.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'authorization', 'cookie', 'user-agent']) {
    const value = request.headers?.[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
  }

  const browserOrigin = String(request.headers?.origin || '');
  const browserReferer = String(request.headers?.referer || '');
  if (browserOrigin) headers.set('origin', browserOrigin);
  if (browserReferer) headers.set('referer', browserReferer);

  const method = String(request.method || 'GET').toUpperCase();
  const body = ['GET', 'HEAD'].includes(method) ? undefined : rawBody(request);

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      redirect: 'manual',
    });

    for (const name of ['content-type', 'cache-control', 'location', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value) response.setHeader(name, value);
    }

    const setCookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []);

    if (setCookies.length) {
      response.setHeader('Set-Cookie', setCookies.filter(Boolean).map(rewriteCookie));
    }

    response.setHeader('Cache-Control', 'no-store');
    const payload = Buffer.from(await upstream.arrayBuffer());
    response.status(upstream.status).send(payload);
  } catch (error) {
    console.error('[CREAPD Neon Auth proxy]', error);
    response.status(503).json({
      error: 'creapd_auth_proxy_unavailable',
      message: error?.message || 'CREAPD authentication is unavailable.',
    });
  }
}
