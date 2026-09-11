import { createAuthClient } from '@neondatabase/neon-js/auth';

const DEFAULT_NEON_AUTH_URL = 'https://ep-silent-cell-awl5kkn3.neonauth.c-12.us-east-1.aws.neon.tech/neondb/auth';

export const neonAuth = createAuthClient(
  import.meta.env.VITE_NEON_AUTH_URL || DEFAULT_NEON_AUTH_URL
);

export function shouldUseNeonAuth() {
  if (typeof window === 'undefined') return false;

  const explicitProvider = import.meta.env.VITE_AUTH_PROVIDER;
  if (explicitProvider === 'neon') return true;
  if (explicitProvider === 'base44') return false;

  // During migration, all Vercel Preview deployments use Neon Auth while
  // production remains on Base44 until the replacement is proven end-to-end.
  return window.location.hostname.endsWith('.vercel.app');
}
