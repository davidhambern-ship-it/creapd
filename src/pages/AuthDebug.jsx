import React, { useEffect, useState } from 'react';
import { neonAuth, shouldUseNeonAuth } from '@/api/neonAuthClient';

function StatusRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-white/10 py-3 text-sm">
      <span className="text-white/60">{label}</span>
      <code className="text-right text-white/90">{String(value)}</code>
    </div>
  );
}

export default function AuthDebug() {
  const [state, setState] = useState({ status: 'running' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = {
        status: 'running',
        neon_auth_selected: shouldUseNeonAuth(),
        session_present: false,
        user_present: false,
        session_token_present: false,
        jwt_present: false,
        jwt_segments: 0,
        jwt_length: 0,
        api_status: null,
        api_ok: false,
        api_error: null,
        identity_source: null,
        data_authority: null,
      };

      try {
        const sessionResult = await neonAuth.getSession();
        const session = sessionResult?.data?.session;
        result.session_present = Boolean(session);
        result.user_present = Boolean(sessionResult?.data?.user);

        // Read the signed JWT directly from the already-valid session. The
        // current beta SDK's getJWTToken() helper performs another session fetch
        // and is the source of the invalid HTTP-method error we are isolating.
        const token =
          session?.token ||
          session?.access_token ||
          session?.accessToken ||
          null;

        result.session_token_present = Boolean(session?.token);
        result.jwt_present = Boolean(token);
        result.jwt_segments = token ? token.split('.').length : 0;
        result.jwt_length = token ? token.length : 0;

        const headers = {
          Accept: 'application/json',
          'X-CREAPD-Auth-Provider': 'neon',
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch('/api/creapd/auth/me', {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        result.api_status = response.status;
        const payload = await response.json().catch(() => null);
        result.api_ok = Boolean(response.ok && payload?.ok);
        result.api_error = payload?.error || null;
        result.identity_source = payload?.identity_source || null;
        result.data_authority = payload?.data_authority || null;
        result.status = response.ok ? 'complete' : 'failed';
      } catch (error) {
        result.status = 'failed';
        result.api_error = error?.message || 'diagnostic_failed';
      }

      if (!cancelled) setState(result);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070912] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">CREAPD Backend Migration</p>
          <h1 className="mt-2 text-2xl font-semibold">Auth Bridge Diagnostic</h1>
          <p className="mt-2 text-sm text-white/50">
            Safe diagnostic only. No token, password, or connection string is displayed.
          </p>
        </div>

        <StatusRow label="Diagnostic" value={state.status} />
        <StatusRow label="Neon auth selected" value={state.neon_auth_selected ?? '—'} />
        <StatusRow label="Session present" value={state.session_present ?? '—'} />
        <StatusRow label="User present" value={state.user_present ?? '—'} />
        <StatusRow label="Session token present" value={state.session_token_present ?? '—'} />
        <StatusRow label="JWT present" value={state.jwt_present ?? '—'} />
        <StatusRow label="JWT segments" value={state.jwt_segments ?? '—'} />
        <StatusRow label="JWT length" value={state.jwt_length ?? '—'} />
        <StatusRow label="CREAPD API status" value={state.api_status ?? '—'} />
        <StatusRow label="CREAPD API ok" value={state.api_ok ?? '—'} />
        <StatusRow label="API error" value={state.api_error ?? 'none'} />
        <StatusRow label="Identity source" value={state.identity_source ?? '—'} />
        <StatusRow label="Data authority" value={state.data_authority ?? '—'} />
      </div>
    </div>
  );
}
