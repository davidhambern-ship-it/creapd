import { createAuthClient } from '@neondatabase/neon-js/auth';

const DEFAULT_NEON_AUTH_URL =
  'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

function resolveNeonAuthUrl() {
  if (import.meta.env.VITE_NEON_AUTH_URL) {
    return import.meta.env.VITE_NEON_AUTH_URL;
  }

  if (
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.vercel.app')
  ) {
    // Keep Preview auth cookies first-party. The Vercel function proxies this
    // path to Neon Auth and rewrites the cookie to the Preview hostname.
    return `${window.location.origin}/api/creapd/neon-auth`;
  }

  return DEFAULT_NEON_AUTH_URL;
}

export const neonAuth = createAuthClient(resolveNeonAuthUrl());

export function shouldUseNeonAuth() {
  if (typeof window === 'undefined') return false;

  const explicitProvider = import.meta.env.VITE_AUTH_PROVIDER;
  if (explicitProvider === 'neon') return true;
  if (explicitProvider === 'base44') return false;

  // During migration, all Vercel Preview deployments use Neon Auth while
  // production remains on Base44 until the replacement is proven end-to-end.
  return window.location.hostname.endsWith('.vercel.app');
}
