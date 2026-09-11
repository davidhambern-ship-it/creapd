import { appParams } from '@/lib/app-params';
import { neonAuth, shouldUseNeonAuth } from '@/api/neonAuthClient';

const liveReadCache = new Map();
const liveReadInFlight = new Map();
let liveReadEpoch = 0;
let neonAuthContextCache = null;

const NEON_AUTH_CONTEXT_TTL_MS = 30000;

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

function invalidateLiveReadCache({ dropTalkBase = false } = {}) {
  liveReadEpoch += 1;
  liveReadInFlight.clear();

  for (const [key, entry] of liveReadCache.entries()) {
    if (key.startsWith('talk:') && !dropTalkBase) {
      liveReadCache.set(key, { ...entry, at: 0 });
    } else {
      liveReadCache.delete(key);
    }
  }
}

function cacheKeyForGet(path) {
  if (!isTalkLivePage()) return null;
  if (!path.startsWith('/production/core?')) return null;
  const query = path.slice(path.indexOf('?') + 1);
  const params = new URLSearchParams(query);
  if (String(params.get('studio') || '').toLowerCase() !== 'talk') return null;
  if (String(params.get('view') || '').toLowerCase() === 'live_state') return null;
  return `talk:${path}`;
}

function toLiveStatePath(path) {
  const question = path.indexOf('?');
  if (question < 0) return path;
  const base = path.slice(0, question);
  const params = new URLSearchParams(path.slice(question + 1));
  params.set('view', 'live_state');
  return `${base}?${params.toString()}`;
}

function mergeRowsById(baseRows, liveRows) {
  if (!Array.isArray(liveRows)) return Array.isArray(baseRows) ? baseRows : [];
  const baseMap = new Map((Array.isArray(baseRows) ? baseRows : []).map(row => [row?.id, row]));
  return liveRows.map(row => ({ ...(baseMap.get(row?.id) || {}), ...row }));
}

function mergeTalkLiveSnapshot(base, live) {
  if (!base) return live;
  if (!live) return base;

  return {
    ...base,
    ...live,
    configuration: live.configuration
      ? { ...(base.configuration || {}), ...live.configuration }
      : base.configuration,
    topics: mergeRowsById(base.topics, live.topics),
    segments: mergeRowsById(base.segments, live.segments),
    session: live.session
      ? { ...(base.session || {}), ...live.session }
      : null,
    research: base.research || [],
    guests: base.guests || [],
    assets: base.assets || [],
    packages: base.packages || [],
    live_state: true,
  };
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

  const requestEpoch = liveReadEpoch;
  const promise = Promise.resolve()
    .then(loader)
    .then(value => {
      if (requestEpoch === liveReadEpoch) {
        liveReadCache.set(key, { value, at: Date.now() });
      }
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

async function getAuthContext({ force = false } = {}) {
  if (shouldUseNeonAuth()) {
    const now = Date.now();
    if (
      !force
      && neonAuthContextCache?.token
      && now - neonAuthContextCache.at < NEON_AUTH_CONTEXT_TTL_MS
    ) {
      return {
        provider: 'neon',
        token: neonAuthContextCache.token,
      };
    }

    const sessionResult = await neonAuth.getSession();
    const session = sessionResult?.data?.session;
    const token =
      session?.token ||
      session?.access_token ||
      session?.accessToken ||
      null;

    neonAuthContextCache = token ? { token, at: now } : null;

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

async function request(path, options = {}, authRetry = false) {
  const auth = await getAuthContext({ force: authRetry });
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
    if (response.status === 401 && auth.provider === 'neon' && !authRetry) {
      neonAuthContextCache = null;
      return request(path, options, true);
    }

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
      generate_media: 'talk_generate_media',
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

function mutationChangesStaticTalkData(action) {
  return [
    'talk_build',
    'talk_refresh',
    'talk_build_research',
    'talk_build_production',
    'talk_generate_media',
    'talk_save_configuration',
    'talk_create_guest',
    'talk_update_guest',
    'talk_delete_guest',
    'talk_set_topic_status',
    'talk_set_asset_status',
    'talk_set_segment_status',
  ].includes(String(action || ''));
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

  if (isTalkLivePage()) {
    invalidateLiveReadCache({
      dropTalkBase: mutationChangesStaticTalkData(normalized.body?.action),
    });
  }
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

  let media = null;
  let mediaWarning = null;
  try {
    media = await postNormalized('/talk/production', {
      action: 'generate_media',
      configuration_id: configurationId,
    });
  } catch (error) {
    mediaWarning = {
      code: error?.data?.diagnostic?.code || error?.data?.error || error?.code || 'TALK_MEDIA_GENERATION_FAILED',
      message: error?.data?.diagnostic?.message || error?.message || 'Talk image generation could not complete.',
    };
  }

  return {
    ...production,
    stages: {
      research: research?.result || research,
      production: production?.result || production,
      media: media?.result || media,
    },
    ...(mediaWarning ? { media_warning: mediaWarning } : {}),
    checkpointed: true,
  };
}

async function getNormalized(path, { force = false } = {}) {
  const normalized = normalizeGetPath(path);
  const key = cacheKeyForGet(normalized);

  if (!key) {
    return request(normalized, { method: 'GET' });
  }

  const cached = liveReadCache.get(key);
  const loader = cached?.value
    ? async () => {
        const live = await request(toLiveStatePath(normalized), { method: 'GET' });
        return mergeTalkLiveSnapshot(cached.value, live);
      }
    : () => request(normalized, { method: 'GET' });

  return cachedLiveRead(key, 'talk', loader, { force });
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
  invalidateLiveState(options) {
    invalidateLiveReadCache(options);
  },
  clearAuthCache() {
    neonAuthContextCache = null;
  },
  request,
};

export { getStoredBase44Token, getAuthContext, runCheckpointedTalkBuild };
