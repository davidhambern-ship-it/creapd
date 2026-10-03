const PARAM = 'creapd_obs_bridge';

const listeners = new Set();
const pending = new Map();

let nonce = '';
let bridgeWindow = null;
let bridgeState = null;
let helloTimer = null;

function currentNonce() {
  if (typeof window === 'undefined') return '';
  if (nonce) return nonce;
  nonce = new URLSearchParams(window.location.search).get(PARAM) || '';
  bridgeWindow = nonce ? window.opener : null;
  return nonce;
}

function notify() {
  const snapshot = getDirectObsBridge();
  listeners.forEach(listener => {
    try { listener(snapshot); } catch {}
  });
}

function postHello() {
  const value = currentNonce();
  if (!value || !bridgeWindow || bridgeWindow.closed) return;
  try {
    bridgeWindow.postMessage({
      type: 'CREAPD_STUDIO_READY',
      nonce: value,
    }, '*');
  } catch {}
}

function handleMessage(event) {
  const value = currentNonce();
  if (!value || !bridgeWindow || event.source !== bridgeWindow) return;

  const message = event.data && typeof event.data === 'object' ? event.data : {};
  if (message.nonce !== value) return;

  if (message.type === 'CREAPD_OBS_BRIDGE_STATE') {
    bridgeState = message.state || null;
    notify();
    return;
  }

  if (message.type === 'CREAPD_OBS_COMMAND_RESULT') {
    if (message.state) {
      bridgeState = message.state;
      notify();
    }
    const slot = pending.get(message.requestId);
    if (!slot) return;
    pending.delete(message.requestId);
    window.clearTimeout(slot.timeout);
    if (message.success === false) {
      slot.reject(new Error(message.error || 'OBS command failed.'));
    } else {
      slot.resolve({
        command: {
          id: message.requestId,
          status: 'completed',
          command_type: slot.commandType,
          result: message.result || {},
          error: null,
          completed_at: new Date().toISOString(),
        },
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', handleMessage);

  if (currentNonce() && bridgeWindow) {
    postHello();
    helloTimer = window.setInterval(() => {
      if (bridgeState?.connected) {
        window.clearInterval(helloTimer);
        helloTimer = null;
        return;
      }
      postHello();
    }, 700);

    window.setTimeout(() => {
      if (helloTimer) {
        window.clearInterval(helloTimer);
        helloTimer = null;
      }
    }, 12000);
  }
}

export function isDirectObsBridgeSession() {
  return Boolean(currentNonce() && bridgeWindow && !bridgeWindow.closed);
}

export function getDirectObsBridge() {
  if (!isDirectObsBridgeSession()) return null;
  if (bridgeState) return bridgeState;

  return {
    id: 'browser-direct',
    name: 'CREAPD Browser Bridge',
    status: 'pairing',
    online: true,
    connected: false,
    obs_endpoint: 'ws://127.0.0.1:4455',
    obs_studio_version: null,
    obs_websocket_version: null,
    current_scene: null,
    scenes: [],
    capabilities: {
      bridge: 'browser-direct',
      bridge_version: '0.4.0-browser',
    },
    last_seen_at: null,
    last_error: null,
  };
}

export function subscribeDirectObsBridge(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function sendDirectObsCommand(commandType, payload = {}) {
  const value = currentNonce();
  if (!value || !bridgeWindow || bridgeWindow.closed) {
    throw new Error('The CREAPD browser bridge is not open.');
  }

  const requestId = (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'obs-' + Date.now() + '-' + Math.random().toString(16).slice(2)
  );

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('OBS command timed out. Keep the CREAPD OBS Bridge window open.'));
    }, 15000);

    pending.set(requestId, {
      resolve,
      reject,
      timeout,
      commandType,
    });

    bridgeWindow.postMessage({
      type: 'CREAPD_OBS_COMMAND',
      nonce: value,
      requestId,
      commandType,
      payload,
    }, '*');
  });
}
