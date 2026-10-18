import postgres from 'postgres';
import { getSql } from './db.js';

let musicSqlClient = null;

export function hasMusicDatabaseConfig() {
  return Boolean(process.env.MUSIC_DATABASE_URL || process.env.DATABASE_URL);
}

export function getMusicSql() {
  const musicUrl = process.env.MUSIC_DATABASE_URL;

  // During the Prisma Postgres pilot, Music gets its own database so Talk and
  // the rest of CREAPD remain on the currently proven database.
  if (musicUrl) {
    if (!musicSqlClient) {
      musicSqlClient = postgres(musicUrl, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 15,
        prepare: false,
      });
    }
    return musicSqlClient;
  }

  // Safe migration fallback: until MUSIC_DATABASE_URL is present, keep using
  // the existing CREAPD database path.
  return getSql();
}
