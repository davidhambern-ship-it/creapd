import { createHmac } from 'node:crypto';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';

const CREAPD_NEON_AUTH_URL =
  process.env.NEON_AUTH_URL ||
  'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

const BERNAVERSE_SSO_URL =
  process.env.BERNAVERSE_SSO_URL ||
  'https://emexrsuuazbowxxwvalj.supabase.co/functions/v1/bernaverse-sso';

const SSO_ADMIN_EMAIL =
  String(process.env.CREAPD_SSO_ADMIN_EMAIL || 'bernaverse-sso@hireberna.app')
    .trim()
    .toLowerCase();

let ssoAdminCookie = '';
let ssoAdminCookieAt = 0;
const SSO_ADMIN_COOKIE_TTL_MS = 45 * 60 * 1000;

function requestOrigin(request) {
  const forwardedProto = String(request.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(request.headers?.host || '');
  return `${forwardedProto}://${host}`;
}

function safeReturnUrl(request, rawReturn) {
  const origin = requestOrigin(request);
  const fallback = new URL('/login?sso=1', origin);

  try {
    const candidate = new URL(String(rawReturn || fallback.toString()));
    if (
      candidate.protocol === 'https:' &&
      candidate.hostname === new URL(origin).hostname
    ) {
      return candidate.toString();
    }
  } catch {}

  return fallback.toString();
}

function failureUrl(request, code) {
  const url = new URL('/login', requestOrigin(request));
  url.searchParams.set('sso', String(code || 'error'));
  return url.toString();
}

function rewriteCookie(cookie) {
  const raw = String(cookie || '');
  if (!raw) return raw;

  let next = raw
    .replace(/;\s*Domain=[^;]+/ig, '')
    .replace(/;\s*Path=[^;]+/ig, '; Path=/');

  if (!/;\s*Path=/i.test(next)) next += '; Path=/';
  return next;
}

function redirect(response, location, cookies = []) {
  response.setHeader('Location', location);
  response.setHeader('Cache-Control', 'no-store');
  if (cookies.length) response.setHeader('Set-Cookie', cookies);
  return response.status(302).end();
}

function getSsoSecret() {
  const secret =
    String(process.env.CREAPD_SSO_SECRET || '').trim() ||
    String(process.env.DATABASE_URL || '').trim();

  if (!secret) {
    throw new Error('CREAPD SSO secret is unavailable.');
  }

  return secret;
}

function deriveInternalPassword(memberId) {
  const digest = createHmac('sha256', getSsoSecret())
    .update(`creapd:${memberId}`)
    .digest('base64url');

  return `Bv!${digest}9a`;
}

function deriveAdminPassword() {
  const digest = createHmac('sha256', getSsoSecret())
    .update('creapd:bernaverse-sso-admin')
    .digest('base64url');

  return `BvAdmin!${digest}9a`;
}

async function exchangeTicket(ticket) {
  const upstream = await fetch(BERNAVERSE_SSO_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'consume_public',
      app: 'creapd',
      ticket,
    }),
  });

  const payload = await upstream.json().catch(() => ({}));
  if (!upstream.ok || !payload?.data?.email || !payload?.data?.member_id) {
    const error = new Error(
      payload?.error || 'BERNAverse SSO ticket could not be verified.',
    );
    error.status = upstream.status;
    throw error;
  }

  return payload.data;
}

