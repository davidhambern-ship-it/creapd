import { appParams } from '@/lib/app-params';
import { neonAuth, shouldUseNeonAuth } from '@/api/neonAuthClient';

const liveReadCache = new Map();
const liveReadInFlight = new Map();

function getStoredBase44Token() {
  if (typeof window === 'undefined') return appParams.token || null;

  return (
    appParams.token ||
    window.localStorage?.getItem('base44_access_token') ||
    window.localStorage?.getItem('token') ||
    null
  );
}

function isTalkLivePage() {
  return typeof window !== 'undefined' && window.location?.pathname === '/talk/live';
}

function livePollTtl(kind) {
  if (typeof document !== 'undefined' && document.hidden) {
    return kind === 'bridge' ? 10000 : 15000;
  }
  return kind === 'bridge' ? 2000 : 3000;
}

function clearLiveReadCache() {
  liveReadCache.clear();
}

function cacheKeyForGet(path) {
  if (!isTalkLivePage()) return null;
  if (!path.startsWith('/production/core?')) return null;
  const query = path.slice(path.indexOf('?') + 1);
  const params = new URLSearchParams(query);
  if (String(params.get('studio') || '').toLowerCase() !== 'talk') return null;
  return `talk:${path}`;
}

async function cachedLiveRead(key, kind, loader, { force = false } = {}) {
  if (!key) return loader();

  const now = Date.now();
  const cached = liveReadCache.get(key);
  if (!force && cached && now - cached.at < livePollTtl(kind)) {
    return cached.value;
  }

  if (!force) {
    const inFlight = liveReadInFlight.get(key);
    if (inFlight) return inFlight;
  }

  const promise = Promise.resolve()
    .then(loader)
    .then(value => {
      liveReadCache.set(key, { value, at: Date.now() });
      return value;
    })
    .finally(() => {
      if (liveReadInFlight.get(key) === promise) {
        liveReadInFlight.delete(key);
      }
    });

  liveReadInFlight.set(key, promise);
  return promise;
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
      build_research: 'talk_build_research',
      build_production: 'talk_build_production',
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

async function postNormalized(path, body) {
  const normalized = normalizePost(path, body ?? {});
  const isBridgeRead = (
    isTalkLivePage()
    && normalized.path === '/production/core'
    && normalized.body?.action === 'obs_bridge_get'
  );

  if (isBridgeRead) {
    const bridgeId = String(normalized.body?.bridge_id || 'owned');
    return cachedLiveRead(
      `bridge:${bridgeId}`,
      'bridge',
      () => request(normalized.path, {
        method: 'POST',
        body: JSON.stringify(normalized.body),
      }),
    );
  }

  const result = await request(normalized.path, {
    method: 'POST',
    body: JSON.stringify(normalized.body),
  });

  // Any successful mutation can change session, segment, scene, graphic, or
  // recording state. Drop the shared Live cache so the next reader goes to the
  // server immediately instead of waiting for the normal polling TTL.
  if (isTalkLivePage()) clearLiveReadCache();
  return result;
}

async function runCheckpointedTalkBuild(body = {}) {
  const configurationId = body?.configuration_id;
  if (!configurationId) {
    const error = new Error('Talk build requires configuration_id');
    error.code = 'TALK_BUILD_CONFIGURATION_REQUIRED';
    throw error;
  }

  const research = await postNormalized('/talk/production', {
    ...body,
    action: 'build_research',
  });

  const production = await postNormalized('/talk/production', {
    ...body,
    action: 'build_production',
  });

  return {
    ...production,
    stages: {
      research: research?.result || research,
      production: production?.result || production,
    },
    checkpointed: true,
  };
}

async function getNormalized(path, { force = false } = {}) {
  const normalized = normalizeGetPath(path);
  const key = cacheKeyForGet(normalized);
  return cachedLiveRead(
    key,
    'talk',
    () => request(normalized, { method: 'GET' }),
    { force },
  );
}

export const creapdApi = {
  get(path) {
    return getNormalized(path);
  },
  getFresh(path) {
    return getNormalized(path, { force: true });
  },
  post(path, body) {
    if (
      shouldUseNeonAuth() &&
      path === '/talk/production' &&
      ['build', 'refresh'].includes(body?.action)
    ) {
      return runCheckpointedTalkBuild(body);
    }

    return postNormalized(path, body);
  },
  invalidateLiveState() {
    clearLiveReadCache();
  },
  request,
};

export { getStoredBase44Token, getAuthContext, runCheckpointedTalkBuild };
