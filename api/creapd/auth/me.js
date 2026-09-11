import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireBase44User } from '../../../server/base44Auth.js';
import { requireNeonUser } from '../../../server/neonAuth.js';

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

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
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
