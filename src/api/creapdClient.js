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
    // The Neon session already contains the signed JWT. Reading it directly
    // avoids a second SDK session lookup through getJWTToken(), which currently
    // fails in this beta client with an invalid fetch-method error.
    const sessionResult = await neonAuth.getSession();
    const session = sessionResult?.data?.session;
    const token =
      session?.token ||
      session?.access_token ||
      session?.accessToken ||
      null;

    return {
      provider: 'neon',
      token,
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

function normalizeGetPath(path) {
  if (path === '/talk/production') {
    return '/production/core?studio=talk';
  }
  if (path.startsWith('/talk/production?')) {
    const query = path.slice('/talk/production?'.length);
    return `/production/core?studio=talk&${query}`;
  }
  return path;
}

function normalizePost(path, body = {}) {
  if (path === '/talk/configuration') {
    return {
      path: '/production/core',
      body: {
        action: 'talk_save_configuration',
        configuration: body,
      },
    };
  }

  if (path === '/talk/production') {
    const actionMap = {
      build: 'talk_build',
      refresh: 'talk_refresh',
      set_topic_status: 'talk_set_topic_status',
      create_guest: 'talk_create_guest',
      update_guest: 'talk_update_guest',
      delete_guest: 'talk_delete_guest',
      set_asset_status: 'talk_set_asset_status',
      set_segment_status: 'talk_set_segment_status',
      start_session: 'talk_start_session',
      session_event: 'talk_session_event',
    };
    return {
      path: '/production/core',
      body: {
        ...body,
        action: actionMap[body?.action] || body?.action,
      },
    };
  }

  return { path, body };
}

export const creapdApi = {
  get(path) {
    return request(normalizeGetPath(path), { method: 'GET' });
  },
  post(path, body) {
    const normalized = normalizePost(path, body ?? {});
    return request(normalized.path, {
      method: 'POST',
      body: JSON.stringify(normalized.body),
    });
  },
  request,
};

export { getStoredBase44Token, getAuthContext };
