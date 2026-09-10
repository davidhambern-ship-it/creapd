import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Do not pass a fixed constructor token here. The Base44 SDK can read the
// current token from storage, which avoids closing over a stale token after a
// login/session transition.
export const base44 = createClient({
  appId,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

export function syncBase44AuthToken() {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const latestToken = window.localStorage.getItem('base44_access_token')
    || window.localStorage.getItem('token');

  if (latestToken) {
    // Update the SDK's entity/integration clients without rewriting storage.
    base44.auth.setToken(latestToken, false);
  }

  return latestToken;
}

export async function requireBase44Session() {
  const token = syncBase44AuthToken();

  if (!token) {
    const error = new Error('Your CREAPD session has expired. Sign in again to continue research.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  try {
    return await base44.auth.me();
  } catch (error) {
    const status = error?.status || error?.response?.status;

    if (status === 401 || status === 403) {
      const authError = new Error('Your CREAPD session has expired. Redirecting you to sign in again…');
      authError.code = 'AUTH_REQUIRED';
      throw authError;
    }

    const sessionError = new Error(error?.message || 'CREAPD could not verify your session. Check your connection and try again.');
    sessionError.code = 'SESSION_CHECK_FAILED';
    sessionError.cause = error;
    throw sessionError;
  }
}
