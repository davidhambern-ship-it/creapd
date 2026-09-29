import { createAuthClient } from '@neondatabase/neon-js/auth';

const DEFAULT_NEON_AUTH_URL = 'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

export const neonAuth = createAuthClient(
  import.meta.env.VITE_NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL
);

export function shouldUseNeonAuth() {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();

  // CREAPD production now runs on the migrated Vercel + Neon stack.
  // Force the public CREAPD domains onto Neon even if an old production
  // environment variable still says "base44".
  if (
    hostname === 'creapd.com' ||
    hostname === 'www.creapd.com' ||
    hostname.endsWith('.vercel.app')
  ) {
    return true;
  }

  const explicitProvider = import.meta.env.VITE_AUTH_PROVIDER;
  if (explicitProvider === 'neon') return true;
  if (explicitProvider === 'base44') return false;

  return false;
}
