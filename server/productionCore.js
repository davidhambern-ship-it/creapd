export const CREAPD_ARCHITECTURE_VERSION = '003';

export const PRODUCTION_PROFILE_KEYS = Object.freeze([
  'news',
  'research',
  'talk',
  'sports',
  'music',
  'cooking',
  'spiritual',
  'cosmo',
]);

export function normalizeProductionProfile(value, fallback = null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (PRODUCTION_PROFILE_KEYS.includes(normalized)) return normalized;
  return fallback;
}

export function withLegacyDateAliases(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at ?? row.created_date ?? null,
    updated_date: row.updated_at ?? row.updated_date ?? null,
  };
}

function safeLimit(value, fallback = 100, maximum = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export async function readProductionCore(sql, ownerUserId, options = {}) {
  const ownerId = String(ownerUserId || '').trim();
  if (!ownerId) throw new Error('owner_user_id_required');

  const limit = safeLimit(options.limit);

  const [profiles, shows, episodes, packages, presentations] = await Promise.all([
    sql`
      SELECT key, name, short_name, description, route_path, icon_key,
             sort_order, is_active, theme, settings, created_at, updated_at
      FROM creapd.production_profiles
      WHERE is_active = true
      ORDER BY sort_order ASC, key ASC
    `,
    sql`
      SELECT *
      FROM creapd.shows
      WHERE owner_user_id = ${ownerId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT *
      FROM creapd.episodes
      WHERE owner_user_id = ${ownerId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT *
      FROM creapd.production_packages
      WHERE owner_user_id = ${ownerId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT *
      FROM creapd.presentations
      WHERE owner_user_id = ${ownerId}
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `,
  ]);

  return {
    architecture_version: CREAPD_ARCHITECTURE_VERSION,
    profiles: (profiles || []).map(withLegacyDateAliases),
    shows: (shows || []).map(withLegacyDateAliases),
    episodes: (episodes || []).map(withLegacyDateAliases),
    packages: (packages || []).map(withLegacyDateAliases),
    presentations: (presentations || []).map(withLegacyDateAliases),
    counts: {
      profiles: profiles?.length || 0,
      shows: shows?.length || 0,
      episodes: episodes?.length || 0,
      packages: packages?.length || 0,
      presentations: presentations?.length || 0,
    },
  };
}
