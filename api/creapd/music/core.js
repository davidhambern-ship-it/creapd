import { getMusicSql, hasMusicDatabaseConfig } from '../../../server/musicDb.js';
import { ensureMusicSchema } from '../../../server/musicSchema.js';
import { requireNeonUser } from '../../../server/neonAuth.js';
import { requireBase44User } from '../../../server/base44Auth.js';
import { readMusicStudio, readMusicStatus, runMusicStudioAction } from '../../../server/musicStudio.js';

export const config = { maxDuration: 300 };

function authProvider(request) {
  const raw = request.headers?.['x-creapd-auth-provider'] || request.headers?.['X-CREAPD-Auth-Provider'] || 'base44';
  return String(raw).trim().toLowerCase();
}

function send(response, status, payload) {
  response.status(status).json(payload);
}

function fail(response, error) {
  const status = Number(error?.status || 500);
  const code = error?.code || 'MUSIC_API_ERROR';
  const message = error?.message || 'Music Studio request failed';
  console.error('[CREAPD MUSIC API]', code, message);
  send(response, status, { ok: false, error: message, code });
}

async function resolveIdentity(request) {
  const provider = authProvider(request);
  if (provider === 'neon') {
    const user = await requireNeonUser(request);
    return { provider, id: String(user.id), email: user.email || null, display_name: null };
  }
  if (provider === 'base44') {
    const user = await requireBase44User(request);
    return {
      provider,
      id: String(user.id),
      email: user.email || null,
      display_name: user.full_name || user.display_name || user.name || null,
    };
  }
  const error = new Error('Unsupported authentication provider');
  error.code = 'UNSUPPORTED_AUTH_PROVIDER';
  error.status = 400;
  throw error;
}

async function ensureMusicUser(sql, identity) {
  const [existingById] = await sql`
    SELECT id, email, display_name
    FROM creapd.users
    WHERE id=${identity.id}
    LIMIT 1
  `;

  if (existingById) {
    const [updated] = await sql`
      UPDATE creapd.users
      SET
        email=COALESCE(${identity.email}, email),
        display_name=COALESCE(${identity.display_name}, display_name),
        source_system=${identity.provider},
        source_payload=${JSON.stringify({ provider: identity.provider, external_id: identity.id })}::jsonb,
        updated_at=now()
      WHERE id=${identity.id}
      RETURNING *
    `;
    return updated;
  }

  if (identity.email) {
    const [existingByEmail] = await sql`
      SELECT id, email, display_name
      FROM creapd.users
      WHERE lower(email)=lower(${identity.email})
      LIMIT 1
    `;
    if (existingByEmail) return existingByEmail;
  }

  const [created] = await sql`
    INSERT INTO creapd.users (id, email, display_name, source_system, source_payload)
    VALUES (
      ${identity.id},
      ${identity.email},
      ${identity.display_name},
      ${identity.provider},
      ${JSON.stringify({ provider: identity.provider, external_id: identity.id })}::jsonb
    )
    RETURNING *
  `;
  return created;
}

export default async function handler(request, response) {
  if (!hasMusicDatabaseConfig()) {
    return send(response, 503, { ok: false, error: 'Music database is not configured', code: 'MUSIC_DATABASE_NOT_CONFIGURED' });
  }

  try {
    const sql = getMusicSql();
    await ensureMusicSchema(sql);
    const identity = await resolveIdentity(request);
    const user = await ensureMusicUser(sql, identity);
    const ownerUserId = String(user.id);
    const ownerEmail = user.email || identity.email || null;

    if (request.method === 'GET') {
      const view = String(request.query?.view || '').trim().toLowerCase();
      const configurationId = request.query?.configuration_id || null;
      const data = view === 'status'
        ? await readMusicStatus(sql, ownerUserId, configurationId)
        : await readMusicStudio(sql, ownerUserId, configurationId);
      return send(response, 200, {
        ok: true,
        service: 'creapd-music-core',
        source: process.env.MUSIC_DATABASE_URL ? 'music_database' : 'default_database',
        data_authority: 'owned',
        ...data,
      });
    }

    if (request.method === 'POST') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
      const action = String(body.action || '').trim();
      if (!action) {
        const error = new Error('Music action is required');
        error.code = 'MUSIC_ACTION_REQUIRED';
        error.status = 400;
        throw error;
      }
      const result = await runMusicStudioAction({ sql, ownerUserId, ownerEmail, action, body });
      return send(response, 200, {
        ok: true,
        service: 'creapd-music-core',
        source: process.env.MUSIC_DATABASE_URL ? 'music_database' : 'default_database',
        data_authority: 'owned',
        action,
        ...result,
      });
    }

    response.setHeader('Allow', 'GET, POST');
    return send(response, 405, { ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    return fail(response, error);
  }
}
