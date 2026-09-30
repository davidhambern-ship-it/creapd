import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireBase44User } from '../../../server/base44Auth.js';
import { requireNeonUser } from '../../../server/neonAuth.js';

const CREAPD_NEON_AUTH_URL =
  process.env.NEON_AUTH_URL ||
  'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

const BERNAVERSE_ORIGIN = 'https://bernaverse.hireberna.app';

function setBernaverseCors(request, response) {
  const origin = String(request.headers?.origin || '');
  if (origin === BERNAVERSE_ORIGIN) {
    response.setHeader('Access-Control-Allow-Origin', BERNAVERSE_ORIGIN);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

async function provisionCreapdNeonAccount(request, response) {
  const origin = String(request.headers?.origin || '');
  if (origin !== BERNAVERSE_ORIGIN) {
    return response.status(403).json({
      ok: false,
      service: 'creapd-auth',
      error: 'bernaverse_origin_required',
    });
  }

  const body =
    typeof request.body === 'string'
      ? JSON.parse(request.body || '{}')
      : (request.body || {});
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  const name = String(body?.name || email.split('@')[0] || 'Creator').trim();

  if (!email || password.length < 6) {
    return response.status(400).json({
      ok: false,
      service: 'creapd-auth',
      error: 'valid_email_and_password_required',
    });
  }

  const upstream = await fetch(`${CREAPD_NEON_AUTH_URL}/sign-up/email`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  });

  const payload = await upstream.json().catch(() => ({}));
  const message = String(
    payload?.message ||
    payload?.error?.message ||
    ''
  );

  if (!upstream.ok) {
    if (/already|exist|registered|email/i.test(message)) {
      return response.status(200).json({
        ok: true,
        service: 'creapd-auth',
        existing: true,
      });
    }

    return response.status(upstream.status).json({
      ok: false,
      service: 'creapd-auth',
      error: message || 'CREAPD account provisioning failed.',
    });
  }

  return response.status(200).json({
    ok: true,
    service: 'creapd-auth',
    existing: false,
  });
}

export const config = {
  maxDuration: 10,
};

function getDisplayName(user) {
  return user?.full_name || user?.display_name || user?.name || null;
}

function getRequestedAuthProvider(request) {
  const raw = request.headers?.['x-creapd-auth-provider'] || request.headers?.['X-CREAPD-Auth-Provider'];
  return String(raw || 'base44').trim().toLowerCase();
}

function getSafeErrorMessage(error) {
  const raw = String(error?.message || 'unknown_error');
  return raw
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-database-url]')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted-token]')
    .slice(0, 240);
}

function buildIdentityPayload(identitySource, userId, verifiedAt) {
  const payload = {
    backend_auth_bridge: true,
    last_verified_at: verifiedAt,
    last_identity_source: identitySource,
  };

  if (identitySource === 'neon') {
    payload.neon_auth_user_id = String(userId);
    payload.neon_last_verified_at = verifiedAt;
  } else if (identitySource === 'base44') {
    payload.base44_user_id = String(userId);
    payload.base44_last_verified_at = verifiedAt;
  }

  return payload;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  setBernaverseCors(request, response);

  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  if (request.method === 'POST') {
    try {
      return await provisionCreapdNeonAccount(request, response);
    } catch (error) {
      console.error('[CREAPD BERNAverse provision]', error);
      return response.status(503).json({
        ok: false,
        service: 'creapd-auth',
        error: error?.message || 'CREAPD provisioning is unavailable.',
      });
    }
  }

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET, POST, OPTIONS');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-auth',
      error: 'database_not_configured',
    });
  }

  let stage = 'initialize';

  try {
    const provider = getRequestedAuthProvider(request);
    const sql = getSql();
    const verifiedAt = new Date().toISOString();

    let user;
    let identitySource;
    let displayName;

    if (provider === 'neon') {
      stage = 'verify_neon_jwt';
      const neonIdentity = await requireNeonUser(request);

      stage = 'lookup_neon_auth_user';
      const [authUser] = await sql`
        SELECT id, email, name
        FROM neon_auth.user
        WHERE id = ${neonIdentity.id}
        LIMIT 1
      `;

      if (!authUser) {
        const error = new Error('Authenticated Neon user not found');
        error.status = 401;
        error.code = 'AUTH_USER_NOT_RESOLVED';
        throw error;
      }

      user = {
        id: authUser.id,
        email: authUser.email || neonIdentity.email || null,
        name: authUser.name || null,
      };
      identitySource = 'neon';
      displayName = getDisplayName(user);
    } else if (provider === 'base44') {
      stage = 'verify_base44_user';
      user = await requireBase44User(request);
      identitySource = 'base44';
      displayName = getDisplayName(user);
    } else {
      return response.status(400).json({
        ok: false,
        service: 'creapd-auth',
        error: 'unsupported_auth_provider',
      });
    }

    const identityPayload = buildIdentityPayload(identitySource, user.id, verifiedAt);

    stage = 'resolve_canonical_creapd_user';
    let canonicalUser = null;

    if (user.email) {
      [canonicalUser] = await sql`
        SELECT id, source_system
        FROM creapd.users
        WHERE id = ${String(user.id)}
           OR LOWER(email) = LOWER(${user.email})
        ORDER BY (id = ${String(user.id)}) DESC
        LIMIT 1
      `;
    } else {
      [canonicalUser] = await sql`
        SELECT id, source_system
        FROM creapd.users
        WHERE id = ${String(user.id)}
        LIMIT 1
      `;
    }

    const canonicalUserId = canonicalUser?.id || String(user.id);
    const canonicalSourceSystem = canonicalUser?.source_system || identitySource;

    stage = 'upsert_creapd_user';
    const [bridgedUser] = await sql`
      INSERT INTO creapd.users (
        id,
        email,
        display_name,
        source_system,
        source_payload,
        created_at,
        updated_at
      )
      VALUES (
        ${canonicalUserId},
        ${user.email || null},
        ${displayName},
        ${canonicalSourceSystem},
        ${JSON.stringify(identityPayload)}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, creapd.users.display_name),
        source_payload = COALESCE(creapd.users.source_payload, '{}'::jsonb) || EXCLUDED.source_payload,
        updated_at = NOW()
      RETURNING id, email, display_name, source_system, source_payload, updated_at
    `;

    stage = 'complete';
    return response.status(200).json({
      ok: true,
      service: 'creapd-auth',
      identity_source: identitySource,
      data_authority: 'neon',
      canonical_user_id: bridgedUser.id,
      user: bridgedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error?.status === 401) {
      return response.status(401).json({
        ok: false,
        service: 'creapd-auth',
        error: error.code || 'authentication_required',
        diagnostic: {
          stage,
          error_name: error?.name || null,
          error_code: error?.code || null,
          safe_message: getSafeErrorMessage(error),
        },
      });
    }

    console.error('[CREAPD AUTH BRIDGE]', { stage, error });
    return response.status(503).json({
      ok: false,
      service: 'creapd-auth',
      error: 'auth_bridge_failed',
      diagnostic: {
        stage,
        error_name: error?.name || null,
        error_code: error?.code || null,
        safe_message: getSafeErrorMessage(error),
      },
    });
  }
}