async function neonEmailAuth(path, body, browserOrigin) {
  const upstream = await fetch(`${CREAPD_NEON_AUTH_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: browserOrigin,
      Referer: `${browserOrigin}/`,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });

  const payload = await upstream.json().catch(() => ({}));
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []);

  const rawSetCookies = setCookies.filter(Boolean);

  return {
    upstream,
    payload,
    rawSetCookies,
    cookieHeader: rawSetCookies
      .map((value) => String(value || '').split(';', 1)[0])
      .filter(Boolean)
      .join('; '),
    setCookies: rawSetCookies.map(rewriteCookie),
  };
}

async function promoteSsoAdmin() {
  if (!hasDatabaseConfig()) {
    throw new Error('CREAPD database is not configured.');
  }

  const sql = getSql();
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'neon_auth'
      AND table_name = 'user'
  `;

  const names = new Set(columns.map((row) => String(row.column_name || '')));
  if (!names.has('role')) {
    throw new Error('CREAPD Neon Auth admin role is unavailable.');
  }

  if (names.has('emailVerified')) {
    await sql`
      UPDATE neon_auth.user
      SET role = 'admin',
          "emailVerified" = true
      WHERE LOWER(email) = LOWER(${SSO_ADMIN_EMAIL})
    `;
  } else {
    await sql`
      UPDATE neon_auth.user
      SET role = 'admin'
      WHERE LOWER(email) = LOWER(${SSO_ADMIN_EMAIL})
    `;
  }
}

async function getSsoAdminCookie({ force = false, browserOrigin } = {}) {
  if (
    !force &&
    ssoAdminCookie &&
    Date.now() - ssoAdminCookieAt < SSO_ADMIN_COOKIE_TTL_MS
  ) {
    return ssoAdminCookie;
  }

  const adminPassword = deriveAdminPassword();
  const origin = browserOrigin || 'https://project-1nufq-git-backend-vercel-foundation-texasnomadgames.vercel.app';

  let signIn = await neonEmailAuth(
    '/sign-in/email',
    { email: SSO_ADMIN_EMAIL, password: adminPassword },
    origin,
  );

  if (!signIn.upstream.ok) {
    const signUp = await neonEmailAuth(
      '/sign-up/email',
      {
        email: SSO_ADMIN_EMAIL,
        password: adminPassword,
        name: 'BERNAverse SSO',
      },
      origin,
    );

    if (!signUp.upstream.ok) {
      const message = String(
        signUp.payload?.message ||
        signUp.payload?.error?.message ||
        '',
      );

      if (!/already|exist|registered|email/i.test(message)) {
        throw new Error(
          message || `CREAPD SSO admin provisioning failed (${signUp.upstream.status}).`,
        );
      }
    }
  }

  await promoteSsoAdmin();

  signIn = await neonEmailAuth(
    '/sign-in/email',
    { email: SSO_ADMIN_EMAIL, password: adminPassword },
    origin,
  );

  if (!signIn.upstream.ok || !signIn.cookieHeader) {
    const message = String(
      signIn.payload?.message ||
      signIn.payload?.error?.message ||
      '',
    );
    throw new Error(
      message || `CREAPD SSO admin sign-in failed (${signIn.upstream.status}).`,
    );
  }

  ssoAdminCookie = signIn.cookieHeader;
  ssoAdminCookieAt = Date.now();
  return ssoAdminCookie;
}

async function neonAdmin(path, body, cookieHeader, browserOrigin) {
  const upstream = await fetch(`${CREAPD_NEON_AUTH_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      Origin: browserOrigin,
      Referer: `${browserOrigin}/`,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });

  const payload = await upstream.json().catch(() => ({}));
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []);

  return {
    upstream,
    payload,
    setCookies: setCookies.filter(Boolean).map(rewriteCookie),
  };
}

async function impersonateExistingUser(userId, browserOrigin) {
  let cookie = await getSsoAdminCookie({ browserOrigin });
  let result = await neonAdmin(
    '/admin/impersonate-user',
    { userId },
    cookie,
    browserOrigin,
  );

  if ([401, 403].includes(result.upstream.status)) {
    ssoAdminCookie = '';
    ssoAdminCookieAt = 0;
    cookie = await getSsoAdminCookie({ force: true, browserOrigin });
    result = await neonAdmin(
      '/admin/impersonate-user',
      { userId },
      cookie,
      browserOrigin,
    );
  }

  if (!result.upstream.ok || !result.setCookies.length) {
    const message = String(
      result.payload?.message ||
      result.payload?.error?.message ||
      result.payload?.error ||
      '',
    );

    throw new Error(
      message || `CREAPD existing-account SSO failed (${result.upstream.status}).`,
    );
  }

  return result;
}

async function existingNeonUserByEmail(email) {
  if (!hasDatabaseConfig()) return null;
  const sql = getSql();
  const [row] = await sql`
    SELECT id, email
    FROM neon_auth.user
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `;
  return row || null;
}

export const config = {
  maxDuration: 10,
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const ticket = String(request.query?.ticket || '').trim();
  const returnUrl = safeReturnUrl(request, request.query?.return);

  if (!ticket) {
    return redirect(response, failureUrl(request, 'invalid'));
  }

  let identity;
  try {
    identity = await exchangeTicket(ticket);
  } catch (error) {
    console.warn('[CREAPD BERNAverse SSO] ticket rejected:', error?.message || error);
    return redirect(response, failureUrl(request, 'invalid'));
  }

  const email = String(identity.email || '').trim().toLowerCase();
  const memberId = String(identity.member_id || '').trim();
  const name = String(identity.display_name || email.split('@')[0] || 'Creator').slice(0, 120);
  const origin = requestOrigin(request);

  let password;
  try {
    password = deriveInternalPassword(memberId);
  } catch (error) {
    console.error('[CREAPD BERNAverse SSO] configuration error:', error?.message || error);
    return redirect(response, failureUrl(request, 'unavailable'));
  }

  let signIn = await neonEmailAuth('/sign-in/email', { email, password }, origin);

  if (!signIn.upstream.ok) {
    const existing = await existingNeonUserByEmail(email).catch(() => null);

    if (existing?.id) {
      // Preserve the existing password. BERNAverse creates a short-lived
      // CREAPD Preview session through Neon Auth's Admin impersonation API.
      try {
        const impersonation = await impersonateExistingUser(existing.id, origin);
        return redirect(response, returnUrl, impersonation.setCookies);
      } catch (impersonationError) {
        console.error(
          '[CREAPD BERNAverse SSO] existing-account handoff failed:',
          impersonationError?.message || impersonationError,
        );
        return redirect(response, failureUrl(request, 'legacy'));
      }
    }

    const signUp = await neonEmailAuth(
      '/sign-up/email',
      { email, password, name },
      origin,
    );

    if (!signUp.upstream.ok) {
      const message = String(
        signUp.payload?.message ||
        signUp.payload?.error?.message ||
        '',
      );

      console.warn('[CREAPD BERNAverse SSO] account creation failed:', {
        status: signUp.upstream.status,
        message: message.slice(0, 180),
      });

      return redirect(
        response,
        failureUrl(request, /already|exist|registered|email/i.test(message) ? 'legacy' : 'setup'),
      );
    }

    signIn = await neonEmailAuth('/sign-in/email', { email, password }, origin);
  }

  if (!signIn.upstream.ok) {
    console.warn('[CREAPD BERNAverse SSO] internal sign-in failed:', {
      status: signIn.upstream.status,
    });
    return redirect(response, failureUrl(request, 'setup'));
  }

  return redirect(response, returnUrl, signIn.setCookies);
}
