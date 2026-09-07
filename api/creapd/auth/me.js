import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireBase44User } from '../../../server/base44Auth.js';

export const config = {
  maxDuration: 10,
};

function getDisplayName(user) {
  return user?.full_name || user?.display_name || user?.name || null;
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
    const user = await requireBase44User(request);
    const sql = getSql();
    const displayName = getDisplayName(user);
    const verifiedAt = new Date().toISOString();

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
        'base44',
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
        source_system = 'base44',
        source_payload = COALESCE(creapd.users.source_payload, '{}'::jsonb) || EXCLUDED.source_payload,
        updated_at = NOW()
      RETURNING id, email, display_name, source_system, updated_at
    `;

    return response.status(200).json({
      ok: true,
      service: 'creapd-auth',
      identity_source: 'base44',
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
