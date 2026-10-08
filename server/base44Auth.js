import { createClient } from '@base44/sdk';

const BASE44_APP_ID = process.env.BASE44_APP_ID || '6a4126962e5804304cc84b12';

export function getBearerToken(request) {
  const authorization = request.headers?.authorization || request.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

export async function requireBase44User(request) {
  const token = getBearerToken(request);

  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  try {
    const client = createClient({
      appId: BASE44_APP_ID,
      token,
    });

    const user = await client.auth.me();
    if (!user?.id) {
      const error = new Error('Authenticated user could not be resolved');
      error.status = 401;
      error.code = 'AUTH_USER_NOT_RESOLVED';
      throw error;
    }

    return user;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.response?.status === 401 || error?.response?.status === 403) {
      const authError = new Error('Authentication required');
      authError.status = 401;
      authError.code = 'AUTH_INVALID';
      throw authError;
    }
    throw error;
  }
}
