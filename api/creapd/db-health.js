import { getSql, hasDatabaseConfig } from '../../server/db.js';

export const config = {
  maxDuration: 10,
};

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({
      ok: false,
      error: 'method_not_allowed',
    });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-database',
      error: 'database_not_configured',
      required_environment_variable: 'DATABASE_URL',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const sql = getSql();
    const [result] = await sql`
      SELECT
        1 AS connected,
        NOW() AS database_time
    `;

    return response.status(200).json({
      ok: result?.connected === 1,
      service: 'creapd-database',
      connected: result?.connected === 1,
      database_time: result?.database_time || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CREAPD DB HEALTH]', error);

    return response.status(503).json({
      ok: false,
      service: 'creapd-database',
      error: 'database_connection_failed',
      timestamp: new Date().toISOString(),
    });
  }
}
