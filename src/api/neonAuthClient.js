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

  const hostname = window.location.hostname.toLowerCase();

  // CREAPD's owned production domains and all Vercel deployments now use the
  // Neon/Vercel backend. Base44 remains available only through an explicit
  // VITE_AUTH_PROVIDER=base44 override for legacy recovery.
  return (
    hostname === 'creapd.com' ||
    hostname === 'www.creapd.com' ||
    hostname.endsWith('.vercel.app')
  );
}
