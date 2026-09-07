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

  try {
    const provider = getRequestedAuthProvider(request);
    const sql = getSql();
    const verifiedAt = new Date().toISOString();

    let user;
    let identitySource;
    let displayName;

    if (provider === 'neon') {
      const neonIdentity = await requireNeonUser(request);
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
        ${user.id},
        ${user.email || null},
        ${displayName},
        ${identitySource},
        ${JSON.stringify({
          backend_auth_bridge: true,
          last_verified_at: verifiedAt,
        })}::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        source_system = EXCLUDED.source_system,
        source_payload = COALESCE(creapd.users.source_payload, '{}'::jsonb) || EXCLUDED.source_payload,
        updated_at = NOW()
      RETURNING id, email, display_name, source_system, updated_at
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-auth',
      identity_source: identitySource,
      data_authority: 'neon',
      user: bridgedUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error?.status === 401) {
      return response.status(401).json({
        ok: false,
        service: 'creapd-auth',
        error: error.code || 'authentication_required',
      });
    }

    console.error('[CREAPD AUTH BRIDGE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-auth',
      error: 'auth_bridge_failed',
    });
  }
}
