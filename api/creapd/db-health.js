import { getSql, hasDatabaseConfig } from '../../server/db.js';

export const config = {
  maxDuration: 10,
};

function inspectDatabaseUrl() {
  const value = process.env.DATABASE_URL || '';
  const summary = {
    present: Boolean(value),
    protocol_valid: false,
    parseable: false,
    neon_host: false,
    database_name_present: false,
    role_name: null,
    password_present: false,
    password_length: 0,
    password_looks_masked: false,
    sslmode: null,
    contains_whitespace: /\s/.test(value),
  };

  if (!value) return summary;

  summary.protocol_valid = value.startsWith('postgresql://') || value.startsWith('postgres://');

  try {
    const parsed = new URL(value);
    const password = decodeURIComponent(parsed.password || '');

    summary.parseable = true;
    summary.neon_host = parsed.hostname.endsWith('.neon.tech');
    summary.database_name_present = Boolean(parsed.pathname && parsed.pathname !== '/');
    summary.role_name = parsed.username || null;
    summary.password_present = Boolean(password);
    summary.password_length = password.length;
    summary.password_looks_masked = Boolean(password) && /^\*+$/.test(password);
    summary.sslmode = parsed.searchParams.get('sslmode');
  } catch {
    // Intentionally omit the URL itself. The connection string contains credentials.
  }

  return summary;
}

function safeDatabaseDiagnostic(error) {
  const code = typeof error?.code === 'string' ? error.code : null;
  const name = typeof error?.name === 'string' ? error.name : 'Error';
  const rawMessage = typeof error?.message === 'string' ? error.message : '';
  const message = rawMessage
    .replace(/postgres(?:ql)?:\/\/[^\s'"@]+@/gi, 'postgresql://***:***@')
    .replace(/password=[^\s&]+/gi, 'password=***')
    .slice(0, 240);

  let category = 'unknown_connection_error';

  if (code === 'ERR_INVALID_URL' || /invalid url/i.test(rawMessage)) {
    category = 'invalid_database_url';
  } else if (code === '28P01' || /password authentication failed/i.test(rawMessage)) {
    category = 'authentication_failed';
  } else if (code === '3D000' || /database .* does not exist/i.test(rawMessage)) {
    category = 'database_not_found';
  } else if (/fetch failed|network|connect|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(rawMessage)) {
    category = 'network_or_transport_failed';
  } else if (/ssl|certificate|tls/i.test(rawMessage)) {
    category = 'ssl_or_tls_failed';
  }

  return {
    category,
    error_name: name,
    error_code: code,
    safe_message: message || null,
    database_url: inspectDatabaseUrl(),
  };
}

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
      diagnostic: safeDatabaseDiagnostic(error),
      timestamp: new Date().toISOString(),
    });
  }
}
