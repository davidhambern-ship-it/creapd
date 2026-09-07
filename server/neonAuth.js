import { createRemoteJWKSet, jwtVerify } from 'jose';

const DEFAULT_NEON_AUTH_URL = 'https://ep-green-king-awdola9h.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL;
const JWKS_URL = `${NEON_AUTH_URL}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

function getBearerToken(request) {
  const authorization = request.headers?.authorization || request.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

export async function requireNeonUser(request) {
  const token = getBearerToken(request);

  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
      clockTolerance: 5,
    });

    if (!payload?.sub) {
      const error = new Error('Authenticated user could not be resolved');
      error.status = 401;
      error.code = 'AUTH_USER_NOT_RESOLVED';
      throw error;
    }

    return {
      id: String(payload.sub),
      email: payload.email ? String(payload.email) : null,
      role: payload.role ? String(payload.role) : null,
      jwt: {
        alg: protectedHeader?.alg || null,
        kid: protectedHeader?.kid || null,
        issuer: payload.iss || null,
      },
    };
  } catch (error) {
    if (error?.status === 401) throw error;

    const authError = new Error('Authentication required');
    authError.status = 401;
    authError.code = 'AUTH_INVALID';
    throw authError;
  }
}
