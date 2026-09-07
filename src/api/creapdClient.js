import { appParams } from '@/lib/app-params';

function getStoredBase44Token() {
  if (typeof window === 'undefined') return appParams.token || null;

  return (
    appParams.token ||
    window.localStorage?.getItem('base44_access_token') ||
    window.localStorage?.getItem('token') ||
    null
  );
}

async function request(path, options = {}) {
  const token = getStoredBase44Token();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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

export { getStoredBase44Token };
