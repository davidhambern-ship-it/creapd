import { getSql } from './db.js';
import { requireBase44User } from './base44Auth.js';
import { requireNeonUser } from './neonAuth.js';

function getRequestedAuthProvider(request) {
  const raw = request.headers?.['x-creapd-auth-provider'] || request.headers?.['X-CREAPD-Auth-Provider'];
  return String(raw || 'base44').trim().toLowerCase();
}

function authError(message, code = 'AUTH_USER_NOT_RESOLVED', status = 401) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Verifies the caller with the selected identity provider and resolves that
 * external identity to CREAPD's canonical user row. During migration a Neon
 * Auth UUID and a legacy Base44 ID may represent the same person, so verified
 * email is the stable bridge while the existing CREAPD user ID remains intact.
 */
export async function requireCreapdUser(request) {
  const sql = getSql();
  const provider = getRequestedAuthProvider(request);

  let externalUser;

  if (provider === 'neon') {
    const neonIdentity = await requireNeonUser(request);
    const [authUser] = await sql`
      SELECT id, email, name
      FROM neon_auth.user
      WHERE id = ${neonIdentity.id}
      LIMIT 1
    `;

    if (!authUser) {
      throw authError('Authenticated Neon user not found');
    }

    externalUser = {
      id: String(authUser.id),
      email: authUser.email || neonIdentity.email || null,
      display_name: authUser.name || null,
    };
  } else if (provider === 'base44') {
    const base44User = await requireBase44User(request);
    externalUser = {
      id: String(base44User.id),
      email: base44User.email || null,
      display_name: base44User.full_name || base44User.display_name || base44User.name || null,
    };
  } else {
    throw authError('Unsupported authentication provider', 'UNSUPPORTED_AUTH_PROVIDER', 400);
  }

  const [canonicalUser] = await sql`
    SELECT id, email, display_name, source_system, source_payload, created_at, updated_at
    FROM creapd.users
    WHERE id = ${externalUser.id}
       OR lower(email) = lower(${externalUser.email || ''})
    ORDER BY CASE WHEN id = ${externalUser.id} THEN 0 ELSE 1 END
    LIMIT 1
  `;

  if (!canonicalUser) {
    throw authError('Authenticated identity is not linked to a CREAPD user', 'CREAPD_USER_NOT_LINKED', 403);
  }

  return {
    provider,
    externalUser,
    user: canonicalUser,
  };
}

export { getRequestedAuthProvider };
