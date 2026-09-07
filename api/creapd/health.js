export const config = {
  maxDuration: 10,
};

export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      ok: false,
      error: 'method_not_allowed',
    });
  }

  return response.status(200).json({
    ok: true,
    service: 'creapd-backend',
    runtime: 'vercel-function',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    deployment: process.env.VERCEL_URL || null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    timestamp: new Date().toISOString(),
  });
}
