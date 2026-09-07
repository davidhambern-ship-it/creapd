import { appParams } from '@/lib/app-params';
import { neonAuth, shouldUseNeonAuth } from '@/api/neonAuthClient';

function getStoredBase44Token() {
  if (typeof window === 'undefined') return appParams.token || null;

  return (
    appParams.token ||
    window.localStorage?.getItem('base44_access_token') ||
    window.localStorage?.getItem('token') ||
    null
  );
}

async function getAuthContext() {
  if (shouldUseNeonAuth()) {
    // Neon Auth exposes the JWT explicitly for calls to external/owned APIs.
    // Do not depend on the shape of getSession().session for this token.
    const jwtToken = typeof neonAuth.getJWTToken === 'function'
      ? await neonAuth.getJWTToken()
      : null;

    // Compatibility fallback for older client/session shapes.
    let fallbackToken = null;
    if (!jwtToken) {
      const sessionResult = await neonAuth.getSession();
      fallbackToken = sessionResult?.data?.session?.access_token || null;
    }

    return {
      provider: 'neon',
      token: jwtToken || fallbackToken,
    };
  }

  return {
    provider: 'base44',
    token: getStoredBase44Token(),
  };
}

async function request(path, options = {}) {
  const auth = await getAuthContext();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');
  headers.set('X-CREAPD-Auth-Provider', auth.provider);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const response = await fetch(`/api/creapd${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(data?.error || `CREAPD API request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const creapdApi = {
  get(path) {
    return request(path, { method: 'GET' });
  },
  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },
  request,
};

export { getStoredBase44Token, getAuthContext };
